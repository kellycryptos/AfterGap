/**
 * Binance Web3 API types (Market RWA, Trading API, Transaction API, Wallet API)
 */

export interface BinanceApiResponse<T> {
  code: string | number;
  msg?: string;
  message?: string;
  data: T;
  timestamp?: number;
  success?: boolean;
}

export interface RwaPlatform {
  platformId: string;
  platformName?: string;
  name?: string;
  tickerCount?: number;
  chainDistribution?: Array<{
    binanceChainId: string | number;
    tokenCount: number;
  }>;
  website?: string;
  logoUrl?: string;
  iconUrl?: string;
  [key: string]: unknown;
}

export interface RwaPlatformsResponse extends Array<RwaPlatform> {}

export interface RwaTokenItem {
  contractAddress?: string;
  tokenContractAddress?: string;
  tokenAddress?: string;
  tokenSymbol: string;
  tokenName?: string;
  decimals?: string | number;
  binanceChainId: string | number;
  chainId?: string | number;
  platformId: string; // 'bstock' | 'ondo' | etc.
  price?: string | number;
  tokenPrice?: string | number;
  referencePrice?: string | number;
  marketStatus?: 'premarket' | 'regular' | 'postmarket' | 'overnight' | 'closed' | 'pause' | string;
  reasonCode?: string;
  statusInfo?: {
    openState?: boolean;
    marketStatus?: string | null;
    reasonCode?: string;
    reasonMsg?: string | null;
    nextOpenTime?: number | null;
    nextCloseTime?: number | null;
  };
  underlyingTicker?: string;
  underlyingName?: string;
  underlyingAssetSymbol?: string;
  underlyingAssetName?: string;
  issuer?: string;
  tokenLogoUrl?: string;
  iconUrl?: string;
  volume24H?: string;
  marketCap?: string;
  [key: string]: unknown;
}

export interface RwaSearchResponse {
  ticker?: string;
  companyName?: string;
  assets?: Array<{
    platformId: string;
    binanceChainId: string | number;
    tokenContractAddress: string;
    tokenSymbol: string;
    assetType?: number;
  }>;
  [key: string]: unknown;
}

export interface RwaTokensResponse extends Array<RwaTokenItem> {}

// --- Trading API Types ---

export interface TradingQuoteRequest {
  binanceChainId: string | number; // '56'
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string; // in smallest unit
  userWalletAddress?: string; // required for RFQ
  slippagePercent?: number | string; // e.g. 1
  autoSlippage?: boolean;
}

export interface QuoteRouteItem {
  quoteId: string;
  vendorName: string; // 'LiquidMesh', 'PcsXRfq', etc.
  executionMode: 'SWAP' | 'RFQ';
  binanceChainId: string;
  fromTokenAmount: string;
  toTokenAmount: string;
  tradeFee?: string;
  estimateGasFee?: string;
  priceImpactPercent?: string;
  router?: string;
  fromToken: {
    tokenContractAddress: string;
    tokenSymbol: string;
    tokenUnitPrice: string;
    decimal: string | number;
  };
  toToken: {
    tokenContractAddress: string;
    tokenSymbol: string;
    tokenUnitPrice: string;
    decimal: string | number;
  };
  approveTarget: string; // DEX spender
  isBest?: boolean;
  [key: string]: unknown;
}

export interface TradingQuoteResponse extends Array<QuoteRouteItem> {}

export interface TradingSwapRequest {
  quoteId: string;
  binanceChainId: string | number;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  userWalletAddress: string;
  slippagePercent?: number | string;
  autoSlippage?: boolean;
}

export interface SwapEvmTx {
  from: string;
  to: string;
  data: string;
  value: string;
  gas: string;
  gasPrice: string;
  maxPriorityFeePerGas?: string;
  minReceiveAmount?: string;
  slippagePercent?: string;
}

export interface SwapRfqData {
  orderId?: string;
  typedDataToSign?: unknown;
  vendorName?: string;
  [key: string]: unknown;
}

export interface TradingSwapResponse {
  executionMode: 'SWAP' | 'RFQ';
  routerResult?: QuoteRouteItem;
  tx?: SwapEvmTx | null;
  rfq?: SwapRfqData | null;
  [key: string]: unknown;
}

// --- Wallet API Types ---

export interface TokenBalanceItem {
  tokenContractAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  balanceInUsd?: string;
  tokenPrice?: string;
  chain: string;
}

export interface WalletBalancesResponse {
  list?: TokenBalanceItem[];
  [key: string]: unknown;
}

// --- Transaction API / Simulation Types ---

export interface SimulationResult {
  success: boolean;
  status: 'passed' | 'reverted' | 'simulated';
  error?: string;
  revertReason?: string;
  gasUsed?: string | number;
  simulatedAt: string;
  txTarget: string;
  txDataPrefix: string;
}

// --- Signer & Config Types ---

export interface SignRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | string;
  pathWithQuery: string;
  body?: string;
  timestamp?: string;
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
  baseUrl?: string;
  recvWindow?: number;
}
