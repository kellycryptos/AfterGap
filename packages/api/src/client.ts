import { Agent, setGlobalDispatcher } from 'undici';
import dns from 'dns/promises';
import {
  ClientConfig,
  BinanceApiResponse,
  RwaPlatformsResponse,
  RwaSearchResponse,
  RwaTokensResponse,
} from './types';
import { signRequest } from './signer';

// Setup resilient DNS and timeouts
let dispatcherInitialized = false;
function initDispatcher() {
  if (dispatcherInitialized) return;
  try {
    import('dns').then((d) => {
      try {
        d.setServers(['8.8.8.8', '1.1.1.1']);
        d.setDefaultResultOrder('ipv4first');
      } catch {}
    });

    const resolver = new dns.Resolver();
    resolver.setServers(['8.8.8.8', '1.1.1.1']);

    const agent = new Agent({
      headersTimeout: 30000,
      connectTimeout: 30000,
      connect: {
        lookup: (hostname, options, callback) => {
          resolver
            .resolve4(hostname)
            .then((ips) => {
              if (!ips || ips.length === 0) {
                return callback(new Error(`No IPv4 address found for ${hostname}`), '' as any, 4);
              }
              if (typeof options === 'object' && options?.all) {
                callback(null, ips.map((ip) => ({ address: ip, family: 4 })) as any);
              } else {
                callback(null, ips[0], 4);
              }
            })
            .catch(() => {
              // System fallback
              import('dns').then((d) => d.lookup(hostname, options, callback));
            });
        },
      },
    });

    setGlobalDispatcher(agent);
    dispatcherInitialized = true;
  } catch {
    // If undici/dns cannot be set, proceed with native fetch
  }
}

initDispatcher();

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
   * Helper to perform an HTTP GET request (signed if keys provided, or raw for diagnostics)
   */
  public async get<T>(pathWithQuery: string): Promise<ApiResponseWrapper<T>> {
    initDispatcher();

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
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers,
      });

      const rawBody = await response.text();
      let parsedJson: any = null;
      try {
        parsedJson = JSON.parse(rawBody);
      } catch {
        // Not JSON
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });

      const isOk = response.ok && parsedJson && parsedJson.code === '000000';

      return {
        success: Boolean(isOk || (response.ok && !parsedJson?.code)),
        status: response.status,
        statusText: response.statusText,
        data: (parsedJson as BinanceApiResponse<T>)?.data ?? (parsedJson as T),
        rawBody,
        error: !response.ok || (parsedJson && parsedJson.code !== '000000')
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
            ...headers,
            'X-OC-SIGN': headers['X-OC-SIGN'] ? `${headers['X-OC-SIGN'].slice(0, 8)}...` : undefined as any,
          },
        },
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
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
   * 1. GET /api/v1/dex/market/rwa/platforms
   * Returns list of all supported RWA token issuance platforms (e.g. 'ondo', 'bstock')
   */
  public async getPlatforms(): Promise<ApiResponseWrapper<RwaPlatformsResponse>> {
    return this.get<RwaPlatformsResponse>('/api/v1/dex/market/rwa/platforms');
  }

  /**
   * 2. GET /api/v1/dex/market/rwa/search?keyword=...
   * Search RWA tokens by keyword (ticker/company) or contract address
   */
  public async search(keyword: string): Promise<ApiResponseWrapper<RwaSearchResponse>> {
    const encoded = encodeURIComponent(keyword.trim());
    return this.get<RwaSearchResponse>(`/api/v1/dex/market/rwa/search?keyword=${encoded}`);
  }

  /**
   * 3. GET /api/v1/dex/market/rwa/tokens?binanceChainId=56&platformId=...
   * Filtered list of RWA tokens on BNB Smart Chain
   */
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
}
