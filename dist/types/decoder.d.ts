/**
 * EWKB Decoder — core parsing logic.
 *
 * This module contains the hot-path implementation for decoding PostGIS
 * Extended Well-Known Binary (EWKB) geometries.
 *
 * @internal
 */
import type { Coordinate } from './types.js';
export declare function decodePoint(buf: Buffer, offset?: number, requireSrid?: boolean): Coordinate | null;
export declare function decodeLineString(buf: Buffer, offset?: number, requireSrid?: boolean): Coordinate[];
export declare function decodePolygon(buf: Buffer, offset?: number, requireSrid?: boolean): Coordinate[][];
export declare function decodeMultiPoint(buf: Buffer, offset?: number, requireSrid?: boolean): Coordinate[];
export declare function decodeMultiLineString(buf: Buffer, offset?: number, requireSrid?: boolean): Coordinate[][];
export declare function decodeMultiPolygon(buf: Buffer, offset?: number, requireSrid?: boolean): Coordinate[][][];
//# sourceMappingURL=decoder.d.ts.map