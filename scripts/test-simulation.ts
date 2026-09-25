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

const BSC_RPC = env.BSC_RPC || 'https://bsc-dataseed.binance.org/';
const BSC_USDT = '0x55d398326f99059fF775485246999027B3197955';
const BSC_NVDAB = '0x02fca66c1d1afb4e2a7884261eb00f63598a7436';
const TEST_WALLET = env.WALLET_ADDRESS || '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

async function testSimulation() {
  console.log('1. Getting swap transaction calldata...');
  const amount = '10000000000000000000'; // 10 USDT
  const quotePath = `/api/v1/dex/aggregator/quote?binanceChainId=56&fromTokenAddress=${BSC_USDT}&toTokenAddress=${BSC_NVDAB}&amount=${amount}&userWalletAddress=${TEST_WALLET}&slippagePercent=1`;
  const quoteRes = await client.get(quotePath);
  const quoteId = (quoteRes.data as any)?.[0]?.quoteId;

  const swapPath = `/api/v1/dex/aggregator/swap?binanceChainId=56&fromTokenAddress=${BSC_USDT}&toTokenAddress=${BSC_NVDAB}&amount=${amount}&userWalletAddress=${TEST_WALLET}&slippagePercent=1&quoteId=${quoteId}`;
  const swapRes = await client.get(swapPath);
  const tx = (swapRes.data as any)?.tx;
  console.log('Swap tx target:', tx?.to);

  // 2. Simulate via BSC RPC (eth_call)
  console.log('\n2. Simulating tx via BSC RPC (eth_call)...');
  const rpcRes = await fetch(BSC_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [
        {
          from: TEST_WALLET,
          to: tx.to,
          data: tx.data,
          value: '0x0',
        },
        'latest',
      ],
    }),
  });
  const rpcJson = await rpcRes.json();
  console.log('RPC eth_call result:', JSON.stringify(rpcJson, null, 2));

  // 3. Test Binance Transaction API simulate endpoint
  console.log('\n3. Testing Binance Transaction API simulate endpoint...');
  const simulatePayload = {
    binanceChainId: '56',
    from: TEST_WALLET,
    to: tx.to,
    data: tx.data,
    value: '0',
  };
  
  // Test /api/v1/transaction/simulate
  const binanceSim = await client.post('/api/v1/transaction/simulate', JSON.stringify(simulatePayload));
  console.log('Binance Transaction API simulate status:', binanceSim.status);
  console.log('Binance Transaction API simulate body:', binanceSim.rawBody);
}

testSimulation().catch(console.error);
