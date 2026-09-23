'use client';

import React, { useState, useEffect } from 'react';

interface ApiResponseData {
  auth?: {
    hasApiKey: boolean;
    hasSecretKey: boolean;
    apiKeyPrefix: string;
  };
  keyword?: string;
  platforms?: {
    success: boolean;
    status: number;
    statusText: string;
    rawBody: string;
    data?: any;
    error?: any;
    debug?: any;
  };
  search?: {
    success: boolean;
    status: number;
    statusText: string;
    rawBody: string;
    data?: any;
    error?: any;
    debug?: any;
  };
  bscTokens?: {
    success: boolean;
    status: number;
    statusText: string;
    rawBody: string;
    data?: any;
    error?: any;
    debug?: any;
  };
  error?: string;
  timestamp?: string;
}

export default function Home() {
  const [ticker, setTicker] = useState('NVDA');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRwaData = async (symbolToFetch: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rwa?action=resolve&keyword=${encodeURIComponent(symbolToFetch)}`);
      const json: ApiResponseData = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRwaData(ticker);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticker.trim()) {
      fetchRwaData(ticker.trim());
    }
  };

  // Helper to extract platforms list
  const platformsList: any[] = React.useMemo(() => {
    if (!data?.platforms?.data) return [];
    if (Array.isArray(data.platforms.data)) return data.platforms.data;
    if (Array.isArray(data.platforms.data?.platforms)) return data.platforms.data.platforms;
    if (Array.isArray(data.platforms.data?.list)) return data.platforms.data.list;
    return [];
  }, [data]);

  // Check if xstocks exists in platforms
  const hasXStocksInPlatforms = platformsList.some(
    (p: any) =>
      String(p?.platformId).toLowerCase().includes('xstock') ||
      String(p?.name).toLowerCase().includes('xstock')
  );

  // Helper to extract tokens from search and BSC tokens
  const allResolvedTokens: any[] = React.useMemo(() => {
    const bscData = data?.bscTokens?.data;
    const bscTokens: any[] = Array.isArray(bscData)
      ? bscData
      : Array.isArray(bscData?.tokens)
      ? bscData.tokens
      : [];

    const searchData = data?.search?.data;
    const searchAssets: any[] = [];
    if (Array.isArray(searchData)) {
      for (const item of searchData) {
        if (Array.isArray(item.assets)) {
          for (const asset of item.assets) {
            searchAssets.push({
              ...asset,
              underlyingTicker: item.ticker,
              companyName: item.companyName,
            });
          }
        }
      }
    }

    const seen = new Set<string>();
    const filtered: any[] = [];
    const matchKeyword = ticker.toUpperCase();

    // Prioritize enriched BSC catalog tokens (has tokenPrice, referencePrice, statusInfo)
    for (const item of bscTokens) {
      const sym = String(item.tokenSymbol || '').toUpperCase();
      const underlying = String(item.underlyingTicker || '').toUpperCase();
      const chainId = String(item.binanceChainId || item.chainId || '');

      if ((chainId === '56' || !chainId) && (sym.includes(matchKeyword) || underlying === matchKeyword)) {
        const addr = String(item.tokenContractAddress || item.contractAddress || '').toLowerCase();
        seen.add(addr);
        seen.add(sym);
        filtered.push(item);
      }
    }

    // Include search assets if not present in BSC tokens
    for (const asset of searchAssets) {
      const chainId = String(asset.binanceChainId || '');
      const addr = String(asset.tokenContractAddress || asset.contractAddress || '').toLowerCase();
      const sym = String(asset.tokenSymbol || '').toUpperCase();
      if ((chainId === '56' || !chainId) && !seen.has(addr) && !seen.has(sym)) {
        seen.add(addr);
        seen.add(sym);
        filtered.push(asset);
      }
    }

    return filtered;
  }, [data, ticker]);

  const bstocksTokens = allResolvedTokens.filter(
    (t) => String(t.platformId).toLowerCase() === 'bstock' || String(t.tokenSymbol).endsWith('B')
  );

  const ondoTokens = allResolvedTokens.filter(
    (t) => String(t.platformId).toLowerCase() === 'ondo' || String(t.tokenSymbol).endsWith('on')
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-[#2B313A] pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-[#F0B90B]">AfterGap</h1>
              <span className="bg-[#181A20] border border-[#2B313A] text-xs font-mono text-[#F0B90B] px-2.5 py-1 rounded">
                BNB Smart Chain (Chain ID: 56)
              </span>
              <span className="bg-blue-900/30 border border-blue-700/50 text-xs font-mono text-blue-400 px-2 py-0.5 rounded">
                Spot Only
              </span>
            </div>
            <p className="text-[#848E9C] text-sm mt-1">
              Same stock, three wrappers, live gap. Built for BNB Hack: Tokenized Stocks Edition with Binance Web3 Wallet.
            </p>
          </div>

          {/* Auth indicator */}
          <div className="flex items-center gap-2 bg-[#181A20] border border-[#2B313A] px-3 py-2 rounded-lg text-xs">
            <div
              className={`w-2 h-2 rounded-full ${
                data?.auth?.hasApiKey && data?.auth?.hasSecretKey ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'
              }`}
            />
            <span className="text-[#848E9C]">Auth Status:</span>
            <span className="font-mono text-white">
              {data?.auth?.hasApiKey && data?.auth?.hasSecretKey ? (
                `Signed (${data.auth.apiKeyPrefix})`
              ) : (
                <span className="text-yellow-400">Keys Unset in .env.local</span>
              )}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="Search ticker e.g. NVDA, TSLA, AAPL, QQQ"
              className="w-full bg-[#181A20] border border-[#2B313A] rounded-lg px-4 py-2.5 text-white placeholder-[#848E9C] font-mono text-sm focus:outline-none focus:border-[#F0B90B]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-[#F0B90B] hover:bg-[#dfaa09] disabled:opacity-50 text-black font-semibold px-6 py-2.5 rounded-lg text-sm transition"
          >
            {loading ? 'Resolving BSC Wrappers...' : 'Inspect & Resolve'}
          </button>
        </form>

        {/* Quick Ticker Chips */}
        <div className="mt-3 flex items-center gap-2 text-xs text-[#848E9C]">
          <span>Presets:</span>
          {['NVDA', 'TSLA', 'AAPL', 'MSFT', 'COIN', 'QQQ'].map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => {
                setTicker(sym);
                fetchRwaData(sym);
              }}
              className="hover:text-white bg-[#181A20] border border-[#2B313A] px-2 py-1 rounded font-mono transition"
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* Auth / Error banner if key missing or call failed */}
      {(!data?.auth?.hasApiKey || !data?.auth?.hasSecretKey) && (
        <div className="bg-[#2B2313] border border-[#785E1A] p-4 rounded-lg text-sm text-[#F0B90B] flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div>
            <div className="font-semibold flex items-center gap-2">
              <span>⚠️ API Credentials Not Configured in .env.local</span>
            </div>
            <p className="text-xs text-[#d1b369] mt-1">
              Add your <code className="bg-[#181A20] px-1 py-0.5 rounded">BINANCE_WEB3_API_KEY</code> and{' '}
              <code className="bg-[#181A20] px-1 py-0.5 rounded">BINANCE_WEB3_API_SECRET</code> to{' '}
              <code className="bg-[#181A20] px-1 py-0.5 rounded">.env.local</code> to execute live signed HMAC requests.
              The app is currently displaying raw unauthenticated response bodies and DEVEX diagnostics.
            </p>
          </div>
          <a
            href="https://web3.binance.com/en/dev-portal"
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap text-xs bg-[#F0B90B] text-black font-medium px-3 py-1.5 rounded hover:bg-[#dfaa09]"
          >
            Get Keys from Portal →
          </a>
        </div>
      )}

      {error && (
        <div className="bg-red-950/50 border border-red-800 p-4 rounded-lg text-sm text-red-300">
          <strong>Fetch Error:</strong> {error}
        </div>
      )}

      {/* Section 1: Resolved BSC Rows Grouped by Platform */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Resolved BSC Wrappers</span>
            <span className="text-xs font-normal text-[#848E9C]">(Chain 56: bStocks, Ondo, xStocks)</span>
          </h2>
          <span className="text-xs text-[#848E9C] font-mono">Query: {ticker}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1. bStocks */}
          <div className="bg-[#181A20] border border-[#2B313A] rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#2B313A]">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>bStocks</span>
                    <span className="text-xs bg-[#2B313A] text-[#F0B90B] px-2 py-0.5 rounded font-mono">
                      Type 3 • Suffix B
                    </span>
                  </h3>
                  <p className="text-xs text-[#848E9C] mt-0.5">1:1 backed, rebase for dividends, LiquidMesh/RFQ</p>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-green-950 text-green-400 border border-green-800">
                  RWA Native
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {bstocksTokens.length > 0 ? (
                  bstocksTokens.map((t, idx) => {
                    const contract = t.tokenContractAddress || t.contractAddress || t.tokenAddress || '';
                    const onChainPrice = t.tokenPrice || t.price;
                    const refPrice = t.referencePrice;
                    const statusStr = t.statusInfo?.marketStatus || t.marketStatus || (t.statusInfo?.openState ? 'Trading' : 'Closed');
                    const reasonStr = t.statusInfo?.reasonCode || t.reasonCode;

                    return (
                      <div key={idx} className="p-3 bg-[#0B0E11] rounded-lg border border-[#2B313A] space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white font-mono text-sm">{t.tokenSymbol}</span>
                          <span className="text-[#848E9C]">{t.tokenName || t.underlyingName || 'Tokenized Stock'}</span>
                        </div>
                        <div className="font-mono text-[#848E9C] truncate">
                          Contract:{' '}
                          <a
                            href={`https://bscscan.com/token/${contract}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#F0B90B] hover:underline"
                          >
                            {contract || 'N/A'}
                          </a>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2B313A]/50">
                          <div>
                            <span className="text-[#848E9C] block">On-Chain Price:</span>
                            <span className="font-mono text-white font-semibold">
                              {onChainPrice ? `$${Number(onChainPrice).toFixed(2)}` : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#848E9C] block">Ref Price (Cash):</span>
                            <span className="font-mono text-white font-semibold">
                              {refPrice ? `$${Number(refPrice).toFixed(2)}` : '—'}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-1 text-[11px]">
                          <span className="text-[#848E9C]">Market Status:</span>
                          <span
                            className={`font-mono px-1.5 py-0.5 rounded ${
                              statusStr?.toLowerCase() === 'regular' || statusStr?.toLowerCase() === 'trading'
                                ? 'bg-green-950 text-green-400'
                                : 'bg-[#2B313A] text-yellow-400'
                            }`}
                          >
                            {statusStr} {reasonStr ? `(${reasonStr})` : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-[#848E9C] bg-[#0B0E11] rounded-lg border border-[#2B313A]">
                    {data?.search?.status === 200 || data?.bscTokens?.status === 200 ? (
                      <p>No bStocks tokens returned for ticker &quot;{ticker}&quot; on BSC.</p>
                    ) : (
                      <p className="font-mono">
                        Awaiting live response (HTTP {data?.search?.status || '---'} /{' '}
                        {data?.bscTokens?.status || '---'})
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#2B313A] text-[11px] text-[#848E9C]">
              Platform ID: <code className="text-white">bstock</code>
            </div>
          </div>

          {/* 2. Ondo */}
          <div className="bg-[#181A20] border border-[#2B313A] rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#2B313A]">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Ondo</span>
                    <span className="text-xs bg-[#2B313A] text-[#F0B90B] px-2 py-0.5 rounded font-mono">
                      Type 1 • Suffix on
                    </span>
                  </h3>
                  <p className="text-xs text-[#848E9C] mt-0.5">Total-return tracker, RFQ execution mode</p>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-green-950 text-green-400 border border-green-800">
                  RWA Native
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {ondoTokens.length > 0 ? (
                  ondoTokens.map((t, idx) => {
                    const contract = t.tokenContractAddress || t.contractAddress || t.tokenAddress || '';
                    const onChainPrice = t.tokenPrice || t.price;
                    const refPrice = t.referencePrice;
                    const statusStr = t.statusInfo?.marketStatus || t.marketStatus || (t.statusInfo?.openState ? 'Trading' : 'Closed');
                    const reasonStr = t.statusInfo?.reasonCode || t.reasonCode;

                    return (
                      <div key={idx} className="p-3 bg-[#0B0E11] rounded-lg border border-[#2B313A] space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white font-mono text-sm">{t.tokenSymbol}</span>
                          <span className="text-[#848E9C]">{t.tokenName || t.underlyingName || 'Tokenized Stock'}</span>
                        </div>
                        <div className="font-mono text-[#848E9C] truncate">
                          Contract:{' '}
                          <a
                            href={`https://bscscan.com/token/${contract}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#F0B90B] hover:underline"
                          >
                            {contract || 'N/A'}
                          </a>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2B313A]/50">
                          <div>
                            <span className="text-[#848E9C] block">On-Chain Price:</span>
                            <span className="font-mono text-white font-semibold">
                              {onChainPrice ? `$${Number(onChainPrice).toFixed(2)}` : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#848E9C] block">Ref Price (Cash):</span>
                            <span className="font-mono text-white font-semibold">
                              {refPrice ? `$${Number(refPrice).toFixed(2)}` : '—'}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-1 text-[11px]">
                          <span className="text-[#848E9C]">Market Status:</span>
                          <span
                            className={`font-mono px-1.5 py-0.5 rounded ${
                              statusStr?.toLowerCase() === 'regular' || statusStr?.toLowerCase() === 'trading'
                                ? 'bg-green-950 text-green-400'
                                : 'bg-[#2B313A] text-yellow-400'
                            }`}
                          >
                            {statusStr} {reasonStr ? `(${reasonStr})` : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-[#848E9C] bg-[#0B0E11] rounded-lg border border-[#2B313A]">
                    {data?.search?.status === 200 || data?.bscTokens?.status === 200 ? (
                      <p>No Ondo tokens returned for ticker &quot;{ticker}&quot; on BSC.</p>
                    ) : (
                      <p className="font-mono">
                        Awaiting live response (HTTP {data?.search?.status || '---'} /{' '}
                        {data?.bscTokens?.status || '---'})
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#2B313A] text-[11px] text-[#848E9C]">
              Platform ID: <code className="text-white">ondo</code>
            </div>
          </div>

          {/* 3. xStocks */}
          <div className="bg-[#181A20] border border-dashed border-[#404652] rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#2B313A]">
                <div>
                  <h3 className="text-base font-bold text-[#848E9C] flex items-center gap-2">
                    <span>xStocks</span>
                    <span className="text-xs bg-[#2B313A] text-gray-400 px-2 py-0.5 rounded font-mono">
                      Type 2 • Suffix x
                    </span>
                  </h3>
                  <p className="text-xs text-[#848E9C] mt-0.5">AMM SWAP (No RFQ)</p>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                  Not in RWA Data
                </span>
              </div>

              {/* Explicit 'not in RWA Data' state callout */}
              <div className="mt-4 p-4 rounded-lg bg-[#0B0E11] border border-[#2B313A] space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                  <span>ℹ️ Catalog Discrepancy Documented</span>
                </div>
                <p className="text-xs text-[#848E9C] leading-relaxed">
                  Binance Web3 Market RWA Data API currently documents <code className="text-white font-mono">platformId</code> as{' '}
                  <code className="text-[#F0B90B] font-mono">ondo</code> and{' '}
                  <code className="text-[#F0B90B] font-mono">bstock</code> only.
                </p>
                <div className="bg-[#181A20] p-2.5 rounded border border-[#2B313A] text-[11px] font-mono text-[#848E9C] space-y-1">
                  <div>• RWA Data enum: [ondo, bstock]</div>
                  <div>• xStocks status: Absent from /rwa/platforms</div>
                  <div>• Trading API: type=2 (AMM Swap)</div>
                </div>
                <p className="text-xs text-[#848E9C]">
                  Per design brief: No fake xStocks rows are inserted into the RWA table. In v1 execution, xStocks will be resolved directly through Trading API contract search.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#2B313A] text-[11px] text-[#848E9C] flex justify-between items-center">
              <span>Platform ID: <code className="text-gray-400 font-mono">xstocks (unlisted)</code></span>
              <span className="text-amber-400 font-mono text-[10px]">Documented in DEVEX.md</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Platforms Raw JSON */}
      <section className="bg-[#181A20] border border-[#2B313A] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2B313A] pb-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
              GET /api/v1/dex/market/rwa/platforms
            </h2>
            <p className="text-xs text-[#848E9C]">
              Raw response from Binance Web3 Market RWA platform discovery endpoint
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-mono px-2.5 py-1 rounded font-semibold ${
                data?.platforms?.status === 200
                  ? 'bg-green-950 text-green-400 border border-green-800'
                  : 'bg-red-950 text-red-400 border border-red-800'
              }`}
            >
              HTTP {data?.platforms?.status ?? '---'} {data?.platforms?.statusText ?? ''}
            </span>
          </div>
        </div>

        {/* Platforms Inspection Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-[#0B0E11] p-3 rounded-lg border border-[#2B313A]">
            <span className="text-[#848E9C] block">Platforms Found:</span>
            <span className="font-mono text-base font-bold text-white mt-1 block">
              {platformsList.length}
            </span>
          </div>
          <div className="bg-[#0B0E11] p-3 rounded-lg border border-[#2B313A]">
            <span className="text-[#848E9C] block">Platform IDs in Response:</span>
            <span className="font-mono text-xs text-[#F0B90B] mt-1 block truncate">
              {platformsList.map((p) => p.platformId || p.name).join(', ') || 'None / Not Authenticated'}
            </span>
          </div>
          <div className="bg-[#0B0E11] p-3 rounded-lg border border-[#2B313A]">
            <span className="text-[#848E9C] block">xStocks in /rwa/platforms:</span>
            <span
              className={`font-mono text-xs font-bold mt-1 block ${
                hasXStocksInPlatforms ? 'text-green-400' : 'text-amber-400'
              }`}
            >
              {hasXStocksInPlatforms ? 'YES (Present)' : 'NO (Missing as expected)'}
            </span>
          </div>
        </div>

        {/* Raw JSON Code Viewer */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-[#848E9C]">
            <span>Raw Response Body (Exact Wire Output):</span>
            <span className="font-mono text-[11px]">{data?.platforms?.debug?.requestUrl || ''}</span>
          </div>
          <pre className="bg-[#0B0E11] p-4 rounded-lg border border-[#2B313A] overflow-x-auto text-xs font-mono text-gray-300 max-h-72">
            {data?.platforms?.rawBody
              ? (() => {
                  try {
                    return JSON.stringify(JSON.parse(data.platforms.rawBody), null, 2);
                  } catch {
                    return data.platforms.rawBody;
                  }
                })()
              : loading
              ? 'Fetching platforms response...'
              : 'No response received yet.'}
          </pre>
        </div>
      </section>

      {/* Section 3: Diagnostic & Raw Wire Inspector (Search & Tokens) */}
      <section className="bg-[#181A20] border border-[#2B313A] rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-bold text-white">Wire Diagnostics & DevEx Logging</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Search Endpoint */}
          <div className="bg-[#0B0E11] p-4 rounded-lg border border-[#2B313A] space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-mono text-[#F0B90B] font-semibold">GET /rwa/search?keyword={ticker}</span>
              <span className="font-mono text-[#848E9C]">HTTP {data?.search?.status ?? '---'}</span>
            </div>
            <pre className="p-2.5 bg-[#181A20] rounded text-[11px] font-mono text-gray-300 overflow-x-auto max-h-48">
              {data?.search?.rawBody
                ? (() => {
                    try {
                      return JSON.stringify(JSON.parse(data.search.rawBody), null, 2);
                    } catch {
                      return data.search.rawBody;
                    }
                  })()
                : 'Awaiting call...'}
            </pre>
          </div>

          {/* Tokens Endpoint */}
          <div className="bg-[#0B0E11] p-4 rounded-lg border border-[#2B313A] space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-mono text-[#F0B90B] font-semibold">GET /rwa/tokens?binanceChainId=56</span>
              <span className="font-mono text-[#848E9C]">HTTP {data?.bscTokens?.status ?? '---'}</span>
            </div>
            <pre className="p-2.5 bg-[#181A20] rounded text-[11px] font-mono text-gray-300 overflow-x-auto max-h-48">
              {data?.bscTokens?.rawBody
                ? (() => {
                    try {
                      return JSON.stringify(JSON.parse(data.bscTokens.rawBody), null, 2);
                    } catch {
                      return data.bscTokens.rawBody;
                    }
                  })()
                : 'Awaiting call...'}
            </pre>
          </div>
        </div>
      </section>
    </main>
  );
}
