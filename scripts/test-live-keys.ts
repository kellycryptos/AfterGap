import { BinanceRwaClient } from '../packages/api/src/client';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (match) {
    env[match[1]] = match[2];
  }
}

async function testKeys() {
  console.log('Testing Combination 1:');
  console.log('API_KEY =', env.BINANCE_WEB3_API_KEY);
  console.log('API_SECRET = [REDACTED]');
  
  let client = new BinanceRwaClient({
    apiKey: env.BINANCE_WEB3_API_KEY,
    secretKey: env.BINANCE_WEB3_API_SECRET,
  });

  let res = await client.getPlatforms();
  console.log('Status 1:', res.status, res.statusText);
  console.log('Headers 1:', JSON.stringify(res.headers, null, 2));
  console.log('Raw Body 1:', res.rawBody);

  if (res.status !== 200) {
    console.log('\nTesting Combination 2 (swapped):');
    client = new BinanceRwaClient({
      apiKey: env.BINANCE_WEB3_API_SECRET,
      secretKey: env.BINANCE_WEB3_API_KEY,
    });

    res = await client.getPlatforms();
    console.log('Status 2:', res.status, res.statusText);
    console.log('Headers 2:', JSON.stringify(res.headers, null, 2));
    console.log('Raw Body 2:', res.rawBody);

    if (res.status === 200) {
      console.log('SUCCESS with Combination 2! Updating .env.local...');
      const updated = `BINANCE_WEB3_API_KEY=${env.BINANCE_WEB3_API_SECRET}\nBINANCE_WEB3_API_SECRET=${env.BINANCE_WEB3_API_KEY}\nWALLET_ADDRESS=${env.WALLET_ADDRESS || ''}\nBSC_RPC=${env.BSC_RPC || ''}\n`;
      fs.writeFileSync(envPath, updated, 'utf8');
    }
  } else {
    console.log('SUCCESS with Combination 1!');
  }
}

testKeys().catch(console.error);
