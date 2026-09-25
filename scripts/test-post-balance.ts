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

async function testPostBalance() {
  console.log('Testing POST /api/v1/dex/balance/token-balances-by-address...');
  const payload = JSON.stringify({
    address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    chains: '56',
  });

  const res = await client.post('/api/v1/dex/balance/token-balances-by-address', payload);
  console.log('Balance POST Status:', res.status);
  console.log('Balance POST Body:', res.rawBody.slice(0, 1000));
}

testPostBalance().catch(console.error);
