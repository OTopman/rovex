# rovex

> Zero-dependency, ultra-high-performance PostGIS EWKB decoder for Node.js and modern JS environments.  
> Optimised for Prisma query extension pipelines, high-throughput systems, and edge runtimes. Supports 2D, 3D, and 4D coordinate dimensions.

[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-blue)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Zero dependencies](https://img.shields.io/badge/dependencies-zero-success)](package.json)

---

## Features

- **Extreme Performance**: Decodes Points at up to **8.9M+ ops/sec** and LineStrings at **1.9M+ ops/sec**.
- **Dimension Support**: Handles **2D (XY)**, **3D (XYZ, XYM)**, and **4D (XYZM)** geographic coordinate combinations.
- **Extended Geometries**: Full parsing support for `Point`, `LineString`, `Polygon`, `MultiPoint`, `MultiLineString`, and `MultiPolygon`.
- **Zero-Allocation JIT Optimization**: Features a custom packed bitfield header parser to completely eliminate internal object allocations during hot-path decoding.
- **Interoperability**: Natively supports `Buffer`, generic `Uint8Array`, standard hexadecimal strings, and PostgreSQL wire protocol (`\x`-prefixed) hex strings.
- **Strict Node.js / ESM Compatibility**: Ship pre-compiled CommonJS and ESM packages out-of-the-box with complete type declarations.

---

## Installation

```bash
npm install rovex
```

---

## Quick Start

```typescript
import { SpatialDecoder } from 'rovex';

// 1. Generic Auto-Routing Decoder
// Inspects the EWKB type headers and routes to the correct geometry parser automatically
const geometry = SpatialDecoder.decode('\x0101000020e61000008956934cf3c3024021133af93e6d4840');
// → { lng: 2.3456789, lat: 48.8534843 }

// 2. Decode 3D XYZ Geometries
const coord3D = SpatialDecoder.decodePoint('01010000a0e61000008956934cf3c3024021133af93e6d48400000000000000000');
// → { lng: 2.3456789, lat: 48.8534843, z: 0 }

// 3. Binary inputs (natively accepts Buffer & standard Uint8Array)
const u8 = new Uint8Array([1, 1, 0, 0, 32, 230, 16, 0, 0, ...]);
const point = SpatialDecoder.decodePoint(u8);
```

---

## API Reference

### `SpatialDecoder.decode(input)`
Inspects the EWKB type header and returns the parsed JS representation:
- **Point** -> `Coordinate | null`
- **LineString** -> `Coordinate[]`
- **Polygon** -> `Coordinate[][]` (Outer ring first, followed by holes)
- **MultiPoint** -> `Coordinate[]`
- **MultiLineString** -> `Coordinate[][]`
- **MultiPolygon** -> `Coordinate[][][]`

```typescript
function decode(input: EwkbInput): any
```

---

### `SpatialDecoder.decodePoint(input)`
Decodes a PostGIS EWKB Point (SRID 4326) into a single coordinate.

```typescript
function decodePoint(input: EwkbInput): Coordinate | null
```

---

### `SpatialDecoder.decodeLineString(input)`
Decodes a PostGIS EWKB LineString (SRID 4326) into an array of coordinates.

```typescript
function decodeLineString(input: EwkbInput): Coordinate[]
```

---

### `SpatialDecoder.decodePolygon(input)`
Decodes a PostGIS EWKB Polygon (SRID 4326) into an array of linear rings.

```typescript
function decodePolygon(input: EwkbInput): Coordinate[][]
```

---

### Types

```typescript
/** WGS 84 geographic coordinate (supporting 2D, 3D, 4D configurations). */
export interface Coordinate {
  readonly lng: number;   // Easting / Longitude
  readonly lat: number;   // Northing / Latitude
  readonly z?: number;    // Optional elevation value (XYZ / XYZM)
  readonly m?: number;    // Optional measure value (XYM / XYZM)
}

/** Binary and string input formats accepted by the decoder. */
export type EwkbInput = Buffer | Uint8Array | string | null | undefined;
```

---

## Performance & Architecture

`rovex` is designed for ultra-low latency pipelines where garbage collection overhead is critical:
- **Zero-Allocation Header Parsing**: Geometry type flags, SRID indicators, byte-order, and Z/M presence are packed into a single 32-bit integer, eliminating the creation of temporary header metadata objects.
- **Fixed V8 Shape literal constructors**: Coordinate objects are returned via monomorphic literal paths, matching optimization targets in the V8 engine and allowing compiled code in client applications to avoid slow property read lookups.
- **Array Pre-Allocation**: Multi-point arrays are pre-allocated with known bounds upfront, preventing internal array resizes.

---

## Testing

```bash
npm test              # Run vitest suite
npm run test:coverage # Generate test coverage
```

---

## License

MIT
