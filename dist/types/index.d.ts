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
import type { Coordinate, EwkbInput } from './types.js';
export type { Coordinate, EwkbInput };
/**
 * SpatialDecoder provides a minimal, stable, and highly optimised API
 * for decoding PostGIS EWKB geometry payloads into plain JavaScript objects.
 *
 * All methods are safe to call with any input — they never throw.
 */
export declare const SpatialDecoder: {
    /**
     * Decodes a PostGIS EWKB Point (with SRID 4326) into a `Coordinate`.
     */
    readonly decodePoint: (input: EwkbInput) => Coordinate | null;
    /**
     * Decodes a PostGIS EWKB LineString (with SRID 4326) into an ordered array
     * of `Coordinate` objects.
     */
    readonly decodeLineString: (input: EwkbInput) => Coordinate[];
    /**
     * Decodes a PostGIS EWKB Polygon (with SRID 4326) into an array of linear rings,
     * where each ring is an array of `Coordinate` objects.
     */
    readonly decodePolygon: (input: EwkbInput) => Coordinate[][];
    /**
     * Decodes a PostGIS EWKB MultiPoint (with SRID 4326) into an array of `Coordinate` objects.
     */
    readonly decodeMultiPoint: (input: EwkbInput) => Coordinate[];
    /**
     * Decodes a PostGIS EWKB MultiLineString (with SRID 4326) into an array of LineStrings.
     */
    readonly decodeMultiLineString: (input: EwkbInput) => Coordinate[][];
    /**
     * Decodes a PostGIS EWKB MultiPolygon (with SRID 4326) into an array of Polygons.
     */
    readonly decodeMultiPolygon: (input: EwkbInput) => Coordinate[][][];
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
    readonly decode: (input: EwkbInput) => any;
};
//# sourceMappingURL=index.d.ts.map