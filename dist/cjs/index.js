"use strict";
/**
 * rovex
 *
 * Zero-dependency, ultra-high-performance PostGIS EWKB decoder for Node.js.
 *
 * Designed for direct use inside Prisma query extension `result` transforms
 * and other high-throughput spatial data pipelines.
 *
 * ---
 * Quick start
 * ---
 *
 * ```ts
 * import { SpatialDecoder } from 'rovex';
 *
 * // Automatically decode any supported geometry type
 * const geometry = SpatialDecoder.decode('\x0101000020e6100000...');
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpatialDecoder = void 0;
const decoder_js_1 = require("./decoder.js");
const normalize_js_1 = require("./normalize.js");
const constants_js_1 = require("./constants.js");
const reader_js_1 = require("./reader.js");
/**
 * SpatialDecoder provides a minimal, stable, and highly optimised API
 * for decoding PostGIS EWKB geometry payloads into plain JavaScript objects.
 *
 * All methods are safe to call with any input — they never throw.
 */
exports.SpatialDecoder = {
    /**
     * Decodes a PostGIS EWKB Point (with SRID 4326) into a `Coordinate`.
     */
    decodePoint(input) {
        const buf = (0, normalize_js_1.normalise)(input);
        if (buf === null)
            return null;
        return (0, decoder_js_1.decodePoint)(buf);
    },
    /**
     * Decodes a PostGIS EWKB LineString (with SRID 4326) into an ordered array
     * of `Coordinate` objects.
     */
    decodeLineString(input) {
        const buf = (0, normalize_js_1.normalise)(input);
        if (buf === null)
            return [];
        return (0, decoder_js_1.decodeLineString)(buf);
    },
    /**
     * Decodes a PostGIS EWKB Polygon (with SRID 4326) into an array of linear rings,
     * where each ring is an array of `Coordinate` objects.
     */
    decodePolygon(input) {
        const buf = (0, normalize_js_1.normalise)(input);
        if (buf === null)
            return [];
        return (0, decoder_js_1.decodePolygon)(buf);
    },
    /**
     * Decodes a PostGIS EWKB MultiPoint (with SRID 4326) into an array of `Coordinate` objects.
     */
    decodeMultiPoint(input) {
        const buf = (0, normalize_js_1.normalise)(input);
        if (buf === null)
            return [];
        return (0, decoder_js_1.decodeMultiPoint)(buf);
    },
    /**
     * Decodes a PostGIS EWKB MultiLineString (with SRID 4326) into an array of LineStrings.
     */
    decodeMultiLineString(input) {
        const buf = (0, normalize_js_1.normalise)(input);
        if (buf === null)
            return [];
        return (0, decoder_js_1.decodeMultiLineString)(buf);
    },
    /**
     * Decodes a PostGIS EWKB MultiPolygon (with SRID 4326) into an array of Polygons.
     */
    decodeMultiPolygon(input) {
        const buf = (0, normalize_js_1.normalise)(input);
        if (buf === null)
            return [];
        return (0, decoder_js_1.decodeMultiPolygon)(buf);
    },
    /**
     * Automatically inspects the geometry type and decodes the EWKB payload
     * into its respective JS representation:
     *   - Point -> Coordinate
     *   - LineString -> Coordinate[]
     *   - Polygon -> Coordinate[][]
     *   - MultiPoint -> Coordinate[]
     *   - MultiLineString -> Coordinate[][]
     *   - MultiPolygon -> Coordinate[][][]
     */
    decode(input) {
        const buf = (0, normalize_js_1.normalise)(input);
        if (buf === null)
            return null;
        if (buf.length < 5)
            return null;
        const byteOrder = buf[0];
        if (byteOrder !== constants_js_1.BYTE_ORDER_LITTLE_ENDIAN && byteOrder !== constants_js_1.BYTE_ORDER_BIG_ENDIAN) {
            return null;
        }
        const littleEndian = byteOrder === constants_js_1.BYTE_ORDER_LITTLE_ENDIAN;
        const rawType = (0, reader_js_1.readUint32)(buf, constants_js_1.OFFSET_WKB_TYPE, littleEndian);
        const geometryType = rawType & constants_js_1.GEOMETRY_TYPE_MASK;
        switch (geometryType) {
            case constants_js_1.WKB_TYPE_POINT:
                return (0, decoder_js_1.decodePoint)(buf);
            case constants_js_1.WKB_TYPE_LINESTRING:
                return (0, decoder_js_1.decodeLineString)(buf);
            case constants_js_1.WKB_TYPE_POLYGON:
                return (0, decoder_js_1.decodePolygon)(buf);
            case constants_js_1.WKB_TYPE_MULTIPOINT:
                return (0, decoder_js_1.decodeMultiPoint)(buf);
            case constants_js_1.WKB_TYPE_MULTILINESTRING:
                return (0, decoder_js_1.decodeMultiLineString)(buf);
            case constants_js_1.WKB_TYPE_MULTIPOLYGON:
                return (0, decoder_js_1.decodeMultiPolygon)(buf);
            default:
                return null;
        }
    }
};
//# sourceMappingURL=index.js.map