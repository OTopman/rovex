/**
 * rovex — comprehensive test suite
 *
 * Coverage targets:
 *   - Valid Point decoding (LE, BE, Buffer, hex, pg-hex)
 *   - Valid LineString decoding (LE, BE, Buffer, hex, pg-hex)
 *   - 3D/4D (XYZ, XYM, XYZM) coordinate shapes (Point & LineString)
 *   - Polygon (2D, 3D, 4D, multiple rings)
 *   - MultiPoint, MultiLineString, MultiPolygon collection structures
 *   - Uint8Array direct binary inputs
 *   - Generic decode() auto-router
 *   - All invalid / edge-case input forms
 *   - Truncated and corrupted payloads
 *   - Concurrency and regression cases
 */

import { describe, expect, it } from 'vitest';
import { SpatialDecoder } from '../src/index.js';
import {
  BAD_BYTE_ORDER,
  LS_1PT_LE,
  LS_3PT_BE,
  LS_3PT_LE,
  NO_SRID_FLAG,
  POINT_BE_4326,
  POINT_LAGOS_LE,
  POINT_LE_4326,
  POINT_LE_WRONG_SRID,
  POINT_PARIS_X,
  POINT_PARIS_Y,
  WRONG_TYPE,
  buildLargeLineString,
  buildLineStringBuffer,
  buildPointBuffer,
  buildPointBuffer3D4D,
  buildLineStringBuffer3D4D,
  buildPolygonBuffer,
  buildMultiPointBuffer,
  buildMultiLineStringBuffer,
  buildMultiPolygonBuffer,
} from './fixtures.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FLOAT_PRECISION = 10;

function hex(h: string): Buffer {
  return Buffer.from(h, 'hex');
}

function pgHex(h: string): string {
  return `\\x${h}`;
}

// ---------------------------------------------------------------------------
// SpatialDecoder.decodePoint
// ---------------------------------------------------------------------------

describe('SpatialDecoder.decodePoint', () => {
  describe('valid inputs', () => {
    it('decodes a little-endian Point from a hex string', () => {
      const coord = SpatialDecoder.decodePoint(POINT_LE_4326);
      expect(coord).not.toBeNull();
      expect(coord!.lng).toBeCloseTo(POINT_PARIS_X, FLOAT_PRECISION);
      expect(coord!.lat).toBeCloseTo(POINT_PARIS_Y, FLOAT_PRECISION);
    });

    it('decodes a big-endian Point from a hex string', () => {
      const coord = SpatialDecoder.decodePoint(POINT_BE_4326);
      expect(coord).not.toBeNull();
      expect(coord!.lng).toBeCloseTo(POINT_PARIS_X, FLOAT_PRECISION);
      expect(coord!.lat).toBeCloseTo(POINT_PARIS_Y, FLOAT_PRECISION);
    });

    it('decodes from a Buffer (little-endian)', () => {
      const buf = hex(POINT_LE_4326);
      const coord = SpatialDecoder.decodePoint(buf);
      expect(coord).not.toBeNull();
      expect(coord!.lng).toBeCloseTo(POINT_PARIS_X, FLOAT_PRECISION);
      expect(coord!.lat).toBeCloseTo(POINT_PARIS_Y, FLOAT_PRECISION);
    });

    it('decodes from a Buffer (big-endian)', () => {
      const buf = hex(POINT_BE_4326);
      const coord = SpatialDecoder.decodePoint(buf);
      expect(coord).not.toBeNull();
      expect(coord!.lng).toBeCloseTo(POINT_PARIS_X, FLOAT_PRECISION);
      expect(coord!.lat).toBeCloseTo(POINT_PARIS_Y, FLOAT_PRECISION);
    });

    it('decodes from a PostgreSQL \\x-prefixed hex string', () => {
      const coord = SpatialDecoder.decodePoint(pgHex(POINT_LE_4326));
      expect(coord).not.toBeNull();
      expect(coord!.lng).toBeCloseTo(POINT_PARIS_X, FLOAT_PRECISION);
      expect(coord!.lat).toBeCloseTo(POINT_PARIS_Y, FLOAT_PRECISION);
    });

    it('decodes Lagos coordinates correctly', () => {
      const coord = SpatialDecoder.decodePoint(POINT_LAGOS_LE);
      expect(coord).not.toBeNull();
      expect(coord!.lng).toBeCloseTo(3.3792, 4);
      expect(coord!.lat).toBeCloseTo(6.5244, 4);
    });

    it('returns correct field names (lng, lat)', () => {
      const coord = SpatialDecoder.decodePoint(POINT_LE_4326);
      expect(coord).toHaveProperty('lng');
      expect(coord).toHaveProperty('lat');
    });

    it('returns exact coordinate values for known inputs', () => {
      const buf = buildPointBuffer(10.0, 20.0, 4326, true);
      const coord = SpatialDecoder.decodePoint(buf);
      expect(coord).not.toBeNull();
      expect(coord!.lng).toBe(10.0);
      expect(coord!.lat).toBe(20.0);
    });

    it('correctly decodes negative longitude (West)', () => {
      const buf = buildPointBuffer(-73.9857, 40.7484, 4326, true);
      const coord = SpatialDecoder.decodePoint(buf);
      expect(coord).not.toBeNull();
      expect(coord!.lng).toBeCloseTo(-73.9857, 4);
      expect(coord!.lat).toBeCloseTo(40.7484, 4);
    });

    it('correctly decodes negative latitude (South)', () => {
      const buf = buildPointBuffer(18.4241, -33.9249, 4326, true);
      const coord = SpatialDecoder.decodePoint(buf);
      expect(coord).not.toBeNull();
      expect(coord!.lng).toBeCloseTo(18.4241, 4);
      expect(coord!.lat).toBeCloseTo(-33.9249, 4);
    });

    it('decodes the origin (0, 0) correctly', () => {
      const buf = buildPointBuffer(0.0, 0.0, 4326, true);
      const coord = SpatialDecoder.decodePoint(buf);
      expect(coord).not.toBeNull();
      expect(coord!.lng).toBe(0.0);
      expect(coord!.lat).toBe(0.0);
    });

    it('decodes boundary coordinate values (±180, ±90)', () => {
      const buf = buildPointBuffer(180.0, 90.0, 4326, true);
      const coord = SpatialDecoder.decodePoint(buf);
      expect(coord).not.toBeNull();
      expect(coord!.lng).toBe(180.0);
      expect(coord!.lat).toBe(90.0);
    });

    it('decodes negative boundary coordinate values (−180, −90)', () => {
      const buf = buildPointBuffer(-180.0, -90.0, 4326, true);
      const coord = SpatialDecoder.decodePoint(buf);
      expect(coord).not.toBeNull();
      expect(coord!.lng).toBe(-180.0);
      expect(coord!.lat).toBe(-90.0);
    });

    it('LE and BE decode the same coordinates identically', () => {
      const x = 12.4924;
      const y = 41.8902;
      const leCoord = SpatialDecoder.decodePoint(buildPointBuffer(x, y, 4326, true));
      const beCoord = SpatialDecoder.decodePoint(buildPointBuffer(x, y, 4326, false));
      expect(leCoord).not.toBeNull();
      expect(beCoord).not.toBeNull();
      expect(leCoord!.lng).toBeCloseTo(beCoord!.lng, FLOAT_PRECISION);
      expect(leCoord!.lat).toBeCloseTo(beCoord!.lat, FLOAT_PRECISION);
    });
  });

  describe('null / undefined / empty inputs', () => {
    it('returns null for null input', () => {
      expect(SpatialDecoder.decodePoint(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(SpatialDecoder.decodePoint(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(SpatialDecoder.decodePoint('')).toBeNull();
    });

    it('returns null for \\x-only string (empty hex body)', () => {
      expect(SpatialDecoder.decodePoint('\\x')).toBeNull();
    });

    it('returns null for empty Buffer', () => {
      expect(SpatialDecoder.decodePoint(Buffer.alloc(0))).toBeNull();
    });
  });

  describe('invalid and malformed inputs', () => {
    it('returns null for an invalid byte-order marker', () => {
      expect(SpatialDecoder.decodePoint(BAD_BYTE_ORDER)).toBeNull();
    });

    it('returns null for a payload without SRID flag', () => {
      expect(SpatialDecoder.decodePoint(NO_SRID_FLAG)).toBeNull();
    });

    it('returns null for a wrong SRID (32632)', () => {
      expect(SpatialDecoder.decodePoint(POINT_LE_WRONG_SRID)).toBeNull();
    });

    it('returns null when geometry type is LineString', () => {
      expect(SpatialDecoder.decodePoint(LS_3PT_LE)).toBeNull();
    });

    it('returns null when geometry type is Polygon', () => {
      expect(SpatialDecoder.decodePoint(WRONG_TYPE)).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// SpatialDecoder.decodeLineString
// ---------------------------------------------------------------------------

describe('SpatialDecoder.decodeLineString', () => {
  describe('valid inputs', () => {
    it('decodes a 3-point LE LineString from a hex string', () => {
      const coords = SpatialDecoder.decodeLineString(LS_3PT_LE);
      expect(coords).toHaveLength(3);
      expect(coords[0]).toEqual({ lng: 0, lat: 0 });
      expect(coords[1]).toEqual({ lng: 1, lat: 1 });
      expect(coords[2]).toEqual({ lng: 2, lat: 2 });
    });

    it('decodes a 3-point BE LineString from a hex string', () => {
      const coords = SpatialDecoder.decodeLineString(LS_3PT_BE);
      expect(coords).toHaveLength(3);
      expect(coords[0]).toEqual({ lng: 0, lat: 0 });
      expect(coords[1]).toEqual({ lng: 1, lat: 1 });
      expect(coords[2]).toEqual({ lng: 2, lat: 2 });
    });

    it('decodes a single-point degenerate LineString', () => {
      const coords = SpatialDecoder.decodeLineString(LS_1PT_LE);
      expect(coords).toHaveLength(1);
      expect(coords[0]!.lng).toBeCloseTo(5.5, 4);
      expect(coords[0]!.lat).toBeCloseTo(6.6, 4);
    });

    it('preserves coordinate order', () => {
      const input: Array<[number, number]> = [
        [1.0, 2.0],
        [3.0, 4.0],
        [5.0, 6.0],
        [7.0, 8.0],
      ];
      const buf = buildLineStringBuffer(input, 4326, true);
      const coords = SpatialDecoder.decodeLineString(buf);
      expect(coords).toHaveLength(4);
      input.forEach(([x, y], i) => {
        expect(coords[i]!.lng).toBe(x);
        expect(coords[i]!.lat).toBe(y);
      });
    });

    it('decodes a large 100-point LineString without error', () => {
      const buf = buildLargeLineString(100);
      const coords = SpatialDecoder.decodeLineString(buf);
      expect(coords).toHaveLength(100);
      expect(coords[0]!.lng).toBe(0);
      expect(coords[0]!.lat).toBe(0);
      expect(coords[99]!.lng).toBeCloseTo(0.99, 5);
      expect(coords[99]!.lat).toBeCloseTo(0.495, 5);
    });
  });

  describe('null / undefined / empty inputs', () => {
    it('returns [] for null', () => {
      expect(SpatialDecoder.decodeLineString(null)).toEqual([]);
    });

    it('returns [] for empty Buffer', () => {
      expect(SpatialDecoder.decodeLineString(Buffer.alloc(0))).toEqual([]);
    });
  });

  describe('invalid and malformed inputs', () => {
    it('returns [] for invalid byte-order marker', () => {
      expect(SpatialDecoder.decodeLineString(BAD_BYTE_ORDER)).toEqual([]);
    });

    it('returns [] for wrong SRID (32632)', () => {
      const buf = buildLineStringBuffer([[0, 0], [1, 1]], 32632, true);
      expect(SpatialDecoder.decodeLineString(buf)).toEqual([]);
    });

    it('returns [] when geometry type is Point', () => {
      expect(SpatialDecoder.decodeLineString(POINT_LE_4326)).toEqual([]);
    });
  });

  describe('truncated payloads', () => {
    it('returns [] for a buffer shorter than the header (< 13 bytes)', () => {
      const full = hex(LS_3PT_LE);
      for (let len = 0; len < 13; len++) {
        expect(SpatialDecoder.decodeLineString(full.subarray(0, len))).toEqual([]);
      }
    });

    it('returns [] when buffer has header but is missing coordinate data', () => {
      const full = hex(LS_3PT_LE);
      const truncated = full.subarray(0, 30);
      expect(SpatialDecoder.decodeLineString(truncated)).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// 3D/4D Coordinate Extraction Assertions
// ---------------------------------------------------------------------------

describe('3D/4D coordinate decoding logic', () => {
  describe('Point 3D/4D formats', () => {
    it('decodes XYZ (3D) point and retains the z property', () => {
      const buf = buildPointBuffer3D4D({ lng: 1.1, lat: 2.2, z: 3.3 }, 4326, true, true, false);
      const coord = SpatialDecoder.decodePoint(buf);
      expect(coord).not.toBeNull();
      expect(coord!.lng).toBeCloseTo(1.1, 5);
      expect(coord!.lat).toBeCloseTo(2.2, 5);
      expect(coord!.z).toBeCloseTo(3.3, 5);
      expect(coord!.m).toBeUndefined();
    });

    it('decodes XYM (3D) point and retains the m property', () => {
      const buf = buildPointBuffer3D4D({ lng: 1.1, lat: 2.2, m: 4.4 }, 4326, true, false, true);
      const coord = SpatialDecoder.decodePoint(buf);
      expect(coord).not.toBeNull();
      expect(coord!.lng).toBeCloseTo(1.1, 5);
      expect(coord!.lat).toBeCloseTo(2.2, 5);
      expect(coord!.z).toBeUndefined();
      expect(coord!.m).toBeCloseTo(4.4, 5);
    });

    it('decodes XYZM (4D) point and retains both z and m properties', () => {
      const buf = buildPointBuffer3D4D({ lng: 1.1, lat: 2.2, z: 3.3, m: 4.4 }, 4326, true, true, true);
      const coord = SpatialDecoder.decodePoint(buf);
      expect(coord).not.toBeNull();
      expect(coord!.lng).toBeCloseTo(1.1, 5);
      expect(coord!.lat).toBeCloseTo(2.2, 5);
      expect(coord!.z).toBeCloseTo(3.3, 5);
      expect(coord!.m).toBeCloseTo(4.4, 5);
    });

    it('XYZM point decoding respects big-endian encoding', () => {
      const buf = buildPointBuffer3D4D({ lng: 10.5, lat: 20.5, z: 30.5, m: 40.5 }, 4326, false, true, true);
      const coord = SpatialDecoder.decodePoint(buf);
      expect(coord).not.toBeNull();
      expect(coord!.lng).toBe(10.5);
      expect(coord!.lat).toBe(20.5);
      expect(coord!.z).toBe(30.5);
      expect(coord!.m).toBe(40.5);
    });
  });

  describe('LineString 3D/4D formats', () => {
    it('decodes 3D XYZ LineString with dynamic stride preventing corruption', () => {
      const input = [
        { lng: 1.0, lat: 2.0, z: 10.0 },
        { lng: 3.0, lat: 4.0, z: 20.0 },
        { lng: 5.0, lat: 6.0, z: 30.0 },
      ];
      const buf = buildLineStringBuffer3D4D(input, 4326, true, true, false);
      const coords = SpatialDecoder.decodeLineString(buf);
      expect(coords).toHaveLength(3);
      expect(coords[0]).toEqual({ lng: 1, lat: 2, z: 10 });
      expect(coords[1]).toEqual({ lng: 3, lat: 4, z: 20 });
      expect(coords[2]).toEqual({ lng: 5, lat: 6, z: 30 });
    });

    it('decodes 4D XYZM LineString correctly', () => {
      const input = [
        { lng: 1.0, lat: 2.0, z: 10.0, m: 100.0 },
        { lng: 3.0, lat: 4.0, z: 20.0, m: 200.0 },
      ];
      const buf = buildLineStringBuffer3D4D(input, 4326, true, true, true);
      const coords = SpatialDecoder.decodeLineString(buf);
      expect(coords).toHaveLength(2);
      expect(coords[0]).toEqual({ lng: 1, lat: 2, z: 10, m: 100 });
      expect(coords[1]).toEqual({ lng: 3, lat: 4, z: 20, m: 200 });
    });
  });
});

// ---------------------------------------------------------------------------
// Polygon and Collection Decoders
// ---------------------------------------------------------------------------

describe('Polygon & Collections', () => {
  describe('Polygon decoding', () => {
    it('decodes a 2D Polygon with single exterior ring', () => {
      const rings = [
        [{ lng: 0, lat: 0 }, { lng: 10, lat: 0 }, { lng: 10, lat: 10 }, { lng: 0, lat: 10 }, { lng: 0, lat: 0 }],
      ];
      const buf = buildPolygonBuffer(rings, 4326, true, false, false);
      const result = SpatialDecoder.decodePolygon(buf);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(5);
      expect(result[0]![0]).toEqual({ lng: 0, lat: 0 });
      expect(result[0]![2]).toEqual({ lng: 10, lat: 10 });
    });

    it('decodes a 3D Polygon with multiple rings (exterior and interior hole)', () => {
      const rings = [
        // Exterior ring
        [{ lng: 0, lat: 0, z: 5 }, { lng: 10, lat: 0, z: 5 }, { lng: 10, lat: 10, z: 5 }, { lng: 0, lat: 10, z: 5 }, { lng: 0, lat: 0, z: 5 }],
        // Interior ring (hole)
        [{ lng: 2, lat: 2, z: 5 }, { lng: 8, lat: 2, z: 5 }, { lng: 8, lat: 8, z: 5 }, { lng: 2, lat: 8, z: 5 }, { lng: 2, lat: 2, z: 5 }],
      ];
      const buf = buildPolygonBuffer(rings, 4326, true, true, false);
      const result = SpatialDecoder.decodePolygon(buf);
      expect(result).toHaveLength(2);
      expect(result[0]![0]).toEqual({ lng: 0, lat: 0, z: 5 });
      expect(result[1]![0]).toEqual({ lng: 2, lat: 2, z: 5 });
    });
  });

  describe('MultiPoint decoding', () => {
    it('decodes a 4D MultiPoint successfully', () => {
      const pts = [
        { lng: 1.5, lat: 2.5, z: 3.5, m: 4.5 },
        { lng: 5.5, lat: 6.5, z: 7.5, m: 8.5 },
      ];
      const buf = buildMultiPointBuffer(pts, 4326, true, true, true);
      const result = SpatialDecoder.decodeMultiPoint(buf);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ lng: 1.5, lat: 2.5, z: 3.5, m: 4.5 });
      expect(result[1]).toEqual({ lng: 5.5, lat: 6.5, z: 7.5, m: 8.5 });
    });
  });

  describe('MultiLineString decoding', () => {
    it('decodes a MultiLineString with 3D coordinate properties', () => {
      const lines = [
        [{ lng: 0, lat: 0, z: 1 }, { lng: 1, lat: 1, z: 2 }],
        [{ lng: 2, lat: 2, z: 3 }, { lng: 3, lat: 3, z: 4 }],
      ];
      const buf = buildMultiLineStringBuffer(lines, 4326, true, true, false);
      const result = SpatialDecoder.decodeMultiLineString(buf);
      expect(result).toHaveLength(2);
      expect(result[0]![0]).toEqual({ lng: 0, lat: 0, z: 1 });
      expect(result[1]![1]).toEqual({ lng: 3, lat: 3, z: 4 });
    });
  });

  describe('MultiPolygon decoding', () => {
    it('decodes a MultiPolygon successfully', () => {
      const polygons = [
        [
          [{ lng: 0, lat: 0 }, { lng: 1, lat: 0 }, { lng: 1, lat: 1 }, { lng: 0, lat: 1 }, { lng: 0, lat: 0 }],
        ],
        [
          [{ lng: 2, lat: 2 }, { lng: 3, lat: 2 }, { lng: 3, lat: 3 }, { lng: 2, lat: 3 }, { lng: 2, lat: 2 }],
        ],
      ];
      const buf = buildMultiPolygonBuffer(polygons, 4326, true, false, false);
      const result = SpatialDecoder.decodeMultiPolygon(buf);
      expect(result).toHaveLength(2);
      expect(result[0]![0]![0]).toEqual({ lng: 0, lat: 0 });
      expect(result[1]![0]![2]).toEqual({ lng: 3, lat: 3 });
    });
  });
});

// ---------------------------------------------------------------------------
// Uint8Array Support
// ---------------------------------------------------------------------------

describe('Uint8Array inputs', () => {
  it('decodes Point from standard Uint8Array input', () => {
    const rawBuf = hex(POINT_LE_4326);
    const u8 = new Uint8Array(rawBuf.buffer, rawBuf.byteOffset, rawBuf.byteLength);
    const coord = SpatialDecoder.decodePoint(u8);
    expect(coord).not.toBeNull();
    expect(coord!.lng).toBeCloseTo(POINT_PARIS_X, FLOAT_PRECISION);
  });

  it('decodes LineString from standard Uint8Array input', () => {
    const rawBuf = hex(LS_3PT_LE);
    const u8 = new Uint8Array(rawBuf.buffer, rawBuf.byteOffset, rawBuf.byteLength);
    const coords = SpatialDecoder.decodeLineString(u8);
    expect(coords).toHaveLength(3);
    expect(coords[0]).toEqual({ lng: 0, lat: 0 });
  });
});

// ---------------------------------------------------------------------------
// Generic decode Auto-Router
// ---------------------------------------------------------------------------

describe('SpatialDecoder.decode router', () => {
  it('correctly routes Point geometry', () => {
    const result = SpatialDecoder.decode(POINT_LE_4326);
    expect(result).toHaveProperty('lng');
    expect(result).toHaveProperty('lat');
    expect(result.z).toBeUndefined();
  });

  it('correctly routes LineString geometry', () => {
    const result = SpatialDecoder.decode(LS_3PT_LE);
    expect(result).toBeInstanceOf(Array);
    expect(result).toHaveLength(3);
  });

  it('correctly routes Polygon geometry', () => {
    const rings = [
      [{ lng: 0, lat: 0 }, { lng: 1, lat: 0 }, { lng: 1, lat: 1 }, { lng: 0, lat: 0 }],
    ];
    const buf = buildPolygonBuffer(rings, 4326, true, false, false);
    const result = SpatialDecoder.decode(buf);
    expect(result).toHaveLength(1);
    expect(result[0]![0]).toEqual({ lng: 0, lat: 0 });
  });

  it('returns null on invalid geometry type or bad headers', () => {
    expect(SpatialDecoder.decode(BAD_BYTE_ORDER)).toBeNull();
    expect(SpatialDecoder.decode('invalid_hex')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Concurrency / Repeated call stability
// ---------------------------------------------------------------------------

describe('concurrency and repeated calls', () => {
  it('produces identical results when called 10,000 times on the same input', () => {
    const buf = hex(POINT_LE_4326);
    const first = SpatialDecoder.decodePoint(buf);
    for (let i = 0; i < 10_000; i++) {
      const coord = SpatialDecoder.decodePoint(buf);
      expect(coord).not.toBeNull();
      expect(coord!.lng).toBe(first!.lng);
      expect(coord!.lat).toBe(first!.lat);
    }
  });

  it('handles concurrent async decode calls without interference', async () => {
    const bufs = Array.from({ length: 100 }, (_, i) =>
      buildPointBuffer(i * 0.01, i * 0.005, 4326, true),
    );

    const results = await Promise.all(
      bufs.map(async (buf, i) => {
        await new Promise<void>((r) => setImmediate(r));
        const coord = SpatialDecoder.decodePoint(buf);
        return { i, coord };
      }),
    );

    for (const { i, coord } of results) {
      expect(coord).not.toBeNull();
      expect(coord!.lng).toBeCloseTo(i * 0.01, 5);
      expect(coord!.lat).toBeCloseTo(i * 0.005, 5);
    }
  });
});

// ---------------------------------------------------------------------------
// Regression: Buffer subarray (shared backing store)
// ---------------------------------------------------------------------------

describe('regression: shared Buffer backing store', () => {
  it('correctly decodes from a Buffer.subarray (shared memory region)', () => {
    const full = Buffer.alloc(100);
    const pointData = hex(POINT_LE_4326);
    pointData.copy(full, 10);
    const sub = full.subarray(10, 35);
    const coord = SpatialDecoder.decodePoint(sub);
    expect(coord).not.toBeNull();
    expect(coord!.lng).toBeCloseTo(POINT_PARIS_X, FLOAT_PRECISION);
    expect(coord!.lat).toBeCloseTo(POINT_PARIS_Y, FLOAT_PRECISION);
  });
});
