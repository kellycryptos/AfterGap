import { BinanceRwaClient } from '../packages/api/src/client';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (match) {
    env[match[1]] = match[2];
  }
}

const client = new BinanceRwaClient({
  apiKey: env.BINANCE_WEB3_API_KEY,
  secretKey: env.BINANCE_WEB3_API_SECRET,
});

const BSC_USDT = '0x55d398326f99059fF775485246999027B3197955';
const BSC_NVDAB = '0x02fca66c1d1afb4e2a7884261eb00f63598a7436';
const TEST_WALLET = env.WALLET_ADDRESS || '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

async function testSwap() {
  console.log('1. Getting fresh quote for NVDAB...');
  const amount = '10000000000000000000'; // 10 USDT
  const quotePath = `/api/v1/dex/aggregator/quote?binanceChainId=56&fromTokenAddress=${BSC_USDT}&toTokenAddress=${BSC_NVDAB}&amount=${amount}&userWalletAddress=${TEST_WALLET}&slippagePercent=1`;

  const quoteRes = await client.get(quotePath);
  console.log('Quote Status:', quoteRes.status);
  const quoteData = (quoteRes.data as any)?.[0];
  const quoteId = quoteData?.quoteId;
  console.log('Quote ID:', quoteId, 'Execution Mode:', quoteData?.executionMode);

  console.log('\n2. Calling /swap with quoteId...');
  const swapPath = `/api/v1/dex/aggregator/swap?binanceChainId=56&fromTokenAddress=${BSC_USDT}&toTokenAddress=${BSC_NVDAB}&amount=${amount}&userWalletAddress=${TEST_WALLET}&slippagePercent=1&quoteId=${quoteId}`;
  const swapRes = await client.get(swapPath);
  console.log('Swap Status:', swapRes.status);
  console.log('Swap Raw Body:', swapRes.rawBody);
}

testSwap().catch(console.error);
