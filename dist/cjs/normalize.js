"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalise = normalise;
const constants_js_1 = require("./constants.js");
/**
 * Normalises any accepted input form into a raw `Buffer` for downstream
 * parsing, or returns `null` when the input is provably unparseable.
 *
 * ---
 * Performance design decisions
 * ---
 *
 * **Buffer fast path (zero copy)**
 * When the caller already holds a `Buffer`, we return it unchanged.
 * `Buffer.isBuffer` is a single C++ type-tag check — O(1), branch-predictable.
 * No heap allocation, no data copy.
 *
 * **String paths (single allocation)**
 * `Buffer.from(hex, 'hex')` in Node.js performs the hex→bytes conversion
 * entirely in native C++ via WHATWG-compatible decoding. There is exactly
 * one heap allocation (the new Buffer) and no intermediate string is created.
 * Slicing with `String.prototype.slice` on the `\x` prefix path is O(1)
 * in V8 (SeqString slicing produces a SubString view, not a copy).
 *
 * **Null / undefined early exit**
 * Explicit null/undefined checks are placed first so the string branch
 * is never reached for those types. In a hot Prisma transform loop the
 * common case is a valid string or Buffer, so the null check is a very
 * rarely-taken branch — V8 will speculatively skip it.
 *
 * **Empty string early exit**
 * An empty string would produce an empty Buffer anyway, but we short-circuit
 * it here so the caller receives `null` directly and the type check below
 * confirms the returned Buffer is non-empty.
 *
 * @internal
 */
function normalise(input) {
    // Fastest rejection: null/undefined — common in ORM result sets
    if (input == null)
        return null;
    // Uint8Array / Buffer fast path — zero copy conversion if generic Uint8Array
    if (input instanceof Uint8Array) {
        if (input.length === 0)
            return null;
        return Buffer.isBuffer(input)
            ? input
            : Buffer.from(input.buffer, input.byteOffset, input.byteLength);
    }
    // String paths
    if (typeof input === 'string') {
        if (input.length === 0)
            return null;
        // PostgreSQL wire protocol prefix: '\x0101000020...'
        // String.slice is O(1) in V8 — produces a SubString view, no copy
        const hex = input.startsWith(constants_js_1.PG_HEX_PREFIX) ? input.slice(2) : input;
        if (hex.length === 0)
            return null;
        // Buffer.from(hex, 'hex') is the canonical single-allocation conversion.
        // Node.js silently ignores trailing odd nibbles; a zero-length result
        // means the hex string was entirely invalid characters.
        const buf = Buffer.from(hex, 'hex');
        return buf.length > 0 ? buf : null;
    }
    // Any other type (number, object, etc.) — reject
    return null;
}
//# sourceMappingURL=normalize.js.map