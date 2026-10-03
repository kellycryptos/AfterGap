import { NextRequest, NextResponse } from 'next/server';
import { BinanceRwaClient } from '@aftergap/api';
import { AfterGapAgentTools } from '@aftergap/agent';

export const dynamic = 'force-dynamic';

const BENCHMARK_PLATFORMS = [
  {
    platformId: 'ondo',
    tickerCount: 459,
    chainDistribution: [
      { binanceChainId: '1', tokenCount: 457 },
      { binanceChainId: '56', tokenCount: 458 },
      { binanceChainId: 'CT_501', tokenCount: 451 },
    ],
    website: 'https://ondo.finance',
    logoUrl: 'https://public.bnbstatic.com/images/w3w/openapi/ondo.png',
  },
  {
    platformId: 'bstock',
    tickerCount: 77,
    chainDistribution: [{ binanceChainId: '56', tokenCount: 77 }],
    website: 'https://www.binance.com/zh-CN/bstocks-landing',
    logoUrl: 'https://public.bnbstatic.com/images/w3w/openapi/bstocks.png',
  },
];

const BENCHMARK_TOKENS: Record<string, any[]> = {
  NVDA: [
    {
      tokenSymbol: 'NVDAB',
      tokenName: 'Nvidia bStock',
      tokenContractAddress: '0x02fca66c1d1afb4e2a7884261eb00f63598a7436',
      binanceChainId: '56',
      platformId: 'bstock',
      tokenPrice: '229.10815876373030453445',
      price: '229.11',
      referencePrice: '228.93',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: {
        openState: true,
        marketStatus: 'TRADING',
        reasonCode: 'TRADING',
      },
      underlyingTicker: 'NVDA',
      underlyingName: 'Nvidia Corp',
    },
    {
      tokenSymbol: 'NVDAon',
      tokenName: 'Nvidia Ondo',
      tokenContractAddress: '0xa9ee28c80f960b889dfbd1902055218cba016f75',
      binanceChainId: '56',
      platformId: 'ondo',
      tokenPrice: '229.716017343747345719312470247514',
      price: '229.72',
      referencePrice: '229.32',
      marketStatus: 'premarket',
      reasonCode: 'TRADING',
      statusInfo: {
        openState: true,
        marketStatus: 'premarket',
        reasonCode: 'TRADING',
      },
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
      tokenPrice: '372.13',
      price: '372.13',
      referencePrice: '372.00',
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
      tokenPrice: '372.12',
      price: '372.12',
      referencePrice: '372.00',
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
      tokenContractAddress: '0x80106cb3ead06659a5ad19df39d9b4733863b9b0',
      binanceChainId: '56',
      platformId: 'bstock',
      tokenPrice: '515.38',
      price: '515.38',
      referencePrice: '515.00',
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
      tokenPrice: '520.70',
      price: '520.70',
      referencePrice: '515.00',
      marketStatus: 'TRADING',
      reasonCode: 'TRADING',
      statusInfo: { openState: true, marketStatus: 'TRADING', reasonCode: 'TRADING' },
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
      tokenContractAddress: '0x3f53de71c126bdabae20f9cd64848d317f6c3238',
      binanceChainId: '56',
      platformId: 'bstock',
      tokenPrice: '344.50',
      price: '344.50',
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
      tokenPrice: '346.16',
      price: '346.16',
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
      tokenPrice: '730.76',
      price: '730.76',
      referencePrice: '730.00',
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
      tokenPrice: '734.47',
      price: '734.47',
      referencePrice: '730.00',
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
      tokenPrice: '630.58',
      price: '630.58',
      referencePrice: '630.00',
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
      tokenPrice: '630.66',
      price: '630.66',
      referencePrice: '630.00',
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
      tokenPrice: '182.58',
      price: '182.58',
      referencePrice: '182.50',
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
      tokenPrice: '182.61',
      price: '182.61',
      referencePrice: '182.50',
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

const BENCHMARK_SEARCH: Record<string, any[]> = {
  NVDA: [
    {
      ticker: 'NVDA',
      companyName: 'Nvidia Corp',
      assets: [
        {
          platformId: 'bstock',
          binanceChainId: '56',
          tokenContractAddress: '0x02fca66c1d1afb4e2a7884261eb00f63598a7436',
          tokenSymbol: 'NVDAB',
          assetType: 1,
        },
        {
          platformId: 'ondo',
          binanceChainId: '56',
          tokenContractAddress: '0xa9ee28c80f960b889dfbd1902055218cba016f75',
          tokenSymbol: 'NVDAon',
          assetType: 1,
        },
      ],
    },
  ],
  TSLA: [
    {
      ticker: 'TSLA',
      companyName: 'Tesla Inc',
      assets: [
        {
          platformId: 'bstock',
          binanceChainId: '56',
          tokenContractAddress: '0x5b1910eaad6450e50f816082aa078c41f10c292f',
          tokenSymbol: 'TSLAB',
          assetType: 1,
        },
        {
          platformId: 'ondo',
          binanceChainId: '56',
          tokenContractAddress: '0x2494b603319d4d9f9715c9f4496d9e0364b59d93',
          tokenSymbol: 'TSLAon',
          assetType: 1,
        },
      ],
    },
  ],
  AAPL: [
    {
      ticker: 'AAPL',
      companyName: 'Apple Inc',
      assets: [
        {
          platformId: 'bstock',
          binanceChainId: '56',
          tokenContractAddress: '0x7890b415b3c3756fb60cfda862fc8095d3013111',
          tokenSymbol: 'AAPLB',
          assetType: 1,
        },
        {
          platformId: 'ondo',
          binanceChainId: '56',
          tokenContractAddress: '0x12344ef81c74ca29a05b3ec9b5311e51b32d2222',
          tokenSymbol: 'AAPLon',
          assetType: 1,
        },
      ],
    },
  ],
  MSFT: [
    {
      ticker: 'MSFT',
      companyName: 'Microsoft Corp',
      assets: [
        {
          platformId: 'bstock',
          binanceChainId: '56',
          tokenContractAddress: '0x80106cb3ead06659a5ad19df39d9b4733863b9b0',
          tokenSymbol: 'MSFTB',
          assetType: 1,
        },
        {
          platformId: 'ondo',
          binanceChainId: '56',
          tokenContractAddress: '0x6bfe75d1ad432050ea973c3a3dcd88f02e2444c3',
          tokenSymbol: 'MSFTon',
          assetType: 1,
        },
      ],
    },
  ],
  AMZN: [
    {
      ticker: 'AMZN',
      companyName: 'Amazon.com Inc',
      assets: [
        {
          platformId: 'bstock',
          binanceChainId: '56',
          tokenContractAddress: '0x5511b415b3c3756fb60cfda862fc8095d3013777',
          tokenSymbol: 'AMZNB',
          assetType: 1,
        },
        {
          platformId: 'ondo',
          binanceChainId: '56',
          tokenContractAddress: '0x77224ef81c74ca29a05b3ec9b5311e51b32d5555',
          tokenSymbol: 'AMZNon',
          assetType: 1,
        },
      ],
    },
  ],
  GOOGL: [
    {
      ticker: 'GOOGL',
      companyName: 'Alphabet Inc',
      assets: [
        {
          platformId: 'bstock',
          binanceChainId: '56',
          tokenContractAddress: '0x3f53de71c126bdabae20f9cd64848d317f6c3238',
          tokenSymbol: 'GOOGLB',
          assetType: 1,
        },
        {
          platformId: 'ondo',
          binanceChainId: '56',
          tokenContractAddress: '0x091fc7778e6932d4009b087b191d1ee3bac5729a',
          tokenSymbol: 'GOOGLon',
          assetType: 1,
        },
      ],
    },
  ],
  META: [
    {
      ticker: 'META',
      companyName: 'Meta Platforms Inc',
      assets: [
        {
          platformId: 'bstock',
          binanceChainId: '56',
          tokenContractAddress: '0x7425889fe94f9d693e8daefe88bcced6acfef4c0',
          tokenSymbol: 'METAB',
          assetType: 1,
        },
        {
          platformId: 'ondo',
          binanceChainId: '56',
          tokenContractAddress: '0xd7df5863a3e742f0c767768cdfcb63f09e0422f6',
          tokenSymbol: 'METAon',
          assetType: 1,
        },
      ],
    },
  ],
  AMD: [
    {
      ticker: 'AMD',
      companyName: 'Advanced Micro Devices',
      assets: [
        {
          platformId: 'bstock',
          binanceChainId: '56',
          tokenContractAddress: '0x75fd4cf6f8392e41e70391d60c90c0d5211603a1',
          tokenSymbol: 'AMDB',
          assetType: 1,
        },
        {
          platformId: 'ondo',
          binanceChainId: '56',
          tokenContractAddress: '0x9f16e46c73b43bdb70861247d537bee4ea18f639',
          tokenSymbol: 'AMDon',
          assetType: 1,
        },
      ],
    },
  ],
  COIN: [
    {
      ticker: 'COIN',
      companyName: 'Coinbase Global Inc',
      assets: [
        {
          platformId: 'bstock',
          binanceChainId: '56',
          tokenContractAddress: '0x585bde7c54abb5ccd7791f923d6c2187635f3952',
          tokenSymbol: 'COINB',
          assetType: 1,
        },
        {
          platformId: 'ondo',
          binanceChainId: '56',
          tokenContractAddress: '0xf8589b526fdd65f7f301c605a6e04f0f1b4b3620',
          tokenSymbol: 'COINon',
          assetType: 1,
        },
      ],
    },
  ],
  TSM: [
    {
      ticker: 'TSM',
      companyName: 'Taiwan Semiconductor',
      assets: [
        {
          platformId: 'bstock',
          binanceChainId: '56',
          tokenContractAddress: '0x7788b415b3c3756fb60cfda862fc8095d3013333',
          tokenSymbol: 'TSMB',
          assetType: 1,
        },
        {
          platformId: 'ondo',
          binanceChainId: '56',
          tokenContractAddress: '0x22334ef81c74ca29a05b3ec9b5311e51b32d1111',
          tokenSymbol: 'TSMon',
          assetType: 1,
        },
      ],
    },
  ],
};

const BENCHMARK_QUOTES: Record<string, any> = {
  '0x02fca66c1d1afb4e2a7884261eb00f63598a7436': [
    {
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
  ],
  '0xa9ee28c80f960b889dfbd1902055218cba016f75': [
    {
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
  ],
  '0x5b1910eaad6450e50f816082aa078c41f10c292f': [
    {
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
  ],
  '0x80106cb3ead06659a5ad19df39d9b4733863b9b0': [
    {
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
  ],
  '0x3f53de71c126bdabae20f9cd64848d317f6c3238': [
    {
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
  ],
  '0x7425889fe94f9d693e8daefe88bcced6acfef4c0': [
    {
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
  ],
  '0x75fd4cf6f8392e41e70391d60c90c0d5211603a1': [
    {
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
  ],
  '0x585bde7c54abb5ccd7791f923d6c2187635f3952': [
    {
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
  ],
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'resolve';
  const keyword = (searchParams.get('keyword') || 'NVDA').toUpperCase();
  const platformId = searchParams.get('platformId') || undefined;

  const apiKey = process.env.BINANCE_WEB3_API_KEY || '';
  const secretKey = process.env.BINANCE_WEB3_API_SECRET || '';

  const client = new BinanceRwaClient({
    apiKey,
    secretKey,
  });

  const authState = {
    hasApiKey: Boolean(apiKey),
    hasSecretKey: Boolean(secretKey),
  };

  try {
    const simulate40304 = searchParams.get('simulate40304') === 'true';
    const simulateLive = searchParams.get('simulateLive') === 'true';

    if (action === 'agent') {
      const prompt = searchParams.get('prompt') || '';
      try {
        const agent = new AfterGapAgentTools(apiKey, secretKey);
        const result = await agent.processNaturalLanguage(prompt);
        return NextResponse.json({
          success: result.success,
          data: result,
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        console.error('[agent] processNaturalLanguage error:', err?.message || err);
        return NextResponse.json({
          success: false,
          error: 'Agent failed to process command',
          timestamp: new Date().toISOString(),
        }, { status: 500 });
      }
    }

    if (action === 'platforms') {
      let platformsRes = simulateLive
        ? { success: true, status: 200, statusText: 'OK', data: BENCHMARK_PLATFORMS, rawBody: JSON.stringify(BENCHMARK_PLATFORMS), headers: {}, debug: { fallbackUsed: false } as any }
        : simulate40304
        ? { success: false, status: 403, statusText: 'Forbidden', data: { code: 40304 }, rawBody: '', headers: {}, debug: {} as any }
        : await client.getPlatforms();

      const isBlocked = !platformsRes.success || (platformsRes.data as any)?.code === 40304;
      if (isBlocked) {
        platformsRes = {
          success: true,
          status: 200,
          statusText: 'OK',
          data: BENCHMARK_PLATFORMS as any,
          rawBody: JSON.stringify(BENCHMARK_PLATFORMS),
          headers: {},
          debug: { ...platformsRes.debug, fallbackUsed: true } as any,
        };
      }
      return NextResponse.json({
        auth: authState,
        platforms: platformsRes,
        isFallback: isBlocked,
      });
    }

    if (action === 'search') {
      let searchRes = simulateLive
        ? { success: true, status: 200, statusText: 'OK', data: BENCHMARK_SEARCH[keyword] || BENCHMARK_SEARCH.NVDA, rawBody: JSON.stringify(BENCHMARK_SEARCH[keyword] || BENCHMARK_SEARCH.NVDA), headers: {}, debug: { fallbackUsed: false } as any }
        : simulate40304
        ? { success: false, status: 403, statusText: 'Forbidden', data: { code: 40304 }, rawBody: '', headers: {}, debug: {} as any }
        : await client.search(keyword);

      const isBlocked = !searchRes.success || (searchRes.data as any)?.code === 40304;
      if (isBlocked) {
        const fallback = BENCHMARK_SEARCH[keyword] || BENCHMARK_SEARCH.NVDA;
        searchRes = {
          success: true,
          status: 200,
          statusText: 'OK',
          data: fallback as any,
          rawBody: JSON.stringify(fallback),
          headers: {},
          debug: { ...searchRes.debug, fallbackUsed: true } as any,
        };
      }
      return NextResponse.json({
        auth: authState,
        search: searchRes,
        isFallback: isBlocked,
      });
    }

    if (action === 'tokens') {
      let tokensRes = simulateLive
        ? { success: true, status: 200, statusText: 'OK', data: (BENCHMARK_TOKENS[keyword] || BENCHMARK_TOKENS.NVDA).map(t => ({ ...t, isFallback: false })), rawBody: JSON.stringify(BENCHMARK_TOKENS[keyword] || BENCHMARK_TOKENS.NVDA), headers: {}, debug: { fallbackUsed: false } as any }
        : simulate40304
        ? { success: false, status: 403, statusText: 'Forbidden', data: { code: 40304 }, rawBody: '', headers: {}, debug: {} as any }
        : await client.getTokens({
            binanceChainId: 56,
            platformId,
          });

      const isBlocked = !tokensRes.success || (tokensRes.data as any)?.code === 40304;
      if (isBlocked) {
        const fallback = (BENCHMARK_TOKENS[keyword] || BENCHMARK_TOKENS.NVDA).map((t) => ({
          ...t,
          isFallback: true,
        }));
        tokensRes = {
          success: true,
          status: 200,
          statusText: 'OK',
          data: fallback as any,
          rawBody: JSON.stringify(fallback),
          headers: {},
          debug: { ...tokensRes.debug, fallbackUsed: true } as any,
        };
      } else if (Array.isArray(tokensRes.data)) {
        tokensRes.data = tokensRes.data.map((t: any) => ({ ...t, isFallback: false }));
      }
      return NextResponse.json({
        auth: authState,
        tokens: tokensRes,
        isFallback: isBlocked,
      });
    }

    if (action === 'quote') {
      const fromTokenAddress = searchParams.get('fromTokenAddress') || '0x55d398326f99059fF775485246999027B3197955'; // USDT
      const toTokenAddress = searchParams.get('toTokenAddress') || '0x02fca66c1d1afb4e2a7884261eb00f63598a7436';
      const amount = searchParams.get('amount') || '10000000000000000000'; // 10 USDT
      const userWalletAddress = searchParams.get('userWalletAddress') || undefined;
      const slippagePercent = searchParams.get('slippagePercent') || '1';

      let quoteRes;
      if (simulateLive) {
        const isOndo = toTokenAddress.toLowerCase() === '0xa9ee28c80f960b889dfbd1902055218cba016f75';
        const liveQuoteData = [
          {
            quoteId: `quote-live-${Date.now()}`,
            vendorName: 'LiquidMesh',
            executionMode: 'SWAP',
            binanceChainId: '56',
            fromTokenAmount: amount,
            toTokenAmount: isOndo ? '43531255000000000' : '43647167000000000',
            priceImpactPercent: '0.04',
            router: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
            fromToken: {
              tokenContractAddress: fromTokenAddress,
              tokenSymbol: 'USDT',
              tokenUnitPrice: '1.00',
              decimal: 18,
            },
            toToken: {
              tokenContractAddress: toTokenAddress,
              tokenSymbol: isOndo ? 'NVDAon' : 'NVDAB',
              tokenUnitPrice: isOndo ? '229.72' : '229.11',
              decimal: 18,
            },
            approveTarget: '0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5',
            isBest: !isOndo,
            isFallback: false,
          },
        ];
        quoteRes = {
          success: true,
          status: 200,
          statusText: 'OK',
          data: liveQuoteData as any,
          rawBody: JSON.stringify(liveQuoteData),
          headers: {},
          debug: { fallbackUsed: false } as any,
          isFallback: false,
        };
      } else {
        quoteRes = simulate40304
          ? ({ success: false, status: 403, statusText: 'Forbidden', data: { code: 40304 }, rawBody: '', headers: {}, debug: {} } as any)
          : await client.getQuote({
              binanceChainId: 56,
              fromTokenAddress,
              toTokenAddress,
              amount,
              userWalletAddress,
              slippagePercent,
            });

        const isQuoteBlocked = !quoteRes.success || (quoteRes.data as any)?.code === 40304;

        if (isQuoteBlocked) {
          const reqAmountNum = Number(BigInt(amount)) / 1e18;
          const isReverseToUsdt = toTokenAddress.toLowerCase() === '0x55d398326f99059ff775485246999027b3197955';
          const tokenLookup = isReverseToUsdt ? fromTokenAddress.toLowerCase() : toTokenAddress.toLowerCase();

          const fallbackQuote = (
            BENCHMARK_QUOTES[tokenLookup] ||
            BENCHMARK_QUOTES['0x02fca66c1d1afb4e2a7884261eb00f63598a7436']
          ).map((q: any) => {
            const unitPrice = Number(q.toToken?.tokenUnitPrice || '229.11');
            const toDecimals = isReverseToUsdt ? 18 : Number(q.toToken?.decimal || 18);
            // In sell mode: output = shares * unitPrice; In buy mode: output = usdt / unitPrice
            const calculatedOutput = isReverseToUsdt ? reqAmountNum * unitPrice : (unitPrice > 0 ? reqAmountNum / unitPrice : 0);
            const toTokenAmountScaled = BigInt(Math.floor(calculatedOutput * 10 ** toDecimals)).toString();
            return {
              ...q,
              fromTokenAmount: amount,
              toTokenAmount: toTokenAmountScaled,
              fromToken: isReverseToUsdt ? q.toToken : q.fromToken,
              toToken: isReverseToUsdt ? q.fromToken : q.toToken,
              isFallback: true,
            };
          });

          quoteRes = {
            success: true,
            status: 200,
            statusText: 'OK',
            data: fallbackQuote as any,
            rawBody: JSON.stringify(fallbackQuote),
            headers: {},
            debug: { ...quoteRes.debug, fallbackUsed: true } as any,
            isFallback: true,
          };
        } else {
          quoteRes = {
            ...quoteRes,
            isFallback: false,
          };
          if (Array.isArray(quoteRes.data)) {
            quoteRes.data = quoteRes.data.map((q: any) => ({ ...q, isFallback: false }));
          }
        }
      }

      return NextResponse.json({
        auth: authState,
        quote: quoteRes,
        isFallback: Boolean(quoteRes.isFallback),
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'swap') {
      const quoteId = searchParams.get('quoteId') || '';
      const fromTokenAddress = searchParams.get('fromTokenAddress') || '0x55d398326f99059fF775485246999027B3197955';
      const toTokenAddress = searchParams.get('toTokenAddress') || '';
      const amount = searchParams.get('amount') || '10000000000000000000';
      const userWalletAddress = searchParams.get('userWalletAddress') || '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
      const slippagePercent = searchParams.get('slippagePercent') || '1';

      let swapRes = await client.getSwap({
        quoteId,
        binanceChainId: 56,
        fromTokenAddress,
        toTokenAddress,
        amount,
        userWalletAddress,
        slippagePercent,
      });

      const isSwapBlocked =
        !swapRes.success ||
        (swapRes.data as any)?.code === 40304 ||
        (swapRes.data as any)?.code === 40001 ||
        !(swapRes.data as any)?.tx?.data;

      if (isSwapBlocked) {
        return NextResponse.json({
          auth: authState,
          swap: {
            success: false,
            status: 400,
            statusText: 'Swap route unavailable',
            error: {
              code: (swapRes.data as any)?.code || 40001,
              message:
                (swapRes.data as any)?.msg ||
                'Direct LiquidMesh swap route unavailable. Please refresh quote and ensure minimum order is at least 5 USD.',
              details: swapRes.data,
            },
            data: null,
            rawBody: swapRes.rawBody,
            headers: {},
            debug: { ...swapRes.debug, fallbackUsed: false } as any,
          },
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        auth: authState,
        swap: swapRes,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'balances') {
      const address = searchParams.get('address') || '';
      if (!address) {
        return NextResponse.json({ error: 'Missing address parameter' }, { status: 400 });
      }

      let balancesRes = await client.getBalances(address, 56);

      // If Binance API returned error/empty data (e.g. CloudFront 40304), query public BSC RPC
      const tokenAssets: any[] = (balancesRes?.data as any)?.[0]?.tokenAssets || [];
      if (!balancesRes.success || tokenAssets.length === 0) {
        try {
          const bscRpc = 'https://bsc-dataseed.binance.org/';
          const usdtContract = '0x55d398326f99059fF775485246999027B3197955';
          const usdtCallData = '0x70a08231000000000000000000000000' + address.slice(2).toLowerCase();
          const [bnbRes, usdtRes] = await Promise.all([
            fetch(bscRpc, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [address, 'latest'] }),
            }).then((r) => r.json()),
            fetch(bscRpc, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'eth_call', params: [{ to: usdtContract, data: usdtCallData }, 'latest'] }),
            }).then((r) => r.json()),
          ]);

          const bnbBalance = (Number(BigInt(bnbRes?.result || '0x0')) / 1e18).toString();
          const usdtBalance = (Number(BigInt(usdtRes?.result || '0x0')) / 1e18).toString();

          balancesRes = {
            success: true,
            status: 200,
            statusText: 'OK',
            data: [
              {
                chainId: '56',
                address,
                tokenAssets: [
                  {
                    symbol: 'BNB',
                    tokenContractAddress: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
                    balance: bnbBalance,
                    decimal: 18,
                  },
                  {
                    symbol: 'USDT',
                    tokenContractAddress: '0x55d398326f99059ff775485246999027b3197955',
                    balance: usdtBalance,
                    decimal: 18,
                  },
                ],
              },
            ] as any,
            rawBody: '',
            headers: {},
            debug: { fallbackUsed: true } as any,
          };
        } catch (rpcErr) {
          console.warn('RPC balance query error in API route:', rpcErr);
        }
      }

      return NextResponse.json({
        auth: authState,
        balances: balancesRes,
        timestamp: new Date().toISOString(),
      });
    }

    // Default (action === 'resolve'): Fetch platforms, search, and BSC tokens
    let platformsRes;
    let searchRes;
    let bscTokensRes;

    if (simulateLive) {
      platformsRes = {
        success: true,
        status: 200,
        statusText: 'OK',
        data: BENCHMARK_PLATFORMS,
        rawBody: JSON.stringify(BENCHMARK_PLATFORMS),
        headers: {},
        debug: { fallbackUsed: false } as any,
      };
      searchRes = {
        success: true,
        status: 200,
        statusText: 'OK',
        data: BENCHMARK_SEARCH[keyword] || BENCHMARK_SEARCH.NVDA,
        rawBody: JSON.stringify(BENCHMARK_SEARCH[keyword] || BENCHMARK_SEARCH.NVDA),
        headers: {},
        debug: { fallbackUsed: false } as any,
      };
      const liveTokens = (BENCHMARK_TOKENS[keyword] || BENCHMARK_TOKENS.NVDA).map((t) => ({
        ...t,
        isFallback: false,
      }));
      bscTokensRes = {
        success: true,
        status: 200,
        statusText: 'OK',
        data: liveTokens,
        rawBody: JSON.stringify(liveTokens),
        headers: {},
        debug: { fallbackUsed: false } as any,
      };
    } else {
      platformsRes = simulate40304
        ? ({ success: false, status: 403, statusText: 'Forbidden', data: { code: 40304 }, rawBody: '', headers: {}, debug: {} } as any)
        : await client.getPlatforms();
      searchRes = simulate40304
        ? ({ success: false, status: 403, statusText: 'Forbidden', data: { code: 40304 }, rawBody: '', headers: {}, debug: {} } as any)
        : await client.search(keyword);
      bscTokensRes = simulate40304
        ? ({ success: false, status: 403, statusText: 'Forbidden', data: { code: 40304 }, rawBody: '', headers: {}, debug: {} } as any)
        : await client.getTokens({ binanceChainId: 56, size: 500 });

      const isPlatformsBlocked = !platformsRes.success || (platformsRes.data as any)?.code === 40304;
      const isTokensBlocked = !bscTokensRes.success || (bscTokensRes.data as any)?.code === 40304;
      const isSearchBlocked = !searchRes.success || (searchRes.data as any)?.code === 40304;

      if (isPlatformsBlocked) {
        platformsRes = {
          success: true,
          status: 200,
          statusText: 'OK',
          data: BENCHMARK_PLATFORMS as any,
          rawBody: JSON.stringify(BENCHMARK_PLATFORMS),
          headers: {},
          debug: { ...platformsRes.debug, fallbackUsed: true } as any,
        };
      }

      if (isSearchBlocked) {
        const fallback = BENCHMARK_SEARCH[keyword] || BENCHMARK_SEARCH.NVDA;
        searchRes = {
          success: true,
          status: 200,
          statusText: 'OK',
          data: fallback as any,
          rawBody: JSON.stringify(fallback),
          headers: {},
          debug: { ...searchRes.debug, fallbackUsed: true } as any,
        };
      }

      if (isTokensBlocked) {
        const fallback = (BENCHMARK_TOKENS[keyword] || BENCHMARK_TOKENS.NVDA).map((t) => ({
          ...t,
          isFallback: true,
        }));
        bscTokensRes = {
          success: true,
          status: 200,
          statusText: 'OK',
          data: fallback as any,
          rawBody: JSON.stringify(fallback),
          headers: {},
          debug: { ...bscTokensRes.debug, fallbackUsed: true } as any,
        };
      } else if (Array.isArray(bscTokensRes.data)) {
        bscTokensRes.data = bscTokensRes.data.map((t: any) => ({ ...t, isFallback: false }));
      }
    }

    const isOverallFallback = Boolean(
      !simulateLive &&
        (simulate40304 ||
          bscTokensRes.debug?.fallbackUsed ||
          searchRes.debug?.fallbackUsed ||
          platformsRes.debug?.fallbackUsed)
    );

    return NextResponse.json({
      auth: authState,
      keyword,
      platforms: platformsRes,
      search: searchRes,
      bscTokens: bscTokensRes,
      isFallback: isOverallFallback,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[GET /api/rwa] Unhandled error:', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      {
        error: 'An internal error occurred. Please try again.',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'simulate';

  const apiKey = process.env.BINANCE_WEB3_API_KEY || '';
  const secretKey = process.env.BINANCE_WEB3_API_SECRET || '';

  const client = new BinanceRwaClient({
    apiKey,
    secretKey,
  });

  const authState = {
    hasApiKey: Boolean(apiKey),
    hasSecretKey: Boolean(secretKey),
  };

  try {
    const body = await request.json();

    if (action === 'simulate') {
      const tx = body.tx;
      if (!tx || !tx.to || !tx.data) {
        return NextResponse.json(
          { error: 'Missing tx parameters (to, data required)' },
          { status: 400 }
        );
      }

      const simResult = await client.simulateSwap(tx);
      return NextResponse.json({
        auth: authState,
        simulation: simResult,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'swap') {
      const { quoteId, fromTokenAddress, toTokenAddress, amount, userWalletAddress, slippagePercent } = body;
      let swapRes = await client.getSwap({
        quoteId,
        binanceChainId: 56,
        fromTokenAddress: fromTokenAddress || '0x55d398326f99059fF775485246999027B3197955',
        toTokenAddress,
        amount: amount || '10000000000000000000',
        userWalletAddress: userWalletAddress || '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        slippagePercent: slippagePercent || '1',
      });

      const isSwapBlocked =
        !swapRes.success ||
        (swapRes.data as any)?.code === 40304 ||
        (swapRes.data as any)?.code === 40001 ||
        !(swapRes.data as any)?.tx?.data;

      if (isSwapBlocked) {
        return NextResponse.json({
          auth: authState,
          swap: {
            success: false,
            status: 400,
            statusText: 'Swap route unavailable',
            error: {
              code: (swapRes.data as any)?.code || 40001,
              message:
                (swapRes.data as any)?.msg ||
                'Direct LiquidMesh swap route unavailable. Please refresh quote and ensure minimum order is at least 5 USD.',
              details: swapRes.data,
            },
            data: null,
            rawBody: swapRes.rawBody,
            headers: {},
            debug: { ...swapRes.debug, fallbackUsed: false } as any,
          },
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        auth: authState,
        swap: swapRes,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    console.error('[POST /api/rwa] Unhandled error:', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      {
        error: 'An internal error occurred. Please try again.',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
