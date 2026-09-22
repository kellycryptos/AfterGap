import assert from 'assert';
import {
  signRequest,
  normalizeRequestPath,
  buildPreHash,
  computeHmacSha256Base64,
  getIsoTimestamp,
} from './signer';

console.log('Running Binance Web3 signer verification tests...');

// 1. Check path normalization with /build prefix
const testPath1 = '/api/v1/dex/market/rwa/search?keyword=NVDA';
const normalized1 = normalizeRequestPath(testPath1);
assert.strictEqual(
  normalized1,
  '/build/api/v1/dex/market/rwa/search?keyword=NVDA',
  'Path must include /build prefix'
);

const testPath2 = '/build/api/v1/dex/market/rwa/platforms';
const normalized2 = normalizeRequestPath(testPath2);
assert.strictEqual(
  normalized2,
  '/build/api/v1/dex/market/rwa/platforms',
  'Already prefixed path should not duplicate /build'
);

// 2. Check ISO 8601 timestamp with milliseconds
const sampleTimestamp = getIsoTimestamp(new Date('2026-09-21T17:33:00.000Z'));
assert.strictEqual(
  sampleTimestamp,
  '2026-09-21T17:33:00.000Z',
  'Timestamp must match ISO 8601 with milliseconds'
);
assert.match(
  getIsoTimestamp(),
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
  'Timestamp must match ISO format'
);

// 3. Prehash construction (no separators, method uppercase, GET body empty)
const preHash = buildPreHash(
  '2026-09-21T17:33:00.000Z',
  'GET',
  '/build/api/v1/dex/market/rwa/platforms',
  ''
);
assert.strictEqual(
  preHash,
  '2026-09-21T17:33:00.000ZGET/build/api/v1/dex/market/rwa/platforms',
  'Prehash string format mismatch'
);

// 4. HMAC-SHA256 Base64 calculation
const testKey = 'test-secret-key-123';
const signature = computeHmacSha256Base64(preHash, testKey);
assert.strictEqual(typeof signature, 'string', 'Signature must be a string');
assert.ok(signature.length > 0, 'Signature must not be empty');

// Verify Base64 format
assert.match(signature, /^[A-Za-z0-9+/=]+$/, 'Signature must be valid Base64');

// 5. signRequest output
const signed = signRequest(
  {
    method: 'GET',
    pathWithQuery: '/api/v1/dex/market/rwa/tokens?binanceChainId=56',
    timestamp: '2026-09-21T17:33:00.000Z',
  },
  'test-api-key',
  testKey
);

assert.strictEqual(signed.headers['X-OC-APIKEY'], 'test-api-key');
assert.strictEqual(signed.headers['X-OC-TIMESTAMP'], '2026-09-21T17:33:00.000Z');
assert.ok(signed.headers['X-OC-SIGN']);
assert.strictEqual(
  signed.fullUrl,
  'https://web3.binance.com/build/api/v1/dex/market/rwa/tokens?binanceChainId=56'
);

console.log('[SIGNER TEST] All signer assertions passed: OK');
