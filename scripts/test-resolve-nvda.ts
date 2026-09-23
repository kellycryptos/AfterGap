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

async function resolveNvda() {
  console.log('Resolving NVDA...');

  console.log('\n--- 1. Search NVDA ---');
  const searchRes = await client.search('NVDA');
  console.log('Search Status:', searchRes.status);
  console.log('Search Raw Body:', searchRes.rawBody);

  console.log('\n--- 2. Tokens on BSC (binanceChainId=56) ---');
  const tokensRes = await client.getTokens({ binanceChainId: 56 });
  console.log('Tokens Status:', tokensRes.status);
  console.log('Tokens Raw Body (sample):', tokensRes.rawBody.slice(0, 1500));
}

resolveNvda().catch(console.error);
