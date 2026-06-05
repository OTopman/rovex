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

import {
  decodeLineString,
  decodePoint,
  decodePolygon,
  decodeMultiPoint,
  decodeMultiLineString,
  decodeMultiPolygon,
} from './decoder.js';
import { normalise } from './normalize.js';
import type { Coordinate, EwkbInput } from './types.js';
import {
  BYTE_ORDER_BIG_ENDIAN,
  BYTE_ORDER_LITTLE_ENDIAN,
  GEOMETRY_TYPE_MASK,
  OFFSET_WKB_TYPE,
  WKB_TYPE_POINT,
  WKB_TYPE_LINESTRING,
  WKB_TYPE_POLYGON,
  WKB_TYPE_MULTIPOINT,
  WKB_TYPE_MULTILINESTRING,
  WKB_TYPE_MULTIPOLYGON,
} from './constants.js';
import { readUint32 } from './reader.js';

// Re-export types so consumers don't need to reach into internals.
export type { Coordinate, EwkbInput };

/**
 * SpatialDecoder provides a minimal, stable, and highly optimised API
 * for decoding PostGIS EWKB geometry payloads into plain JavaScript objects.
 *
 * All methods are safe to call with any input — they never throw.
 */
export const SpatialDecoder = {
  /**
   * Decodes a PostGIS EWKB Point (with SRID 4326) into a `Coordinate`.
   */
  decodePoint(input: EwkbInput): Coordinate | null {
    const buf = normalise(input);
    if (buf === null) return null;
    return decodePoint(buf);
  },

  /**
   * Decodes a PostGIS EWKB LineString (with SRID 4326) into an ordered array
   * of `Coordinate` objects.
   */
  decodeLineString(input: EwkbInput): Coordinate[] {
    const buf = normalise(input);
    if (buf === null) return [];
    return decodeLineString(buf);
  },

  /**
   * Decodes a PostGIS EWKB Polygon (with SRID 4326) into an array of linear rings,
   * where each ring is an array of `Coordinate` objects.
   */
  decodePolygon(input: EwkbInput): Coordinate[][] {
    const buf = normalise(input);
    if (buf === null) return [];
    return decodePolygon(buf);
  },

  /**
   * Decodes a PostGIS EWKB MultiPoint (with SRID 4326) into an array of `Coordinate` objects.
   */
  decodeMultiPoint(input: EwkbInput): Coordinate[] {
    const buf = normalise(input);
    if (buf === null) return [];
    return decodeMultiPoint(buf);
  },

  /**
   * Decodes a PostGIS EWKB MultiLineString (with SRID 4326) into an array of LineStrings.
   */
  decodeMultiLineString(input: EwkbInput): Coordinate[][] {
    const buf = normalise(input);
    if (buf === null) return [];
    return decodeMultiLineString(buf);
  },

  /**
   * Decodes a PostGIS EWKB MultiPolygon (with SRID 4326) into an array of Polygons.
   */
  decodeMultiPolygon(input: EwkbInput): Coordinate[][][] {
    const buf = normalise(input);
    if (buf === null) return [];
    return decodeMultiPolygon(buf);
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
  decode(input: EwkbInput) {
    const buf = normalise(input);
    if (buf === null) return null;
    if (buf.length < 5) return null;

    const byteOrder = buf[0];
    if (byteOrder !== BYTE_ORDER_LITTLE_ENDIAN && byteOrder !== BYTE_ORDER_BIG_ENDIAN) {
      return null;
    }
    const littleEndian = byteOrder === BYTE_ORDER_LITTLE_ENDIAN;
    const rawType = readUint32(buf, OFFSET_WKB_TYPE, littleEndian);
    const geometryType = rawType & GEOMETRY_TYPE_MASK;

    switch (geometryType) {
      case WKB_TYPE_POINT:
        return decodePoint(buf);
      case WKB_TYPE_LINESTRING:
        return decodeLineString(buf);
      case WKB_TYPE_POLYGON:
        return decodePolygon(buf);
      case WKB_TYPE_MULTIPOINT:
        return decodeMultiPoint(buf);
      case WKB_TYPE_MULTILINESTRING:
        return decodeMultiLineString(buf);
      case WKB_TYPE_MULTIPOLYGON:
        return decodeMultiPolygon(buf);
      default:
        return null;
    }
  }
} as const;
