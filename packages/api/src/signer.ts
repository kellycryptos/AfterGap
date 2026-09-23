import * as crypto from 'crypto';
import { SignRequestOptions, SignedHeaders } from './types';

/**
 * ============================================================================
 * BINANCE WEB3 API SIGNER RULES
 * ============================================================================
 * 1. Base URL: https://web3.binance.com/build
 * 2. requestPath in prehash: MUST start with `/build` + raw query string.
 *    Example: `/build/api/v1/dex/market/rwa/search?keyword=NVDA`
 *    CRITICAL: Omitting `/build` is the #1 cause of `40102 Invalid signature`.
 * 3. X-OC-TIMESTAMP: Current UTC time in ISO 8601 format with milliseconds:
 *    e.g. `2026-09-21T17:33:00.000Z` (NOT a unix millisecond integer).
 * 4. Prehash string: `timestamp + METHOD + requestPath + body`
 *    - Concatenated directly with NO separators.
 *    - METHOD in UPPERCASE (e.g. GET, POST).
 *    - For GET/HEAD requests, body is empty string `""`.
 * 5. Signature: HMAC-SHA256 of prehash using secretKey, Base64-encoded.
 * 6. Headers:
 *    - X-OC-APIKEY: your API key
 *    - X-OC-TIMESTAMP: exact timestamp string used in prehash
 *    - X-OC-SIGN: Base64-encoded signature
 *    - X-OC-RECV-WINDOW: optional window in ms (default 5000)
 * ============================================================================
 */

export const BASE_URL = 'https://web3.binance.com/build';

/**
 * Normalizes request path to ensure it has the mandatory `/build` prefix for signing
 */
export function normalizeRequestPath(pathWithQuery: string): string {
  // If the path already starts with /build/, keep as is
  if (pathWithQuery.startsWith('/build/')) {
    return pathWithQuery;
  }
  // If it starts with /build without trailing slash, fix
  if (pathWithQuery === '/build') {
    return '/build';
  }
  // Ensure leading slash
  const cleanPath = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`;
  return `/build${cleanPath}`;
}

/**
 * Generates ISO 8601 UTC timestamp with milliseconds (e.g. 2026-09-21T17:33:00.000Z)
 */
export function getIsoTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Computes pre-hash string: timestamp + METHOD + requestPath + body
 */
export function buildPreHash(
  timestamp: string,
  method: string,
  normalizedPathWithQuery: string,
  body: string = ''
): string {
  return `${timestamp}${method.toUpperCase()}${normalizedPathWithQuery}${body}`;
}

/**
 * Computes HMAC-SHA256 Base64 signature
 */
export function computeHmacSha256Base64(preHash: string, secretKey: string): string {
  return crypto.createHmac('sha256', secretKey).update(preHash).digest('base64');
}

/**
 * Signs an HTTP request for Binance Web3 API
 */
export function signRequest(
  options: SignRequestOptions,
  apiKey: string,
  secretKey: string
): { headers: SignedHeaders; preHash: string; requestPath: string; fullUrl: string } {
  const timestamp = options.timestamp || getIsoTimestamp();
  const method = options.method.toUpperCase();
  const normalizedPath = normalizeRequestPath(options.pathWithQuery);
  const body = options.body ?? (method === 'GET' || method === 'HEAD' ? '' : '');

  const preHash = buildPreHash(timestamp, method, normalizedPath, body);
  const signature = computeHmacSha256Base64(preHash, secretKey);

  const headers: SignedHeaders = {
    'X-OC-APIKEY': apiKey,
    'X-OC-TIMESTAMP': timestamp,
    'X-OC-SIGN': signature,
    'Content-Type': 'application/json',
  };

  const recvWindow = options.recvWindow || 30000;
  headers['X-OC-RECV-WINDOW'] = String(recvWindow);
  if (options.nonce) {
    headers['X-OC-NONCE'] = options.nonce;
  }

  const fullUrl = `https://web3.binance.com${normalizedPath}`;

  return {
    headers,
    preHash,
    requestPath: normalizedPath,
    fullUrl,
  };
}
