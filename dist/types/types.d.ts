/**
 * A 2D geographic coordinate in WGS 84 (SRID 4326).
 *
 * `lng` maps to the EWKB X value (easting / longitude).
 * `lat` maps to the EWKB Y value (northing / latitude).
 *
 * The shape is intentionally fixed and minimal so that V8 can monomorphise
 * call sites that consume this object — no optional fields, no index
 * signatures, no prototype chains.
 */
export interface Coordinate {
    readonly lng: number;
    readonly lat: number;
    readonly z?: number;
    readonly m?: number;
}
/**
 * All input types the decoder will accept.
 *
 * - `Buffer` | `Uint8Array` — zero-copy fast path; buffer/array is used directly.
 * - `string`  — hex string, optionally prefixed with `\x` (PostgreSQL protocol).
 * - `null | undefined` — safe no-ops; returns null / [].
 */
export type EwkbInput = Buffer | Uint8Array | string | null | undefined;
//# sourceMappingURL=types.d.ts.map