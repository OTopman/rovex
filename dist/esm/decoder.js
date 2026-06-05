/**
 * EWKB Decoder — core parsing logic.
 *
 * This module contains the hot-path implementation for decoding PostGIS
 * Extended Well-Known Binary (EWKB) geometries.
 *
 * @internal
 */
import { BYTE_ORDER_BIG_ENDIAN, BYTE_ORDER_LITTLE_ENDIAN, EWKB_M_FLAG, EWKB_SRID_FLAG, EWKB_Z_FLAG, GEOMETRY_TYPE_MASK, OFFSET_SRID, OFFSET_WKB_TYPE, SRID_WGS84, WKB_TYPE_LINESTRING, WKB_TYPE_POINT, WKB_TYPE_POLYGON, WKB_TYPE_MULTIPOINT, WKB_TYPE_MULTILINESTRING, WKB_TYPE_MULTIPOLYGON, } from './constants.js';
import { readFloat64, readUint32 } from './reader.js';
// ---------------------------------------------------------------------------
// Packed Header Parser (Zero-Allocation)
// ---------------------------------------------------------------------------
/**
 * Parses the EWKB header starting at `offset`.
 *
 * To avoid any heap allocations in this high-frequency helper, we pack
 * the parsed fields into a single 32-bit integer return value.
 *
 * Layout of the returned 32-bit integer:
 *   Bit 0      - littleEndian (1 = true, 0 = false)
 *   Bit 1      - hasZ (1 = true, 0 = false)
 *   Bit 2      - hasM (1 = true, 0 = false)
 *   Bits 3..10 - headerLength (uint8)
 *   Bits 11..31- geometryType (uint24)
 *
 * If parsing fails or validations fail, returns `-1`.
 */
function parseHeader(buf, offset, requireSrid) {
    if (buf.length < offset + 5)
        return -1;
    const byteOrder = buf[offset];
    if (byteOrder !== BYTE_ORDER_LITTLE_ENDIAN && byteOrder !== BYTE_ORDER_BIG_ENDIAN) {
        return -1;
    }
    const littleEndian = byteOrder === BYTE_ORDER_LITTLE_ENDIAN;
    const rawType = readUint32(buf, offset + OFFSET_WKB_TYPE, littleEndian);
    const hasSrid = (rawType & EWKB_SRID_FLAG) !== 0;
    const hasZ = (rawType & EWKB_Z_FLAG) !== 0;
    const hasM = (rawType & EWKB_M_FLAG) !== 0;
    const geometryType = rawType & GEOMETRY_TYPE_MASK;
    let headerLength = 5;
    if (requireSrid) {
        if (!hasSrid)
            return -1;
        if (buf.length < offset + 9)
            return -1;
        const srid = readUint32(buf, offset + OFFSET_SRID, littleEndian);
        if (srid !== SRID_WGS84)
            return -1;
        headerLength = 9;
    }
    else if (hasSrid) {
        if (buf.length < offset + 9)
            return -1;
        const srid = readUint32(buf, offset + OFFSET_SRID, littleEndian);
        if (srid !== SRID_WGS84)
            return -1;
        headerLength = 9;
    }
    const leVal = littleEndian ? 1 : 0;
    const zVal = hasZ ? 2 : 0;
    const mVal = hasM ? 4 : 0;
    const lenVal = headerLength << 3;
    const typeVal = geometryType << 11;
    return leVal | zVal | mVal | lenVal | typeVal;
}
// ---------------------------------------------------------------------------
// Coordinate Reader (V8 Shape-Optimised)
// ---------------------------------------------------------------------------
/**
 * Reads a coordinate from `buf` at `offset`.
 *
 * To ensure V8 shape stability (monomorphic objects) and avoid hidden-class
 * transitions, we return coordinates created using distinct literal blocks
 * for each coordinate dimension configuration.
 */
function readCoordinate(buf, offset, littleEndian, hasZ, hasM) {
    const x = readFloat64(buf, offset, littleEndian);
    const y = readFloat64(buf, offset + 8, littleEndian);
    if (hasZ && hasM) {
        const z = readFloat64(buf, offset + 16, littleEndian);
        const m = readFloat64(buf, offset + 24, littleEndian);
        return { lng: x, lat: y, z, m };
    }
    else if (hasZ) {
        const z = readFloat64(buf, offset + 16, littleEndian);
        return { lng: x, lat: y, z };
    }
    else if (hasM) {
        const m = readFloat64(buf, offset + 16, littleEndian);
        return { lng: x, lat: y, m };
    }
    else {
        return { lng: x, lat: y };
    }
}
// ---------------------------------------------------------------------------
// Point Decoder
// ---------------------------------------------------------------------------
export function decodePoint(buf, offset = 0, requireSrid = true) {
    const header = parseHeader(buf, offset, requireSrid);
    if (header === -1)
        return null;
    const geometryType = header >> 11;
    if (geometryType !== WKB_TYPE_POINT)
        return null;
    const littleEndian = (header & 1) === 1;
    const hasZ = (header & 2) === 2;
    const hasM = (header & 4) === 4;
    const headerLength = (header >> 3) & 0xff;
    const stride = 16 + (hasZ ? 8 : 0) + (hasM ? 8 : 0);
    const requiredBytes = offset + headerLength + stride;
    if (buf.length < requiredBytes)
        return null;
    return readCoordinate(buf, offset + headerLength, littleEndian, hasZ, hasM);
}
// ---------------------------------------------------------------------------
// LineString Decoder
// ---------------------------------------------------------------------------
export function decodeLineString(buf, offset = 0, requireSrid = true) {
    const header = parseHeader(buf, offset, requireSrid);
    if (header === -1)
        return [];
    const geometryType = header >> 11;
    if (geometryType !== WKB_TYPE_LINESTRING)
        return [];
    const littleEndian = (header & 1) === 1;
    const hasZ = (header & 2) === 2;
    const hasM = (header & 4) === 4;
    const headerLength = (header >> 3) & 0xff;
    const startOffset = offset + headerLength;
    if (buf.length < startOffset + 4)
        return [];
    const numPoints = readUint32(buf, startOffset, littleEndian);
    if (numPoints === 0)
        return [];
    const stride = 16 + (hasZ ? 8 : 0) + (hasM ? 8 : 0);
    const requiredBytes = startOffset + 4 + numPoints * stride;
    if (buf.length < requiredBytes)
        return [];
    const result = new Array(numPoints);
    let coordOffset = startOffset + 4;
    for (let i = 0; i < numPoints; i++) {
        result[i] = readCoordinate(buf, coordOffset, littleEndian, hasZ, hasM);
        coordOffset += stride;
    }
    return result;
}
// ---------------------------------------------------------------------------
// Polygon Decoder
// ---------------------------------------------------------------------------
export function decodePolygon(buf, offset = 0, requireSrid = true) {
    const header = parseHeader(buf, offset, requireSrid);
    if (header === -1)
        return [];
    const geometryType = header >> 11;
    if (geometryType !== WKB_TYPE_POLYGON)
        return [];
    const littleEndian = (header & 1) === 1;
    const hasZ = (header & 2) === 2;
    const hasM = (header & 4) === 4;
    const headerLength = (header >> 3) & 0xff;
    const startOffset = offset + headerLength;
    if (buf.length < startOffset + 4)
        return [];
    const numRings = readUint32(buf, startOffset, littleEndian);
    if (numRings === 0)
        return [];
    let currentOffset = startOffset + 4;
    const stride = 16 + (hasZ ? 8 : 0) + (hasM ? 8 : 0);
    const result = new Array(numRings);
    for (let r = 0; r < numRings; r++) {
        if (buf.length < currentOffset + 4)
            return [];
        const numPoints = readUint32(buf, currentOffset, littleEndian);
        currentOffset += 4;
        const requiredBytes = currentOffset + numPoints * stride;
        if (buf.length < requiredBytes)
            return [];
        const ring = new Array(numPoints);
        for (let p = 0; p < numPoints; p++) {
            ring[p] = readCoordinate(buf, currentOffset, littleEndian, hasZ, hasM);
            currentOffset += stride;
        }
        result[r] = ring;
    }
    return result;
}
// ---------------------------------------------------------------------------
// MultiPoint Decoder
// ---------------------------------------------------------------------------
export function decodeMultiPoint(buf, offset = 0, requireSrid = true) {
    const header = parseHeader(buf, offset, requireSrid);
    if (header === -1)
        return [];
    const geometryType = header >> 11;
    if (geometryType !== WKB_TYPE_MULTIPOINT)
        return [];
    const littleEndian = (header & 1) === 1;
    const headerLength = (header >> 3) & 0xff;
    const startOffset = offset + headerLength;
    if (buf.length < startOffset + 4)
        return [];
    const numGeoms = readUint32(buf, startOffset, littleEndian);
    let currentOffset = startOffset + 4;
    const result = new Array(numGeoms);
    for (let i = 0; i < numGeoms; i++) {
        const subHeader = parseHeader(buf, currentOffset, false);
        if (subHeader === -1)
            return [];
        const subType = subHeader >> 11;
        if (subType !== WKB_TYPE_POINT)
            return [];
        const subLE = (subHeader & 1) === 1;
        const subHasZ = (subHeader & 2) === 2;
        const subHasM = (subHeader & 4) === 4;
        const subLen = (subHeader >> 3) & 0xff;
        const stride = 16 + (subHasZ ? 8 : 0) + (subHasM ? 8 : 0);
        const requiredBytes = currentOffset + subLen + stride;
        if (buf.length < requiredBytes)
            return [];
        result[i] = readCoordinate(buf, currentOffset + subLen, subLE, subHasZ, subHasM);
        currentOffset = requiredBytes;
    }
    return result;
}
// ---------------------------------------------------------------------------
// MultiLineString Decoder
// ---------------------------------------------------------------------------
export function decodeMultiLineString(buf, offset = 0, requireSrid = true) {
    const header = parseHeader(buf, offset, requireSrid);
    if (header === -1)
        return [];
    const geometryType = header >> 11;
    if (geometryType !== WKB_TYPE_MULTILINESTRING)
        return [];
    const littleEndian = (header & 1) === 1;
    const headerLength = (header >> 3) & 0xff;
    const startOffset = offset + headerLength;
    if (buf.length < startOffset + 4)
        return [];
    const numGeoms = readUint32(buf, startOffset, littleEndian);
    let currentOffset = startOffset + 4;
    const result = new Array(numGeoms);
    for (let i = 0; i < numGeoms; i++) {
        const subHeader = parseHeader(buf, currentOffset, false);
        if (subHeader === -1)
            return [];
        const subType = subHeader >> 11;
        if (subType !== WKB_TYPE_LINESTRING)
            return [];
        const subLE = (subHeader & 1) === 1;
        const subHasZ = (subHeader & 2) === 2;
        const subHasM = (subHeader & 4) === 4;
        const subLen = (subHeader >> 3) & 0xff;
        const startSub = currentOffset + subLen;
        if (buf.length < startSub + 4)
            return [];
        const numPoints = readUint32(buf, startSub, subLE);
        const stride = 16 + (subHasZ ? 8 : 0) + (subHasM ? 8 : 0);
        const requiredBytes = startSub + 4 + numPoints * stride;
        if (buf.length < requiredBytes)
            return [];
        const line = new Array(numPoints);
        let coordOffset = startSub + 4;
        for (let p = 0; p < numPoints; p++) {
            line[p] = readCoordinate(buf, coordOffset, subLE, subHasZ, subHasM);
            coordOffset += stride;
        }
        result[i] = line;
        currentOffset = requiredBytes;
    }
    return result;
}
// ---------------------------------------------------------------------------
// MultiPolygon Decoder
// ---------------------------------------------------------------------------
export function decodeMultiPolygon(buf, offset = 0, requireSrid = true) {
    const header = parseHeader(buf, offset, requireSrid);
    if (header === -1)
        return [];
    const geometryType = header >> 11;
    if (geometryType !== WKB_TYPE_MULTIPOLYGON)
        return [];
    const littleEndian = (header & 1) === 1;
    const headerLength = (header >> 3) & 0xff;
    const startOffset = offset + headerLength;
    if (buf.length < startOffset + 4)
        return [];
    const numGeoms = readUint32(buf, startOffset, littleEndian);
    let currentOffset = startOffset + 4;
    const result = new Array(numGeoms);
    for (let i = 0; i < numGeoms; i++) {
        const subHeader = parseHeader(buf, currentOffset, false);
        if (subHeader === -1)
            return [];
        const subType = subHeader >> 11;
        if (subType !== WKB_TYPE_POLYGON)
            return [];
        const subLE = (subHeader & 1) === 1;
        const subHasZ = (subHeader & 2) === 2;
        const subHasM = (subHeader & 4) === 4;
        const subLen = (subHeader >> 3) & 0xff;
        const startSub = currentOffset + subLen;
        if (buf.length < startSub + 4)
            return [];
        const numRings = readUint32(buf, startSub, subLE);
        currentOffset = startSub + 4;
        const stride = 16 + (subHasZ ? 8 : 0) + (subHasM ? 8 : 0);
        const polygon = new Array(numRings);
        for (let r = 0; r < numRings; r++) {
            if (buf.length < currentOffset + 4)
                return [];
            const numPoints = readUint32(buf, currentOffset, subLE);
            currentOffset += 4;
            const requiredBytes = currentOffset + numPoints * stride;
            if (buf.length < requiredBytes)
                return [];
            const ring = new Array(numPoints);
            for (let p = 0; p < numPoints; p++) {
                ring[p] = readCoordinate(buf, currentOffset, subLE, subHasZ, subHasM);
                currentOffset += stride;
            }
            polygon[r] = ring;
        }
        result[i] = polygon;
    }
    return result;
}
//# sourceMappingURL=decoder.js.map