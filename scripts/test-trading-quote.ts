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
const BSC_NVDAON = '0xa9ee28c80f960b889dfbd1902055218cba016f75';
const TEST_WALLET = env.WALLET_ADDRESS || '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

async function testQuotes() {
  console.log('Testing Trading API Quotes on BSC...');
  console.log('Wallet:', TEST_WALLET);

  // 1. Quote USDT -> NVDAB ($10 = 10 * 10^18)
  const amount = '10000000000000000000'; // 10 USDT
  const nvdabPath = `/api/v1/dex/aggregator/quote?binanceChainId=56&fromTokenAddress=${BSC_USDT}&toTokenAddress=${BSC_NVDAB}&amount=${amount}&userWalletAddress=${TEST_WALLET}&slippagePercent=1`;

  console.log('\n--- 1. Quote USDT -> NVDAB ---');
  console.log('URL:', nvdabPath);
  const nvdabRes = await client.get(nvdabPath);
  console.log('Status:', nvdabRes.status);
  console.log('Headers:', JSON.stringify(nvdabRes.headers, null, 2));
  console.log('Raw Body:', nvdabRes.rawBody);

  // 2. Quote USDT -> NVDAon
  const nvdaonPath = `/api/v1/dex/aggregator/quote?binanceChainId=56&fromTokenAddress=${BSC_USDT}&toTokenAddress=${BSC_NVDAON}&amount=${amount}&userWalletAddress=${TEST_WALLET}&slippagePercent=1`;

  console.log('\n--- 2. Quote USDT -> NVDAon ---');
  console.log('URL:', nvdaonPath);
  const nvdaonRes = await client.get(nvdaonPath);
  console.log('Status:', nvdaonRes.status);
  console.log('Raw Body:', nvdaonRes.rawBody);
}

testQuotes().catch(console.error);
