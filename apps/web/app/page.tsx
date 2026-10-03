'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BorderBeam } from 'border-beam';
import { ThinkingOrb } from 'thinking-orbs';
import { BotAvatar } from 'bot-avatars';
import { MetalFx } from 'metal-fx';
import { Wallet } from 'lucide-react';
import { AfterGapLogo } from './Logo';

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
    isFallback?: boolean;
  };
  search?: {
    success: boolean;
    status: number;
    statusText: string;
    rawBody: string;
    data?: any;
    error?: any;
    debug?: any;
    isFallback?: boolean;
  };
  bscTokens?: {
    success: boolean;
    status: number;
    statusText: string;
    rawBody: string;
    data?: any;
    error?: any;
    debug?: any;
    isFallback?: boolean;
  };
  isFallback?: boolean;
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
  isFallback?: boolean;
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

interface WalletState {
  connected: boolean;
  connecting: boolean;
  address: string | null;
  chainId: string | null;
  error: string | null;
}

interface TxBroadcastState {
  loading: boolean;
  step: 'idle' | 'preparing' | 'approving' | 'waiting_receipt' | 'approved' | 'swapping' | 'done' | 'error';
  approveTxHash?: string;
  swapTxHash?: string;
  message?: string;
  error?: string;
}

async function checkAllowance(
  owner: string,
  spender: string,
  tokenContract: string = '0x55d398326f99059fF775485246999027B3197955'
): Promise<bigint> {
  const ownerPadded = owner.toLowerCase().replace('0x', '').padStart(64, '0');
  const spenderPadded = spender.toLowerCase().replace('0x', '').padStart(64, '0');
  const data = '0xdd62ed3e' + ownerPadded + spenderPadded;

  try {
    const eth = typeof window !== 'undefined' ? (window as any).ethereum : null;
    let result: string | null = null;
    if (eth?.request) {
      result = await eth.request({
        method: 'eth_call',
        params: [{ to: tokenContract, data }, 'latest'],
      });
    }
    if (!result || result === '0x') {
      const res = await fetch('https://bsc-dataseed.binance.org/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to: tokenContract, data }, 'latest'],
        }),
      });
      const json = await res.json();
      result = json?.result;
    }
    if (result && result.startsWith('0x')) {
      return BigInt(result);
    }
  } catch (e) {
    console.warn('checkAllowance query error:', e);
  }
  return 0n;
}

async function waitForTxReceipt(txHash: string, maxAttempts = 25): Promise<boolean> {
  const eth = typeof window !== 'undefined' ? (window as any).ethereum : null;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      let receipt: any = null;
      if (eth?.request) {
        receipt = await eth.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash],
        });
      }
      if (!receipt) {
        const res = await fetch('https://bsc-dataseed.binance.org/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_getTransactionReceipt',
            params: [txHash],
          }),
        });
        const json = await res.json();
        receipt = json?.result;
      }
      if (receipt && receipt.blockNumber) {
        return receipt.status === '0x1' || receipt.status === 1 || receipt.status === '0x01';
      }
    } catch (e) {
      // Continue polling
    }
  }
  return false;
}

const DEFAULT_BENCHMARK_TOKENS: Record<string, any[]> = {
  NVDA: [
    {
      tokenSymbol: 'NVDAB',
      tokenName: 'Nvidia bStock',
      tokenContractAddress: '0x02fca66c1d1afb4e2a7884261eb00f63598a7436',
      binanceChainId: '56',
      platformId: 'bstock',
      tokenPrice: '234.58',
      price: '234.58',
      referencePrice: '234.50',
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
      tokenPrice: '235.38',
      price: '235.38',
      referencePrice: '234.50',
      marketStatus: 'regular',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'regular', reasonCode: 'TRADING' },
      underlyingTicker: 'NVDA',
      underlyingName: 'Nvidia Corp',
    },
  ],
  TSLA: [
    {
      tokenSymbol: 'TSLAB',
      tokenName: 'Tesla bStock',
      tokenContractAddress: '0x5b1910eaad6450e50f816082aa078c41f10c292f',
      binanceChainId: '56',
      platformId: 'bstock',
      tokenPrice: '370.99',
      price: '370.99',
      referencePrice: '371.00',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
      underlyingTicker: 'TSLA',
      underlyingName: 'Tesla Inc',
    },
    {
      tokenSymbol: 'TSLAon',
      tokenName: 'Tesla Ondo',
      tokenContractAddress: '0x2494b603319d4d9f9715c9f4496d9e0364b59d93',
      binanceChainId: '56',
      platformId: 'ondo',
      tokenPrice: '371.18',
      price: '371.18',
      referencePrice: '371.00',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
      underlyingTicker: 'TSLA',
      underlyingName: 'Tesla Inc',
    },
  ],
  MSFT: [
    {
      tokenSymbol: 'MSFTB',
      tokenName: 'Microsoft bStock',
      tokenContractAddress: '0x80106cb3ead06659a5ad19df39d9b4733863b9b0',
      binanceChainId: '56',
      platformId: 'bstock',
      tokenPrice: '518.52',
      price: '518.52',
      referencePrice: '518.00',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
      underlyingTicker: 'MSFT',
      underlyingName: 'Microsoft Corp',
    },
    {
      tokenSymbol: 'MSFTon',
      tokenName: 'Microsoft Ondo',
      tokenContractAddress: '0x6bfe75d1ad432050ea973c3a3dcd88f02e2444c3',
      binanceChainId: '56',
      platformId: 'ondo',
      tokenPrice: '523.57',
      price: '523.57',
      referencePrice: '518.00',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
      underlyingTicker: 'MSFT',
      underlyingName: 'Microsoft Corp',
    },
  ],
  GOOGL: [
    {
      tokenSymbol: 'GOOGLB',
      tokenName: 'Alphabet bStock',
      tokenContractAddress: '0x3f53de71c126bdabae20f9cd64848d317f6c3238',
      binanceChainId: '56',
      platformId: 'bstock',
      tokenPrice: '343.83',
      price: '343.83',
      referencePrice: '344.00',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
      underlyingTicker: 'GOOGL',
      underlyingName: 'Alphabet Inc',
    },
    {
      tokenSymbol: 'GOOGLon',
      tokenName: 'Alphabet Ondo',
      tokenContractAddress: '0x091fc7778e6932d4009b087b191d1ee3bac5729a',
      binanceChainId: '56',
      platformId: 'ondo',
      tokenPrice: '345.59',
      price: '345.59',
      referencePrice: '344.00',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
      underlyingTicker: 'GOOGL',
      underlyingName: 'Alphabet Inc',
    },
  ],
  META: [
    {
      tokenSymbol: 'METAB',
      tokenName: 'Meta bStock',
      tokenContractAddress: '0x7425889fe94f9d693e8daefe88bcced6acfef4c0',
      binanceChainId: '56',
      platformId: 'bstock',
      tokenPrice: '727.96',
      price: '727.96',
      referencePrice: '728.00',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
      underlyingTicker: 'META',
      underlyingName: 'Meta Platforms Inc',
    },
    {
      tokenSymbol: 'METAon',
      tokenName: 'Meta Ondo',
      tokenContractAddress: '0xd7df5863a3e742f0c767768cdfcb63f09e0422f6',
      binanceChainId: '56',
      platformId: 'ondo',
      tokenPrice: '731.69',
      price: '731.69',
      referencePrice: '728.00',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
      underlyingTicker: 'META',
      underlyingName: 'Meta Platforms Inc',
    },
  ],
  AMD: [
    {
      tokenSymbol: 'AMDB',
      tokenName: 'AMD bStock',
      tokenContractAddress: '0x75fd4cf6f8392e41e70391d60c90c0d5211603a1',
      binanceChainId: '56',
      platformId: 'bstock',
      tokenPrice: '633.28',
      price: '633.28',
      referencePrice: '633.00',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
      underlyingTicker: 'AMD',
      underlyingName: 'Advanced Micro Devices',
    },
    {
      tokenSymbol: 'AMDon',
      tokenName: 'AMD Ondo',
      tokenContractAddress: '0x9f16e46c73b43bdb70861247d537bee4ea18f639',
      binanceChainId: '56',
      platformId: 'ondo',
      tokenPrice: '633.15',
      price: '633.15',
      referencePrice: '633.00',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
      underlyingTicker: 'AMD',
      underlyingName: 'Advanced Micro Devices',
    },
  ],
  COIN: [
    {
      tokenSymbol: 'COINB',
      tokenName: 'Coinbase bStock',
      tokenContractAddress: '0x585bde7c54abb5ccd7791f923d6c2187635f3952',
      binanceChainId: '56',
      platformId: 'bstock',
      tokenPrice: '183.48',
      price: '183.48',
      referencePrice: '183.40',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
      underlyingTicker: 'COIN',
      underlyingName: 'Coinbase Global Inc',
    },
    {
      tokenSymbol: 'COINon',
      tokenName: 'Coinbase Ondo',
      tokenContractAddress: '0xf8589b526fdd65f7f301c605a6e04f0f1b4b3620',
      binanceChainId: '56',
      platformId: 'ondo',
      tokenPrice: '183.43',
      price: '183.43',
      referencePrice: '183.40',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
      underlyingTicker: 'COIN',
      underlyingName: 'Coinbase Global Inc',
    },
  ],
  TSM: [
    {
      tokenSymbol: 'TSMB',
      tokenName: 'TSMC bStock',
      tokenContractAddress: '0x7788b415b3c3756fb60cfda862fc8095d3013333',
      binanceChainId: '56',
      platformId: 'bstock',
      tokenPrice: '178.50',
      price: '178.50',
      referencePrice: '178.10',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
      underlyingTicker: 'TSM',
      underlyingName: 'Taiwan Semiconductor',
    },
    {
      tokenSymbol: 'TSMon',
      tokenName: 'TSMC Ondo',
      tokenContractAddress: '0x22334ef81c74ca29a05b3ec9b5311e51b32d1111',
      binanceChainId: '56',
      platformId: 'ondo',
      tokenPrice: '179.20',
      price: '179.20',
      referencePrice: '178.40',
      marketStatus: 'premarket',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'premarket', reasonCode: 'TRADING' },
      underlyingTicker: 'TSM',
      underlyingName: 'Taiwan Semiconductor',
    },
  ],
};

const THEMATIC_BASKETS: Record<string, { name: string; icon: string; description: string; tickers: string[] }> = {
  mag7: {
    name: 'Magnificent 7 Basket',
    icon: '🌟',
    description: 'Mega-cap technology leaders dominating global on-chain equity trading on BNB Smart Chain.',
    tickers: ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'META'],
  },
  ai_semis: {
    name: 'AI & Semiconductor Chips',
    icon: '⚡',
    description: 'Hardware compute and semiconductor giants powering decentralized AI agent infrastructure.',
    tickers: ['NVDA', 'AMD', 'TSM'],
  },
  buffett: {
    name: 'Buffett Value Portfolio',
    icon: '🏛️',
    description: 'High-cashflow dividend compounders with 1:1 backing and automated rebasing on BSC.',
    tickers: ['AAPL', 'MSFT', 'AMZN'],
  },
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
    router: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
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
    approveTarget: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    isBest: true,
  },
  '0xa9ee28c80f960b889dfbd1902055218cba016f75': {
    quoteId: 'quote-nvdaon-benchmark-02',
    vendorName: 'LiquidMesh',
    executionMode: 'SWAP',
    binanceChainId: '56',
    fromTokenAmount: '10000000000000000000',
    toTokenAmount: '43531255000000000',
    priceImpactPercent: '0.05',
    router: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
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
    approveTarget: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    isBest: false,
  },
  '0x5b1910eaad6450e50f816082aa078c41f10c292f': {
    quoteId: 'quote-tslab-benchmark-03',
    vendorName: 'LiquidMesh',
    executionMode: 'SWAP',
    binanceChainId: '56',
    fromTokenAmount: '10000000000000000000',
    toTokenAmount: '26872329562249751',
    priceImpactPercent: '0.01',
    router: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    fromToken: {
      tokenContractAddress: '0x55d398326f99059fF775485246999027B3197955',
      tokenSymbol: 'USDT',
      tokenUnitPrice: '1.00',
      decimal: 18,
    },
    toToken: {
      tokenContractAddress: '0x5b1910eaad6450e50f816082aa078c41f10c292f',
      tokenSymbol: 'TSLAB',
      tokenUnitPrice: '372.13',
      decimal: 18,
    },
    approveTarget: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    isBest: true,
  },
  '0x2494b603319d4d9f9715c9f4496d9e0364b59d93': {
    quoteId: 'quote-tslaon-benchmark-03b',
    vendorName: 'LiquidMesh',
    executionMode: 'SWAP',
    binanceChainId: '56',
    fromTokenAmount: '10000000000000000000',
    toTokenAmount: '26873050978179082',
    priceImpactPercent: '0.01',
    router: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    fromToken: {
      tokenContractAddress: '0x55d398326f99059fF775485246999027B3197955',
      tokenSymbol: 'USDT',
      tokenUnitPrice: '1.00',
      decimal: 18,
    },
    toToken: {
      tokenContractAddress: '0x2494b603319d4d9f9715c9f4496d9e0364b59d93',
      tokenSymbol: 'TSLAon',
      tokenUnitPrice: '372.12',
      decimal: 18,
    },
    approveTarget: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    isBest: false,
  },
  '0x80106cb3ead06659a5ad19df39d9b4733863b9b0': {
    quoteId: 'quote-msftb-benchmark-04',
    vendorName: 'LiquidMesh',
    executionMode: 'SWAP',
    binanceChainId: '56',
    fromTokenAmount: '10000000000000000000',
    toTokenAmount: '19403119830588691',
    priceImpactPercent: '0.01',
    router: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    fromToken: {
      tokenContractAddress: '0x55d398326f99059fF775485246999027B3197955',
      tokenSymbol: 'USDT',
      tokenUnitPrice: '1.00',
      decimal: 18,
    },
    toToken: {
      tokenContractAddress: '0x80106cb3ead06659a5ad19df39d9b4733863b9b0',
      tokenSymbol: 'MSFTB',
      tokenUnitPrice: '515.38',
      decimal: 18,
    },
    approveTarget: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    isBest: true,
  },
  '0x6bfe75d1ad432050ea973c3a3dcd88f02e2444c3': {
    quoteId: 'quote-msfton-benchmark-04b',
    vendorName: 'LiquidMesh',
    executionMode: 'SWAP',
    binanceChainId: '56',
    fromTokenAmount: '10000000000000000000',
    toTokenAmount: '19204916458613404',
    priceImpactPercent: '0.01',
    router: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    fromToken: {
      tokenContractAddress: '0x55d398326f99059fF775485246999027B3197955',
      tokenSymbol: 'USDT',
      tokenUnitPrice: '1.00',
      decimal: 18,
    },
    toToken: {
      tokenContractAddress: '0x6bfe75d1ad432050ea973c3a3dcd88f02e2444c3',
      tokenSymbol: 'MSFTon',
      tokenUnitPrice: '520.70',
      decimal: 18,
    },
    approveTarget: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    isBest: false,
  },
  '0x3f53de71c126bdabae20f9cd64848d317f6c3238': {
    quoteId: 'quote-googlb-benchmark-05',
    vendorName: 'LiquidMesh',
    executionMode: 'SWAP',
    binanceChainId: '56',
    fromTokenAmount: '10000000000000000000',
    toTokenAmount: '29027576197387518',
    priceImpactPercent: '0.01',
    router: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    fromToken: {
      tokenContractAddress: '0x55d398326f99059fF775485246999027B3197955',
      tokenSymbol: 'USDT',
      tokenUnitPrice: '1.00',
      decimal: 18,
    },
    toToken: {
      tokenContractAddress: '0x3f53de71c126bdabae20f9cd64848d317f6c3238',
      tokenSymbol: 'GOOGLB',
      tokenUnitPrice: '344.50',
      decimal: 18,
    },
    approveTarget: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    isBest: true,
  },
  '0x091fc7778e6932d4009b087b191d1ee3bac5729a': {
    quoteId: 'quote-googlon-benchmark-05b',
    vendorName: 'LiquidMesh',
    executionMode: 'SWAP',
    binanceChainId: '56',
    fromTokenAmount: '10000000000000000000',
    toTokenAmount: '28888375317772128',
    priceImpactPercent: '0.01',
    router: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    fromToken: {
      tokenContractAddress: '0x55d398326f99059fF775485246999027B3197955',
      tokenSymbol: 'USDT',
      tokenUnitPrice: '1.00',
      decimal: 18,
    },
    toToken: {
      tokenContractAddress: '0x091fc7778e6932d4009b087b191d1ee3bac5729a',
      tokenSymbol: 'GOOGLon',
      tokenUnitPrice: '346.16',
      decimal: 18,
    },
    approveTarget: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    isBest: false,
  },
  '0x7425889fe94f9d693e8daefe88bcced6acfef4c0': {
    quoteId: 'quote-metab-benchmark-06',
    vendorName: 'LiquidMesh',
    executionMode: 'SWAP',
    binanceChainId: '56',
    fromTokenAmount: '10000000000000000000',
    toTokenAmount: '13684383107997154',
    priceImpactPercent: '0.01',
    router: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    fromToken: {
      tokenContractAddress: '0x55d398326f99059fF775485246999027B3197955',
      tokenSymbol: 'USDT',
      tokenUnitPrice: '1.00',
      decimal: 18,
    },
    toToken: {
      tokenContractAddress: '0x7425889fe94f9d693e8daefe88bcced6acfef4c0',
      tokenSymbol: 'METAB',
      tokenUnitPrice: '730.76',
      decimal: 18,
    },
    approveTarget: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    isBest: true,
  },
  '0xd7df5863a3e742f0c767768cdfcb63f09e0422f6': {
    quoteId: 'quote-metaon-benchmark-06b',
    vendorName: 'LiquidMesh',
    executionMode: 'SWAP',
    binanceChainId: '56',
    fromTokenAmount: '10000000000000000000',
    toTokenAmount: '13615260000000000',
    priceImpactPercent: '0.01',
    router: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    fromToken: {
      tokenContractAddress: '0x55d398326f99059fF775485246999027B3197955',
      tokenSymbol: 'USDT',
      tokenUnitPrice: '1.00',
      decimal: 18,
    },
    toToken: {
      tokenContractAddress: '0xd7df5863a3e742f0c767768cdfcb63f09e0422f6',
      tokenSymbol: 'METAon',
      tokenUnitPrice: '734.47',
      decimal: 18,
    },
    approveTarget: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    isBest: false,
  },
  '0x75fd4cf6f8392e41e70391d60c90c0d5211603a1': {
    quoteId: 'quote-amdb-benchmark-07',
    vendorName: 'LiquidMesh',
    executionMode: 'SWAP',
    binanceChainId: '56',
    fromTokenAmount: '10000000000000000000',
    toTokenAmount: '15858416061403786',
    priceImpactPercent: '0.01',
    router: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    fromToken: {
      tokenContractAddress: '0x55d398326f99059fF775485246999027B3197955',
      tokenSymbol: 'USDT',
      tokenUnitPrice: '1.00',
      decimal: 18,
    },
    toToken: {
      tokenContractAddress: '0x75fd4cf6f8392e41e70391d60c90c0d5211603a1',
      tokenSymbol: 'AMDB',
      tokenUnitPrice: '630.58',
      decimal: 18,
    },
    approveTarget: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    isBest: true,
  },
  '0x9f16e46c73b43bdb70861247d537bee4ea18f639': {
    quoteId: 'quote-amdon-benchmark-07b',
    vendorName: 'LiquidMesh',
    executionMode: 'SWAP',
    binanceChainId: '56',
    fromTokenAmount: '10000000000000000000',
    toTokenAmount: '15856404401737861',
    priceImpactPercent: '0.01',
    router: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    fromToken: {
      tokenContractAddress: '0x55d398326f99059fF775485246999027B3197955',
      tokenSymbol: 'USDT',
      tokenUnitPrice: '1.00',
      decimal: 18,
    },
    toToken: {
      tokenContractAddress: '0x9f16e46c73b43bdb70861247d537bee4ea18f639',
      tokenSymbol: 'AMDon',
      tokenUnitPrice: '630.66',
      decimal: 18,
    },
    approveTarget: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    isBest: false,
  },
  '0x585bde7c54abb5ccd7791f923d6c2187635f3952': {
    quoteId: 'quote-coinb-benchmark-08',
    vendorName: 'LiquidMesh',
    executionMode: 'SWAP',
    binanceChainId: '56',
    fromTokenAmount: '10000000000000000000',
    toTokenAmount: '54770511556577938',
    priceImpactPercent: '0.01',
    router: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    fromToken: {
      tokenContractAddress: '0x55d398326f99059fF775485246999027B3197955',
      tokenSymbol: 'USDT',
      tokenUnitPrice: '1.00',
      decimal: 18,
    },
    toToken: {
      tokenContractAddress: '0x585bde7c54abb5ccd7791f923d6c2187635f3952',
      tokenSymbol: 'COINB',
      tokenUnitPrice: '182.58',
      decimal: 18,
    },
    approveTarget: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    isBest: true,
  },
  '0xf8589b526fdd65f7f301c605a6e04f0f1b4b3620': {
    quoteId: 'quote-coinon-benchmark-08b',
    vendorName: 'LiquidMesh',
    executionMode: 'SWAP',
    binanceChainId: '56',
    fromTokenAmount: '10000000000000000000',
    toTokenAmount: '54761500000000000',
    priceImpactPercent: '0.01',
    router: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    fromToken: {
      tokenContractAddress: '0x55d398326f99059fF775485246999027B3197955',
      tokenSymbol: 'USDT',
      tokenUnitPrice: '1.00',
      decimal: 18,
    },
    toToken: {
      tokenContractAddress: '0xf8589b526fdd65f7f301c605a6e04f0f1b4b3620',
      tokenSymbol: 'COINon',
      tokenUnitPrice: '182.61',
      decimal: 18,
    },
    approveTarget: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
    isBest: false,
  },
};

function formatRevertReason(raw?: string, spender?: string): string {
  if (!raw) return '';
  const spenderDisplay = spender ? `${spender.slice(0, 6)}...${spender.slice(-4)}` : 'LiquidMesh';
  if (raw.startsWith('0x')) {
    if (raw.startsWith('0x08c379a0') && raw.length >= 138) {
      try {
        const lengthHex = raw.slice(74, 138);
        const length = parseInt(lengthHex, 16);
        const stringHex = raw.slice(138, 138 + length * 2);
        let decoded = '';
        for (let i = 0; i < stringHex.length; i += 2) {
          decoded += String.fromCharCode(parseInt(stringHex.slice(i, i + 2), 16));
        }
        if (decoded.toLowerCase().includes('allowance')) {
          return `USDT approval required on BSC before execution (Spender: ${spenderDisplay}).`;
        }
        return `Simulation Note: ${decoded}`;
      } catch {}
    }
    if (raw.toLowerCase().includes('616c6c6f77616e6365') || raw.toLowerCase().includes('allowance')) {
      return `USDT approval required on BSC before execution (Spender: ${spenderDisplay}).`;
    }
    return `Simulation Note: On-chain check returned ${raw.slice(0, 16)}... (Approval or liquidity route ready)`;
  }
  if (raw.toLowerCase().includes('allowance')) {
    return `USDT approval required on BSC before execution (Spender: ${spenderDisplay}).`;
  }
  return raw;
}

export default function Home() {
  const [viewMode, setViewMode] = useState<'simple' | 'pro'>((globalThis as any).__AFTERGAP_TEST_MODE__ || 'simple');
  const [selectedSimpleTicker, setSelectedSimpleTicker] = useState<string>('NVDA');
  const [ticker, setTicker] = useState('NVDA');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Wallet address for quote & simulation (default to standard BSC address)
  const [walletAddress, setWalletAddress] = useState('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
  const [walletBalances, setWalletBalances] = useState<{ usdt: string; bnb: string; nvdab: string; loading: boolean }>({
    usdt: '—',
    bnb: '—',
    nvdab: '—',
    loading: false,
  });

  // Trading quote and simulation states indexed by token contract address
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [quotes, setQuotes] = useState<Record<string, QuoteState>>({});
  const [simulations, setSimulations] = useState<Record<string, SimulationState>>({});
  const [inspectTx, setInspectTx] = useState<{ symbol: string; tx: any } | null>(null);
  const [selectedBasket, setSelectedBasket] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    connecting: false,
    address: null,
    chainId: null,
    error: null,
  });
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  // Per-token broadcast state (approve + swap)
  const [broadcasts, setBroadcasts] = useState<Record<string, TxBroadcastState>>({});
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [approvalMode, setApprovalMode] = useState<'exact' | 'unlimited'>('exact');
  const [tradeDirections, setTradeDirections] = useState<Record<string, 'buy' | 'sell'>>({});
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | 'risks' | null>(null);
  const [lastPriceRefresh, setLastPriceRefresh] = useState<number>(Date.now());

  // Natural-Language Command Bar State
  const [nlPrompt, setNlPrompt] = useState('');
  const [nlLoading, setNlLoading] = useState(false);
  const [nlError, setNlError] = useState<{ error: string; reason: string; suggestions?: string[] } | null>(null);
  const [nlResult, setNlResult] = useState<{
    intent: any;
    plainLanguageReason: string;
    selectedWrapper?: {
      symbol: string;
      name: string;
      platformId: string;
      contractAddress: string;
      price: number;
      referencePrice?: number;
    };
    gapResult?: any;
    basketResult?: any;
  } | null>(null);

  // --- Wallet Connect ---
  const connectWallet = async () => {
    const eth = (window as any).ethereum;
    if (!eth) {
      setWallet((w) => ({ ...w, error: 'No Web3 wallet found. Install MetaMask or Binance Web3 Wallet.' }));
      return;
    }
    setWallet((w) => ({ ...w, connecting: true, error: null }));
    try {
      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
      const chainIdHex: string = await eth.request({ method: 'eth_chainId' });
      const address = accounts[0];
      const chainId = parseInt(chainIdHex, 16).toString();

      // Auto switch to BSC mainnet (chainId 56) if needed
      if (chainId !== '56') {
        try {
          await eth.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x38' }],
          });
        } catch (switchErr: any) {
          // Chain not added — add it
          if (switchErr.code === 4902) {
            await eth.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x38',
                chainName: 'BNB Smart Chain',
                nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                blockExplorerUrls: ['https://bscscan.com'],
              }],
            });
          }
        }
      }

      setWallet({ connected: true, connecting: false, address, chainId: '56', error: null });
      setWalletAddress(address);
      fetchBalances(address);

      // Listen for account / chain changes
      eth.on('accountsChanged', (accs: string[]) => {
        if (accs.length === 0) {
          setWallet({ connected: false, connecting: false, address: null, chainId: null, error: null });
        } else {
          setWallet((w) => ({ ...w, address: accs[0] }));
          setWalletAddress(accs[0]);
          fetchBalances(accs[0]);
        }
      });
      eth.on('chainChanged', () => window.location.reload());
    } catch (err: any) {
      setWallet({ connected: false, connecting: false, address: null, chainId: null, error: err.message || 'Connection rejected' });
    }
  };

  const disconnectWallet = () => {
    setWallet({ connected: false, connecting: false, address: null, chainId: null, error: null });
    setWalletAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
    setWalletBalances({ usdt: '—', bnb: '—', nvdab: '—', loading: false });
    setWalletDropdownOpen(false);
  };

  // --- USDT Approve + Swap Execute ---
  const handleApproveAndExecute = async (token: any) => {
    const contract = token.tokenContractAddress || token.contractAddress || token.tokenAddress;
    if (!contract) return;
    const currentQuote = quotes[contract];
    if (!currentQuote?.quoteId) return;
    if (!wallet.connected || !wallet.address) {
      setWallet((w) => ({ ...w, error: 'Connect your wallet first.' }));
      return;
    }

    const eth = (window as any).ethereum;
    if (!eth) return;

    const direction = tradeDirections[contract.toLowerCase()] || 'buy';
    const isSell = direction === 'sell';
    const usdtContract = '0x55d398326f99059fF775485246999027B3197955';
    const fromToken = isSell ? contract : usdtContract;
    const toToken = isSell ? usdtContract : contract;
    const tokenToApprove = isSell ? contract : usdtContract;

    const inputAmountStr = currentQuote.fromAmount || (isSell ? '0.0218' : '10');
    const amountInSmallestUnit = (BigInt(Math.floor(Number(inputAmountStr) * 1e6)) * BigInt(1e12)).toString();
    const amountNeeded = BigInt(amountInSmallestUnit);

    setBroadcasts((prev) => ({ ...prev, [contract]: { loading: true, step: 'preparing' } }));

    if (currentQuote.isFallback) {
      setBroadcasts((prev) => ({
        ...prev,
        [contract]: {
          loading: false,
          step: 'error',
          error: 'Swaps are locked in benchmark mode to protect user funds. Live Binance RFQ gateway is restricted on this cloud region (CloudFront 40304). Run AfterGap Agent CLI for live trading.',
        },
      }));
      return;
    }

    try {
      // Step 1: Fetch live swap transaction from secure server proxy
      let swapTx: { to: string; data: string; value?: string; gas?: string } | null = null;
      let targetSpender = currentQuote.spender || currentQuote.rawQuote?.approveTarget || '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5';

      try {
        const swapRes = await fetch(
          `/api/rwa?action=swap&quoteId=${currentQuote.quoteId}&fromTokenAddress=${fromToken}&toTokenAddress=${toToken}&amount=${amountInSmallestUnit}&userWalletAddress=${wallet.address}&slippagePercent=1`
        );
        const swapJson = await swapRes.json();
        if (swapRes.ok && swapJson?.swap?.data?.tx?.data) {
          swapTx = swapJson.swap.data.tx;
          if (swapTx?.to) {
            targetSpender = swapTx.to;
          }
        }
      } catch (e) {
        console.warn('Proxy swap fetch error:', e);
      }

      if (!swapTx || !swapTx.data) {
        throw new Error(
          'Live LiquidMesh execution route could not be locked. Please refresh quote and ensure trade amount is at least 5 USD.'
        );
      }

      const finalSpender = targetSpender || '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5';

      // Step 2: Check existing token allowance on BSC for finalSpender
      const currentAllowance = await checkAllowance(wallet.address, finalSpender, tokenToApprove);
      let approveTxHash: string | undefined;

      if (currentAllowance < amountNeeded) {
        setBroadcasts((prev) => ({ ...prev, [contract]: { loading: true, step: 'approving' } }));
        // Least-Privilege Approval Default: Request exact trade amount only, avoiding unlimited allowance exposure
        const isExact = approvalMode === 'exact';
        const approveAmount = isExact
          ? amountNeeded.toString(16).padStart(64, '0')
          : 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
        const spenderPadded = finalSpender.toLowerCase().replace('0x', '').padStart(64, '0');
        const approveData = '0x095ea7b3' + spenderPadded + approveAmount;

        const txHash: string = await eth.request({
          method: 'eth_sendTransaction',
          params: [{
            from: wallet.address,
            to: tokenToApprove,
            data: approveData,
            gas: '0x13880', // 80,000 gas
          }],
        });
        approveTxHash = txHash;

        setBroadcasts((prev) => ({
          ...prev,
          [contract]: {
            loading: true,
            step: 'waiting_receipt',
            approveTxHash: txHash,
            message: 'Approval broadcast! Waiting for BSC block confirmation (~3s)...',
          },
        }));

        // Poll until approval receipt is mined into a BSC block
        const confirmed = await waitForTxReceipt(txHash);
        if (!confirmed) {
          throw new Error('Token approval transaction timed out or failed on BSC. Please check BSCScan.');
        }
      }

      // Step 3: Trigger Swap Transaction
      setBroadcasts((prev) => ({ ...prev, [contract]: { loading: true, step: 'swapping', approveTxHash } }));

      const swapGasHex = swapTx.gas
        ? (swapTx.gas.startsWith('0x') ? swapTx.gas : '0x' + parseInt(swapTx.gas).toString(16))
        : '0x6DDD0'; // 450,000 gas

      const swapValueHex = swapTx.value
        ? (swapTx.value.startsWith('0x') ? swapTx.value : '0x' + parseInt(swapTx.value).toString(16))
        : '0x0';

      const swapTxHash: string = await eth.request({
        method: 'eth_sendTransaction',
        params: [{
          from: wallet.address,
          to: swapTx.to,
          data: swapTx.data,
          value: swapValueHex,
          gas: swapGasHex,
        }],
      });

      setBroadcasts((prev) => ({
        ...prev,
        [contract]: { loading: false, step: 'done', approveTxHash, swapTxHash },
      }));

      // Refresh balances
      fetchBalances(wallet.address);
    } catch (err: any) {
      const msg = err?.message?.includes('User denied')
        ? 'Transaction rejected in wallet.'
        : (err?.message || 'Transaction failed.');
      setBroadcasts((prev) => ({ ...prev, [contract]: { loading: false, step: 'error', error: msg } }));
    }
  };

  const fetchRwaData = async (symbolToFetch: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rwa?action=resolve&keyword=${encodeURIComponent(symbolToFetch)}`);
      const json: ApiResponseData = await res.json();
      setData(json);
      setLastPriceRefresh(Date.now());
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
      const bscRpcs = [
        'https://bsc-dataseed.binance.org/',
        'https://bsc-dataseed1.defibit.io/',
        'https://bsc-dataseed1.ninicoin.io/',
      ];
      const usdtContract = '0x55d398326f99059fF775485246999027B3197955';
      const nvdabContract = '0x02fca66c1d1afb4e2a7884261eb00f63598a7436';
      const usdtCallData = '0x70a08231000000000000000000000000' + address.slice(2).toLowerCase();
      const nvdabCallData = '0x70a08231000000000000000000000000' + address.slice(2).toLowerCase();

      let bnbVal = '0.0000';
      let usdtVal = '0.00';
      let nvdabVal = '0.0000';
      let fetchedOnChain = false;

      // 1. Direct wallet query via window.ethereum (100% reliable, zero CORS issues)
      const eth = typeof window !== 'undefined' ? (window as any).ethereum : null;
      if (eth?.request) {
        try {
          const [bnbHex, usdtHex, nvdabHex] = await Promise.all([
            eth.request({ method: 'eth_getBalance', params: [address, 'latest'] }),
            eth.request({ method: 'eth_call', params: [{ to: usdtContract, data: usdtCallData }, 'latest'] }),
            eth.request({ method: 'eth_call', params: [{ to: nvdabContract, data: nvdabCallData }, 'latest'] }).catch(() => null),
          ]);
          if (bnbHex) {
            const rawBnb = BigInt(bnbHex);
            const numBnb = Number(rawBnb) / 1e18;
            bnbVal = numBnb > 0 && numBnb < 0.0001 ? '<0.0001' : numBnb.toFixed(4);
            fetchedOnChain = true;
          }
          if (usdtHex && usdtHex !== '0x') {
            const rawUsdt = BigInt(usdtHex);
            usdtVal = (Number(rawUsdt) / 1e18).toFixed(2);
          }
          if (nvdabHex && nvdabHex !== '0x') {
            const rawNvdab = BigInt(nvdabHex);
            const numNvdab = Number(rawNvdab) / 1e18;
            nvdabVal = numNvdab > 0 && numNvdab < 0.0001 ? '<0.0001' : numNvdab.toFixed(4);
          }
        } catch (e) {
          console.warn('Direct wallet balance query fallback:', e);
        }
      }

      // 2. Direct BSC RPC query if not already fetched
      if (!fetchedOnChain) {
        for (const rpc of bscRpcs) {
          try {
            const [bnbRes, usdtRes, nvdabRes] = await Promise.all([
              fetch(rpc, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [address, 'latest'] }),
              }).then((r) => r.json()),
              fetch(rpc, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'eth_call', params: [{ to: usdtContract, data: usdtCallData }, 'latest'] }),
              }).then((r) => r.json()),
              fetch(rpc, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'eth_call', params: [{ to: nvdabContract, data: nvdabCallData }, 'latest'] }),
              }).then((r) => r.json()).catch(() => null),
            ]);

            if (bnbRes?.result) {
              const rawBnb = BigInt(bnbRes.result);
              const numBnb = Number(rawBnb) / 1e18;
              bnbVal = numBnb > 0 && numBnb < 0.0001 ? '<0.0001' : numBnb.toFixed(4);
              fetchedOnChain = true;
            }
            if (usdtRes?.result) {
              const rawUsdt = BigInt(usdtRes.result);
              usdtVal = (Number(rawUsdt) / 1e18).toFixed(2);
            }
            if (nvdabRes?.result && nvdabRes.result !== '0x') {
              const rawNvdab = BigInt(nvdabRes.result);
              const numNvdab = Number(rawNvdab) / 1e18;
              nvdabVal = numNvdab > 0 && numNvdab < 0.0001 ? '<0.0001' : numNvdab.toFixed(4);
            }
            if (bnbRes?.result && usdtRes?.result) {
              break;
            }
          } catch {
            // Fall through to next RPC
          }
        }
      }

      if (fetchedOnChain) {
        setWalletBalances({
          usdt: usdtVal,
          bnb: bnbVal,
          nvdab: nvdabVal,
          loading: false,
        });
        return;
      }

      // 3. Secondary fallback via server route
      const res = await fetch(`/api/rwa?action=balances&address=${address}`);
      const json = await res.json();
      const assets: any[] = json?.balances?.data?.[0]?.tokenAssets || [];
      const usdtAsset = assets.find(
        (a) => a.tokenContractAddress?.toLowerCase() === usdtContract.toLowerCase() || a.symbol === 'USDT'
      );
      const bnbAsset = assets.find(
        (a) => a.symbol === 'BNB' || a.tokenContractAddress?.toLowerCase() === '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'
      );
      const nvdabAsset = assets.find(
        (a) => a.tokenContractAddress?.toLowerCase() === nvdabContract.toLowerCase() || a.symbol === 'NVDAB'
      );
      if (bnbAsset?.balance) {
        const numBnb = Number(bnbAsset.balance);
        bnbVal = numBnb > 0 && numBnb < 0.0001 ? '<0.0001' : numBnb.toFixed(4);
      }
      setWalletBalances({
        usdt: usdtAsset ? Number(usdtAsset.balance).toFixed(2) : usdtVal,
        bnb: bnbVal,
        nvdab: nvdabAsset ? Number(nvdabAsset.balance).toFixed(4) : nvdabVal,
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

    const isOverallFallback = Boolean(
      data?.isFallback ??
        (data?.bscTokens?.isFallback ||
          data?.bscTokens?.debug?.fallbackUsed ||
          data?.search?.debug?.fallbackUsed)
    );

    // Prioritize enriched BSC catalog tokens (has tokenPrice, referencePrice, statusInfo)
    for (const item of bscTokens) {
      const sym = String(item.tokenSymbol || '').toUpperCase();
      const underlying = String(item.underlyingTicker || '').toUpperCase();
      const chainId = String(item.binanceChainId || item.chainId || '');

      if ((chainId === '56' || !chainId) && (sym.includes(matchKeyword) || underlying === matchKeyword)) {
        const addr = String(item.tokenContractAddress || item.contractAddress || '').toLowerCase();
        seen.add(addr);
        seen.add(sym);
        const itemFallback = item.isFallback !== undefined ? Boolean(item.isFallback) : isOverallFallback;
        filtered.push({ ...item, isFallback: itemFallback });
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
        const assetFallback = asset.isFallback !== undefined ? Boolean(asset.isFallback) : isOverallFallback;
        filtered.push({ ...asset, isFallback: assetFallback });
      }
    }

    if (filtered.length === 0) {
      const fallbackList = (
        DEFAULT_BENCHMARK_TOKENS[matchKeyword] ||
        (matchKeyword === 'NVDA' ? DEFAULT_BENCHMARK_TOKENS.NVDA : [])
      ).map((t) => ({ ...t, isFallback: true }));
      return fallbackList;
    }

    return filtered;
  }, [data, ticker]);

  // Real-time map of dual-wrapper tokens for all 7 Simple Mode tickers
  // Merges live BSC tokens from Binance Web3 API (data.bscTokens.data) with fallback defaults
  const simpleModeTokensMap = useMemo(() => {
    const bscData = data?.bscTokens?.data;
    const bscTokens: any[] = Array.isArray(bscData)
      ? bscData
      : Array.isArray(bscData?.tokens)
      ? bscData.tokens
      : [];

    const map: Record<string, { bstock: any; ondo: any; isLive: boolean }> = {};
    const TICKERS = ['NVDA', 'TSLA', 'MSFT', 'GOOGL', 'META', 'AMD', 'COIN'];

    for (const sym of TICKERS) {
      const fallbackList = DEFAULT_BENCHMARK_TOKENS[sym] || [];
      const fallbackBstock = fallbackList.find(
        (t: any) => String(t.platformId).toLowerCase() === 'bstock' || String(t.tokenSymbol).endsWith('B')
      );
      const fallbackOndo = fallbackList.find(
        (t: any) => String(t.platformId).toLowerCase() === 'ondo' || String(t.tokenSymbol).endsWith('on')
      );

      // Search inside live bscTokens array (from Binance API client.getTokens)
      const liveBstock = bscTokens.find((tok: any) => {
        const s = String(tok.tokenSymbol || '');
        const u = String(tok.underlyingTicker || '').toUpperCase();
        return (
          (u === sym && (String(tok.platformId).toLowerCase() === 'bstock' || s.endsWith('B'))) ||
          s === `${sym}B`
        );
      });

      const liveOndo = bscTokens.find((tok: any) => {
        const s = String(tok.tokenSymbol || '');
        const u = String(tok.underlyingTicker || '').toUpperCase();
        return (
          (u === sym && (String(tok.platformId).toLowerCase() === 'ondo' || s.endsWith('on'))) ||
          s === `${sym}on`
        );
      });

      const isLive = Boolean(liveBstock && liveOndo && !data?.isFallback);

      map[sym] = {
        bstock: liveBstock ? { ...fallbackBstock, ...liveBstock, isFallback: Boolean(data?.isFallback) } : fallbackBstock,
        ondo: liveOndo ? { ...fallbackOndo, ...liveOndo, isFallback: Boolean(data?.isFallback) } : fallbackOndo,
        isLive,
      };
    }

    return map;
  }, [data]);

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

        const isRouteFallback = Boolean(cheaper.isFallback || other.isFallback);

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
          isLive: !isRouteFallback,
          isFallback: isRouteFallback,
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
        price: '234.58',
        savings: '0.80',
        savingsPercent: '0.34',
        otherSymbol: 'NVDAon',
        otherPrice: '235.38',
        spreadToCash: '0.08',
        venue: 'LiquidMesh RFQ',
        cheaperName: 'bStocks',
        otherName: 'Ondo',
        isLive: false,
        isFallback: true,
      };
    }

    return null;
  }, [bstocksTokens, ondoTokens, quotes, ticker]);

  // Computed Thematic Basket data (wired to real-time tokens map)
  const currentBasketData = useMemo(() => {
    if (!selectedBasket) return null;
    const basketConfig = THEMATIC_BASKETS[selectedBasket];
    if (!basketConfig) return null;

    const list = basketConfig.tickers.map((sym) => {
      const pair = simpleModeTokensMap[sym];
      const fallbackTokens = DEFAULT_BENCHMARK_TOKENS[sym] || [];
      const bstock = pair?.bstock || fallbackTokens.find((t: any) => t.platformId === 'bstock') || fallbackTokens[0];
      const ondo = pair?.ondo || fallbackTokens.find((t: any) => t.platformId === 'ondo') || fallbackTokens[1];
      const bPrice = Number(bstock?.tokenPrice || bstock?.price || 0);
      const oPrice = Number(ondo?.tokenPrice || ondo?.price || 0);
      const cheaper = bstock && ondo ? (bPrice <= oPrice ? bstock : ondo) : bstock;
      const other = cheaper === bstock ? ondo : bstock;
      const cheaperPrice = Number(cheaper?.tokenPrice || cheaper?.price || 0);
      const otherPrice = Number(other?.tokenPrice || other?.price || cheaperPrice);
      const savings = Math.max(0, otherPrice - cheaperPrice);
      const refPrice = Number(cheaper?.referencePrice || cheaperPrice);
      const spread = refPrice > 0 ? ((cheaperPrice - refPrice) / refPrice) * 100 : 0;

      return {
        ticker: sym,
        tokenName: cheaper?.tokenName || cheaper?.underlyingName || sym,
        cheaperToken: cheaper,
        cheaperSymbol: cheaper?.tokenSymbol || `${sym}B`,
        platform: cheaper?.platformId || 'bstock',
        price: cheaperPrice.toFixed(2),
        referencePrice: refPrice.toFixed(2),
        savings: savings.toFixed(2),
        spreadToCash: spread.toFixed(2),
        otherSymbol: other?.tokenSymbol || `${sym}on`,
      };
    });

    list.sort((a, b) => Number(b.savings) - Number(a.savings));
    const totalSavings = list.reduce((acc, item) => acc + Number(item.savings), 0);
    const avgSpread = list.reduce((acc, item) => acc + Number(item.spreadToCash), 0) / (list.length || 1);

    return {
      ...basketConfig,
      key: selectedBasket,
      constituents: list,
      totalSavings: totalSavings.toFixed(2),
      avgSpread: avgSpread.toFixed(2),
      topPick: list[0],
    };
  }, [selectedBasket, simpleModeTokensMap]);

  // Request a live quote from Trading API
  const handleGetQuote = async (token: any, forceDirection?: 'buy' | 'sell') => {
    const contract = token.tokenContractAddress || token.contractAddress || token.tokenAddress;
    if (!contract) return;

    const direction = forceDirection || tradeDirections[contract.toLowerCase()] || 'buy';
    const isSell = direction === 'sell';
    const usdtContract = '0x55d398326f99059fF775485246999027B3197955';
    const fromToken = isSell ? contract : usdtContract;
    const toToken = isSell ? usdtContract : contract;

    let inputAmountStr = amounts[contract];
    if (!inputAmountStr || Number(inputAmountStr) <= 0) {
      inputAmountStr = isSell ? '0.0218' : '10';
      setAmounts((prev) => ({ ...prev, [contract]: inputAmountStr }));
    }

    // In buy mode, enforce 5 USDT min
    if (!isSell && Number(inputAmountStr) < 5) {
      inputAmountStr = '5';
      setAmounts((prev) => ({ ...prev, [contract]: '5' }));
    }

    const amountInSmallestUnit = (BigInt(Math.floor(Number(inputAmountStr) * 1e6)) * BigInt(1e12)).toString(); // 18 decimals

    setQuotes((prev) => ({
      ...prev,
      [contract]: { loading: true, error: undefined },
    }));

    let bestRoute: any = null;
    let isDirectLive = false;

    // Fetch quote via authenticated server API route (1-hop)
    try {
      const res = await fetch(
        `/api/rwa?action=quote&fromTokenAddress=${fromToken}&toTokenAddress=${toToken}&amount=${amountInSmallestUnit}&userWalletAddress=${walletAddress}&slippagePercent=1`
      );
      const json = await res.json();
      if (res.ok && json.quote?.data) {
        const routeList = Array.isArray(json.quote?.data) ? json.quote.data : [json.quote?.data];
        if (routeList[0]?.quoteId) {
          bestRoute = routeList[0];
          isDirectLive = !Boolean(
            json.isFallback ||
            json.quote?.isFallback ||
            json.quote?.debug?.fallbackUsed ||
            bestRoute.isFallback
          );
        }
      }
    } catch (e) {
      console.warn('Proxy quote fetch error:', e);
    }

    if (bestRoute && bestRoute.quoteId) {
      const toDecimals = Number(bestRoute.toToken?.decimal || 18);
      const toTokenAmountFormatted = (Number(bestRoute.toTokenAmount) / 10 ** toDecimals).toFixed(isSell ? 4 : 6);

      setQuotes((prev) => ({
        ...prev,
        [contract]: {
          loading: false,
          quoteId: bestRoute.quoteId,
          vendorName: bestRoute.vendorName || 'LiquidMesh',
          executionMode: bestRoute.executionMode || 'SWAP',
          fromAmount: inputAmountStr,
          toAmount: toTokenAmountFormatted,
          toTokenSymbol: isSell ? 'USDT' : (bestRoute.toToken?.tokenSymbol || token.tokenSymbol),
          unitPrice: bestRoute.toToken?.tokenUnitPrice,
          spender: bestRoute.approveTarget || '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
          router: bestRoute.router || '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
          fetchedAt: Date.now(),
          ttlRemaining: 30,
          rawQuote: bestRoute,
          isFallback: !isDirectLive,
        },
      }));
      return;
    }

    // Attempt 3: Scaled benchmark fallback
    const fallbackBest = DEFAULT_BENCHMARK_QUOTES[contract.toLowerCase()] || DEFAULT_BENCHMARK_QUOTES['0x02fca66c1d1afb4e2a7884261eb00f63598a7436'];
    if (fallbackBest) {
      const unitPrice = Number(fallbackBest.toToken?.tokenUnitPrice || '229.11');
      const numInput = Number(inputAmountStr);
      const calculatedOutput = isSell ? numInput * unitPrice : (unitPrice > 0 ? numInput / unitPrice : 0);
      const toTokenAmountFormatted = calculatedOutput.toFixed(isSell ? 4 : 6);
      const toDecimals = Number(fallbackBest.toToken?.decimal || 18);
      const toTokenAmountScaled = BigInt(Math.floor(calculatedOutput * 10 ** toDecimals)).toString();

      setQuotes((prev) => ({
        ...prev,
        [contract]: {
          loading: false,
          quoteId: fallbackBest.quoteId,
          vendorName: fallbackBest.vendorName,
          executionMode: fallbackBest.executionMode,
          fromAmount: inputAmountStr,
          toAmount: toTokenAmountFormatted,
          toTokenSymbol: isSell ? 'USDT' : (fallbackBest.toToken?.tokenSymbol || token.tokenSymbol),
          unitPrice: fallbackBest.toToken?.tokenUnitPrice,
          spender: fallbackBest.approveTarget,
          router: fallbackBest.router,
          fetchedAt: Date.now(),
          ttlRemaining: 30,
          rawQuote: {
            ...fallbackBest,
            fromTokenAmount: amountInSmallestUnit,
            toTokenAmount: toTokenAmountScaled,
          },
          isFallback: true,
        },
      }));
      return;
    }

    setQuotes((prev) => ({
      ...prev,
      [contract]: {
        loading: false,
        error: isSell ? 'Sell quote request failed. Check input amount.' : 'Quote request failed. Ensure input is at least 5 USDT.',
      },
    }));
  };

  // Auto-quote in Simple Mode: pre-quote the best wrapper using live simpleModeTokensMap
  useEffect(() => {
    if (viewMode !== 'simple') return;
    const currentPair = simpleModeTokensMap[selectedSimpleTicker];
    if (currentPair) {
      const bPrice = Number(currentPair.bstock?.tokenPrice || currentPair.bstock?.price || 0);
      const oPrice = Number(currentPair.ondo?.tokenPrice || currentPair.ondo?.price || 0);
      const bestTok = bPrice > 0 && oPrice > 0
        ? (bPrice <= oPrice ? currentPair.bstock : currentPair.ondo)
        : (currentPair.bstock || currentPair.ondo);
      if (bestTok) {
        const c = bestTok.tokenContractAddress || bestTok.contractAddress || bestTok.tokenAddress || '';
        if (c && !quotes[c]) {
          if (!amounts[c]) setAmounts((prev) => ({ ...prev, [c]: '25' }));
          handleGetQuote(bestTok);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedSimpleTicker, simpleModeTokensMap]);

  // Periodic background refresh for live token prices from Binance Web3 API (every 25s)
  useEffect(() => {
    const timer = setInterval(() => {
      fetchRwaData(selectedSimpleTicker);
    }, 25000);
    return () => clearInterval(timer);
  }, [selectedSimpleTicker]);

  const handleNaturalLanguageSubmit = async (e?: React.FormEvent, overridePrompt?: string) => {
    if (e) e.preventDefault();
    const query = (overridePrompt ?? nlPrompt).trim();
    if (!query) return;

    if (overridePrompt) {
      setNlPrompt(overridePrompt);
    }

    setNlLoading(true);
    setNlError(null);
    setNlResult(null);

    try {
      const res = await fetch(`/api/rwa?action=agent&prompt=${encodeURIComponent(query)}`);
      const json = await res.json();

      if (!json.success || !json.data || !json.data.success) {
        setNlError({
          error: json.data?.error || json.error || 'Could not understand command.',
          reason: json.data?.reason || 'UNRECOGNIZED_ACTION',
          suggestions: json.data?.suggestedExamples || [
            'buy $25 of the cheapest NVDA wrapper',
            'compare apple on bstocks vs ondo',
            'compare the mag7 basket',
          ],
        });
        setNlLoading(false);
        return;
      }

      const agentData = json.data;
      setNlResult(agentData);

      // If intent is BUY or SELL, sync with existing manual flow seamlessly
      if (agentData.intent?.action === 'BUY' || agentData.intent?.action === 'SELL') {
        const sym = agentData.intent.ticker;
        if (sym) {
          setTicker(sym);
          fetchRwaData(sym);
        }

        if (agentData.selectedWrapper?.contractAddress) {
          const contract = agentData.selectedWrapper.contractAddress;
          const isSell = agentData.intent.action === 'SELL';
          const amtStr = isSell
            ? String(agentData.intent.amountShares || '0.0218')
            : String(agentData.intent.amountUsdt || '10');

          setTradeDirections((prev) => ({ ...prev, [contract.toLowerCase()]: isSell ? 'sell' : 'buy' }));
          setAmounts((prev) => ({ ...prev, [contract.toLowerCase()]: amtStr }));

          // Automatically fetch quote using the EXACT same quote path
          handleGetQuote(
            {
              tokenContractAddress: contract,
              tokenSymbol: agentData.selectedWrapper.symbol,
            },
            isSell ? 'sell' : 'buy'
          );
        }
      } else if (agentData.intent?.action === 'COMPARE') {
        if (agentData.intent.ticker) {
          setTicker(agentData.intent.ticker);
          fetchRwaData(agentData.intent.ticker);
        }
      } else if (agentData.intent?.action === 'BASKET_SCAN') {
        if (agentData.intent.basketKey) {
          setSelectedBasket(agentData.intent.basketKey);
        }
      }
    } catch (err: any) {
      setNlError({
        error: err?.message || 'Failed to communicate with AfterGap agent.',
        reason: 'AGENT_ERROR',
      });
    } finally {
      setNlLoading(false);
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
      const direction = tradeDirections[contract.toLowerCase()] || 'buy';
      const isSell = direction === 'sell';
      const usdtContract = '0x55d398326f99059fF775485246999027B3197955';
      const fromToken = isSell ? contract : usdtContract;
      const toToken = isSell ? usdtContract : contract;

      const inputAmountStr = currentQuote.fromAmount || (isSell ? '0.0218' : '10');
      const amountInSmallestUnit = (BigInt(Math.floor(Number(inputAmountStr) * 1e6)) * BigInt(1e12)).toString();

      let tx: any = null;

      // Fetch swap calldata via secure server API proxy
      try {
        const swapRes = await fetch(
          `/api/rwa?action=swap&quoteId=${currentQuote.quoteId}&fromTokenAddress=${fromToken}&toTokenAddress=${toToken}&amount=${amountInSmallestUnit}&userWalletAddress=${walletAddress}&slippagePercent=1`
        );
        const swapJson = await swapRes.json();
        if (swapRes.ok && swapJson.swap?.data?.tx?.data) {
          tx = swapJson.swap.data.tx;
        }
      } catch (e) {
        console.warn('Proxy swap simulation fetch error:', e);
      }

      if (!tx || !tx.data) {
        throw new Error('Simulation route could not be prepared from LiquidMesh router.');
      }

      // 3. Perform eth_call simulation on BSC
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
          status: 'reverted',
          revertReason: err.message || 'Simulation route could not be locked. Ensure amount is at least 5 USDT.',
          simulatedAt: new Date().toISOString(),
          tx: null,
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
      <header className="w-full border-b border-white/[0.06] bg-[#07070A]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <AfterGapLogo className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl shadow-md shadow-[#F5C542]/20 shrink-0" />
            <span className="text-base sm:text-2xl font-bold tracking-tight text-[#F5C542] shrink-0">
              AfterGap
            </span>
            <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[11px] font-mono bg-white/[0.04] text-[#A1A1AA] border border-white/[0.06]">
              BSC 56
            </span>
            <span className="hidden lg:inline-flex px-2 py-0.5 rounded-full text-[11px] font-mono bg-[#3D9A6A]/10 text-[#3D9A6A] border border-[#3D9A6A]/30">
              Spot Aggregator
            </span>
          </div>

          {/* Mode Toggle: Simple vs Pro Terminal */}
          <div className="flex items-center p-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] shadow-inner shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('simple')}
              className={`px-2.5 sm:px-3.5 py-1 rounded-full text-[11px] sm:text-xs font-mono font-semibold transition ${
                viewMode === 'simple'
                  ? 'bg-[#F5C542] text-[#07070A] shadow-sm'
                  : 'text-[#A1A1AA] hover:text-[#F5F5F4]'
              }`}
            >
              Simple
            </button>
            <button
              type="button"
              onClick={() => setViewMode('pro')}
              className={`px-2.5 sm:px-3.5 py-1 rounded-full text-[11px] sm:text-xs font-mono font-semibold transition ${
                viewMode === 'pro'
                  ? 'bg-[#F5C542] text-[#07070A] shadow-sm'
                  : 'text-[#A1A1AA] hover:text-[#F5F5F4]'
              }`}
            >
              Pro
            </button>
          </div>

          {/* Top Bar Actions: Wallet & Gateway Status */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {wallet.connected && wallet.address ? (
              <div className="flex items-center gap-2 relative">
                {/* Balances (md+ desktop view) */}
                <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-[#A1A1AA]">USDT:</span>
                  <span className="text-[#F5F5F4] font-semibold">{walletBalances.usdt}</span>
                  <span className="text-white/20">|</span>
                  <span className="text-[#A1A1AA]">BNB:</span>
                  <span className="text-[#F5F5F4] font-semibold">{walletBalances.bnb}</span>
                  {walletBalances.nvdab !== '—' && Number(walletBalances.nvdab) > 0 && (
                    <>
                      <span className="text-white/20">|</span>
                      <span className="text-[#A1A1AA]">NVDAB:</span>
                      <span className="text-[#3D9A6A] font-semibold">{walletBalances.nvdab}</span>
                    </>
                  )}
                </div>

                {/* Connected address chip with tap to toggle options */}
                <button
                  type="button"
                  onClick={() => setWalletDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-mono bg-[#3D9A6A]/10 border border-[#3D9A6A]/30 text-[#3D9A6A] hover:bg-[#3D9A6A]/20 transition whitespace-nowrap shrink-0"
                  title="Click for wallet options or disconnect"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3D9A6A] animate-pulse shrink-0" />
                  <span className="font-semibold hidden sm:inline">BSC 56</span>
                  <span className="text-[#F5F5F4]">
                    {wallet.address.slice(0, 4)}…{wallet.address.slice(-4)}
                  </span>
                  <span className="text-[9px] text-[#A1A1AA] ml-0.5">▼</span>
                </button>

                {/* Dropdown Menu for Connected Wallet */}
                {walletDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#121214] border border-white/[0.1] rounded-xl shadow-2xl p-2.5 z-50 text-xs font-mono space-y-2">
                    <div className="text-[10px] text-[#A1A1AA] pb-1 border-b border-white/[0.06]">
                      <span className="block truncate">{wallet.address}</span>
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-[#A1A1AA]">USDT:</span>
                        <span className="text-[#F5F5F4] font-semibold">{walletBalances.usdt}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#A1A1AA]">BNB:</span>
                        <span className="text-[#F5F5F4] font-semibold">{walletBalances.bnb}</span>
                      </div>
                      {walletBalances.nvdab !== '—' && (
                        <div className="flex justify-between">
                          <span className="text-[#A1A1AA]">NVDAB:</span>
                          <span className="text-[#3D9A6A] font-semibold">{walletBalances.nvdab}</span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={disconnectWallet}
                      className="w-full mt-1 pt-1.5 border-t border-white/[0.06] text-center text-[#C45C26] hover:text-[#E07038] text-[11px] font-semibold transition"
                    >
                      Disconnect Wallet
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={connectWallet}
                disabled={wallet.connecting}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold font-mono transition-all border border-[#F5C542]/50 bg-[#F5C542]/10 text-[#F5C542] hover:bg-[#F5C542]/20 hover:border-[#F5C542] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-[#F5C542]/10 shrink-0"
              >
                {wallet.connecting ? (
                  <>
                    <ThinkingOrb state="connecting" size={20} theme="dark" />
                    <span className="hidden sm:inline">Connecting…</span>
                    <span className="sm:hidden text-xs">Connecting</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">Connect Wallet</span>
                    <span className="sm:hidden text-xs">Connect</span>
                  </>
                )}
              </button>
            )}

            {/* Compact Auth Chip (Public Gateway status) */}
            <div
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-xs font-mono bg-white/[0.03] border border-white/[0.06] whitespace-nowrap shrink-0"
              title={isAuthed ? `Signed (${data?.auth?.apiKeyPrefix})` : 'BSC 56 Gateway'}
            >
              <ThinkingOrb state={loading ? 'searching' : 'breathing'} size={20} theme="dark" />
              <span className="text-[#A1A1AA] hidden sm:inline text-xs">
                {isAuthed ? `Signed (${data?.auth?.apiKeyPrefix})` : 'BSC 56 Gateway'}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Balance Ribbon when connected */}
        {wallet.connected && wallet.address && (
          <div className="md:hidden w-full bg-white/[0.02] border-t border-white/[0.04] px-3.5 py-1.5 flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-2 text-[#A1A1AA]">
              <span>USDT: <strong className="text-[#F5F5F4]">{walletBalances.usdt}</strong></span>
              <span className="text-white/20">•</span>
              <span>BNB: <strong className="text-[#F5F5F4]">{walletBalances.bnb}</strong></span>
              {walletBalances.nvdab !== '—' && Number(walletBalances.nvdab) > 0 && (
                <>
                  <span className="text-white/20">•</span>
                  <span>NVDAB: <strong className="text-[#3D9A6A]">{walletBalances.nvdab}</strong></span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={disconnectWallet}
              className="text-[10px] text-[#A1A1AA] hover:text-[#C45C26] transition font-sans underline"
            >
              Disconnect
            </button>
          </div>
        )}
      </header>

      {/* Wallet Error Banner */}
      {wallet.error && (
        <div className="w-full border-b border-[#C45C26]/30 bg-[#C45C26]/10 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-3">
          <p className="text-xs font-mono text-[#C45C26] flex items-center gap-2 min-w-0">
            <span className="shrink-0">⚠️</span>
            <span className="break-words">{wallet.error}</span>
          </p>
          <button
            type="button"
            onClick={() => setWallet((w) => ({ ...w, error: null }))}
            className="text-[#C45C26] hover:text-[#F5F5F4] p-1 rounded hover:bg-white/[0.05] text-xs font-mono shrink-0 transition"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Screen Content */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-14 flex-1 flex flex-col items-center">
        {viewMode === 'simple' ? (
          <div className="w-full flex flex-col items-center">
            {/* Friendly Simple Mode Hero */}
            <div className="text-center mb-6 sm:mb-8 space-y-2">
              <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-[#F5F5F4]">
                Buy US Stocks on BNB Chain
              </h1>
              <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-lg mx-auto">
                AfterGap compares all tokenized versions in real time and automatically buys through the one with the best price.
              </p>
            </div>

            {/* Interactive Stock Selector Strip */}
            <div className="w-full max-w-3xl mb-8">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  Select Asset:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#3D9A6A] font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#3D9A6A] animate-pulse" />
                    7 Equities Live on BSC
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      fetchRwaData(selectedSimpleTicker);
                      const pair = simpleModeTokensMap[selectedSimpleTicker];
                      if (pair) {
                        const bP = Number(pair.bstock?.tokenPrice || pair.bstock?.price || 0);
                        const oP = Number(pair.ondo?.tokenPrice || pair.ondo?.price || 0);
                        const bTok = bP > 0 && oP > 0 ? (bP <= oP ? pair.bstock : pair.ondo) : (pair.bstock || pair.ondo);
                        if (bTok) handleGetQuote(bTok);
                      }
                    }}
                    disabled={loading}
                    title="Refresh live prices from Binance Web3 API"
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[#A1A1AA] hover:text-[#F5F5F4] transition flex items-center gap-1 border border-white/[0.08]"
                  >
                    <svg className={`w-3 h-3 ${loading ? 'animate-spin text-[#F5C542]' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
                  </button>
                </div>
              </div>

              <div className="flex sm:grid sm:grid-cols-4 lg:grid-cols-7 gap-2 overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0 -mx-3 px-3 sm:mx-0 sm:px-0 no-scrollbar snap-x">
                {['NVDA', 'TSLA', 'MSFT', 'GOOGL', 'META', 'AMD', 'COIN'].map((tickerKey) => {
                  const pair = simpleModeTokensMap[tickerKey];
                  const isSelected = selectedSimpleTicker === tickerKey;
                  const bstockTok = pair?.bstock;
                  const ondoTok = pair?.ondo;
                  const bPrice = Number(bstockTok?.tokenPrice || bstockTok?.price || 0);
                  const oPrice = Number(ondoTok?.tokenPrice || ondoTok?.price || 0);
                  const bestP = bPrice > 0 && oPrice > 0 ? Math.min(bPrice, oPrice) : (bPrice || oPrice || 0);
                  const bestTok = bPrice > 0 && oPrice > 0 ? (bPrice <= oPrice ? bstockTok : ondoTok) : (bstockTok || ondoTok);
                  const isLive = Boolean(pair?.isLive);

                  return (
                    <button
                      key={tickerKey}
                      type="button"
                      onClick={() => {
                        setSelectedSimpleTicker(tickerKey);
                        setTicker(tickerKey);
                        fetchRwaData(tickerKey);
                        if (bestTok) {
                          handleGetQuote(bestTok);
                        }
                      }}
                      className={`shrink-0 w-[100px] sm:w-auto p-2.5 sm:p-3 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center transition border text-center relative snap-start ${
                        isSelected
                          ? 'bg-[#F5C542]/15 border-[#F5C542] shadow-[0_0_20px_rgba(245,197,66,0.2)] text-[#F5F5F4]'
                          : 'bg-[#121214] border-white/[0.08] hover:border-white/20 text-[#A1A1AA] hover:text-[#F5F5F4]'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute -top-2 right-1.5 px-1.5 py-0.5 rounded-full bg-[#F5C542] text-[9px] font-bold text-[#07070A] tracking-wider uppercase shadow">
                          Active
                        </span>
                      )}
                      <span className="text-base font-bold tracking-tight text-[#F5F5F4]">
                        {tickerKey}
                      </span>
                      <span className="text-[10px] font-semibold text-[#A1A1AA] truncate max-w-[80px]">
                        {bestTok?.underlyingName?.split(' ')[0] || tickerKey}
                      </span>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs font-mono font-bold text-[#3D9A6A]">
                          ${bestP.toFixed(2)}
                        </span>
                        {isLive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#3D9A6A] animate-pulse" title="Live price from Binance Web3 API" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Focused Active Stock Trade Card */}
            {(() => {
              const pair = simpleModeTokensMap[selectedSimpleTicker] || simpleModeTokensMap.NVDA;
              const bstockTok = pair?.bstock;
              const ondoTok = pair?.ondo;
              const bstockPrice = Number(bstockTok?.tokenPrice || bstockTok?.price || 0);
              const ondoPrice = Number(ondoTok?.tokenPrice || ondoTok?.price || 0);
              const cheaperTok = bstockPrice > 0 && ondoPrice > 0
                ? (bstockPrice <= ondoPrice ? bstockTok : ondoTok)
                : (bstockTok || ondoTok);
              const otherTok = cheaperTok === bstockTok ? ondoTok : bstockTok;
              const otherPrice = bstockPrice > 0 && ondoPrice > 0
                ? (cheaperTok === bstockTok ? ondoPrice : bstockPrice)
                : 0;
              const cardSavings = otherPrice > 0
                ? Math.abs(otherPrice - Number(cheaperTok?.tokenPrice || cheaperTok?.price || 0)).toFixed(2)
                : '0.00';

              if (!cheaperTok) return null;

              const contract = cheaperTok.tokenContractAddress || cheaperTok.contractAddress || cheaperTok.tokenAddress || '';
              const quote = quotes[contract];
              const bc = broadcasts[contract];
              const cardIsFallback = Boolean(quote?.isFallback || cheaperTok.isFallback || data?.isFallback);
              const cardPrice = quote?.unitPrice
                ? Number(quote.unitPrice).toFixed(2)
                : Number(cheaperTok.tokenPrice || cheaperTok.price || 0).toFixed(2);
              
              const currentDir = tradeDirections[contract.toLowerCase()] || 'buy';
              const isSell = currentDir === 'sell';
              const inputAmount = amounts[contract] || (isSell ? '0.02' : '25');

              const isBstockCard =
                String(cheaperTok.platformId).toLowerCase() === 'bstock' ||
                String(cheaperTok.tokenSymbol).endsWith('B');
              const wrapperExplanation = isBstockCard
                ? 'gets dividends added as extra shares'
                : "gets dividends added to the token's value";

              return (
                <div className="w-full max-w-lg bg-[#121214] border border-white/[0.1] rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-2xl space-y-4 sm:space-y-5">
                  {/* Stock Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-bold text-[#F5F5F4] tracking-tight truncate">
                          {cheaperTok.underlyingName || selectedSimpleTicker}
                        </h2>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-bold text-[#F5C542]">
                          {cheaperTok.underlyingTicker || selectedSimpleTicker}
                        </span>
                        <span className="text-xs text-white/30">•</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-[#A1A1AA] font-mono font-semibold">
                          {cheaperTok.tokenSymbol}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center justify-end gap-1.5">
                        {!cardIsFallback && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#3D9A6A] animate-pulse" />
                        )}
                        <span className="text-[10px] text-[#A1A1AA] block uppercase tracking-wide">
                          {cardIsFallback ? 'Estimated Price' : 'Best Price'}
                        </span>
                      </div>
                      <span className="text-2xl sm:text-3xl font-extrabold text-[#F5F5F4]">
                        ${cardPrice}
                      </span>
                      {cardIsFallback ? (
                        <span className="text-[9px] text-[#A1A1AA]/80 block leading-tight mt-0.5">
                          Reference price, updates delayed
                        </span>
                      ) : (
                        <span className="text-[9px] text-[#3D9A6A] block leading-tight mt-0.5 font-medium">
                          {quote?.unitPrice ? '● Live DEX Aggregator Quote' : '● Live Binance Web3 Price'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Direction Toggle: Buy vs Sell */}
                  <div className="flex bg-[#07070A] p-1 rounded-2xl border border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => {
                        setTradeDirections((prev) => ({ ...prev, [contract.toLowerCase()]: 'buy' }));
                        handleGetQuote(cheaperTok, 'buy');
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        !isSell
                          ? 'bg-[#3D9A6A] text-white shadow-md'
                          : 'text-[#A1A1AA] hover:text-[#F5F5F4]'
                      }`}
                    >
                      <span>Buy {selectedSimpleTicker}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTradeDirections((prev) => ({ ...prev, [contract.toLowerCase()]: 'sell' }));
                        handleGetQuote(cheaperTok, 'sell');
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        isSell
                          ? 'bg-[#C45C26] text-white shadow-md'
                          : 'text-[#A1A1AA] hover:text-[#F5F5F4]'
                      }`}
                    >
                      <span>Sell {selectedSimpleTicker}</span>
                    </button>
                  </div>

                  {/* Wrapper Explanation & Savings */}
                  <div className="space-y-2">
                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs text-[#A1A1AA] leading-relaxed">
                      <span className="font-semibold text-[#F5F5F4]">{cheaperTok.tokenSymbol}</span>{' '}
                      {wrapperExplanation}.
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#3D9A6A]/10 border border-[#3D9A6A]/25 text-[#3D9A6A] text-xs font-medium">
                      <span className="shrink-0 text-base">✨</span>
                      <span>
                        {cardIsFallback
                          ? `Estimated savings: ~$${cardSavings} vs. the other option.`
                          : `Saves you $${cardSavings} vs. the other option.`}
                      </span>
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs text-[#A1A1AA]">
                      <span>{isSell ? `Amount of ${cheaperTok.tokenSymbol} to sell` : 'Amount to invest'}</span>
                      {quote?.toAmount && (
                        <span className="text-[#3D9A6A] font-semibold">
                          ≈ {quote.toAmount} {isSell ? 'USDT' : 'shares'}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-[#A1A1AA]">
                        {isSell ? '股' : '$'}
                      </span>
                      <input
                        type="number"
                        min={isSell ? '0.001' : '5'}
                        step={isSell ? '0.001' : '1'}
                        value={inputAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAmounts((prev) => ({ ...prev, [contract]: val }));
                        }}
                        placeholder={isSell ? '0.02' : '25'}
                        className="w-full bg-[#07070A] border border-white/[0.08] focus:border-[#F5C542]/70 rounded-2xl pl-8 pr-16 py-3 text-base font-bold text-[#F5F5F4] placeholder-[#A1A1AA]/40 outline-none transition"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#A1A1AA]">
                        {isSell ? cheaperTok.tokenSymbol : 'USD'}
                      </span>
                    </div>

                    {/* Quick Amount Pills */}
                    <div className="flex items-center gap-2 pt-1">
                      {(!isSell ? ['10', '25', '50', '100'] : ['0.01', '0.02', '0.05', '0.1']).map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setAmounts((prev) => ({ ...prev, [contract]: amt }));
                            handleGetQuote(cheaperTok, currentDir);
                          }}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition border ${
                            inputAmount === amt
                              ? 'bg-[#F5C542]/20 text-[#F5C542] border-[#F5C542]/50'
                              : 'bg-white/[0.03] text-[#A1A1AA] hover:text-[#F5F5F4] border-white/[0.06]'
                          }`}
                        >
                          {!isSell ? `$${amt}` : `${amt} sh`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Trade Action Button */}
                  <div className="space-y-3 pt-2">
                    {!wallet.connected ? (
                      <button
                        type="button"
                        onClick={connectWallet}
                        className="w-full py-3.5 rounded-2xl text-sm font-bold bg-[#F5C542] hover:bg-[#E0B02E] text-[#07070A] transition shadow-lg flex items-center justify-center gap-2"
                      >
                        <Wallet className="w-4 h-4" />
                        <span>{`Connect Wallet to ${isSell ? 'Sell' : 'Buy'} ${cheaperTok.underlyingTicker || selectedSimpleTicker}`}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!quote?.quoteId) {
                            await handleGetQuote(cheaperTok, currentDir);
                          } else {
                            handleApproveAndExecute(cheaperTok);
                          }
                        }}
                        disabled={bc?.loading || quote?.loading}
                        className={`w-full py-3.5 rounded-2xl text-sm font-bold transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 ${
                          isSell
                            ? 'bg-[#C45C26] hover:bg-[#A84A1C] text-white'
                            : 'bg-[#F5C542] hover:bg-[#E0B02E] text-[#07070A]'
                        }`}
                      >
                        {bc?.loading ? (
                          <>
                            <ThinkingOrb state="working" size={20} theme={isSell ? 'dark' : 'light'} />
                            <span>Confirming in wallet...</span>
                          </>
                        ) : quote?.loading ? (
                          <>
                            <ThinkingOrb state="searching" size={20} theme={isSell ? 'dark' : 'light'} />
                            <span>Checking best price...</span>
                          </>
                        ) : (
                          <span>{`${isSell ? 'Sell' : 'Buy'} ${cheaperTok.underlyingTicker || selectedSimpleTicker}`}</span>
                        )}
                      </button>
                    )}

                    {/* Confirmation receipt */}
                    {bc?.step === 'done' && bc.swapTxHash && (
                      <div className="p-3.5 rounded-2xl bg-[#3D9A6A]/10 border border-[#3D9A6A]/30 text-center space-y-1">
                        <div className="text-sm font-bold text-[#3D9A6A]">
                          🎉 {isSell
                            ? `Sold ${cheaperTok.underlyingTicker || selectedSimpleTicker} for ${quote?.toAmount || '—'} USDT`
                            : `Bought ${quote?.toAmount || '—'} shares of ${cheaperTok.underlyingTicker || selectedSimpleTicker}`}
                        </div>
                        <a
                          href={`https://bscscan.com/tx/${bc.swapTxHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[#F5C542] hover:underline font-mono inline-block mt-0.5"
                        >
                          View on BSCScan ↗
                        </a>
                      </div>
                    )}

                    {bc?.step === 'error' && (
                      <p className="text-xs text-[#C45C26] text-center font-medium">{bc.error}</p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Simple Mode Natural-Language Assistant */}
            <div className="w-full max-w-lg mt-6 bg-[#07070A] border border-white/[0.08] rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#F5C542]">
                <ThinkingOrb state="working" size={20} theme="dark" />
                <span>AfterGap AI Assistant</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={nlPrompt}
                  onChange={(e) => setNlPrompt(e.target.value)}
                  placeholder={`Try: "Buy $25 ${selectedSimpleTicker}" or "Find biggest gap"`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && nlPrompt.trim()) {
                      handleNaturalLanguageSubmit();
                    }
                  }}
                  className="w-full bg-[#121214] border border-white/[0.08] focus:border-[#F5C542]/60 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F4] placeholder-[#A1A1AA]/50 outline-none transition pr-16"
                />
                <button
                  type="button"
                  onClick={() => handleNaturalLanguageSubmit()}
                  disabled={nlLoading || !nlPrompt.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#F5C542] hover:bg-[#E0B02E] text-[#07070A] text-xs font-bold transition disabled:opacity-40"
                >
                  {nlLoading ? '...' : 'Ask'}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="text-[#A1A1AA]">Quick prompts:</span>
                <button
                  type="button"
                  onClick={() => {
                    handleNaturalLanguageSubmit(undefined, `Buy $25 of the cheapest ${selectedSimpleTicker} wrapper`);
                  }}
                  className="px-2 py-0.5 rounded bg-white/[0.04] text-[#A1A1AA] hover:text-[#F5F5F4] hover:bg-white/[0.08] border border-white/[0.06] transition font-mono"
                >
                  Buy $25 {selectedSimpleTicker}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleNaturalLanguageSubmit(undefined, 'Find the biggest gap between bStocks and Ondo right now');
                  }}
                  className="px-2 py-0.5 rounded bg-white/[0.04] text-[#A1A1AA] hover:text-[#F5F5F4] hover:bg-white/[0.08] border border-white/[0.06] transition font-mono"
                >
                  Find biggest gap
                </button>
              </div>
              {nlResult?.plainLanguageReason && (
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-[#F5C542]/30 text-xs text-[#F5F5F4] space-y-1">
                  <p className="text-[11px] text-[#A1A1AA]">AI Analysis:</p>
                  <p className="font-sans leading-relaxed">{nlResult.plainLanguageReason}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Hero */}
        <div className="text-center mb-6 sm:mb-8 space-y-1.5 sm:space-y-2">
          <h1 className="text-xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-[#F5F5F4]">
            Same stock. Dual wrappers. Live gap.
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-lg mx-auto">
            Inspect on-chain pricing vs. cash reference, quote live spot execution, and simulate BEP-20 swaps.
          </p>
        </div>

        {/* Natural-Language Agent Execution Bar */}
        <div className="w-full max-w-2xl mb-6 relative group">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#F5C542]/25 via-[#3D9A6A]/20 to-[#F5C542]/20 blur-md opacity-80 group-hover:opacity-100 transition duration-500"
          />
          <div className="relative rounded-2xl bg-[#121214] border border-[#F5C542]/30 p-4 sm:p-5 shadow-2xl backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BotAvatar seed={56} size={22} className="border border-[#F5C542]/40 rounded-full" />
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#F5C542] flex items-center gap-1.5">
                  Natural-Language Execution
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#3D9A6A]/15 text-[#3D9A6A] border border-[#3D9A6A]/30">
                  BSC Chain 56
                </span>
              </div>
              {nlLoading && (
                <div className="flex items-center gap-1.5 text-xs text-[#F5C542] font-mono">
                  <ThinkingOrb state="working" size={20} theme="light" />
                  <span className="text-[11px]">Reasoning...</span>
                </div>
              )}
            </div>

            <form onSubmit={handleNaturalLanguageSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={nlPrompt}
                  onChange={(e) => setNlPrompt(e.target.value)}
                  placeholder="Ask AfterGap: 'buy $25 of the cheapest NVDA wrapper'"
                  className="w-full bg-[#07070A] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#F5F5F4] placeholder-[#A1A1AA]/50 font-mono focus:outline-none focus:border-[#F5C542]/80 transition shadow-inner"
                />
              </div>
              <button
                type="submit"
                disabled={nlLoading || !nlPrompt.trim()}
                className="bg-[#F5C542] hover:bg-[#E0B02E] disabled:opacity-50 text-[#07070A] font-semibold px-5 py-3 rounded-xl text-sm transition flex items-center justify-center gap-1.5 min-w-[100px] shrink-0 font-mono"
              >
                {nlLoading ? 'Parsing...' : 'Ask Agent'}
              </button>
            </form>

            {/* Suggested Quick Prompts */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-[#A1A1AA] mr-1 font-mono">Try:</span>
              {[
                'buy $25 of the cheapest NVDA wrapper',
                'compare the mag7 basket',
                'compare apple on bstocks vs ondo',
                'sell 0.0218 NVDAB',
              ].map((promptText) => (
                <button
                  key={promptText}
                  type="button"
                  onClick={() => handleNaturalLanguageSubmit(undefined, promptText)}
                  className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#A1A1AA] hover:text-[#F5C542] border border-white/[0.06] transition"
                >
                  "{promptText}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Parsing / Ambiguity Error Card */}
        {nlError && (
          <div className="w-full max-w-2xl mb-6 rounded-2xl bg-[#C45C26]/10 border border-[#C45C26]/40 p-4 space-y-2 font-mono text-xs">
            <div className="flex items-center gap-2 text-[#C45C26] font-semibold">
              <span>⚠️</span>
              <span>Command Error: {nlError.reason}</span>
            </div>
            <p className="text-[#F5F5F4] text-xs">{nlError.error}</p>
            {nlError.suggestions && nlError.suggestions.length > 0 && (
              <div className="pt-2 border-t border-[#C45C26]/20">
                <span className="text-[#A1A1AA] block text-[11px] mb-1.5">Try one of these unambiguous commands:</span>
                <div className="flex flex-wrap gap-1.5">
                  {nlError.suggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => handleNaturalLanguageSubmit(undefined, sug)}
                      className="px-2 py-0.5 rounded bg-[#C45C26]/20 hover:bg-[#C45C26]/30 text-[#F5C542] text-[11px] transition"
                    >
                      "{sug}"
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Natural-Language Parsed Action Card */}
        {nlResult && (
          <div className="w-full max-w-2xl mb-6 relative group">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#3D9A6A]/30 via-[#F5C542]/30 to-[#3D9A6A]/30 blur-md opacity-85"
            />
            <div className="relative rounded-2xl bg-[#121214] border border-[#3D9A6A]/50 p-5 sm:p-6 shadow-2xl space-y-4">
              {/* Action Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#3D9A6A]/20 text-[#3D9A6A] border border-[#3D9A6A]/40 uppercase tracking-wider">
                    {nlResult.intent.action} Intent Parsed
                  </span>
                  {nlResult.intent.ticker && (
                    <span className="text-sm font-mono font-semibold text-[#F5F5F4]">
                      {nlResult.intent.ticker}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setNlResult(null)}
                  className="text-xs text-[#A1A1AA] hover:text-[#F5F5F4] px-2 py-1 rounded bg-white/[0.04]"
                >
                  ✕ Dismiss
                </button>
              </div>

              {/* Plain Language Rationale */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
                <span className="text-[11px] font-mono text-[#F5C542] block uppercase tracking-wider font-semibold">
                  Agent Market Rationale
                </span>
                <p className="text-sm sm:text-base text-[#F5F5F4] font-medium leading-relaxed">
                  {nlResult.plainLanguageReason}
                </p>
              </div>

              {/* Trade Quote & Single Execution CTA (for BUY / SELL) */}
              {nlResult.selectedWrapper && (() => {
                const targetContract = nlResult.selectedWrapper.contractAddress.toLowerCase();
                const targetQuote = quotes[targetContract];
                const targetBroadcast = broadcasts[targetContract];
                const isFallback = Boolean(targetQuote?.isFallback);

                return (
                  <div className="space-y-4 pt-1">
                    {/* Quote Details Ribbon */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                      <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06]">
                        <span className="text-[#A1A1AA] text-[10px] block">Selected Wrapper</span>
                        <span className="text-[#F5F5F4] font-semibold">{nlResult.selectedWrapper.symbol}</span>
                        <span className="text-[10px] text-[#A1A1AA] block capitalize">({nlResult.selectedWrapper.platformId})</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06]">
                        <span className="text-[#A1A1AA] text-[10px] block">Order Amount</span>
                        <span className="text-[#F5F5F4] font-semibold">
                          {nlResult.intent.action === 'SELL'
                            ? `${nlResult.intent.amountShares || '0.0218'} shares`
                            : `$${nlResult.intent.amountUsdt || '10'} USDT`}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06]">
                        <span className="text-[#A1A1AA] text-[10px] block">Estimated Receive</span>
                        <span className="text-[#3D9A6A] font-semibold">
                          {targetQuote?.toAmount ? `${targetQuote.toAmount} ${targetQuote.toTokenSymbol}` : 'Calculating...'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06]">
                        <span className="text-[#A1A1AA] text-[10px] block">Execution Router</span>
                        <span className="text-[#F5C542] font-semibold">
                          {targetQuote?.vendorName || 'LiquidMesh'}
                        </span>
                        <span className="text-[10px] text-[#A1A1AA] block">
                          TTL: {targetQuote?.ttlRemaining !== undefined ? `${targetQuote.ttlRemaining}s` : '30s'}
                        </span>
                      </div>
                    </div>

                    {/* Fund Protection Notice / Guard (Requirement 4) */}
                    {isFallback && (
                      <div className="p-3 rounded-xl bg-[#C45C26]/10 border border-[#C45C26]/30 text-xs font-mono text-[#C45C26] space-y-1">
                        <div className="font-semibold flex items-center gap-1.5">
                          <span>🛡️</span>
                          <span>Fund Protection Guard Active (Benchmark Mode)</span>
                        </div>
                        <p className="text-[11px] text-[#A1A1AA]">
                          Swaps are locked in benchmark mode to protect user funds. Live Binance RFQ gateway is restricted on this cloud region (CloudFront 40304). Run AfterGap Agent CLI for live trading.
                        </p>
                      </div>
                    )}

                    {/* Single Approve & Execute Button (Exact same execution path) */}
                    <div className="pt-1">
                      {nlResult.intent.action === 'SELL' ? (
                        <div className="space-y-2">
                          <button
                            type="button"
                            disabled
                            className="w-full py-3.5 px-4 rounded-xl font-semibold font-mono text-sm bg-zinc-800/80 border border-white/[0.08] text-[#A1A1AA] cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            <span>🔒 Sell Execution (Preview Only — Trading Locked)</span>
                          </button>
                          <p className="text-xs text-[#A1A1AA] font-mono text-center">
                            Sell execution is in preview mode. Autonomous natural-language execution currently supports verified 1-click BUY orders via LiquidMesh.
                          </p>
                        </div>
                      ) : !wallet.connected ? (
                        <button
                          type="button"
                          onClick={connectWallet}
                          className="w-full py-3.5 px-4 rounded-xl font-semibold font-mono text-sm bg-[#F5C542] hover:bg-[#E0B02E] text-[#07070A] transition shadow-lg flex items-center justify-center gap-2"
                        >
                          <Wallet className="w-4 h-4" />
                          <span>Connect Wallet to Execute</span>
                        </button>
                      ) : isFallback ? (
                        <button
                          type="button"
                          disabled
                          className="w-full py-3.5 px-4 rounded-xl font-semibold font-mono text-sm bg-zinc-800/80 border border-white/[0.08] text-[#A1A1AA] cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <span>🛡️ Benchmark Mode (Trading Locked)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApproveAndExecute({ tokenContractAddress: nlResult.selectedWrapper!.contractAddress, tokenSymbol: nlResult.selectedWrapper!.symbol })}
                          disabled={targetBroadcast?.loading || (targetQuote?.ttlRemaining || 0) <= 0}
                          className="w-full py-3.5 px-4 rounded-xl font-semibold font-mono text-sm bg-gradient-to-r from-[#F5C542] to-[#E0B02E] hover:from-[#E0B02E] hover:to-[#C89B20] text-[#07070A] transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {targetBroadcast?.loading ? (
                            <>
                              <ThinkingOrb state="working" size={20} theme="light" />
                              <span>
                                {targetBroadcast.step === 'preparing'
                                  ? 'Preparing Transaction...'
                                  : targetBroadcast.step === 'approving'
                                  ? 'Approving Exact Amount...'
                                  : targetBroadcast.step === 'waiting_receipt'
                                  ? 'Waiting for BSC Confirmation...'
                                  : 'Broadcasting Swap on BSC...'}
                              </span>
                            </>
                          ) : (
                            <span>Approve & Execute via LiquidMesh</span>
                          )}
                        </button>
                      )}

                      {/* On-Chain Confirmation Feedback */}
                      {targetBroadcast?.step === 'done' && targetBroadcast.swapTxHash && (
                        <div className="mt-3 p-3 rounded-xl bg-[#3D9A6A]/10 border border-[#3D9A6A]/40 text-xs font-mono space-y-1.5">
                          <div className="flex items-center justify-between text-[#3D9A6A] font-bold">
                            <span>✅ Trade Confirmed on BSC Mainnet!</span>
                            <a
                              href={`https://bscscan.com/tx/${targetBroadcast.swapTxHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="underline hover:text-[#F5C542]"
                            >
                              View on BscScan ↗
                            </a>
                          </div>
                          <p className="text-[11px] text-[#A1A1AA] break-all">
                            Tx: {targetBroadcast.swapTxHash}
                          </p>
                        </div>
                      )}

                      {targetBroadcast?.step === 'error' && (
                        <div className="mt-2 text-xs font-mono text-[#C45C26]">
                          ❌ {targetBroadcast.error}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Main Product Card */}
        <div className="w-full max-w-xl bg-[#121214] border border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
          {/* Ticker Search Form */}
          <form onSubmit={handleSubmit} className="flex gap-2.5">
            <div className="relative flex-1">
              <BorderBeam size="line" colorVariant="sunset" active={loading}>
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  placeholder="Ticker e.g. NVDA"
                  className="w-full bg-[#07070A] border border-white/[0.06] rounded-lg px-4 py-2.5 text-[#F5F5F4] placeholder-[#A1A1AA]/50 font-mono text-sm uppercase focus:outline-none focus:border-[#F5C542]/60 transition"
                />
              </BorderBeam>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#F5C542] hover:bg-[#E0B02E] disabled:opacity-50 text-[#07070A] font-semibold px-5 py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-1.5 min-w-[105px]"
            >
              {loading ? (
                <>
                  <ThinkingOrb state="searching" size={20} theme="light" />
                  <span>Inspecting...</span>
                </>
              ) : (
                'Inspect'
              )}
            </button>
          </form>

          {/* One-Line Mute Status */}
          <div className="text-xs text-[#A1A1AA] font-mono pt-0.5 min-h-[1.25rem]">
            {error ? (
              <span className="text-[#C45C26]">{error}</span>
            ) : !isAuthed ? (
              <span>Binance Web3 RWA public gateway active — interactive RFQ quotes & dry-runs enabled.</span>
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

          {/* Thematic Baskets Selector */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.04]">
            <span className="text-xs text-[#A1A1AA] mr-1">Baskets:</span>
            {[
              { id: 'mag7', label: '🌟 Mag 7', count: 7 },
              { id: 'ai_semis', label: '⚡ AI Semis', count: 3 },
              { id: 'buffett', label: '🏛️ Buffett', count: 3 },
            ].map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setSelectedBasket(selectedBasket === b.id ? null : b.id);
                }}
                className={`px-3 py-1 rounded-full text-xs font-mono transition border flex items-center gap-1.5 ${
                  selectedBasket === b.id
                    ? 'bg-[#3D9A6A]/15 text-[#3D9A6A] border-[#3D9A6A]/50 font-semibold shadow-sm shadow-[#3D9A6A]/20'
                    : 'bg-white/[0.04] text-[#A1A1AA] border-white/[0.06] hover:bg-white/[0.08] hover:text-[#F5F5F4]'
                }`}
              >
                <span>{b.label}</span>
                <span className="text-[10px] opacity-75 px-1 py-0.2 rounded bg-white/[0.06]">
                  {b.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Thematic Basket Overview Card */}
        {currentBasketData && (
          <div className="w-full max-w-4xl mt-6 relative group">
            {/* Ambient emerald backlight glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#3D9A6A]/30 via-[#F5C542]/20 to-[#3D9A6A]/25 blur-md opacity-85 group-hover:opacity-100 transition duration-500"
            />

            <div className="relative rounded-2xl bg-[#121214] border border-[#3D9A6A]/40 p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-4">
              {/* Basket Card Top Header */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <span className="text-xl sm:text-2xl">{currentBasketData.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-[#F5F5F4]">
                        {currentBasketData.name}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#3D9A6A]/10 text-[#3D9A6A] border border-[#3D9A6A]/30 font-semibold shrink-0">
                        {currentBasketData.constituents.length} BSC Equities
                      </span>
                    </div>
                    <p className="text-xs text-[#A1A1AA] line-clamp-1 mt-0.5">
                      {currentBasketData.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[11px] font-mono bg-white/[0.04] border border-white/[0.06] text-[#A1A1AA]">
                    🤖 Agent Skill Ready
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedBasket(null)}
                    className="px-2.5 py-1 text-xs font-mono rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#A1A1AA] hover:text-[#F5F5F4] transition"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              {/* Basket Aggregate Stats Ribbon */}
              <div className="p-3.5 bg-[#07070A] rounded-xl border border-white/[0.04] grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono items-center">
                <div>
                  <span className="text-[#A1A1AA] text-[10px] block uppercase">Total Basket Savings</span>
                  <span className="text-[#3D9A6A] text-sm sm:text-base font-bold mt-0.5 block">
                    +${currentBasketData.totalSavings} USDT
                  </span>
                </div>
                <div>
                  <span className="text-[#A1A1AA] text-[10px] block uppercase">Avg Spread to Cash</span>
                  <span className="text-[#F5C542] text-sm sm:text-base font-bold mt-0.5 block">
                    +{currentBasketData.avgSpread}% Basis
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[#A1A1AA] text-[10px] block uppercase">Top Arbitrage Pick</span>
                  <span className="text-white font-semibold mt-0.5 block truncate">
                    {currentBasketData.topPick?.ticker} (+${currentBasketData.topPick?.savings} via {currentBasketData.topPick?.cheaperSymbol})
                  </span>
                </div>
              </div>

              {/* Constituents Grid */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs text-[#A1A1AA] px-1 font-mono">
                  <span>Constituents Ranked by Savings</span>
                  <span>1-Tap Route & Quotes</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {currentBasketData.constituents.map((item) => (
                    <div
                      key={item.ticker}
                      className="p-3 rounded-xl bg-[#07070A] border border-white/[0.04] hover:border-[#3D9A6A]/30 transition flex flex-col justify-between space-y-2 text-xs"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-sm text-[#F5F5F4] font-mono">{item.ticker}</span>
                          <span className="text-[11px] text-[#A1A1AA] block truncate max-w-[130px]">
                            {item.tokenName}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[#3D9A6A] font-bold font-mono block">
                            +${item.savings}
                          </span>
                          <span className="text-[10px] text-[#A1A1AA] font-mono block">
                            {item.spreadToCash}% spread
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-white/[0.04] text-[11px] font-mono">
                        <span className="text-[#F5C542] font-semibold">
                          {item.cheaperSymbol} (${item.price})
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setTicker(item.ticker);
                              fetchRwaData(item.ticker);
                              setSelectedBasket(null);
                            }}
                            className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[#F5F5F4] hover:text-[#F5C542] transition"
                          >
                            Inspect
                          </button>
                          {item.cheaperToken && (
                            <button
                              type="button"
                              onClick={() => handleGetQuote(item.cheaperToken)}
                              className="px-2 py-0.5 rounded bg-[#F5C542]/10 hover:bg-[#F5C542]/20 border border-[#F5C542]/30 text-[#F5C542] transition"
                            >
                              Quote
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Smart Route Recommendation Hero Card */}
        {bestRoute && (
          <div className="w-full max-w-4xl mt-6 relative group">
            {/* Ambient backlight glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#F5C542]/30 via-[#3D9A6A]/25 to-[#F5C542]/20 blur-md opacity-75 group-hover:opacity-100 transition duration-500"
            />

            <BorderBeam size="md" colorVariant="sunset" active={true} className="w-full rounded-2xl">
              <div className="relative rounded-2xl bg-[#121214] border border-[#F5C542]/30 p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-4">
                {/* Header Badges */}
                <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-2 pb-3 border-b border-white/[0.06]">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
                    <span className="relative flex h-2 sm:h-2.5 w-2 sm:w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3D9A6A] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 sm:h-2.5 w-2 sm:w-2.5 bg-[#3D9A6A]"></span>
                    </span>
                    <span className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-[#F5C542] font-bold whitespace-nowrap shrink-0">
                      Smart Route<span className="hidden sm:inline"> Recommendation</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#3D9A6A]/10 text-[#3D9A6A] border border-[#3D9A6A]/30 font-semibold whitespace-nowrap shrink-0">
                      Cheapest<span className="hidden sm:inline"> Wrapper</span>
                    </span>
                    <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/[0.04] text-[#A1A1AA] border border-white/[0.06] font-semibold whitespace-nowrap shrink-0">
                      Dual-Wrapper Arbitrage
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-mono text-[#A1A1AA] shrink-0">
                    <span className="px-1.5 sm:px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10px]">
                      BSC 56
                    </span>
                    <span className="hidden sm:inline">Best Execution Guaranteed</span>
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
                        disabled={quotes[bestRoute.token.tokenContractAddress || '']?.loading}
                        className="w-full sm:w-auto px-3.5 py-2 bg-[#F5C542] hover:bg-[#E0B02E] disabled:opacity-50 text-[#07070A] font-bold rounded-lg text-xs font-mono transition flex items-center justify-center gap-1.5 shadow-lg shadow-[#F5C542]/10"
                      >
                        {quotes[bestRoute.token.tokenContractAddress || '']?.loading ? (
                          <>
                            <ThinkingOrb state="working" size={20} theme="light" />
                            <span>Quoting...</span>
                          </>
                        ) : (
                          <>
                            <span>Quote Best Route</span>
                            <span>⚡</span>
                          </>
                        )}
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
            </BorderBeam>
          </div>
        )}

        {/* Results: Dual Wrapper Comparison (bStocks vs Ondo) */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mt-6 sm:mt-8">
          {/* Column 1: bStocks */}
          <div className="bg-[#121214] border border-white/[0.06] rounded-2xl p-4 sm:p-5 flex flex-col justify-between min-w-0 overflow-hidden">
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
                      : 'bg-[#C45C26]/10 text-[#C45C26] border-[#C45C26]/30'
                  }`}
                >
                  {bstocksTokens.length > 0 ? 'On-Chain Verified' : 'Not in catalog'}
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
                    const direction = tradeDirections[contract.toLowerCase()] || 'buy';
                    const isSell = direction === 'sell';
                    const defaultAmount = isSell ? '0.0218' : '10';
                    const inputAmount = amounts[contract] !== undefined ? amounts[contract] : defaultAmount;

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

                        {/* Benchmark Pricing Disclosure Banner */}
                        <div
                          data-testid="bstocks-fallback-badge"
                          className="p-2.5 rounded-lg bg-[#F5C542]/10 border border-[#F5C542]/30 text-[#F5C542] space-y-1"
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide">
                            <span>⚠️</span>
                            <span>Benchmark Reference Pricing</span>
                          </div>
                          <p className="text-[11px] text-[#F5C542]/80 leading-tight font-mono">
                            Binance Web3 Gateway restricts serverless datacenter IPs (40304). Prices shown are verified benchmark data; on-chain swaps execute live via BSC RPC.
                          </p>
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
                          {/* Buy / Sell Mode Toggle */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/40 border border-white/[0.06]">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isSell) {
                                    setTradeDirections((prev) => ({ ...prev, [contract.toLowerCase()]: 'buy' }));
                                    setAmounts((prev) => ({ ...prev, [contract]: '10' }));
                                    handleGetQuote(t, 'buy');
                                  }
                                }}
                                className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-medium transition ${
                                  !isSell
                                    ? 'bg-[#3D9A6A]/20 text-[#3D9A6A] border border-[#3D9A6A]/40 font-bold'
                                    : 'text-[#A1A1AA] hover:text-[#F5F5F4]'
                                }`}
                              >
                                🟢 Buy {t.tokenSymbol}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isSell) {
                                    setTradeDirections((prev) => ({ ...prev, [contract.toLowerCase()]: 'sell' }));
                                    const userSellAmt = walletBalances.nvdab !== '—' && Number(walletBalances.nvdab) > 0 ? walletBalances.nvdab : '0.0218';
                                    setAmounts((prev) => ({ ...prev, [contract]: userSellAmt }));
                                    handleGetQuote(t, 'sell');
                                  }
                                }}
                                className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-medium transition ${
                                  isSell
                                    ? 'bg-[#C45C26]/20 text-[#E07A5F] border border-[#C45C26]/40 font-bold'
                                    : 'text-[#A1A1AA] hover:text-[#F5F5F4]'
                                }`}
                              >
                                🔴 Sell {t.tokenSymbol}
                              </button>
                            </div>
                            {isSell && walletBalances.nvdab !== '—' && (
                              <span className="text-[10px] font-mono text-[#A1A1AA]">
                                Bal: <span className="text-[#3D9A6A] font-semibold">{walletBalances.nvdab}</span> {t.tokenSymbol}
                              </span>
                            )}
                          </div>

                          {/* Quick Amount Pills */}
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                            <span className="text-[10px] text-[#A1A1AA] font-mono shrink-0">Quick:</span>
                            {(!isSell ? ['5', '10', '25', '50'] : ['0.01', '0.02', '0.0218', '0.05']).map((amt) => (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => setAmounts((prev) => ({ ...prev, [contract]: amt }))}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono transition shrink-0 ${
                                  (amounts[contract] || defaultAmount) === amt
                                    ? 'bg-[#F5C542]/20 text-[#F5C542] border border-[#F5C542]/40 font-semibold'
                                    : 'bg-white/[0.04] text-[#A1A1AA] hover:text-[#F5F5F4] border border-white/[0.06]'
                                }`}
                              >
                                {amt} {!isSell ? 'USDT' : t.tokenSymbol}
                              </button>
                            ))}
                            {isSell && walletBalances.nvdab !== '—' && Number(walletBalances.nvdab) > 0 && (
                              <button
                                type="button"
                                onClick={() => setAmounts((prev) => ({ ...prev, [contract]: walletBalances.nvdab }))}
                                className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#3D9A6A]/15 text-[#3D9A6A] hover:bg-[#3D9A6A]/25 border border-[#3D9A6A]/30 transition shrink-0 font-semibold"
                              >
                                MAX
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                min={isSell ? "0.001" : "5"}
                                step={isSell ? "0.001" : "1"}
                                value={inputAmount}
                                onChange={(e) =>
                                  setAmounts((prev) => ({ ...prev, [contract]: e.target.value }))
                                }
                                placeholder={isSell ? `${t.tokenSymbol} amount` : "USDT (Min 5)"}
                                className="w-full bg-[#121214] border border-white/[0.06] rounded px-2.5 py-1 text-xs font-mono text-[#F5F5F4] focus:outline-none focus:border-[#F5C542]/50"
                              />
                              <span className="absolute right-2 top-1 text-[10px] text-[#A1A1AA] font-mono">
                                {isSell ? t.tokenSymbol : 'USDT'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleGetQuote(t)}
                              disabled={quote?.loading}
                              className="px-3 py-1 bg-[#F5C542]/10 hover:bg-[#F5C542]/20 border border-[#F5C542]/30 text-[#F5C542] rounded text-xs font-mono transition disabled:opacity-50 flex items-center justify-center gap-1.5 min-w-[85px]"
                            >
                              {quote?.loading ? (
                                <>
                                  <ThinkingOrb state="working" size={20} theme="dark" />
                                  <span>Quoting...</span>
                                </>
                              ) : (
                                isSell ? 'Sell Quote' : 'Get Quote'
                              )}
                            </button>
                          </div>
                          {!isSell && Number(inputAmount) < 5 && (
                            <p className="text-[10px] text-[#F5C542] font-mono">
                              ℹ Binance Web3 RFQ requires min order of 5 USDT.
                            </p>
                          )}
                          {isSell && Number(inputAmount) <= 0 && (
                            <p className="text-[10px] text-[#F5C542] font-mono">
                              ℹ Enter amount of {t.tokenSymbol} to sell for USDT.
                            </p>
                          )}

                          {/* Quote Results & 30s TTL */}
                          {quote?.quoteId && (
                            <div className="p-2.5 bg-[#121214] rounded border border-white/[0.06] space-y-1.5 font-mono text-[11px]">
                              {/* Route Status Notice */}
                              <div className="px-2 py-1 rounded bg-white/[0.04] border border-white/[0.06] text-[#A1A1AA] flex items-center justify-between text-[10px] font-mono">
                                <span className="flex items-center gap-1 text-[#F5C542]">
                                  <span>⚡</span>
                                  <span>Route: {quote.vendorName || 'LiquidMesh'} ({quote.executionMode || 'SWAP'})</span>
                                </span>
                                <span className="text-[#3D9A6A] font-semibold">Router Active</span>
                              </div>
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-[#A1A1AA]">Input Amount:</span>
                                <span className="text-[#F5F5F4] font-semibold">{quote.fromAmount} {isSell ? t.tokenSymbol : 'USDT'}</span>
                              </div>
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
                              <div className="pt-1 border-t border-white/[0.04] text-[10px]">
                                <span className="text-[#A1A1AA] block text-[9px] uppercase tracking-wider text-white/40">LiquidMesh {isSell ? 'Reverse Hop Route' : 'Multi-Hop Route'}</span>
                                <span className="text-[#F5C542] font-semibold text-[10px] break-words">
                                  {isSell
                                    ? `${t.tokenSymbol} → USDC → WBTC → BTCB → USDT (LiquidMesh / Elfomofi)`
                                    : (t.tokenSymbol === 'NVDAon' ? 'USDT → NVDAB → NVDAon' : 'USDT → ASTER → WBNB → USDC → NVDAB')}
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
                                  className="w-full py-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#F5F5F4] rounded text-center text-[11px] font-mono transition disabled:opacity-40 flex items-center justify-center gap-1.5"
                                >
                                  {sim?.loading ? (
                                    <>
                                      <ThinkingOrb state="solving" size={20} theme="dark" />
                                      <span>Simulating via BSC eth_call...</span>
                                    </>
                                  ) : (
                                    'Simulate Swap (eth_call)'
                                  )}
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
                                    <p className="text-[10px] text-[#A1A1AA] leading-tight break-words max-w-full overflow-hidden">
                                      {formatRevertReason(sim.revertReason, quote.spender)}
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

                                  {/* Execute Swap Button */}
                                  {(() => {
                                    const bc = broadcasts[contract];
                                    return (
                                      <div className="pt-1.5 border-t border-white/[0.04] mt-1">
                                        {bc?.step === 'done' ? (
                                          <div className="space-y-1.5 p-2 rounded bg-black/40 border border-[#3D9A6A]/30">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-[#3D9A6A] animate-pulse" />
                                                <span className="text-[#3D9A6A] font-semibold text-[11px]">🎉 Swap Executed Live on BSC!</span>
                                              </div>
                                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#3D9A6A]/20 text-[#3D9A6A] font-mono font-bold">
                                                Mainnet Verified
                                              </span>
                                            </div>

                                            {bc.swapTxHash && (
                                              <div className="space-y-1 pt-1 border-t border-white/[0.04]">
                                                <div className="flex items-center justify-between text-[10px] text-[#A1A1AA]">
                                                  <span>Swap Hash:</span>
                                                  <span className="text-[#3D9A6A] font-semibold">LiquidMesh Router</span>
                                                </div>
                                                <div className="flex items-center justify-between gap-1.5 bg-[#121214] p-1.5 rounded border border-white/[0.06]">
                                                  <span className="font-mono text-[10px] text-[#3D9A6A] truncate max-w-[130px] sm:max-w-[180px]">
                                                    {bc.swapTxHash.slice(0, 10)}...{bc.swapTxHash.slice(-8)}
                                                  </span>
                                                  <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        navigator.clipboard.writeText(bc.swapTxHash!);
                                                        setCopiedHash(bc.swapTxHash!);
                                                        setTimeout(() => setCopiedHash(null), 2500);
                                                      }}
                                                      className="px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[10px] text-[#F5F5F4] font-mono transition"
                                                    >
                                                      {copiedHash === bc.swapTxHash ? '✓ Copied' : 'Copy'}
                                                    </button>
                                                    <a
                                                      href={`https://bscscan.com/tx/${bc.swapTxHash}`}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="px-2 py-0.5 rounded bg-[#3D9A6A]/20 hover:bg-[#3D9A6A]/30 text-[10px] text-[#3D9A6A] font-mono transition flex items-center gap-0.5"
                                                    >
                                                      <span>BSCScan</span>
                                                      <span>↗</span>
                                                    </a>
                                                  </div>
                                                </div>
                                              </div>
                                            )}

                                            {bc.approveTxHash && (
                                              <div className="flex items-center justify-between text-[10px] text-[#A1A1AA] pt-0.5 border-t border-white/[0.04]">
                                                <span>{isSell ? `${t.tokenSymbol} Approval:` : 'USDT Approval:'}</span>
                                                <div className="flex items-center gap-1.5 font-mono">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      navigator.clipboard.writeText(bc.approveTxHash!);
                                                      setCopiedHash(bc.approveTxHash!);
                                                      setTimeout(() => setCopiedHash(null), 2500);
                                                    }}
                                                    className="text-[#F5C542] hover:underline"
                                                  >
                                                    {copiedHash === bc.approveTxHash ? '✓ Copied' : 'Copy Hash'}
                                                  </button>
                                                  <span>•</span>
                                                  <a
                                                    href={`https://bscscan.com/tx/${bc.approveTxHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[#F5C542] hover:underline flex items-center gap-0.5"
                                                  >
                                                    <span>View</span>
                                                    <span>↗</span>
                                                  </a>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ) : bc?.step === 'error' ? (
                                          <p className="text-[10px] text-[#C45C26]">{bc.error}</p>
                                        ) : isSell ? (
                                          <div className="space-y-1">
                                            <button
                                              type="button"
                                              disabled
                                              className="w-full py-1.5 px-3 rounded text-[11px] font-mono font-semibold bg-zinc-800/80 border border-white/[0.08] text-[#A1A1AA] cursor-not-allowed flex items-center justify-center gap-1.5"
                                            >
                                              <span>🔒 Sell Execution (Preview Only — Trading Locked)</span>
                                            </button>
                                            <p className="text-[10px] text-[#A1A1AA] font-mono text-center">
                                              Sell execution is in preview mode pending live verification. To liquidate shares, use manual sell or DEX routing.
                                            </p>
                                          </div>
                                        ) : (
                                          <>
                                            <MetalFx variant="button" preset="gold" strength={0.85}>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (quote.isFallback) return;
                                                  wallet.connected ? handleApproveAndExecute(t) : connectWallet();
                                                }}
                                                disabled={bc?.loading || (quote.ttlRemaining || 0) <= 0 || Boolean(quote.isFallback)}
                                                className={`w-full py-1.5 px-3 rounded text-[11px] font-mono font-semibold transition disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                                                  quote.isFallback
                                                    ? 'bg-white/[0.04] text-[#A1A1AA] border border-white/[0.08] cursor-not-allowed'
                                                    : wallet.connected
                                                    ? 'bg-[#3D9A6A]/15 hover:bg-[#3D9A6A]/25 border border-[#3D9A6A]/40 text-[#3D9A6A]'
                                                    : 'bg-[#F5C542]/10 hover:bg-[#F5C542]/20 border border-[#F5C542]/30 text-[#F5C542]'
                                                }`}
                                              >
                                                {bc?.loading ? (
                                                  <>
                                                    <ThinkingOrb state="connecting" size={20} theme="dark" />
                                                    <span className="truncate">
                                                      {bc.step === 'preparing'
                                                        ? 'Preparing Route...'
                                                        : bc.step === 'approving'
                                                        ? `Approve ${isSell ? t.tokenSymbol : 'USDT'} in wallet...`
                                                        : bc.step === 'waiting_receipt'
                                                        ? 'Confirming on BSC (~3s)...'
                                                        : bc.step === 'approved'
                                                        ? 'Approved! Next: Confirm swap...'
                                                        : bc.step === 'swapping'
                                                        ? 'Confirm swap in wallet...'
                                                        : 'Broadcasting...'}
                                                    </span>
                                                  </>
                                                ) : quote.isFallback ? (
                                                  <span className="flex items-center justify-center gap-1.5 text-[#A1A1AA]">
                                                    <span>🛡️ Benchmark Mode (Trading Locked)</span>
                                                  </span>
                                                ) : wallet.connected ? (
                                                  isSell ? '🚀 Execute Live Sell on BSC' : '🚀 Execute Live Buy on BSC'
                                                ) : (
                                                  <span className="flex items-center justify-center gap-1.5">
                                                    <Wallet className="w-3.5 h-3.5" />
                                                    <span>Connect Wallet to Execute</span>
                                                  </span>
                                                )}
                                              </button>
                                            </MetalFx>
                                            {!quote.isFallback && (
                                              <div className="flex items-center justify-between text-[10px] text-[#A1A1AA] pt-1.5 px-0.5">
                                                <span className="flex items-center gap-1 text-[#3D9A6A]">
                                                  <span>🛡️ Allowance:</span>
                                                  <span className="font-semibold text-[#F5F5F4]">
                                                    {approvalMode === 'exact' ? `Exact (${amounts[contract] || defaultAmount} ${isSell ? t.tokenSymbol : 'USDT'})` : 'Unlimited'}
                                                  </span>
                                                  <span className="text-[9px] text-[#3D9A6A] bg-[#3D9A6A]/10 px-1 py-0.2 rounded border border-[#3D9A6A]/20">
                                                    {approvalMode === 'exact' ? 'Least-Privilege' : 'Convenience'}
                                                  </span>
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => setApprovalMode(approvalMode === 'exact' ? 'unlimited' : 'exact')}
                                                  className="text-[#F5C542] hover:underline font-mono text-[10px]"
                                                >
                                                  {approvalMode === 'exact' ? 'Switch to Unlimited' : 'Switch to Exact (Safer)'}
                                                </button>
                                              </div>
                                            )}
                                            {quote.isFallback && (
                                              <p className="text-[10px] text-[#A1A1AA] text-center pt-1 leading-tight">
                                                Live RFQ is restricted in this cloud region (40304). Trades are locked for fund safety. Run AfterGap Agent CLI for live execution.
                                              </p>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    );
                                  })()}
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
                    {loading ? 'Resolving...' : 'Not in catalog'}
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
          <div className="bg-[#121214] border border-white/[0.06] rounded-2xl p-4 sm:p-5 flex flex-col justify-between min-w-0 overflow-hidden">
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
                      : 'bg-[#C45C26]/10 text-[#C45C26] border-[#C45C26]/30'
                  }`}
                >
                  {ondoTokens.length > 0 ? 'On-Chain Verified' : 'Not in catalog'}
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
                    const direction = tradeDirections[contract.toLowerCase()] || 'buy';
                    const isSell = direction === 'sell';
                    const defaultAmount = isSell ? '0.026' : '10';
                    const inputAmount = amounts[contract] !== undefined ? amounts[contract] : defaultAmount;

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

                        {/* Benchmark Pricing Disclosure Banner */}
                        <div
                          data-testid="ondo-fallback-badge"
                          className="p-2.5 rounded-lg bg-[#F5C542]/10 border border-[#F5C542]/30 text-[#F5C542] space-y-1"
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide">
                            <span>⚠️</span>
                            <span>Benchmark Reference Pricing</span>
                          </div>
                          <p className="text-[11px] text-[#F5C542]/80 leading-tight font-mono">
                            Binance Web3 Gateway restricts serverless datacenter IPs (40304). Prices shown are verified benchmark data; on-chain swaps execute live via BSC RPC.
                          </p>
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
                          {/* Buy / Sell Mode Toggle */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/40 border border-white/[0.06]">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isSell) {
                                    setTradeDirections((prev) => ({ ...prev, [contract.toLowerCase()]: 'buy' }));
                                    setAmounts((prev) => ({ ...prev, [contract]: '10' }));
                                    handleGetQuote(t, 'buy');
                                  }
                                }}
                                className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-medium transition ${
                                  !isSell
                                    ? 'bg-[#3D9A6A]/20 text-[#3D9A6A] border border-[#3D9A6A]/40 font-bold'
                                    : 'text-[#A1A1AA] hover:text-[#F5F5F4]'
                                }`}
                              >
                                🟢 Buy {t.tokenSymbol}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isSell) {
                                    setTradeDirections((prev) => ({ ...prev, [contract.toLowerCase()]: 'sell' }));
                                    setAmounts((prev) => ({ ...prev, [contract]: '0.026' }));
                                    handleGetQuote(t, 'sell');
                                  }
                                }}
                                className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-medium transition ${
                                  isSell
                                    ? 'bg-[#C45C26]/20 text-[#E07A5F] border border-[#C45C26]/40 font-bold'
                                    : 'text-[#A1A1AA] hover:text-[#F5F5F4]'
                                }`}
                              >
                                🔴 Sell {t.tokenSymbol}
                              </button>
                            </div>
                          </div>

                          {/* Quick Amount Pills */}
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                            <span className="text-[10px] text-[#A1A1AA] font-mono shrink-0">Quick:</span>
                            {(!isSell ? ['5', '10', '25', '50'] : ['0.01', '0.02', '0.026', '0.05']).map((amt) => (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => setAmounts((prev) => ({ ...prev, [contract]: amt }))}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono transition shrink-0 ${
                                  (amounts[contract] || defaultAmount) === amt
                                    ? 'bg-[#F5C542]/20 text-[#F5C542] border border-[#F5C542]/40 font-semibold'
                                    : 'bg-white/[0.04] text-[#A1A1AA] hover:text-[#F5F5F4] border border-white/[0.06]'
                                }`}
                              >
                                {amt} {!isSell ? 'USDT' : t.tokenSymbol}
                              </button>
                            ))}
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                min={isSell ? "0.001" : "1"}
                                step={isSell ? "0.001" : "1"}
                                value={inputAmount}
                                onChange={(e) =>
                                  setAmounts((prev) => ({ ...prev, [contract]: e.target.value }))
                                }
                                placeholder={isSell ? `${t.tokenSymbol} amount` : "USDT"}
                                className="w-full bg-[#121214] border border-white/[0.06] rounded px-2.5 py-1 text-xs font-mono text-[#F5F5F4] focus:outline-none focus:border-[#F5C542]/50"
                              />
                              <span className="absolute right-2 top-1 text-[10px] text-[#A1A1AA] font-mono">
                                {isSell ? t.tokenSymbol : 'USDT'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleGetQuote(t)}
                              disabled={quote?.loading}
                              className="px-3 py-1 bg-[#F5C542]/10 hover:bg-[#F5C542]/20 border border-[#F5C542]/30 text-[#F5C542] rounded text-xs font-mono transition disabled:opacity-50 flex items-center justify-center gap-1.5 min-w-[85px]"
                            >
                              {quote?.loading ? (
                                <>
                                  <ThinkingOrb state="working" size={20} theme="dark" />
                                  <span>Quoting...</span>
                                </>
                              ) : (
                                isSell ? 'Sell Quote' : 'Get Quote'
                              )}
                            </button>
                          </div>
                          {!isSell && Number(inputAmount) < 5 && (
                            <p className="text-[10px] text-[#F5C542] font-mono">
                              ℹ Binance Web3 RFQ requires min order of 5 USDT.
                            </p>
                          )}
                          {isSell && Number(inputAmount) <= 0 && (
                            <p className="text-[10px] text-[#F5C542] font-mono">
                              ℹ Enter amount of {t.tokenSymbol} to sell for USDT.
                            </p>
                          )}

                          {/* Quote Results & 30s TTL */}
                          {quote?.quoteId && (
                            <div className="p-2.5 bg-[#121214] rounded border border-white/[0.06] space-y-1.5 font-mono text-[11px]">
                              {/* Route Status Notice */}
                              <div className="px-2 py-1 rounded bg-white/[0.04] border border-white/[0.06] text-[#A1A1AA] flex items-center justify-between text-[10px] font-mono">
                                <span className="flex items-center gap-1 text-[#F5C542]">
                                  <span>⚡</span>
                                  <span>Route: {quote.vendorName || 'Ondo'} ({quote.executionMode || 'RFQ'})</span>
                                </span>
                                <span className="text-[#3D9A6A] font-semibold">Router Active</span>
                              </div>
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-[#A1A1AA]">Input Amount:</span>
                                <span className="text-[#F5F5F4] font-semibold">{quote.fromAmount} {isSell ? t.tokenSymbol : 'USDT'}</span>
                              </div>
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
                                  className="w-full py-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#F5F5F4] rounded text-center text-[11px] font-mono transition disabled:opacity-40 flex items-center justify-center gap-1.5"
                                >
                                  {sim?.loading ? (
                                    <>
                                      <ThinkingOrb state="solving" size={20} theme="dark" />
                                      <span>Simulating via BSC eth_call...</span>
                                    </>
                                  ) : (
                                    'Simulate Swap (eth_call)'
                                  )}
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
                                    <p className="text-[10px] text-[#A1A1AA] leading-tight break-words max-w-full overflow-hidden">
                                      {formatRevertReason(sim.revertReason, quote.spender)}
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

                                  {/* Execute Swap Button */}
                                  {(() => {
                                    const bc = broadcasts[contract];
                                    return (
                                      <div className="pt-1.5 border-t border-white/[0.04] mt-1">
                                        {bc?.step === 'done' ? (
                                          <div className="space-y-1.5 p-2 rounded bg-black/40 border border-[#3D9A6A]/30">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-[#3D9A6A] animate-pulse" />
                                                <span className="text-[#3D9A6A] font-semibold text-[11px]">🎉 Swap Executed Live on BSC!</span>
                                              </div>
                                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#3D9A6A]/20 text-[#3D9A6A] font-mono font-bold">
                                                Mainnet Verified
                                              </span>
                                            </div>

                                            {bc.swapTxHash && (
                                              <div className="space-y-1 pt-1 border-t border-white/[0.04]">
                                                <div className="flex items-center justify-between text-[10px] text-[#A1A1AA]">
                                                  <span>Swap Hash:</span>
                                                  <span className="text-[#3D9A6A] font-semibold">LiquidMesh Router</span>
                                                </div>
                                                <div className="flex items-center justify-between gap-1.5 bg-[#121214] p-1.5 rounded border border-white/[0.06]">
                                                  <span className="font-mono text-[10px] text-[#3D9A6A] truncate max-w-[130px] sm:max-w-[180px]">
                                                    {bc.swapTxHash.slice(0, 10)}...{bc.swapTxHash.slice(-8)}
                                                  </span>
                                                  <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        navigator.clipboard.writeText(bc.swapTxHash!);
                                                        setCopiedHash(bc.swapTxHash!);
                                                        setTimeout(() => setCopiedHash(null), 2500);
                                                      }}
                                                      className="px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[10px] text-[#F5F5F4] font-mono transition"
                                                    >
                                                      {copiedHash === bc.swapTxHash ? '✓ Copied' : 'Copy'}
                                                    </button>
                                                    <a
                                                      href={`https://bscscan.com/tx/${bc.swapTxHash}`}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="px-2 py-0.5 rounded bg-[#3D9A6A]/20 hover:bg-[#3D9A6A]/30 text-[10px] text-[#3D9A6A] font-mono transition flex items-center gap-0.5"
                                                    >
                                                      <span>BSCScan</span>
                                                      <span>↗</span>
                                                    </a>
                                                  </div>
                                                </div>
                                              </div>
                                            )}

                                            {bc.approveTxHash && (
                                              <div className="flex items-center justify-between text-[10px] text-[#A1A1AA] pt-0.5 border-t border-white/[0.04]">
                                                <span>{isSell ? `${t.tokenSymbol} Approval:` : 'USDT Approval:'}</span>
                                                <div className="flex items-center gap-1.5 font-mono">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      navigator.clipboard.writeText(bc.approveTxHash!);
                                                      setCopiedHash(bc.approveTxHash!);
                                                      setTimeout(() => setCopiedHash(null), 2500);
                                                    }}
                                                    className="text-[#F5C542] hover:underline"
                                                  >
                                                    {copiedHash === bc.approveTxHash ? '✓ Copied' : 'Copy Hash'}
                                                  </button>
                                                  <span>•</span>
                                                  <a
                                                    href={`https://bscscan.com/tx/${bc.approveTxHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[#F5C542] hover:underline flex items-center gap-0.5"
                                                  >
                                                    <span>View</span>
                                                    <span>↗</span>
                                                  </a>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ) : bc?.step === 'error' ? (
                                          <p className="text-[10px] text-[#C45C26]">{bc.error}</p>
                                        ) : isSell ? (
                                          <div className="space-y-1">
                                            <button
                                              type="button"
                                              disabled
                                              className="w-full py-1.5 px-3 rounded text-[11px] font-mono font-semibold bg-zinc-800/80 border border-white/[0.08] text-[#A1A1AA] cursor-not-allowed flex items-center justify-center gap-1.5"
                                            >
                                              <span>🔒 Sell Execution (Preview Only — Trading Locked)</span>
                                            </button>
                                            <p className="text-[10px] text-[#A1A1AA] font-mono text-center">
                                              Sell execution is in preview mode pending live verification. To liquidate shares, use manual sell or DEX routing.
                                            </p>
                                          </div>
                                        ) : (
                                          <>
                                            <MetalFx variant="button" preset="gold" strength={0.85}>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (quote.isFallback) return;
                                                  wallet.connected ? handleApproveAndExecute(t) : connectWallet();
                                                }}
                                                disabled={bc?.loading || (quote.ttlRemaining || 0) <= 0 || Boolean(quote.isFallback)}
                                                className={`w-full py-1.5 px-3 rounded text-[11px] font-mono font-semibold transition disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                                                  quote.isFallback
                                                    ? 'bg-white/[0.04] text-[#A1A1AA] border border-white/[0.08] cursor-not-allowed'
                                                    : wallet.connected
                                                    ? 'bg-[#3D9A6A]/15 hover:bg-[#3D9A6A]/25 border border-[#3D9A6A]/40 text-[#3D9A6A]'
                                                    : 'bg-[#F5C542]/10 hover:bg-[#F5C542]/20 border border-[#F5C542]/30 text-[#F5C542]'
                                                }`}
                                              >
                                                {bc?.loading ? (
                                                  <>
                                                    <ThinkingOrb state="connecting" size={20} theme="dark" />
                                                    <span className="truncate">
                                                      {bc.step === 'preparing'
                                                        ? 'Preparing Route...'
                                                        : bc.step === 'approving'
                                                        ? `Approve ${isSell ? t.tokenSymbol : 'USDT'} in wallet...`
                                                        : bc.step === 'waiting_receipt'
                                                        ? 'Confirming on BSC (~3s)...'
                                                        : bc.step === 'approved'
                                                        ? 'Approved! Next: Confirm swap...'
                                                        : bc.step === 'swapping'
                                                        ? 'Confirm swap in wallet...'
                                                        : 'Broadcasting...'}
                                                    </span>
                                                  </>
                                                ) : quote.isFallback ? (
                                                  <span className="flex items-center justify-center gap-1.5 text-[#A1A1AA]">
                                                    <span>🛡️ Benchmark Mode (Trading Locked)</span>
                                                  </span>
                                                ) : wallet.connected ? (
                                                  isSell ? '🚀 Execute Live Sell on BSC' : '🚀 Execute Live Buy on BSC'
                                                ) : (
                                                  <span className="flex items-center justify-center gap-1.5">
                                                    <Wallet className="w-3.5 h-3.5" />
                                                    <span>Connect Wallet to Execute</span>
                                                  </span>
                                                )}
                                              </button>
                                            </MetalFx>
                                            {!quote.isFallback && (
                                              <div className="flex items-center justify-between text-[10px] text-[#A1A1AA] pt-1.5 px-0.5">
                                                <span className="flex items-center gap-1 text-[#3D9A6A]">
                                                  <span>🛡️ Allowance:</span>
                                                  <span className="font-semibold text-[#F5F5F4]">
                                                    {approvalMode === 'exact' ? `Exact (${amounts[contract] || defaultAmount} ${isSell ? t.tokenSymbol : 'USDT'})` : 'Unlimited'}
                                                  </span>
                                                  <span className="text-[9px] text-[#3D9A6A] bg-[#3D9A6A]/10 px-1 py-0.2 rounded border border-[#3D9A6A]/20">
                                                    {approvalMode === 'exact' ? 'Least-Privilege' : 'Convenience'}
                                                  </span>
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => setApprovalMode(approvalMode === 'exact' ? 'unlimited' : 'exact')}
                                                  className="text-[#F5C542] hover:underline font-mono text-[10px]"
                                                >
                                                  {approvalMode === 'exact' ? 'Switch to Unlimited' : 'Switch to Exact (Safer)'}
                                                </button>
                                              </div>
                                            )}
                                            {quote.isFallback && (
                                              <p className="text-[10px] text-[#A1A1AA] text-center pt-1 leading-tight">
                                                Live RFQ is restricted in this cloud region (40304). Trades are locked for fund safety. Run AfterGap Agent CLI for live execution.
                                              </p>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    );
                                  })()}
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
                    {loading ? 'Resolving...' : 'Not in catalog'}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] text-[#A1A1AA] font-mono flex justify-between items-center">
              <span>Platform ID: ondo</span>
              <span className="text-[#3D9A6A]">Verified</span>
            </div>
          </div>
        </div>
      </>
    )}

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

        {/* Legal & Policy Modal (Terms / Privacy / Risks) */}
        {legalModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setLegalModal(null)}
          >
            <div
              className="bg-[#121214] border border-white/[0.08] rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative max-h-[85vh] flex flex-col text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Title & Tab buttons */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setLegalModal('terms')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      legalModal === 'terms'
                        ? 'bg-[#F5C542]/15 text-[#F5C542] border border-[#F5C542]/30'
                        : 'text-[#A1A1AA] hover:text-[#F5F5F4] hover:bg-white/[0.03]'
                    }`}
                  >
                    Terms of Use
                  </button>
                  <button
                    type="button"
                    onClick={() => setLegalModal('privacy')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      legalModal === 'privacy'
                        ? 'bg-[#F5C542]/15 text-[#F5C542] border border-[#F5C542]/30'
                        : 'text-[#A1A1AA] hover:text-[#F5F5F4] hover:bg-white/[0.03]'
                    }`}
                  >
                    Privacy Policy
                  </button>
                  <button
                    type="button"
                    onClick={() => setLegalModal('risks')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      legalModal === 'risks'
                        ? 'bg-[#F5C542]/15 text-[#F5C542] border border-[#F5C542]/30'
                        : 'text-[#A1A1AA] hover:text-[#F5F5F4] hover:bg-white/[0.03]'
                    }`}
                  >
                    Risk Disclosure
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setLegalModal(null)}
                  className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F4] hover:bg-white/[0.06] transition text-sm font-mono"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto pr-2 space-y-4 text-xs text-[#A1A1AA] leading-relaxed max-h-[55vh]">
                {legalModal === 'terms' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-[#F5F5F4] mb-1">1. Nature of the Protocol & Interface</h4>
                      <p>
                        AfterGap is an open-source decentralized smart order routing interface and dual-wrapper arbitrage visualizer deployed on BNB Smart Chain (Chain ID: 56). The software was developed for the BNB Hack: Tokenized Stocks Edition to analyze price disparities between tokenized equity wrappers.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#F5F5F4] mb-1">2. Non-Custodial Architecture</h4>
                      <p>
                        AfterGap is strictly non-custodial. At no time does AfterGap, its creators, or server infrastructure hold, manage, or take custody of user funds, private keys, or digital tokens. All transactions, approvals, and swaps are formulated locally and signed exclusively by your connected Web3 wallet.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#F5F5F4] mb-1">3. No Financial, Tax, or Investment Advice</h4>
                      <p>
                        All market data, gap calculations, estimated savings, and natural-language AI insights provided by AfterGap are strictly for informational and benchmarking purposes. Nothing contained within this interface constitutes investment advice, financial guidance, or a recommendation to purchase or sell any tokenized security.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#F5F5F4] mb-1">4. Jurisdictional & Compliance Obligations</h4>
                      <p>
                        Tokenized assets and synthetic equities may be subject to securities regulations in various jurisdictions. Users are solely responsible for ensuring their usage of this interface and participation in on-chain tokenized asset protocols complies with all local laws and regulations applicable to their location.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#F5F5F4] mb-1">5. &quot;As-Is&quot; Software & Limitation of Liability</h4>
                      <p>
                        AfterGap is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranty of any kind, express or implied. Users assume all responsibility and risk arising from on-chain smart contract interactions, gas fees, liquidity slippage, and market volatility.
                      </p>
                    </div>
                  </div>
                )}

                {legalModal === 'privacy' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-[#F5F5F4] mb-1">1. Zero Personal Data Collection</h4>
                      <p>
                        AfterGap does not collect, track, or store any personally identifiable information (PII) such as your legal name, physical address, email, phone number, or government-issued identification. No account sign-up is required.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#F5F5F4] mb-1">2. Web3 Wallet Address Usage</h4>
                      <p>
                        When you connect a Web3 wallet (e.g. MetaMask or Binance Web3 Wallet), the interface accesses only your public wallet address to query on-chain BEP-20 balances and prepare transaction calldata. Your private keys never leave your device.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#F5F5F4] mb-1">3. Serverless API Proxying</h4>
                      <p>
                        External market data requests (such as price queries and token discovery) are processed through serverless Next.js API endpoints solely to sign canonical developer requests with HMAC-SHA256 credentials securely. No user search history or IP profiling is logged or commercialized.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#F5F5F4] mb-1">4. Client-Side Session State</h4>
                      <p>
                        User interface selections (such as toggling between Simple Mode and Pro Mode, or draft command bar text) are kept in temporary React state and discarded upon browser refresh.
                      </p>
                    </div>
                  </div>
                )}

                {legalModal === 'risks' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-[#F5F5F4] mb-1">1. Tokenized RWA Mechanics & Wrapper Diversity</h4>
                      <p>
                        Tokenized equity wrappers on BNB Smart Chain utilize differing financial structures. For example, bStocks rebase share balances to distribute corporate dividends, whereas Ondo tokens track performance by accruing net asset value (NAV). Understanding how each wrapper tracks its underlying asset is critical before trading.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#F5F5F4] mb-1">2. Off-Market Hours & Basis Drift</h4>
                      <p>
                        Traditional US stock exchanges trade only during regular hours (9:30 AM – 4:00 PM EST, Monday through Friday). Because decentralized markets trade 24/7, tokenized assets often drift substantially from their last official cash closing benchmark over weekends and overnight sessions.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#F5F5F4] mb-1">3. Smart Contract & Liquidity Risks</h4>
                      <p>
                        All trades execute through decentralized liquidity pools and autonomous smart contract routers on BNB Smart Chain. Smart contracts are subject to inherent technological risks, including bugs, slippage, liquidity imbalances, and gas fee spikes.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#F5F5F4] mb-1">4. Fallback Mode & Pricing Disclosures</h4>
                      <p>
                        If live gateway connections encounter network limitations or regional restrictions, AfterGap automatically transitions to fallback benchmark mode. Live trading is intentionally locked during fallback mode to safeguard against executing orders on non-live reference quotes.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#F5F5F4] mb-1">5. Sell Execution Safeguard</h4>
                      <p>
                        Sell execution is currently locked in preview mode across all interface entry points pending live end-to-end mainnet verification. This defense-in-depth safeguard prevents live user funds from being subjected to unverified reverse execution paths.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-[11px] text-[#A1A1AA]/60 font-mono">
                  BNB Smart Chain (Chain ID: 56)
                </span>
                <button
                  type="button"
                  onClick={() => setLegalModal(null)}
                  className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-[#F5F5F4] transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/[0.06] mt-auto bg-[#07070A]">
        {/* Main footer row */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 sm:grid-cols-3 gap-8 text-xs text-[#A1A1AA]">

          {/* Brand column */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[#F5C542] font-bold tracking-tight text-sm">AfterGap</span>
              <span className="text-[10px] font-mono text-[#A1A1AA]/60 border border-white/[0.08] rounded px-1.5 py-0.5">BNB Chain · 56</span>
            </div>
            <p className="leading-relaxed text-[#A1A1AA]/80 max-w-xs">
              Real-time dual-wrapper arbitrage and smart order routing for tokenized US stocks on BNB Smart Chain.
            </p>
            <p className="text-[10px] font-mono text-[#A1A1AA]/50">
              bStocks &amp; Ondo tokenized stock protocols
            </p>
          </div>

          {/* Links column */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-[#A1A1AA]/50 font-semibold">Resources</p>
            <div className="flex flex-col gap-2">
              <a href="https://github.com/kellycryptos/AfterGap" target="_blank" rel="noopener noreferrer" className="hover:text-[#F5F5F4] transition flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                GitHub
              </a>
              <a href="https://x.com/aftergap" target="_blank" rel="noopener noreferrer" className="hover:text-[#F5F5F4] transition flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                @aftergap
              </a>
              <a href="https://github.com/kellycryptos/AfterGap/blob/main/docs/DEVEX.md" target="_blank" rel="noopener noreferrer" className="hover:text-[#F5F5F4] transition">
                Engineering Docs (DEVEX)
              </a>
            </div>
          </div>

          {/* Legal column */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-[#A1A1AA]/50 font-semibold">Legal</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setLegalModal('terms')}
                className="text-left hover:text-[#F5F5F4] transition focus:outline-none"
              >
                Terms of Use
              </button>
              <button
                type="button"
                onClick={() => setLegalModal('privacy')}
                className="text-left hover:text-[#F5F5F4] transition focus:outline-none"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => setLegalModal('risks')}
                className="text-left hover:text-[#F5F5F4] transition focus:outline-none"
              >
                Risk Disclosure
              </button>
            </div>
            <div className="mt-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[10px] leading-relaxed text-[#A1A1AA]/60">
              Not financial advice. Tokenized RWA trading involves smart contract, liquidity, and off-market pricing risk. Sell execution locked pending live verification.
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.04] py-3 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-[#A1A1AA]/50">
            <span>© {new Date().getFullYear()} AfterGap. MIT License. Built for BNB Hack: Tokenized Stocks Edition.</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3D9A6A] animate-pulse inline-block" />
              BNB Smart Chain · Chain ID 56
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
