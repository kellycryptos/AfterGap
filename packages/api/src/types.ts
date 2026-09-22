/**
 * RWA Data API types for Binance Web3 Wallet
 */

export interface BinanceApiResponse<T> {
  code: string | number;
  message?: string;
  data: T;
}

export interface RwaPlatform {
  platformId: string;
  platformName?: string;
  name?: string;
  description?: string;
  website?: string;
  iconUrl?: string;
  chains?: Array<{
    chainId?: string | number;
    chainName?: string;
    binanceChainId?: string | number;
  }>;
  [key: string]: unknown;
}

export interface RwaPlatformsResponse {
  platforms?: RwaPlatform[];
  list?: RwaPlatform[];
  [key: string]: unknown;
}

export interface RwaTokenItem {
  contractAddress: string;
  tokenAddress?: string;
  tokenSymbol: string;
  tokenName?: string;
  decimals?: number;
  binanceChainId: string | number;
  chainId?: string | number;
  platformId: string; // 'bstock' | 'ondo' | etc.
  price?: string | number;
  referencePrice?: string | number;
  marketStatus?: 'premarket' | 'regular' | 'postmarket' | 'overnight' | 'closed' | 'pause' | string;
  reasonCode?: string;
  underlyingAssetSymbol?: string;
  underlyingAssetName?: string;
  issuer?: string;
  iconUrl?: string;
  [key: string]: unknown;
}

export interface RwaSearchResponse {
  tokens?: RwaTokenItem[];
  list?: RwaTokenItem[];
  [key: string]: unknown;
}

export interface RwaTokensResponse {
  tokens?: RwaTokenItem[];
  list?: RwaTokenItem[];
  total?: number;
  page?: number;
  pageSize?: number;
  [key: string]: unknown;
}

export interface SignRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | string;
  pathWithQuery: string; // e.g. '/api/v1/dex/market/rwa/platforms' or with query params
  body?: string;
  timestamp?: string; // ISO 8601 with ms, e.g. '2026-09-21T17:33:00.000Z'
  recvWindow?: number;
  nonce?: string;
}

export interface SignedHeaders {
  'X-OC-APIKEY': string;
  'X-OC-TIMESTAMP': string;
  'X-OC-SIGN': string;
  'X-OC-RECV-WINDOW'?: string;
  'X-OC-NONCE'?: string;
  'Content-Type': string;
}

export interface ClientConfig {
  apiKey?: string;
  secretKey?: string;
  baseUrl?: string; // defaults to 'https://web3.binance.com/build'
  recvWindow?: number;
}
