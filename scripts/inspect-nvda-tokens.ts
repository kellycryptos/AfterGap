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

async function inspectNvdaTokens() {
  const tokensRes = await client.getTokens({ binanceChainId: 56, size: 500 });
  const list = (tokensRes.data as any) || [];
  console.log('Total tokens fetched:', list.length);
  const nvdaTokens = list.filter((t: any) => 
    t.underlyingTicker === 'NVDA' || 
    t.tokenSymbol?.toUpperCase().includes('NVDA')
  );
  console.log('NVDA Tokens found in /rwa/tokens:');
  console.log(JSON.stringify(nvdaTokens, null, 2));
}

inspectNvdaTokens().catch(console.error);
