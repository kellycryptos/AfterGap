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

async function testBalance() {
  const address = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
  const url = `/api/v1/dex/balance/token-balances-by-address?address=${address}`;
  const body = JSON.stringify([
    {
      binanceChainId: '56',
      tokenContractAddress: '', // BNB native
    },
    {
      binanceChainId: '56',
      tokenContractAddress: '0x55d398326f99059ff775485246999027b3197955', // USDT
    },
    {
      binanceChainId: '56',
      tokenContractAddress: '0x02fca66c1d1afb4e2a7884261eb00f63598a7436', // NVDAB
    },
  ]);

  console.log('Testing Wallet API balances...');
  const res = await client.post(url, body);
  console.log('Status:', res.status);
  console.log('Body:', res.rawBody);
}

testBalance().catch(console.error);
