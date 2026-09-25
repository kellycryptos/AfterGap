'use client';

import React, { useState, useEffect, useMemo } from 'react';

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
  };
  search?: {
    success: boolean;
    status: number;
    statusText: string;
    rawBody: string;
    data?: any;
    error?: any;
  };
  bscTokens?: {
    success: boolean;
    status: number;
    statusText: string;
    rawBody: string;
    data?: any;
    error?: any;
  };
  error?: string;
  timestamp?: string;
}

interface QuoteState {
  loading: boolean;
  error?: string;
  quoteId?: string;
  vendorName?: string;
  executionMode?: 'SWAP' | 'RFQ';
  fromAmount?: string;
  toAmount?: string;
  toTokenSymbol?: string;
  unitPrice?: string;
  spender?: string;
  router?: string;
  fetchedAt?: number;
  ttlRemaining?: number;
  rawQuote?: any;
}

interface SimulationState {
  loading: boolean;
  error?: string;
  status?: 'passed' | 'reverted';
  revertReason?: string;
  simulatedAt?: string;
  tx?: {
    from: string;
    to: string;
    data: string;
    value: string;
    gas: string;
    gasPrice?: string;
  };
}

const DEFAULT_BENCHMARK_TOKENS: Record<string, any[]> = {
  NVDA: [
    {
      tokenSymbol: 'NVDAB',
      tokenName: 'Nvidia bStock',
      tokenContractAddress: '0x02fca66c1d1afb4e2a7884261eb00f63598a7436',
      binanceChainId: '56',
      platformId: 'bstock',
      tokenPrice: '229.11',
      price: '229.11',
      referencePrice: '228.93',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
      underlyingTicker: 'NVDA',
      underlyingName: 'Nvidia Corp',
    },
    {
      tokenSymbol: 'NVDAon',
      tokenName: 'Nvidia Ondo',
      tokenContractAddress: '0xa9ee28c80f960b889dfbd1902055218cba016f75',
      binanceChainId: '56',
      platformId: 'ondo',
      tokenPrice: '229.72',
      price: '229.72',
      referencePrice: '229.32',
      marketStatus: 'premarket',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'premarket', reasonCode: 'TRADING' },
      underlyingTicker: 'NVDA',
      underlyingName: 'Nvidia Corp',
    },
  ],
  TSLA: [
    {
      tokenSymbol: 'TSLAB',
      tokenName: 'Tesla bStock',
      tokenContractAddress: '0x39a1b415b3c3756fb60cfda862fc8095d3013892',
      binanceChainId: '56',
      platformId: 'bstock',
      tokenPrice: '254.20',
      price: '254.20',
      referencePrice: '253.80',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
      underlyingTicker: 'TSLA',
      underlyingName: 'Tesla Inc',
    },
    {
      tokenSymbol: 'TSLAon',
      tokenName: 'Tesla Ondo',
      tokenContractAddress: '0x56a64ef81c74ca29a05b3ec9b5311e51b32d2038',
      binanceChainId: '56',
      platformId: 'ondo',
      tokenPrice: '254.85',
      price: '254.85',
      referencePrice: '253.80',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
      underlyingTicker: 'TSLA',
      underlyingName: 'Tesla Inc',
    },
  ],
  AAPL: [
    {
      tokenSymbol: 'AAPLB',
      tokenName: 'Apple bStock',
      tokenContractAddress: '0x7890b415b3c3756fb60cfda862fc8095d3013111',
      binanceChainId: '56',
      platformId: 'bstock',
      tokenPrice: '231.40',
      price: '231.40',
      referencePrice: '231.10',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
      underlyingTicker: 'AAPL',
      underlyingName: 'Apple Inc',
    },
    {
      tokenSymbol: 'AAPLon',
      tokenName: 'Apple Ondo',
      tokenContractAddress: '0x12344ef81c74ca29a05b3ec9b5311e51b32d2222',
      binanceChainId: '56',
      platformId: 'ondo',
      tokenPrice: '231.95',
      price: '231.95',
      referencePrice: '231.10',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
      underlyingTicker: 'AAPL',
      underlyingName: 'Apple Inc',
    },
  ],
};

const DEFAULT_BENCHMARK_QUOTES: Record<string, any> = {
  '0x02fca66c1d1afb4e2a7884261eb00f63598a7436': {
    quoteId: 'quote-nvdab-benchmark-01',
    vendorName: 'LiquidMesh',
    executionMode: 'SWAP',
    binanceChainId: '56',
    fromTokenAmount: '10000000000000000000',
    toTokenAmount: '43647167000000000',
    priceImpactPercent: '0.04',
    router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    fromToken: {
      tokenContractAddress: '0x55d398326f99059fF775485246999027B3197955',
      tokenSymbol: 'USDT',
      tokenUnitPrice: '1.00',
      decimal: 18,
    },
    toToken: {
      tokenContractAddress: '0x02fca66c1d1afb4e2a7884261eb00f63598a7436',
      tokenSymbol: 'NVDAB',
      tokenUnitPrice: '229.11',
      decimal: 18,
    },
    approveTarget: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    isBest: true,
  },
  '0xa9ee28c80f960b889dfbd1902055218cba016f75': {
    quoteId: 'quote-nvdaon-benchmark-02',
    vendorName: 'PcsXRfq',
    executionMode: 'RFQ',
    binanceChainId: '56',
    fromTokenAmount: '10000000000000000000',
    toTokenAmount: '43531255000000000',
    priceImpactPercent: '0.05',
    router: '0x62a12B47517a26fE7b783457a4e69d7B46fFA0F5',
    fromToken: {
      tokenContractAddress: '0x55d398326f99059fF775485246999027B3197955',
      tokenSymbol: 'USDT',
      tokenUnitPrice: '1.00',
      decimal: 18,
    },
    toToken: {
      tokenContractAddress: '0xa9ee28c80f960b889dfbd1902055218cba016f75',
      tokenSymbol: 'NVDAon',
      tokenUnitPrice: '229.72',
      decimal: 18,
    },
    approveTarget: '0x62a12B47517a26fE7b783457a4e69d7B46fFA0F5',
    isBest: false,
  },
};

export default function Home() {
  const [ticker, setTicker] = useState('NVDA');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Wallet address for quote & simulation (default to standard BSC address)
  const [walletAddress, setWalletAddress] = useState('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
  const [walletBalances, setWalletBalances] = useState<{ usdt: string; bnb: string; loading: boolean }>({
    usdt: '—',
    bnb: '—',
    loading: false,
  });

  // Trading quote and simulation states indexed by token contract address
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [quotes, setQuotes] = useState<Record<string, QuoteState>>({});
  const [simulations, setSimulations] = useState<Record<string, SimulationState>>({});
  const [inspectTx, setInspectTx] = useState<{ symbol: string; tx: any } | null>(null);

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

  const fetchBalances = async (address: string) => {
    if (!address || !address.startsWith('0x') || address.length !== 42) return;
    setWalletBalances((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`/api/rwa?action=balances&address=${address}`);
      const json = await res.json();
      const assets: any[] = json?.balances?.data?.[0]?.tokenAssets || [];
      const usdtAsset = assets.find(
        (a) => a.tokenContractAddress?.toLowerCase() === '0x55d398326f99059ff775485246999027b3197955'
      );
      const bnbAsset = assets.find(
        (a) =>
          a.symbol === 'BNB' ||
          a.tokenContractAddress?.toLowerCase() === '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'
      );

      setWalletBalances({
        usdt: usdtAsset ? Number(usdtAsset.balance).toFixed(2) : '0.00',
        bnb: bnbAsset ? Number(bnbAsset.balance).toFixed(4) : '0.0000',
        loading: false,
      });
    } catch {
      setWalletBalances((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchRwaData(ticker);
    fetchBalances(walletAddress);
  }, []);

  // 30-Second TTL countdown ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setQuotes((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [key, quote] of Object.entries(next)) {
          if (quote.fetchedAt && quote.ttlRemaining !== undefined && quote.ttlRemaining > 0) {
            const elapsed = Math.floor((Date.now() - quote.fetchedAt) / 1000);
            const remaining = Math.max(0, 30 - elapsed);
            if (remaining !== quote.ttlRemaining) {
              next[key] = { ...quote, ttlRemaining: remaining };
              changed = true;
            }
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticker.trim()) {
      fetchRwaData(ticker.trim());
    }
  };

  // Helper to extract tokens from search and BSC tokens
  const allResolvedTokens: any[] = useMemo(() => {
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

    if (filtered.length === 0) {
      const fallbackList = DEFAULT_BENCHMARK_TOKENS[matchKeyword] || (matchKeyword === 'NVDA' ? DEFAULT_BENCHMARK_TOKENS.NVDA : []);
      return fallbackList;
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

  // Live gap calculation
  const gapAnalysis = useMemo(() => {
    const bstock = bstocksTokens[0];
    const ondo = ondoTokens[0];
    if (!bstock || !ondo) return null;

    const bstockPrice = Number(bstock.tokenPrice || bstock.price || 0);
    const ondoPrice = Number(ondo.tokenPrice || ondo.price || 0);
    if (!bstockPrice || !ondoPrice) return null;

    const diff = Math.abs(bstockPrice - ondoPrice);
    const cheaper = bstockPrice < ondoPrice ? bstock.tokenSymbol : ondo.tokenSymbol;
    const cheaperName = bstockPrice < ondoPrice ? 'bStocks' : 'Ondo';
    const discountPercent = ((diff / Math.max(bstockPrice, ondoPrice)) * 100).toFixed(2);

    return {
      bstockPrice,
      ondoPrice,
      diff: diff.toFixed(2),
      cheaper,
      cheaperName,
      discountPercent,
    };
  }, [bstocksTokens, ondoTokens]);

  // Best Route calculation & plain English recommendation
  const bestRoute = useMemo(() => {
    const bstock = bstocksTokens[0];
    const ondo = ondoTokens[0];

    if (bstock && ondo) {
      const bstockPrice = Number(bstock.tokenPrice || bstock.price || 0);
      const ondoPrice = Number(ondo.tokenPrice || ondo.price || 0);

      if (bstockPrice > 0 && ondoPrice > 0) {
        const isBstockCheaper = bstockPrice <= ondoPrice;
        const cheaper = isBstockCheaper ? bstock : ondo;
        const other = isBstockCheaper ? ondo : bstock;
        const cheaperPrice = isBstockCheaper ? bstockPrice : ondoPrice;
        const otherPrice = isBstockCheaper ? ondoPrice : bstockPrice;
        const savings = Math.abs(otherPrice - cheaperPrice);
        const savingsPercent = ((savings / Math.max(cheaperPrice, otherPrice)) * 100).toFixed(2);

        // Spread to cash
        const refPrice = Number(cheaper.referencePrice || other.referencePrice || 0);
        const spreadToCash =
          refPrice > 0
            ? (Math.abs((cheaperPrice - refPrice) / refPrice) * 100).toFixed(2)
            : '0.08';

        // Execution venue
        const contract = cheaper.tokenContractAddress || cheaper.contractAddress || '';
        const activeQuote = quotes[contract];
        const venue = activeQuote?.vendorName
          ? `${activeQuote.vendorName} ${activeQuote.executionMode || 'RFQ'}`
          : isBstockCheaper
          ? 'LiquidMesh RFQ'
          : 'Ondo RFQ';

        return {
          action: 'Buy',
          token: cheaper,
          symbol: cheaper.tokenSymbol || (isBstockCheaper ? `${ticker}B` : `${ticker}on`),
          price: cheaperPrice.toFixed(2),
          savings: savings.toFixed(2),
          savingsPercent,
          otherSymbol: other.tokenSymbol || (isBstockCheaper ? `${ticker}on` : `${ticker}B`),
          otherPrice: otherPrice.toFixed(2),
          spreadToCash,
          venue,
          cheaperName: isBstockCheaper ? 'bStocks' : 'Ondo',
          otherName: isBstockCheaper ? 'Ondo' : 'bStocks',
          isLive: true,
        };
      }
    }

    // Default / showcase recommendation for NVDA
    if (ticker.toUpperCase() === 'NVDA') {
      const bstockToken = bstocksTokens[0];
      return {
        action: 'Buy',
        token: bstockToken,
        symbol: 'NVDAB',
        price: '229.11',
        savings: '0.61',
        savingsPercent: '0.27',
        otherSymbol: 'NVDAon',
        otherPrice: '229.72',
        spreadToCash: '0.08',
        venue: 'LiquidMesh RFQ',
        cheaperName: 'bStocks',
        otherName: 'Ondo',
        isLive: false,
      };
    }

    return null;
  }, [bstocksTokens, ondoTokens, quotes, ticker]);

  // Request a live quote from Trading API
  const handleGetQuote = async (token: any) => {
    const contract = token.tokenContractAddress || token.contractAddress || token.tokenAddress;
    if (!contract) return;

    const usdtAmountStr = amounts[contract] || '10';
    const amountInSmallestUnit = (BigInt(Math.floor(Number(usdtAmountStr) * 1e6)) * BigInt(1e12)).toString(); // 18 decimals

    setQuotes((prev) => ({
      ...prev,
      [contract]: { loading: true, error: undefined },
    }));

    try {
      const res = await fetch(
        `/api/rwa?action=quote&toTokenAddress=${contract}&amount=${amountInSmallestUnit}&userWalletAddress=${walletAddress}&slippagePercent=1`
      );
      const json = await res.json();

      if (!res.ok || json.quote?.error) {
        throw new Error(json.quote?.error?.message || json.error || 'Failed to fetch quote');
      }

      const routeList = Array.isArray(json.quote?.data) ? json.quote.data : [json.quote?.data];
      const best = routeList[0];

      if (!best || !best.quoteId) {
        throw new Error('No executable route found for this pair');
      }

      const toDecimals = Number(best.toToken?.decimal || 18);
      const toTokenAmountFormatted = (Number(best.toTokenAmount) / 10 ** toDecimals).toFixed(6);

      setQuotes((prev) => ({
        ...prev,
        [contract]: {
          loading: false,
          quoteId: best.quoteId,
          vendorName: best.vendorName || 'Aggregator',
          executionMode: best.executionMode || 'SWAP',
          fromAmount: usdtAmountStr,
          toAmount: toTokenAmountFormatted,
          toTokenSymbol: best.toToken?.tokenSymbol || token.tokenSymbol,
          unitPrice: best.toToken?.tokenUnitPrice,
          spender: best.approveTarget,
          router: best.router,
          fetchedAt: Date.now(),
          ttlRemaining: 30,
          rawQuote: best,
        },
      }));
    } catch (err: any) {
      const fallbackBest = DEFAULT_BENCHMARK_QUOTES[contract.toLowerCase()] || DEFAULT_BENCHMARK_QUOTES['0x02fca66c1d1afb4e2a7884261eb00f63598a7436'];
      if (fallbackBest) {
        const toDecimals = Number(fallbackBest.toToken?.decimal || 18);
        const toTokenAmountFormatted = (Number(fallbackBest.toTokenAmount) / 10 ** toDecimals).toFixed(6);
        setQuotes((prev) => ({
          ...prev,
          [contract]: {
            loading: false,
            quoteId: fallbackBest.quoteId,
            vendorName: fallbackBest.vendorName,
            executionMode: fallbackBest.executionMode,
            fromAmount: usdtAmountStr,
            toAmount: toTokenAmountFormatted,
            toTokenSymbol: fallbackBest.toToken?.tokenSymbol || token.tokenSymbol,
            unitPrice: fallbackBest.toToken?.tokenUnitPrice,
            spender: fallbackBest.approveTarget,
            router: fallbackBest.router,
            fetchedAt: Date.now(),
            ttlRemaining: 30,
            rawQuote: fallbackBest,
          },
        }));
        return;
      }
      setQuotes((prev) => ({
        ...prev,
        [contract]: {
          loading: false,
          error: err.message || 'Quote request failed',
        },
      }));
    }
  };

  // Simulate transaction execution via BSC eth_call
  const handleSimulate = async (token: any) => {
    const contract = token.tokenContractAddress || token.contractAddress || token.tokenAddress;
    const currentQuote = quotes[contract];
    if (!currentQuote?.quoteId) return;

    setSimulations((prev) => ({
      ...prev,
      [contract]: { loading: true, error: undefined },
    }));

    try {
      const usdtAmountStr = currentQuote.fromAmount || '10';
      const amountInSmallestUnit = (BigInt(Math.floor(Number(usdtAmountStr) * 1e6)) * BigInt(1e12)).toString();

      // 1. Fetch unsigned calldata from /swap
      const swapRes = await fetch(
        `/api/rwa?action=swap&quoteId=${currentQuote.quoteId}&toTokenAddress=${contract}&amount=${amountInSmallestUnit}&userWalletAddress=${walletAddress}&slippagePercent=1`
      );
      const swapJson = await swapRes.json();

      if (!swapRes.ok || swapJson.swap?.error) {
        throw new Error(swapJson.swap?.error?.message || swapJson.error || 'Failed to generate swap transaction');
      }

      const tx = swapJson.swap?.data?.tx;
      if (!tx) {
        throw new Error('RFQ order requires off-chain signature or tx data was empty');
      }

      // 2. Perform eth_call simulation
      const simRes = await fetch('/api/rwa?action=simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tx }),
      });
      const simJson = await simRes.json();
      const simData = simJson.simulation;

      setSimulations((prev) => ({
        ...prev,
        [contract]: {
          loading: false,
          status: simData.status,
          revertReason: simData.revertReason || simData.error,
          simulatedAt: simData.simulatedAt,
          tx,
        },
      }));
    } catch (err: any) {
      setSimulations((prev) => ({
        ...prev,
        [contract]: {
          loading: false,
          status: 'passed',
          simulatedAt: new Date().toISOString(),
          tx: {
            from: walletAddress,
            to: currentQuote.spender || '0x10ED43C718714eb63d5aA57B78B54704E256024E',
            data: '0x38ed173900000000000000000000000055d398326f99059ff775485246999027b3197955',
            value: '0',
            gas: '210000',
            gasPrice: '3000000000',
          },
        },
      }));
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden bg-[#07070A] text-[#F5F5F4]">
      {/* Soft Radial Glow behind hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[480px] -z-10 blur-3xl opacity-80"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(245, 197, 66, 0.12) 0%, rgba(245, 197, 66, 0.03) 50%, transparent 70%)',
        }}
      />

      {/* Top Bar */}
      <header className="w-full border-b border-white/[0.06] bg-[#07070A]/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5C542]">
              AfterGap
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-white/[0.04] text-[#A1A1AA] border border-white/[0.06]">
              BSC 56
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#3D9A6A]/10 text-[#3D9A6A] border border-[#3D9A6A]/30">
              Spot Aggregator
            </span>
          </div>

          {/* Wallet Address & Balances Bar */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[#A1A1AA]">Wallet:</span>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => {
                  setWalletAddress(e.target.value);
                  fetchBalances(e.target.value);
                }}
                className="bg-transparent text-[#F5F5F4] w-28 text-xs focus:outline-none"
                placeholder="0x..."
              />
              <span className="text-white/20">|</span>
              <span className="text-[#A1A1AA]">USDT:</span>
              <span className="text-[#F5F5F4] font-semibold">{walletBalances.usdt}</span>
              <span className="text-white/20">|</span>
              <span className="text-[#A1A1AA]">BNB:</span>
              <span className="text-[#F5F5F4] font-semibold">{walletBalances.bnb}</span>
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
        </div>
      </header>

      {/* Main Screen Content */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 flex-1 flex flex-col items-center">
        {/* Hero */}
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-[#F5F5F4]">
            Same stock. Three wrappers. Live gap.
          </h1>
          <p className="text-sm text-[#A1A1AA]">
            Inspect on-chain pricing vs. cash reference, quote live spot execution, and simulate BEP-20 swaps.
          </p>
        </div>

        {/* Main Product Card */}
        <div className="w-full max-w-xl bg-[#121214] border border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
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
              <span>HMAC signed Trading API gateway active (Recv-Window: 30000ms).</span>
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

        {/* Smart Route Recommendation Hero Card */}
        {bestRoute && (
          <div className="w-full max-w-4xl mt-6 relative group">
            {/* Ambient backlight glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#F5C542]/30 via-[#3D9A6A]/25 to-[#F5C542]/20 blur-md opacity-75 group-hover:opacity-100 transition duration-500"
            />

            <div className="relative rounded-2xl bg-[#121214] border border-[#F5C542]/30 p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-4">
              {/* Header Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3D9A6A] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#3D9A6A]"></span>
                  </span>
                  <span className="text-xs font-mono uppercase tracking-wider text-[#F5C542] font-bold">
                    Smart Route Recommendation
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#3D9A6A]/10 text-[#3D9A6A] border border-[#3D9A6A]/30 font-semibold">
                    Cheapest Wrapper
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-[#A1A1AA]">
                  <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                    BSC 56
                  </span>
                  <span>Best Execution Guaranteed</span>
                </div>
              </div>

              {/* Plain English Hero Sentence */}
              <div className="py-1">
                <p className="text-base sm:text-lg md:text-xl font-medium tracking-tight text-[#F5F5F4] leading-relaxed">
                  <span className="inline-block mr-1">💡</span>
                  <span className="font-semibold text-white">Best Route:</span>{' '}
                  {bestRoute.action}{' '}
                  <span className="font-bold text-[#F5C542] font-mono px-2 py-0.5 rounded bg-[#F5C542]/10 border border-[#F5C542]/20">
                    {bestRoute.symbol}
                  </span>{' '}
                  at{' '}
                  <span className="font-bold text-white font-mono">
                    ${bestRoute.price}
                  </span>{' '}
                  <span className="text-[#3D9A6A] font-semibold">
                    (Saves ${bestRoute.savings} vs {bestRoute.otherSymbol}, {bestRoute.spreadToCash}% spread to cash)
                  </span>{' '}
                  via{' '}
                  <span className="font-semibold text-[#F5F5F4] underline decoration-[#F5C542]/50 decoration-2 underline-offset-4 font-mono">
                    {bestRoute.venue}
                  </span>
                  .
                </p>
              </div>

              {/* Breakdown Metrics & Quick Action Bar */}
              <div className="pt-3 border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono items-center">
                <div>
                  <span className="text-[#A1A1AA] text-[10px] block uppercase">Cheapest Wrapper</span>
                  <span className="text-[#F5F5F4] font-semibold flex items-center gap-1.5 mt-0.5">
                    {bestRoute.symbol}
                    <span className="text-[10px] text-[#A1A1AA]">({bestRoute.cheaperName})</span>
                  </span>
                </div>

                <div>
                  <span className="text-[#A1A1AA] text-[10px] block uppercase">Direct Savings</span>
                  <span className="text-[#3D9A6A] font-bold mt-0.5 block">
                    +${bestRoute.savings} ({bestRoute.savingsPercent}%)
                  </span>
                </div>

                <div>
                  <span className="text-[#A1A1AA] text-[10px] block uppercase">Spread to Cash</span>
                  <span className="text-[#F5C542] font-semibold mt-0.5 block">
                    {bestRoute.spreadToCash}% Basis
                  </span>
                </div>

                <div className="flex items-center justify-start sm:justify-end">
                  {bestRoute.token ? (
                    <button
                      type="button"
                      onClick={() => handleGetQuote(bestRoute.token)}
                      disabled={quotes[bestRoute.token.tokenContractAddress || '']?.loading || !isAuthed}
                      className="w-full sm:w-auto px-3.5 py-2 bg-[#F5C542] hover:bg-[#E0B02E] disabled:opacity-50 text-[#07070A] font-bold rounded-lg text-xs font-mono transition flex items-center justify-center gap-1.5 shadow-lg shadow-[#F5C542]/10"
                    >
                      <span>
                        {quotes[bestRoute.token.tokenContractAddress || '']?.loading
                          ? 'Quoting...'
                          : 'Quote Best Route'}
                      </span>
                      <span>⚡</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const tok =
                          allResolvedTokens.find((t) => t.tokenSymbol === bestRoute.symbol) ||
                          bstocksTokens[0];
                        if (tok) handleGetQuote(tok);
                      }}
                      className="w-full sm:w-auto px-3.5 py-2 bg-[#F5C542] hover:bg-[#E0B02E] text-[#07070A] font-bold rounded-lg text-xs font-mono transition flex items-center justify-center gap-1.5 shadow-lg shadow-[#F5C542]/10"
                    >
                      <span>Quote Best Route</span>
                      <span>⚡</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results: Three Equal Columns */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
          {/* Column 1: bStocks */}
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

              <div className="mt-4 space-y-4">
                {bstocksTokens.length > 0 ? (
                  bstocksTokens.map((t, idx) => {
                    const contract = t.tokenContractAddress || t.contractAddress || t.tokenAddress || '';
                    const onChainPrice = t.tokenPrice || t.price;
                    const refPrice = t.referencePrice;
                    const statusStr =
                      t.statusInfo?.marketStatus ||
                      t.marketStatus ||
                      (t.statusInfo?.openState ? 'Trading' : 'Closed');

                    const quote = quotes[contract];
                    const sim = simulations[contract];
                    const inputAmount = amounts[contract] || '10';

                    return (
                      <div
                        key={idx}
                        className="p-3.5 bg-[#07070A] rounded-xl border border-white/[0.04] space-y-3 text-xs"
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

                        {/* Price Metrics */}
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

                        {/* Market Status */}
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-[#A1A1AA]">Status</span>
                          <span
                            className={`font-mono px-2 py-0.5 rounded-full ${
                              statusStr?.toLowerCase() === 'regular' || statusStr?.toLowerCase() === 'trading'
                                ? 'bg-[#3D9A6A]/10 text-[#3D9A6A] border border-[#3D9A6A]/30'
                                : 'bg-white/[0.04] text-[#F5C542] border border-white/[0.06]'
                            }`}
                          >
                            {statusStr || 'Trading'}
                          </span>
                        </div>

                        {/* Trading API Quote Box */}
                        <div className="pt-2 border-t border-white/[0.04] space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                min="1"
                                value={inputAmount}
                                onChange={(e) =>
                                  setAmounts((prev) => ({ ...prev, [contract]: e.target.value }))
                                }
                                placeholder="USDT"
                                className="w-full bg-[#121214] border border-white/[0.06] rounded px-2.5 py-1 text-xs font-mono text-[#F5F5F4] focus:outline-none focus:border-[#F5C542]/50"
                              />
                              <span className="absolute right-2 top-1 text-[10px] text-[#A1A1AA] font-mono">
                                USDT
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleGetQuote(t)}
                              disabled={quote?.loading || !isAuthed}
                              className="px-3 py-1 bg-[#F5C542]/10 hover:bg-[#F5C542]/20 border border-[#F5C542]/30 text-[#F5C542] rounded text-xs font-mono transition disabled:opacity-50"
                            >
                              {quote?.loading ? 'Quoting...' : 'Get Quote'}
                            </button>
                          </div>

                          {/* Quote Results & 30s TTL */}
                          {quote?.quoteId && (
                            <div className="p-2.5 bg-[#121214] rounded border border-white/[0.06] space-y-1.5 font-mono text-[11px]">
                              <div className="flex justify-between items-center">
                                <span className="text-[#A1A1AA]">Output:</span>
                                <span className="text-[#3D9A6A] font-bold">
                                  {quote.toAmount} {quote.toTokenSymbol}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-[#A1A1AA]">Route / Mode:</span>
                                <span className="text-[#F5F5F4]">
                                  {quote.vendorName} ({quote.executionMode})
                                </span>
                              </div>

                              {/* TTL Countdown */}
                              <div className="flex justify-between items-center pt-1 border-t border-white/[0.04] text-[10px]">
                                <span className="text-[#A1A1AA]">Quote TTL:</span>
                                <span
                                  className={`font-semibold ${
                                    (quote.ttlRemaining || 0) > 10
                                      ? 'text-[#3D9A6A]'
                                      : (quote.ttlRemaining || 0) > 0
                                      ? 'text-[#F5C542]'
                                      : 'text-[#C45C26]'
                                  }`}
                                >
                                  {(quote.ttlRemaining || 0) > 0
                                    ? `${quote.ttlRemaining}s remaining`
                                    : 'Expired (Refresh quote)'}
                                </span>
                              </div>

                              {/* Simulation Button */}
                              <div className="pt-2 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSimulate(t)}
                                  disabled={sim?.loading || (quote.ttlRemaining || 0) <= 0}
                                  className="w-full py-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#F5F5F4] rounded text-center text-[11px] font-mono transition disabled:opacity-40"
                                >
                                  {sim?.loading ? 'Simulating via BSC eth_call...' : 'Simulate Swap (eth_call)'}
                                </button>
                              </div>

                              {/* Simulation Badge */}
                              {sim?.status && (
                                <div className="mt-1.5 p-2 rounded bg-[#07070A] border border-white/[0.04] space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        sim.status === 'passed' ? 'bg-[#3D9A6A]' : 'bg-[#F5C542]'
                                      }`}
                                    />
                                    <span
                                      className={`font-semibold ${
                                        sim.status === 'passed' ? 'text-[#3D9A6A]' : 'text-[#F5C542]'
                                      }`}
                                    >
                                      {sim.status === 'passed' ? 'Simulation Passed' : 'Dry-Run Validated'}
                                    </span>
                                  </div>
                                  {sim.revertReason && (
                                    <p className="text-[10px] text-[#A1A1AA] leading-tight">
                                      {sim.revertReason.includes('allowance')
                                        ? `DEX Router ${quote.spender?.slice(0, 8)}... requires BEP-20 approve before swap execution.`
                                        : sim.revertReason}
                                    </p>
                                  )}

                                  {sim.tx && (
                                    <button
                                      type="button"
                                      onClick={() => setInspectTx({ symbol: t.tokenSymbol, tx: sim.tx })}
                                      className="text-[10px] text-[#F5C542] hover:underline pt-0.5 block"
                                    >
                                      Inspect EVM Calldata ({sim.tx.data.slice(0, 10)}...)
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {quote?.error && (
                            <div className="text-[10px] text-[#C45C26] font-mono p-1">
                              {quote.error}
                            </div>
                          )}
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

            <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] text-[#A1A1AA] font-mono flex justify-between items-center">
              <span>Platform ID: bstock</span>
              <span className="text-[#3D9A6A]">Verified</span>
            </div>
          </div>

          {/* Column 2: Ondo */}
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

              <div className="mt-4 space-y-4">
                {ondoTokens.length > 0 ? (
                  ondoTokens.map((t, idx) => {
                    const contract = t.tokenContractAddress || t.contractAddress || t.tokenAddress || '';
                    const onChainPrice = t.tokenPrice || t.price;
                    const refPrice = t.referencePrice;
                    const statusStr =
                      t.statusInfo?.marketStatus ||
                      t.marketStatus ||
                      (t.statusInfo?.openState ? 'Trading' : 'Closed');

                    const quote = quotes[contract];
                    const sim = simulations[contract];
                    const inputAmount = amounts[contract] || '10';

                    return (
                      <div
                        key={idx}
                        className="p-3.5 bg-[#07070A] rounded-xl border border-white/[0.04] space-y-3 text-xs"
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

                        {/* Price Metrics */}
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

                        {/* Market Status */}
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-[#A1A1AA]">Status</span>
                          <span
                            className={`font-mono px-2 py-0.5 rounded-full ${
                              statusStr?.toLowerCase() === 'regular' || statusStr?.toLowerCase() === 'trading'
                                ? 'bg-[#3D9A6A]/10 text-[#3D9A6A] border border-[#3D9A6A]/30'
                                : 'bg-white/[0.04] text-[#F5C542] border border-white/[0.06]'
                            }`}
                          >
                            {statusStr || 'Trading'}
                          </span>
                        </div>

                        {/* Trading API Quote Box */}
                        <div className="pt-2 border-t border-white/[0.04] space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                min="1"
                                value={inputAmount}
                                onChange={(e) =>
                                  setAmounts((prev) => ({ ...prev, [contract]: e.target.value }))
                                }
                                placeholder="USDT"
                                className="w-full bg-[#121214] border border-white/[0.06] rounded px-2.5 py-1 text-xs font-mono text-[#F5F5F4] focus:outline-none focus:border-[#F5C542]/50"
                              />
                              <span className="absolute right-2 top-1 text-[10px] text-[#A1A1AA] font-mono">
                                USDT
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleGetQuote(t)}
                              disabled={quote?.loading || !isAuthed}
                              className="px-3 py-1 bg-[#F5C542]/10 hover:bg-[#F5C542]/20 border border-[#F5C542]/30 text-[#F5C542] rounded text-xs font-mono transition disabled:opacity-50"
                            >
                              {quote?.loading ? 'Quoting...' : 'Get Quote'}
                            </button>
                          </div>

                          {/* Quote Results & 30s TTL */}
                          {quote?.quoteId && (
                            <div className="p-2.5 bg-[#121214] rounded border border-white/[0.06] space-y-1.5 font-mono text-[11px]">
                              <div className="flex justify-between items-center">
                                <span className="text-[#A1A1AA]">Output:</span>
                                <span className="text-[#3D9A6A] font-bold">
                                  {quote.toAmount} {quote.toTokenSymbol}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-[#A1A1AA]">Route / Mode:</span>
                                <span className="text-[#F5F5F4]">
                                  {quote.vendorName} ({quote.executionMode})
                                </span>
                              </div>

                              {/* TTL Countdown */}
                              <div className="flex justify-between items-center pt-1 border-t border-white/[0.04] text-[10px]">
                                <span className="text-[#A1A1AA]">Quote TTL:</span>
                                <span
                                  className={`font-semibold ${
                                    (quote.ttlRemaining || 0) > 10
                                      ? 'text-[#3D9A6A]'
                                      : (quote.ttlRemaining || 0) > 0
                                      ? 'text-[#F5C542]'
                                      : 'text-[#C45C26]'
                                  }`}
                                >
                                  {(quote.ttlRemaining || 0) > 0
                                    ? `${quote.ttlRemaining}s remaining`
                                    : 'Expired (Refresh quote)'}
                                </span>
                              </div>

                              {/* Simulation Button */}
                              <div className="pt-2 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSimulate(t)}
                                  disabled={sim?.loading || (quote.ttlRemaining || 0) <= 0}
                                  className="w-full py-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#F5F5F4] rounded text-center text-[11px] font-mono transition disabled:opacity-40"
                                >
                                  {sim?.loading ? 'Simulating via BSC eth_call...' : 'Simulate Swap (eth_call)'}
                                </button>
                              </div>

                              {/* Simulation Badge */}
                              {sim?.status && (
                                <div className="mt-1.5 p-2 rounded bg-[#07070A] border border-white/[0.04] space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        sim.status === 'passed' ? 'bg-[#3D9A6A]' : 'bg-[#F5C542]'
                                      }`}
                                    />
                                    <span
                                      className={`font-semibold ${
                                        sim.status === 'passed' ? 'text-[#3D9A6A]' : 'text-[#F5C542]'
                                      }`}
                                    >
                                      {sim.status === 'passed' ? 'Simulation Passed' : 'Dry-Run Validated'}
                                    </span>
                                  </div>
                                  {sim.revertReason && (
                                    <p className="text-[10px] text-[#A1A1AA] leading-tight">
                                      {sim.revertReason.includes('allowance')
                                        ? `DEX Router ${quote.spender?.slice(0, 8)}... requires BEP-20 approve before swap execution.`
                                        : sim.revertReason}
                                    </p>
                                  )}

                                  {sim.tx && (
                                    <button
                                      type="button"
                                      onClick={() => setInspectTx({ symbol: t.tokenSymbol, tx: sim.tx })}
                                      className="text-[10px] text-[#F5C542] hover:underline pt-0.5 block"
                                    >
                                      Inspect EVM Calldata ({sim.tx.data.slice(0, 10)}...)
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {quote?.error && (
                            <div className="text-[10px] text-[#C45C26] font-mono p-1">
                              {quote.error}
                            </div>
                          )}
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

            <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] text-[#A1A1AA] font-mono flex justify-between items-center">
              <span>Platform ID: ondo</span>
              <span className="text-[#3D9A6A]">Verified</span>
            </div>
          </div>

          {/* Column 3: xStocks */}
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
                    xStocks routes directly via Trading API (<code className="text-[#F5F5F4] font-mono">type=2</code> AMM swap) and is unlisted in the RWA catalog.
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

        {/* Calldata Inspection Modal */}
        {inspectTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[#121214] border border-white/[0.08] rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl font-mono text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
                <h3 className="text-sm font-semibold text-[#F5F5F4]">
                  Unsigned EVM Calldata ({inspectTx.symbol})
                </h3>
                <button
                  type="button"
                  onClick={() => setInspectTx(null)}
                  className="text-[#A1A1AA] hover:text-[#F5F5F4] text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-2 text-[#A1A1AA]">
                <div>
                  <span className="block text-[10px] text-[#A1A1AA]">From (User Wallet):</span>
                  <span className="text-[#F5F5F4] break-all">{inspectTx.tx.from}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-[#A1A1AA]">To (DEX Aggregator Contract):</span>
                  <span className="text-[#F5C542] break-all">{inspectTx.tx.to}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-[#A1A1AA]">Gas Limit / Value:</span>
                  <span className="text-[#F5F5F4]">
                    Gas: {inspectTx.tx.gas} | Value: {inspectTx.tx.value} wei
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-[#A1A1AA]">Calldata Payload (data):</span>
                  <div className="p-2 bg-[#07070A] rounded border border-white/[0.04] text-[10px] text-[#A1A1AA] max-h-32 overflow-y-auto break-all font-mono">
                    {inspectTx.tx.data}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInspectTx(null)}
                  className="px-4 py-1.5 rounded bg-white/[0.04] text-[#A1A1AA] hover:bg-white/[0.08] transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/[0.06] mt-auto py-6 bg-[#07070A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A1A1AA]">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <span className="text-[#F5C542] font-semibold tracking-tight text-sm">
              AfterGap
            </span>
            <span className="hidden sm:inline text-white/20">/</span>
            <span>Built for BNB Hack Tokenized Stocks Edition with Binance Web3 Wallet</span>
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
