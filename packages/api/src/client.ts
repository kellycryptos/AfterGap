import { Agent, fetch as undiciFetch } from 'undici';
import https from 'https';
import dns from 'dns';
import {
  ClientConfig,
  BinanceApiResponse,
  RwaPlatformsResponse,
  RwaSearchResponse,
  RwaTokensResponse,
  TradingQuoteRequest,
  TradingQuoteResponse,
  TradingSwapRequest,
  TradingSwapResponse,
  RfqSubmitOrderRequest,
  RfqSubmitOrderResponse,
  WalletBalancesResponse,
  SimulationResult,
} from './types';
import { signRequest } from './signer';

// Setup resilient CloudFront IP resolution for web3.binance.com
const BINANCE_CLOUDFRONT_IPS = ['108.156.221.91', '108.156.221.120', '108.156.221.129', '108.156.221.85'];
let cachedBinanceIp: string = BINANCE_CLOUDFRONT_IPS[0];

function refreshDohIp(hostname: string): void {
  try {
    const req = https.get(
      `https://8.8.8.8/resolve?name=${hostname}&type=A`,
      {
        headers: { Host: 'dns.google' },
        servername: 'dns.google',
        timeout: 3000,
      },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          try {
            const j = JSON.parse(d);
            const a = j.Answer && j.Answer.find((x: any) => x.type === 1);
            if (a && a.data) cachedBinanceIp = a.data;
          } catch {}
        });
      }
    );
    req.on('error', () => {});
    req.on('timeout', () => req.destroy());
  } catch {}
}

let sharedAgent: Agent | null = null;

function getAgent(): Agent {
  if (sharedAgent) return sharedAgent;
  sharedAgent = new Agent({
    headersTimeout: 30000,
    connectTimeout: 30000,
    keepAliveTimeout: 4000,
    keepAliveMaxTimeout: 10000,
    connect: {
      lookup: (hostname, options, callback) => {
        let cb = callback;
        let opts = options;
        if (typeof opts === 'function') {
          cb = opts as any;
          opts = {};
        }
        if (hostname === 'web3.binance.com') {
          refreshDohIp(hostname);
          const ip = cachedBinanceIp || BINANCE_CLOUDFRONT_IPS[0];
          if (typeof opts === 'object' && (opts as any)?.all) {
            return cb(null, [{ address: ip, family: 4 }] as any);
          }
          return cb(null, ip as any, 4);
        }
        (dns.lookup as any)(hostname, opts, cb);
      },
    },
  });
  return sharedAgent;
}

export interface ApiResponseWrapper<T> {
  success: boolean;
  status: number;
  statusText: string;
  data?: T;
  rawBody: string;
  error?: {
    code?: string | number;
    message?: string;
    details?: unknown;
  };
  headers: Record<string, string>;
  debug: {
    requestUrl: string;
    method: string;
    requestTimestamp: string;
    hasAuth: boolean;
    sentHeaders?: Record<string, string>;
  };
}

export class BinanceRwaClient {
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;

  constructor(config: ClientConfig = {}) {
    this.apiKey = config.apiKey || process.env.BINANCE_WEB3_API_KEY || '';
    this.secretKey = config.secretKey || process.env.BINANCE_WEB3_API_SECRET || '';
    this.baseUrl = config.baseUrl || 'https://web3.binance.com/build';
  }

  /**
   * Helper to perform an HTTP GET request (signed if keys provided)
   */
  public async get<T>(pathWithQuery: string): Promise<ApiResponseWrapper<T>> {
    const timestamp = new Date().toISOString();
    const hasAuth = Boolean(this.apiKey && this.secretKey);

    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    let requestUrl: string;

    if (hasAuth) {
      const signed = signRequest(
        {
          method: 'GET',
          pathWithQuery,
          timestamp,
        },
        this.apiKey,
        this.secretKey
      );
      headers = { ...headers, ...signed.headers };
      requestUrl = signed.fullUrl;
    } else {
      const cleanPath = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`;
      const normalizedPath = cleanPath.startsWith('/build') ? cleanPath : `/build${cleanPath}`;
      requestUrl = `https://web3.binance.com${normalizedPath}`;
      if (this.apiKey) {
        headers['X-OC-APIKEY'] = this.apiKey;
      }
      headers['X-OC-TIMESTAMP'] = timestamp;
    }

    try {
      const response = await undiciFetch(requestUrl, {
        method: 'GET',
        headers,
        dispatcher: getAgent(),
      });

      const rawBody = await response.text();
      let parsedJson: any = null;
      try {
        parsedJson = JSON.parse(rawBody);
      } catch {}

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });

      const isOk = response.ok && parsedJson && (parsedJson.code === 0 || parsedJson.code === '000000');

      return {
        success: Boolean(isOk || (response.ok && !parsedJson?.code)),
        status: response.status,
        statusText: response.statusText,
        data: (parsedJson as BinanceApiResponse<T>)?.data ?? (parsedJson as T),
        rawBody,
        error: !response.ok || (parsedJson && parsedJson.code !== 0 && parsedJson.code !== '000000')
          ? {
              code: parsedJson?.code ?? response.status,
              message: parsedJson?.msg ?? parsedJson?.message ?? response.statusText,
              details: parsedJson,
            }
          : undefined,
        headers: responseHeaders,
        debug: {
          requestUrl,
          method: 'GET',
          requestTimestamp: timestamp,
          hasAuth,
          sentHeaders: {
            'Content-Type': headers['Content-Type'],
            Accept: headers['Accept'],
          },
        },
      };
    } catch (err: unknown) {
      const cause = err instanceof Error && (err as any).cause ? ` (${(err as any).cause?.message || (err as any).cause})` : '';
      const errorMessage = (err instanceof Error ? err.message : String(err)) + cause;
      return {
        success: false,
        status: 0,
        statusText: 'Network Error',
        rawBody: errorMessage,
        error: {
          code: 'NETWORK_ERROR',
          message: errorMessage,
        },
        headers: {},
        debug: {
          requestUrl,
          method: 'GET',
          requestTimestamp: timestamp,
          hasAuth,
        },
      };
    }
  }

  /**
   * Helper to perform an HTTP POST request (signed if keys provided)
   */
  public async post<T>(pathWithQuery: string, bodyString: string = ''): Promise<ApiResponseWrapper<T>> {
    const timestamp = new Date().toISOString();
    const hasAuth = Boolean(this.apiKey && this.secretKey);

    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    let requestUrl: string;

    if (hasAuth) {
      const signed = signRequest(
        {
          method: 'POST',
          pathWithQuery,
          body: bodyString,
          timestamp,
        },
        this.apiKey,
        this.secretKey
      );
      headers = { ...headers, ...signed.headers };
      requestUrl = signed.fullUrl;
    } else {
      const cleanPath = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`;
      const normalizedPath = cleanPath.startsWith('/build') ? cleanPath : `/build${cleanPath}`;
      requestUrl = `https://web3.binance.com${normalizedPath}`;
      if (this.apiKey) {
        headers['X-OC-APIKEY'] = this.apiKey;
      }
      headers['X-OC-TIMESTAMP'] = timestamp;
    }

    try {
      const response = await undiciFetch(requestUrl, {
        method: 'POST',
        headers,
        body: bodyString,
        dispatcher: getAgent(),
      });

      const rawBody = await response.text();
      let parsedJson: any = null;
      try {
        parsedJson = JSON.parse(rawBody);
      } catch {}

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });

      const isOk = response.ok && parsedJson && (parsedJson.code === 0 || parsedJson.code === '000000');

      return {
        success: Boolean(isOk || (response.ok && !parsedJson?.code)),
        status: response.status,
        statusText: response.statusText,
        data: (parsedJson as BinanceApiResponse<T>)?.data ?? (parsedJson as T),
        rawBody,
        error: !response.ok || (parsedJson && parsedJson.code !== 0 && parsedJson.code !== '000000')
          ? {
              code: parsedJson?.code ?? response.status,
              message: parsedJson?.msg ?? parsedJson?.message ?? response.statusText,
              details: parsedJson,
            }
          : undefined,
        headers: responseHeaders,
        debug: {
          requestUrl,
          method: 'POST',
          requestTimestamp: timestamp,
          hasAuth,
          sentHeaders: {
            'Content-Type': headers['Content-Type'],
            Accept: headers['Accept'],
          },
        },
      };
    } catch (err: unknown) {
      const cause = err instanceof Error && (err as any).cause ? ` (${(err as any).cause?.message || (err as any).cause})` : '';
      const errorMessage = (err instanceof Error ? err.message : String(err)) + cause;
      return {
        success: false,
        status: 0,
        statusText: 'Network Error',
        rawBody: errorMessage,
        error: {
          code: 'NETWORK_ERROR',
          message: errorMessage,
        },
        headers: {},
        debug: {
          requestUrl,
          method: 'POST',
          requestTimestamp: timestamp,
          hasAuth,
        },
      };
    }
  }

  // --- Market RWA Methods ---

  public async getPlatforms(): Promise<ApiResponseWrapper<RwaPlatformsResponse>> {
    return this.get<RwaPlatformsResponse>('/api/v1/dex/market/rwa/platforms');
  }

  public async search(keyword: string): Promise<ApiResponseWrapper<RwaSearchResponse>> {
    const encoded = encodeURIComponent(keyword.trim());
    return this.get<RwaSearchResponse>(`/api/v1/dex/market/rwa/search?keyword=${encoded}`);
  }

  public async getTokens(options: {
    binanceChainId?: string | number;
    platformId?: string;
    page?: number;
    size?: number;
  } = {}): Promise<ApiResponseWrapper<RwaTokensResponse>> {
    const params = new URLSearchParams();
    params.set('binanceChainId', String(options.binanceChainId ?? 56));
    if (options.platformId) {
      params.set('platformId', options.platformId);
    }
    if (options.page) {
      params.set('page', String(options.page));
    }
    if (options.size) {
      params.set('size', String(options.size));
    }

    return this.get<RwaTokensResponse>(`/api/v1/dex/market/rwa/tokens?${params.toString()}`);
  }

  // --- Trading API Methods ---

  public async getQuote(req: TradingQuoteRequest): Promise<ApiResponseWrapper<TradingQuoteResponse>> {
    const params = new URLSearchParams();
    params.set('binanceChainId', String(req.binanceChainId || 56));
    params.set('fromTokenAddress', req.fromTokenAddress);
    params.set('toTokenAddress', req.toTokenAddress);
    params.set('amount', req.amount);
    if (req.userWalletAddress) {
      params.set('userWalletAddress', req.userWalletAddress);
    }
    if (req.slippagePercent !== undefined) {
      params.set('slippagePercent', String(req.slippagePercent));
    }
    if (req.autoSlippage) {
      params.set('autoSlippage', 'true');
    }

    return this.get<TradingQuoteResponse>(`/api/v1/dex/aggregator/quote?${params.toString()}`);
  }

  public async getSwap(req: TradingSwapRequest): Promise<ApiResponseWrapper<TradingSwapResponse>> {
    const params = new URLSearchParams();
    params.set('quoteId', req.quoteId);
    params.set('binanceChainId', String(req.binanceChainId || 56));
    params.set('fromTokenAddress', req.fromTokenAddress);
    params.set('toTokenAddress', req.toTokenAddress);
    params.set('amount', req.amount);
    params.set('userWalletAddress', req.userWalletAddress);
    if (req.slippagePercent !== undefined) {
      params.set('slippagePercent', String(req.slippagePercent));
    }
    if (req.autoSlippage) {
      params.set('autoSlippage', 'true');
    }

    return this.get<TradingSwapResponse>(`/api/v1/dex/aggregator/swap?${params.toString()}`);
  }

  public async submitRfqOrder(req: RfqSubmitOrderRequest): Promise<ApiResponseWrapper<RfqSubmitOrderResponse>> {
    return this.post<RfqSubmitOrderResponse>(
      '/api/v1/dex/rfq/order/submit',
      JSON.stringify(req)
    );
  }

  public async getRfqOrderStatus(orderId: string, binanceChainId: string | number = 56): Promise<ApiResponseWrapper<RfqSubmitOrderResponse>> {
    const params = new URLSearchParams();
    params.set('orderId', orderId);
    params.set('binanceChainId', String(binanceChainId));
    return this.get<RfqSubmitOrderResponse>(`/api/v1/dex/rfq/order/status?${params.toString()}`);
  }

  // --- Wallet API Methods ---

  public async getBalances(address: string, chainId: string | number = 56): Promise<ApiResponseWrapper<WalletBalancesResponse>> {
    const params = new URLSearchParams();
    params.set('address', address);
    params.set('chains', String(chainId));
    params.set('excludeRiskToken', 'true');

    return this.get<WalletBalancesResponse>(`/api/v1/dex/balance/all-token-balances-by-address?${params.toString()}`);
  }

  // --- Transaction Dry-Run / Simulation ---

  public async simulateSwap(
    tx: { from: string; to: string; data: string; value?: string },
    bscRpcUrl: string = 'https://bsc-dataseed.binance.org/'
  ): Promise<SimulationResult> {
    const timestamp = new Date().toISOString();
    try {
      const response = await fetch(bscRpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [
            {
              from: tx.from,
              to: tx.to,
              data: tx.data,
              value: tx.value ? (tx.value.startsWith('0x') ? tx.value : `0x${BigInt(tx.value).toString(16)}`) : '0x0',
            },
            'latest',
          ],
        }),
      });

      const resJson: any = await response.json();

      if (resJson.error) {
        return {
          success: false,
          status: 'reverted',
          error: resJson.error.message || 'Simulation reverted',
          revertReason: resJson.error.data || resJson.error.message,
          simulatedAt: timestamp,
          txTarget: tx.to,
          txDataPrefix: tx.data?.slice(0, 10),
        };
      }

      return {
        success: true,
        status: 'passed',
        simulatedAt: timestamp,
        txTarget: tx.to,
        txDataPrefix: tx.data?.slice(0, 10),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        status: 'reverted',
        error: msg,
        simulatedAt: timestamp,
        txTarget: tx.to,
        txDataPrefix: tx.data?.slice(0, 10),
      };
    }
  }
}
