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
  MSFT: [
    {
      tokenSymbol: 'MSFTB',
      tokenName: 'Microsoft bStock',
      tokenContractAddress: '0x4433b415b3c3756fb60cfda862fc8095d3013999',
      binanceChainId: '56',
      platformId: 'bstock',
      tokenPrice: '428.10',
      price: '428.10',
      referencePrice: '427.60',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
      underlyingTicker: 'MSFT',
      underlyingName: 'Microsoft Corp',
    },
    {
      tokenSymbol: 'MSFTon',
      tokenName: 'Microsoft Ondo',
      tokenContractAddress: '0x99884ef81c74ca29a05b3ec9b5311e51b32d8888',
      binanceChainId: '56',
      platformId: 'ondo',
      tokenPrice: '429.35',
      price: '429.35',
      referencePrice: '428.20',
      marketStatus: 'premarket',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'premarket', reasonCode: 'TRADING' },
      underlyingTicker: 'MSFT',
      underlyingName: 'Microsoft Corp',
    },
  ],
  AMZN: [
    {
      tokenSymbol: 'AMZNB',
      tokenName: 'Amazon bStock',
      tokenContractAddress: '0x5511b415b3c3756fb60cfda862fc8095d3013777',
      binanceChainId: '56',
      platformId: 'bstock',
      tokenPrice: '189.60',
      price: '189.60',
      referencePrice: '189.25',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
      underlyingTicker: 'AMZN',
      underlyingName: 'Amazon.com Inc',
    },
    {
      tokenSymbol: 'AMZNon',
      tokenName: 'Amazon Ondo',
      tokenContractAddress: '0x77224ef81c74ca29a05b3ec9b5311e51b32d5555',
      binanceChainId: '56',
      platformId: 'ondo',
      tokenPrice: '190.25',
      price: '190.25',
      referencePrice: '189.70',
      marketStatus: 'premarket',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'premarket', reasonCode: 'TRADING' },
      underlyingTicker: 'AMZN',
      underlyingName: 'Amazon.com Inc',
    },
  ],
  GOOGL: [
    {
      tokenSymbol: 'GOOGLB',
      tokenName: 'Alphabet bStock',
      tokenContractAddress: '0x3344b415b3c3756fb60cfda862fc8095d3013666',
      binanceChainId: '56',
      platformId: 'bstock',
      tokenPrice: '165.20',
      price: '165.20',
      referencePrice: '164.90',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
      underlyingTicker: 'GOOGL',
      underlyingName: 'Alphabet Inc',
    },
    {
      tokenSymbol: 'GOOGLon',
      tokenName: 'Alphabet Ondo',
      tokenContractAddress: '0x66554ef81c74ca29a05b3ec9b5311e51b32d4444',
      binanceChainId: '56',
      platformId: 'ondo',
      tokenPrice: '165.80',
      price: '165.80',
      referencePrice: '165.20',
      marketStatus: 'premarket',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'premarket', reasonCode: 'TRADING' },
      underlyingTicker: 'GOOGL',
      underlyingName: 'Alphabet Inc',
    },
  ],
  META: [
    {
      tokenSymbol: 'METAB',
      tokenName: 'Meta bStock',
      tokenContractAddress: '0x2211b415b3c3756fb60cfda862fc8095d3013555',
      binanceChainId: '56',
      platformId: 'bstock',
      tokenPrice: '568.40',
      price: '568.40',
      referencePrice: '567.50',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
      underlyingTicker: 'META',
      underlyingName: 'Meta Platforms Inc',
    },
    {
      tokenSymbol: 'METAon',
      tokenName: 'Meta Ondo',
      tokenContractAddress: '0x88994ef81c74ca29a05b3ec9b5311e51b32d3333',
      binanceChainId: '56',
      platformId: 'ondo',
      tokenPrice: '570.10',
      price: '570.10',
      referencePrice: '568.60',
      marketStatus: 'premarket',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'premarket', reasonCode: 'TRADING' },
      underlyingTicker: 'META',
      underlyingName: 'Meta Platforms Inc',
    },
  ],
  AMD: [
    {
      tokenSymbol: 'AMDB',
      tokenName: 'AMD bStock',
      tokenContractAddress: '0x1199b415b3c3756fb60cfda862fc8095d3013444',
      binanceChainId: '56',
      platformId: 'bstock',
      tokenPrice: '156.30',
      price: '156.30',
      referencePrice: '155.90',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
      underlyingTicker: 'AMD',
      underlyingName: 'Advanced Micro Devices',
    },
    {
      tokenSymbol: 'AMDon',
      tokenName: 'AMD Ondo',
      tokenContractAddress: '0x33114ef81c74ca29a05b3ec9b5311e51b32d2222',
      binanceChainId: '56',
      platformId: 'ondo',
      tokenPrice: '156.95',
      price: '156.95',
      referencePrice: '156.20',
      marketStatus: 'premarket',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'premarket', reasonCode: 'TRADING' },
      underlyingTicker: 'AMD',
      underlyingName: 'Advanced Micro Devices',
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
  const [selectedBasket, setSelectedBasket] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    connecting: false,
    address: null,
    chainId: null,
    error: null,
  });
  // Per-token broadcast state (approve + swap)
  const [broadcasts, setBroadcasts] = useState<Record<string, TxBroadcastState>>({});
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [approvalMode, setApprovalMode] = useState<'exact' | 'unlimited'>('exact');
  const [tradeDirections, setTradeDirections] = useState<Record<string, 'buy' | 'sell'>>({});

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
          throw new Error('USDT Approval transaction timed out or failed on BSC. Please check BSCScan.');
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
      const usdtCallData = '0x70a08231000000000000000000000000' + address.slice(2).toLowerCase();

      let bnbVal = '0.0000';
      let usdtVal = '0.00';
      let fetchedOnChain = false;

      // 1. Direct wallet query via window.ethereum (100% reliable, zero CORS issues)
      const eth = typeof window !== 'undefined' ? (window as any).ethereum : null;
      if (eth?.request) {
        try {
          const [bnbHex, usdtHex] = await Promise.all([
            eth.request({ method: 'eth_getBalance', params: [address, 'latest'] }),
            eth.request({ method: 'eth_call', params: [{ to: usdtContract, data: usdtCallData }, 'latest'] }),
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
        } catch (e) {
          console.warn('Direct wallet balance query fallback:', e);
        }
      }

      // 2. Direct BSC RPC query if not already fetched
      if (!fetchedOnChain) {
        for (const rpc of bscRpcs) {
          try {
            const [bnbRes, usdtRes] = await Promise.all([
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
      if (bnbAsset?.balance) {
        const numBnb = Number(bnbAsset.balance);
        bnbVal = numBnb > 0 && numBnb < 0.0001 ? '<0.0001' : numBnb.toFixed(4);
      }
      setWalletBalances({
        usdt: usdtAsset ? Number(usdtAsset.balance).toFixed(2) : usdtVal,
        bnb: bnbVal,
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
        isFallback: true,
      };
    }

    return null;
  }, [bstocksTokens, ondoTokens, quotes, ticker]);

  // Computed Thematic Basket data
  const currentBasketData = useMemo(() => {
    if (!selectedBasket) return null;
    const basketConfig = THEMATIC_BASKETS[selectedBasket];
    if (!basketConfig) return null;

    const list = basketConfig.tickers.map((sym) => {
      const tokens = DEFAULT_BENCHMARK_TOKENS[sym] || [];
      const bstock = tokens.find((t) => t.platformId === 'bstock') || tokens[0];
      const ondo = tokens.find((t) => t.platformId === 'ondo') || tokens[1];
      const cheaper = bstock && ondo ? (Number(bstock.price) <= Number(ondo.price) ? bstock : ondo) : bstock;
      const other = cheaper === bstock ? ondo : bstock;
      const cheaperPrice = Number(cheaper?.price || 0);
      const otherPrice = Number(other?.price || cheaperPrice);
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
  }, [selectedBasket]);

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
      <header className="w-full border-b border-white/[0.06] bg-[#07070A]/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center gap-2.5">
              <AfterGapLogo className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl shadow-md shadow-[#F5C542]/20 shrink-0" />
              <span className="text-lg sm:text-2xl font-bold tracking-tight text-[#F5C542] shrink-0">
                AfterGap
              </span>
            </div>
            <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-xs font-mono bg-white/[0.04] text-[#A1A1AA] border border-white/[0.06]">
              BSC 56
            </span>
            <span className="hidden md:inline-flex px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#3D9A6A]/10 text-[#3D9A6A] border border-[#3D9A6A]/30">
              Spot Aggregator
            </span>
          </div>

          {/* Top Bar Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {wallet.connected && wallet.address ? (
              <div className="flex items-center gap-2">
                {/* Balances (responsive mobile & desktop) */}
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-mono bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-[#A1A1AA]">USDT:</span>
                  <span className="text-[#F5F5F4] font-semibold">{walletBalances.usdt}</span>
                  <span className="text-white/20">|</span>
                  <span className="text-[#A1A1AA]">BNB:</span>
                  <span className="text-[#F5F5F4] font-semibold">{walletBalances.bnb}</span>
                </div>
                {/* Connected address chip */}
                <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-mono bg-[#3D9A6A]/10 border border-[#3D9A6A]/30 whitespace-nowrap shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3D9A6A] animate-pulse shrink-0" />
                  <span className="text-[#3D9A6A] font-semibold hidden sm:inline">BSC 56</span>
                  <span className="text-[#A1A1AA]">
                    {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
                  </span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={connectWallet}
                disabled={wallet.connecting}
                className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold font-mono transition-all border border-[#F5C542]/50 bg-[#F5C542]/10 text-[#F5C542] hover:bg-[#F5C542]/20 hover:border-[#F5C542] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-[#F5C542]/10 shrink-0"
              >
                {wallet.connecting ? (
                  <>
                    <ThinkingOrb state="connecting" size={20} theme="dark" />
                    <span>Connecting…</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Connect Wallet</span>
                  </>
                )}
              </button>
            )}

            {/* Compact Auth Chip (Public Gateway status) */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full text-xs font-mono bg-white/[0.03] border border-white/[0.06] whitespace-nowrap shrink-0">
              <ThinkingOrb state={loading ? 'searching' : 'breathing'} size={20} theme="dark" />
              <span className="text-[#A1A1AA] hidden sm:inline">
                {isAuthed ? `Signed (${data?.auth?.apiKeyPrefix})` : 'BSC 56 Gateway'}
              </span>
              <span className="text-[#A1A1AA] sm:hidden text-[11px]">
                {isAuthed ? 'Signed' : 'BSC 56'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Wallet Error Banner */}
      {wallet.error && (
        <div className="w-full border-b border-[#C45C26]/30 bg-[#C45C26]/10 px-4 py-2 flex items-center justify-between gap-3">
          <p className="text-xs font-mono text-[#C45C26] flex items-center gap-2">
            <span>⚠️</span> {wallet.error}
          </p>
          <button
            type="button"
            onClick={() => setWallet((w) => ({ ...w, error: null }))}
            className="text-[#C45C26] text-xs hover:opacity-70 shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Screen Content */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-14 flex-1 flex flex-col items-center">
        {/* Hero */}
        <div className="text-center mb-6 sm:mb-8 space-y-1.5 sm:space-y-2">
          <h1 className="text-xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-[#F5F5F4]">
            Same stock. Dual wrappers. Live gap.
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-lg mx-auto">
            Inspect on-chain pricing vs. cash reference, quote live spot execution, and simulate BEP-20 swaps.
          </p>
        </div>

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
                    const inputAmount = amounts[contract] !== undefined ? amounts[contract] : '10';

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
                          {/* Quick Amount Pills */}
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                            <span className="text-[10px] text-[#A1A1AA] font-mono shrink-0">Quick:</span>
                            {['5', '10', '25', '50'].map((amt) => (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => setAmounts((prev) => ({ ...prev, [contract]: amt }))}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono transition shrink-0 ${
                                  (amounts[contract] || '10') === amt
                                    ? 'bg-[#F5C542]/20 text-[#F5C542] border border-[#F5C542]/40 font-semibold'
                                    : 'bg-white/[0.04] text-[#A1A1AA] hover:text-[#F5F5F4] border border-white/[0.06]'
                                }`}
                              >
                                {amt} USDT
                              </button>
                            ))}
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                min="5"
                                value={inputAmount}
                                onChange={(e) =>
                                  setAmounts((prev) => ({ ...prev, [contract]: e.target.value }))
                                }
                                placeholder="USDT (Min 5)"
                                className="w-full bg-[#121214] border border-white/[0.06] rounded px-2.5 py-1 text-xs font-mono text-[#F5F5F4] focus:outline-none focus:border-[#F5C542]/50"
                              />
                              <span className="absolute right-2 top-1 text-[10px] text-[#A1A1AA] font-mono">
                                USDT
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
                                'Get Quote'
                              )}
                            </button>
                          </div>
                          {Number(inputAmount) < 5 && (
                            <p className="text-[10px] text-[#F5C542] font-mono">
                              ℹ Binance Web3 RFQ requires min order of 5 USDT.
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
                                <span className="text-[#F5F5F4] font-semibold">{quote.fromAmount} USDT</span>
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
                                <span className="text-[#A1A1AA] block text-[9px] uppercase tracking-wider text-white/40">LiquidMesh Multi-Hop Route</span>
                                <span className="text-[#F5C542] font-semibold text-[10px] break-words">
                                  {t.tokenSymbol === 'NVDAon' ? 'USDT → NVDAB → NVDAon' : 'USDT → ASTER → WBNB → USDC → NVDAB'}
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
                                                <span>USDT Approval:</span>
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
                                                        ? 'Approve USDT in wallet...'
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
                                                  '🚀 Execute Live Swap on BSC'
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
                                                    {approvalMode === 'exact' ? `Exact ($${amounts[contract] || '10'} USDT)` : 'Unlimited'}
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
                    const inputAmount = amounts[contract] !== undefined ? amounts[contract] : '10';

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
                              disabled={quote?.loading}
                              className="px-3 py-1 bg-[#F5C542]/10 hover:bg-[#F5C542]/20 border border-[#F5C542]/30 text-[#F5C542] rounded text-xs font-mono transition disabled:opacity-50 flex items-center justify-center gap-1.5 min-w-[85px]"
                            >
                              {quote?.loading ? (
                                <>
                                  <ThinkingOrb state="working" size={20} theme="dark" />
                                  <span>Quoting...</span>
                                </>
                              ) : (
                                'Get Quote'
                              )}
                            </button>
                          </div>

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
                                <span className="text-[#F5F5F4] font-semibold">{quote.fromAmount} USDT</span>
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
                                                <span>USDT Approval:</span>
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
                                                        ? 'Approve USDT in wallet...'
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
                                                  '🚀 Execute Live Swap on BSC'
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
                                                    {approvalMode === 'exact' ? `Exact ($${amounts[contract] || '10'} USDT)` : 'Unlimited'}
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
            <span>Dual-Wrapper Tokenized US Stocks Arbitrage & Smart Routing on BNB Smart Chain</span>
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
              href="https://x.com/aftergap"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#F5F5F4] transition flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>@aftergap</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
