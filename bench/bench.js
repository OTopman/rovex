/**
 * rovex — benchmark suite
 *
 * Run with:
 *   node --expose-gc bench/bench.js
 *
 * Measures:
 *   - Operations per second (ops/sec)
 *   - Average latency (ns/op)
 *   - Throughput variance
 *   - Memory allocation behaviour (via GC exposure)
 *
 * Methodology:
 *   1. JIT warmup: run each case 50,000 times to trigger TurboFan compilation
 *   2. GC: force a full GC before each measurement window
 *   3. Measurement: accumulate time over a minimum of 1 million operations
 *      or 2 seconds, whichever comes first
 *   4. Report: ops/sec, ns/op, and heap delta
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import from compiled output if available, else from source via ts-node
// For the benchmark we load the built CJS version for maximum performance
let SpatialDecoder;
try {
  const require = createRequire(import.meta.url);
  ({ SpatialDecoder } = require(join(__dirname, '../dist/cjs/index.js')));
} catch {
  // Fallback: run with tsx or ts-node
  console.warn('[bench] dist/cjs not found — run `npm run build` first for accurate results');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Test vectors
// ---------------------------------------------------------------------------

const SRID_FLAG = 0x20000000;

function makePointBuffer(x, y, le = true) {
  const buf = Buffer.alloc(25);
  buf.writeUInt8(le ? 1 : 0, 0);
  if (le) {
    buf.writeUInt32LE(1 | SRID_FLAG, 1);
    buf.writeUInt32LE(4326, 5);
    buf.writeDoubleLE(x, 9);
    buf.writeDoubleLE(y, 17);
  } else {
    buf.writeUInt32BE(1 | SRID_FLAG, 1);
    buf.writeUInt32BE(4326, 5);
    buf.writeDoubleBE(x, 9);
    buf.writeDoubleBE(y, 17);
  }
  return buf;
}

function makeLineStringBuffer(n, le = true) {
  const buf = Buffer.alloc(13 + n * 16);
  buf.writeUInt8(le ? 1 : 0, 0);
  if (le) {
    buf.writeUInt32LE(2 | SRID_FLAG, 1);
    buf.writeUInt32LE(4326, 5);
    buf.writeUInt32LE(n, 9);
    for (let i = 0; i < n; i++) {
      buf.writeDoubleLE(i * 0.01, 13 + i * 16);
      buf.writeDoubleLE(i * 0.005, 13 + i * 16 + 8);
    }
  } else {
    buf.writeUInt32BE(2 | SRID_FLAG, 1);
    buf.writeUInt32BE(4326, 5);
    buf.writeUInt32BE(n, 9);
    for (let i = 0; i < n; i++) {
      buf.writeDoubleBE(i * 0.01, 13 + i * 16);
      buf.writeDoubleBE(i * 0.005, 13 + i * 16 + 8);
    }
  }
  return buf;
}

const POINT_BUF = makePointBuffer(2.3456789, 48.8534843, true);
const POINT_HEX = POINT_BUF.toString('hex');
const POINT_PG_HEX = '\\x' + POINT_HEX;
const LS_10_BUF = makeLineStringBuffer(10, true);
const LS_10_HEX = LS_10_BUF.toString('hex');
const LS_100_BUF = makeLineStringBuffer(100, true);

// ---------------------------------------------------------------------------
// Benchmark runner
// ---------------------------------------------------------------------------

function gc() {
  if (typeof global.gc === 'function') {
    global.gc();
    global.gc(); // Double GC to compact heap
  }
}

function bench(name, fn, warmupIterations = 50_000, minIterations = 1_000_000, minDurationMs = 2_000) {
  // Warmup — triggers JIT compilation and IC stabilisation
  for (let i = 0; i < warmupIterations; i++) fn();

  gc();
  const heapBefore = process.memoryUsage().heapUsed;
  const startTime = process.hrtime.bigint();

  let iterations = 0;
  let elapsed = 0n;

  do {
    for (let i = 0; i < 10_000; i++) fn();
    iterations += 10_000;
    elapsed = process.hrtime.bigint() - startTime;
  } while (
    iterations < minIterations ||
    Number(elapsed) < minDurationMs * 1_000_000
  );

  gc();
  const heapAfter = process.memoryUsage().heapUsed;

  const durationMs = Number(elapsed) / 1_000_000;
  const opsPerSec = Math.round(iterations / (durationMs / 1000));
  const nsPerOp = Number(elapsed) / iterations;
  const heapDeltaKb = ((heapAfter - heapBefore) / 1024).toFixed(1);

  console.log(
    `  ${name.padEnd(42)} ${String(opsPerSec).padStart(12)} ops/sec  ${nsPerOp.toFixed(2).padStart(8)} ns/op  heap Δ ${heapDeltaKb} KB`,
  );

  return { name, opsPerSec, nsPerOp };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

console.log('\nrovex — benchmark\n');
console.log('Node.js:', process.version);
console.log('Platform:', process.platform, process.arch);
console.log('');
console.log(
  '  ' +
  'Case'.padEnd(42) +
  'ops/sec'.padStart(12) + '  ' +
  'ns/op'.padStart(8) + '  ' +
  'heap Δ',
);
console.log('  ' + '-'.repeat(80));

const results = [];

// Point — Buffer input
results.push(bench('decodePoint (Buffer, LE)', () => SpatialDecoder.decodePoint(POINT_BUF)));

// Point — hex string input
results.push(bench('decodePoint (hex string, LE)', () => SpatialDecoder.decodePoint(POINT_HEX)));

// Point — PostgreSQL \\x-prefixed hex input
results.push(bench('decodePoint (pg hex \\\\x, LE)', () => SpatialDecoder.decodePoint(POINT_PG_HEX)));

// Point — null input (fast-path rejection)
results.push(bench('decodePoint (null)', () => SpatialDecoder.decodePoint(null)));

// LineString — 10-point Buffer
results.push(bench('decodeLineString (Buffer, 10 pts)', () => SpatialDecoder.decodeLineString(LS_10_BUF)));

// LineString — 10-point hex string
results.push(bench('decodeLineString (hex, 10 pts)', () => SpatialDecoder.decodeLineString(LS_10_HEX)));

// LineString — 100-point Buffer
results.push(bench('decodeLineString (Buffer, 100 pts)', () => SpatialDecoder.decodeLineString(LS_100_BUF)));

// Invalid payload — fast rejection
results.push(bench('decodePoint (invalid hex)', () => SpatialDecoder.decodePoint('deadbeef')));

console.log('');

// Summary
const pointBufResult = results.find(r => r.name === 'decodePoint (Buffer, LE)');
const pointHexResult = results.find(r => r.name === 'decodePoint (hex string, LE)');

if (pointBufResult && pointHexResult) {
  const overhead = ((pointBufResult.opsPerSec - pointHexResult.opsPerSec) / pointBufResult.opsPerSec * 100).toFixed(1);
  console.log(`  Buffer vs hex string overhead: ${overhead}% (hex requires one Buffer allocation)`);
}

console.log('');
