"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PG_HEX_PREFIX = exports.OFFSET_LINESTRING_FIRST_COORD = exports.OFFSET_POINT_Y = exports.OFFSET_POINT_X = exports.OFFSET_LINESTRING_NUM_POINTS = exports.OFFSET_SRID = exports.OFFSET_WKB_TYPE = exports.COORD_PAIR_BYTES = exports.LINESTRING_HEADER_BYTES = exports.POINT_MIN_BYTES = exports.SRID_WGS84 = exports.GEOMETRY_TYPE_MASK = exports.EWKB_M_FLAG = exports.EWKB_Z_FLAG = exports.EWKB_SRID_FLAG = exports.WKB_TYPE_MULTIPOLYGON = exports.WKB_TYPE_MULTILINESTRING = exports.WKB_TYPE_MULTIPOINT = exports.WKB_TYPE_POLYGON = exports.WKB_TYPE_LINESTRING = exports.WKB_TYPE_POINT = exports.BYTE_ORDER_LITTLE_ENDIAN = exports.BYTE_ORDER_BIG_ENDIAN = void 0;
/**
 * EWKB byte order markers.
 * Stored as const enum so V8 inlines them as integer literals.
 * No object allocation, no property lookup.
 */
exports.BYTE_ORDER_BIG_ENDIAN = 0;
exports.BYTE_ORDER_LITTLE_ENDIAN = 1;
/**
 * Standard WKB geometry type identifiers (ISO 19125).
 * Lower 16 bits of the type field after masking EWKB flags.
 */
exports.WKB_TYPE_POINT = 1;
exports.WKB_TYPE_LINESTRING = 2;
exports.WKB_TYPE_POLYGON = 3;
exports.WKB_TYPE_MULTIPOINT = 4;
exports.WKB_TYPE_MULTILINESTRING = 5;
exports.WKB_TYPE_MULTIPOLYGON = 6;
/**
 * PostGIS EWKB extension flag: indicates SRID is present in the payload.
 * Position: bit 29 of the uint32 type field.
 *
 * When set, a uint32 SRID follows immediately after the type field,
 * before the coordinate payload begins.
 */
exports.EWKB_SRID_FLAG = 0x20000000;
/**
 * PostGIS EWKB extension flag: indicates Z coordinate is present.
 * Position: bit 31 of the uint32 type field.
 * Not decoded in this implementation (2D only).
 */
exports.EWKB_Z_FLAG = 0x80000000;
/**
 * PostGIS EWKB extension flag: indicates M coordinate is present.
 * Position: bit 30 of the uint32 type field.
 * Not decoded in this implementation (2D only).
 */
exports.EWKB_M_FLAG = 0x40000000;
/**
 * Mask to isolate the geometry type from the EWKB type field,
 * stripping all extension flags (SRID, Z, M) from the upper bits.
 */
exports.GEOMETRY_TYPE_MASK = 0x1fffffff;
/**
 * Expected SRID for geographic coordinates (WGS 84).
 * Validated on decode; payloads with a different SRID return null / [].
 */
exports.SRID_WGS84 = 4326;
/**
 * Minimum buffer length for a valid EWKB Point with SRID.
 *
 * Layout:
 *   byte[0]     byteOrder   (1 byte)
 *   byte[1..4]  wkbType     (4 bytes, uint32)
 *   byte[5..8]  srid        (4 bytes, uint32)
 *   byte[9..16] x           (8 bytes, float64)
 *   byte[17..24] y          (8 bytes, float64)
 *   TOTAL: 25 bytes
 */
exports.POINT_MIN_BYTES = 25;
/**
 * Minimum buffer length for a valid EWKB LineString with SRID.
 *
 * Layout:
 *   byte[0]     byteOrder   (1 byte)
 *   byte[1..4]  wkbType     (4 bytes, uint32)
 *   byte[5..8]  srid        (4 bytes, uint32)
 *   byte[9..12] numPoints   (4 bytes, uint32)
 *   byte[13..]  coordinates (16 bytes per point)
 *   TOTAL header: 13 bytes; minimum with 1 point: 29 bytes
 */
exports.LINESTRING_HEADER_BYTES = 13;
/** Size in bytes of a single 2D coordinate pair (x: float64, y: float64). */
exports.COORD_PAIR_BYTES = 16;
/** Byte offset of the wkbType field within an EWKB payload. */
exports.OFFSET_WKB_TYPE = 1;
/** Byte offset of the SRID field within an EWKB payload (when SRID flag present). */
exports.OFFSET_SRID = 5;
/** Byte offset of the numPoints field within a LineString payload. */
exports.OFFSET_LINESTRING_NUM_POINTS = 9;
/** Byte offset of the first coordinate in a Point payload. */
exports.OFFSET_POINT_X = 9;
/** Byte offset of the y coordinate in a Point payload. */
exports.OFFSET_POINT_Y = 17;
/** Byte offset of the first coordinate pair in a LineString payload. */
exports.OFFSET_LINESTRING_FIRST_COORD = 13;
/** PostgreSQL wire-protocol hex prefix. */
exports.PG_HEX_PREFIX = '\\x';
//# sourceMappingURL=constants.js.map