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

  const isAuthed = Boolean(data?.auth?.hasApiKey && data?.auth?.hasSecretKey);

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden bg-[#07070A] text-[#F5F5F4]">
      {/* Soft Radial Glow behind hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[420px] -z-10 blur-3xl opacity-80"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(245, 197, 66, 0.12) 0%, rgba(245, 197, 66, 0.03) 50%, transparent 70%)',
        }}
      />

      {/* Top Bar */}
      <header className="w-full border-b border-white/[0.06] bg-[#07070A]/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5C542]">
              AfterGap
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-white/[0.04] text-[#A1A1AA] border border-white/[0.06]">
              BSC 56
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-white/[0.04] text-[#A1A1AA] border border-white/[0.06]">
              Spot only
            </span>
          </div>

          {/* Compact Auth Chip */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-white/[0.03] border border-white/[0.06]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isAuthed ? 'bg-[#3D9A6A]' : 'bg-[#A1A1AA]'
              }`}
            />
            <span className="text-[#A1A1AA]">
              {isAuthed ? `Signed (${data?.auth?.apiKeyPrefix})` : 'Needs key'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Screen Content */}
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex-1 flex flex-col items-center justify-center">
        {/* Hero */}
        <div className="text-center mb-8 sm:mb-10 space-y-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-[#F5F5F4]">
            Same stock. Three wrappers. Live gap.
          </h1>
        </div>

        {/* Main Product Card */}
        <div className="w-full max-w-xl bg-[#121214] border border-white/[0.06] rounded-2xl p-5 sm:p-7 shadow-2xl space-y-4">
          {/* Ticker Search Form */}
          <form onSubmit={handleSubmit} className="flex gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="Ticker e.g. NVDA"
                className="w-full bg-[#07070A] border border-white/[0.06] rounded-lg px-4 py-2.5 text-[#F5F5F4] placeholder-[#A1A1AA]/50 font-mono text-sm uppercase focus:outline-none focus:border-[#F5C542]/60 transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#F5C542] hover:bg-[#E0B02E] disabled:opacity-50 text-[#07070A] font-semibold px-5 py-2.5 rounded-lg text-sm transition"
            >
              {loading ? 'Inspecting...' : 'Inspect'}
            </button>
          </form>

          {/* One-Line Mute Status */}
          <div className="text-xs text-[#A1A1AA] font-mono pt-0.5 min-h-[1.25rem]">
            {error ? (
              <span className="text-[#C45C26]">{error}</span>
            ) : !isAuthed ? (
              <span>API credentials not configured in .env.local — live quote signing unavailable.</span>
            ) : (
              <span>HMAC signed credentials active ({data?.auth?.apiKeyPrefix}).</span>
            )}
          </div>

          {/* Preset Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.04]">
            <span className="text-xs text-[#A1A1AA] mr-1">Presets:</span>
            {['NVDA', 'TSLA', 'AAPL', 'MSFT', 'COIN', 'QQQ'].map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => {
                  setTicker(sym);
                  fetchRwaData(sym);
                }}
                className={`px-3 py-1 rounded-full text-xs font-mono transition border ${
                  ticker === sym
                    ? 'bg-[#F5C542]/10 text-[#F5C542] border-[#F5C542]/40'
                    : 'bg-white/[0.04] text-[#A1A1AA] border-white/[0.06] hover:bg-white/[0.08] hover:text-[#F5F5F4]'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        {/* Results: Three Equal Cards */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mt-10">
          {/* Card 1: bStocks */}
          <div className="bg-[#121214] border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-[#F5F5F4]">bStocks</h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-white/[0.04] text-[#A1A1AA] border border-white/[0.06]">
                    Type 3
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-mono border ${
                    bstocksTokens.length > 0
                      ? 'bg-[#3D9A6A]/10 text-[#3D9A6A] border-[#3D9A6A]/30'
                      : !isAuthed
                      ? 'bg-white/[0.04] text-[#A1A1AA] border-white/[0.06]'
                      : 'bg-[#C45C26]/10 text-[#C45C26] border-[#C45C26]/30'
                  }`}
                >
                  {bstocksTokens.length > 0 ? 'Live' : !isAuthed ? 'Needs key' : 'Not in catalog'}
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-2">
                1:1 backed, rebase for dividends, LiquidMesh/RFQ
              </p>

              <div className="mt-4 space-y-3">
                {bstocksTokens.length > 0 ? (
                  bstocksTokens.map((t, idx) => {
                    const contract = t.tokenContractAddress || t.contractAddress || t.tokenAddress || '';
                    const onChainPrice = t.tokenPrice || t.price;
                    const refPrice = t.referencePrice;
                    const statusStr =
                      t.statusInfo?.marketStatus ||
                      t.marketStatus ||
                      (t.statusInfo?.openState ? 'Trading' : 'Closed');
                    const reasonStr = t.statusInfo?.reasonCode || t.reasonCode;

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-[#07070A] rounded-lg border border-white/[0.04] space-y-2 text-xs"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#F5F5F4] font-mono text-sm">{t.tokenSymbol}</span>
                          <span className="text-[#A1A1AA]">{t.tokenName || t.underlyingName || 'Tokenized Stock'}</span>
                        </div>
                        <div className="font-mono text-[#A1A1AA] truncate text-[11px]">
                          Contract:{' '}
                          <a
                            href={`https://bscscan.com/token/${contract}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#F5C542] hover:underline"
                          >
                            {contract ? `${contract.slice(0, 6)}...${contract.slice(-4)}` : 'N/A'}
                          </a>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.04]">
                          <div>
                            <span className="text-[#A1A1AA] block text-[11px]">On-Chain Price</span>
                            <span className="font-mono text-[#F5F5F4] font-semibold text-sm">
                              {onChainPrice ? `$${Number(onChainPrice).toFixed(2)}` : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#A1A1AA] block text-[11px]">Ref Price (Cash)</span>
                            <span className="font-mono text-[#F5F5F4] font-semibold text-sm">
                              {refPrice ? `$${Number(refPrice).toFixed(2)}` : '—'}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-1 text-[11px]">
                          <span className="text-[#A1A1AA]">Market Status</span>
                          <span
                            className={`font-mono px-2 py-0.5 rounded-full text-[11px] ${
                              statusStr?.toLowerCase() === 'regular' || statusStr?.toLowerCase() === 'trading'
                                ? 'bg-[#3D9A6A]/10 text-[#3D9A6A] border border-[#3D9A6A]/30'
                                : 'bg-white/[0.04] text-[#F5C542] border border-white/[0.06]'
                            }`}
                          >
                            {statusStr || 'Trading'} {reasonStr ? `(${reasonStr})` : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-xs font-mono text-[#A1A1AA] bg-[#07070A] rounded-lg border border-white/[0.04]">
                    {loading ? 'Resolving...' : !isAuthed ? 'Needs key' : 'Not in catalog'}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] text-[#A1A1AA] font-mono">
              Platform ID: bstock
            </div>
          </div>

          {/* Card 2: Ondo */}
          <div className="bg-[#121214] border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-[#F5F5F4]">Ondo</h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-white/[0.04] text-[#A1A1AA] border border-white/[0.06]">
                    Type 1
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-mono border ${
                    ondoTokens.length > 0
                      ? 'bg-[#3D9A6A]/10 text-[#3D9A6A] border-[#3D9A6A]/30'
                      : !isAuthed
                      ? 'bg-white/[0.04] text-[#A1A1AA] border-white/[0.06]'
                      : 'bg-[#C45C26]/10 text-[#C45C26] border-[#C45C26]/30'
                  }`}
                >
                  {ondoTokens.length > 0 ? 'Live' : !isAuthed ? 'Needs key' : 'Not in catalog'}
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-2">
                Total-return tracker, RFQ execution mode
              </p>

              <div className="mt-4 space-y-3">
                {ondoTokens.length > 0 ? (
                  ondoTokens.map((t, idx) => {
                    const contract = t.tokenContractAddress || t.contractAddress || t.tokenAddress || '';
                    const onChainPrice = t.tokenPrice || t.price;
                    const refPrice = t.referencePrice;
                    const statusStr =
                      t.statusInfo?.marketStatus ||
                      t.marketStatus ||
                      (t.statusInfo?.openState ? 'Trading' : 'Closed');
                    const reasonStr = t.statusInfo?.reasonCode || t.reasonCode;

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-[#07070A] rounded-lg border border-white/[0.04] space-y-2 text-xs"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#F5F5F4] font-mono text-sm">{t.tokenSymbol}</span>
                          <span className="text-[#A1A1AA]">{t.tokenName || t.underlyingName || 'Tokenized Stock'}</span>
                        </div>
                        <div className="font-mono text-[#A1A1AA] truncate text-[11px]">
                          Contract:{' '}
                          <a
                            href={`https://bscscan.com/token/${contract}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#F5C542] hover:underline"
                          >
                            {contract ? `${contract.slice(0, 6)}...${contract.slice(-4)}` : 'N/A'}
                          </a>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.04]">
                          <div>
                            <span className="text-[#A1A1AA] block text-[11px]">On-Chain Price</span>
                            <span className="font-mono text-[#F5F5F4] font-semibold text-sm">
                              {onChainPrice ? `$${Number(onChainPrice).toFixed(2)}` : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#A1A1AA] block text-[11px]">Ref Price (Cash)</span>
                            <span className="font-mono text-[#F5F5F4] font-semibold text-sm">
                              {refPrice ? `$${Number(refPrice).toFixed(2)}` : '—'}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-1 text-[11px]">
                          <span className="text-[#A1A1AA]">Market Status</span>
                          <span
                            className={`font-mono px-2 py-0.5 rounded-full text-[11px] ${
                              statusStr?.toLowerCase() === 'regular' || statusStr?.toLowerCase() === 'trading'
                                ? 'bg-[#3D9A6A]/10 text-[#3D9A6A] border border-[#3D9A6A]/30'
                                : 'bg-white/[0.04] text-[#F5C542] border border-white/[0.06]'
                            }`}
                          >
                            {statusStr || 'Trading'} {reasonStr ? `(${reasonStr})` : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-xs font-mono text-[#A1A1AA] bg-[#07070A] rounded-lg border border-white/[0.04]">
                    {loading ? 'Resolving...' : !isAuthed ? 'Needs key' : 'Not in catalog'}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] text-[#A1A1AA] font-mono">
              Platform ID: ondo
            </div>
          </div>

          {/* Card 3: xStocks */}
          <div className="bg-[#121214] border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-[#F5F5F4]">xStocks</h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-white/[0.04] text-[#A1A1AA] border border-white/[0.06]">
                    Type 2
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-[#C45C26]/10 text-[#C45C26] border border-[#C45C26]/30">
                  Not in RWA Data
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-2">
                AMM SWAP (No RFQ)
              </p>

              <div className="mt-4 space-y-3">
                <div className="py-4 text-center text-xs font-mono text-[#A1A1AA] bg-[#07070A] rounded-lg border border-white/[0.04]">
                  <span className="text-[#C45C26] font-medium block">Not in catalog</span>
                  <span className="text-[11px] text-[#A1A1AA] block mt-0.5">Absent from /rwa/platforms</span>
                </div>

                <div className="p-3 bg-[#07070A] rounded-lg border border-white/[0.04] text-xs text-[#A1A1AA] space-y-2 leading-relaxed">
                  <p>
                    Binance Web3 Market RWA Data API documents <code className="text-[#F5F5F4] font-mono">ondo</code> and <code className="text-[#F5F5F4] font-mono">bstock</code> only.
                  </p>
                  <p className="text-[11px]">
                    xStocks routes via Trading API (type=2 AMM swap) and is unlisted in the RWA catalog.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] text-[#A1A1AA] font-mono flex justify-between items-center">
              <span>Platform ID: xstocks</span>
              <span className="text-[#C45C26]">Unlisted</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer, full width, quiet */}
      <footer className="w-full border-t border-white/[0.06] mt-auto py-6 sm:py-8 bg-[#07070A]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A1A1AA]">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <span className="text-[#F5C542] font-semibold tracking-tight text-sm">
              AfterGap
            </span>
            <span className="hidden sm:inline text-white/20">/</span>
            <span>Built for BNB Hack Tokenized Stocks Edition</span>
          </div>

          <div className="flex items-center gap-6 font-mono text-xs">
            <a
              href="https://github.com/kellycryptos/AfterGap"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#F5F5F4] transition"
            >
              GitHub
            </a>
            <a
              href="https://x.com/kellycryptos"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#F5F5F4] transition"
            >
              X
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
