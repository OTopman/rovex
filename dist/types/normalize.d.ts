import type { EwkbInput } from './types.js';
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
export declare function normalise(input: EwkbInput): Buffer | null;
//# sourceMappingURL=normalize.d.ts.map