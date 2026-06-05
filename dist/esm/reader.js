/**
 * Low-level, endianness-aware Buffer read helpers.
 *
 * ---
 * Architecture rationale
 * ---
 *
 * All reads are delegated directly to the native `Buffer` methods
 * (`readUInt32LE`, `readUInt32BE`, `readDoubleLE`, `readDoubleBE`).
 * These are C++ builtins that map to a single memory read + potential
 * byte-swap, with no JavaScript overhead between the call and the result.
 *
 * We intentionally do NOT implement manual bit-shifting alternatives.
 * While bitwise ops in JS are sometimes used for micro-optimisation,
 * V8's optimising compiler (TurboFan) already inlines Buffer read
 * methods and issues the equivalent machine instruction. Manual bit ops
 * add code complexity for no throughput gain.
 *
 * **Bounds checking**
 * Node.js Buffer methods throw `RangeError` when reads exceed `buf.length`.
 * Our callers perform a single up-front length assertion before entering
 * a parse path, so individual reads inside a validated path should never
 * throw in practice. However, we provide a safe wrapper
 * (`safeguardedRead`) for the external boundary where the caller cannot
 * guarantee the buffer was fully validated — specifically the coordinate
 * loop, where `numPoints` is encoded in the payload and could be spoofed
 * by a truncated or malformed buffer.
 *
 * @internal
 */
/**
 * Reads a uint32 from `buf` at `offset` in little-endian or big-endian byte
 * order depending on `littleEndian`.
 *
 * No bounds checking — callers must validate `buf.length >= offset + 4`.
 */
export function readUint32(buf, offset, littleEndian) {
    return littleEndian
        ? buf.readUInt32LE(offset)
        : buf.readUInt32BE(offset);
}
/**
 * Reads a float64 from `buf` at `offset` in little-endian or big-endian byte
 * order depending on `littleEndian`.
 *
 * No bounds checking — callers must validate `buf.length >= offset + 8`.
 */
export function readFloat64(buf, offset, littleEndian) {
    return littleEndian
        ? buf.readDoubleLE(offset)
        : buf.readDoubleBE(offset);
}
//# sourceMappingURL=reader.js.map