import { BinanceRwaClient } from '../packages/api/src/client.js';

async function testCall() {
  console.log('Testing live call to Binance Web3 API...');
  const client = new BinanceRwaClient();
  
  console.log('\n--- 1. Testing GET /api/v1/dex/market/rwa/platforms ---');
  const platforms = await client.getPlatforms();
  console.log('Status:', platforms.status, platforms.statusText);
  console.log('Headers:', JSON.stringify(platforms.headers, null, 2));
  console.log('Raw Body:', platforms.rawBody);

  console.log('\n--- 2. Testing GET /api/v1/dex/market/rwa/search?keyword=NVDA ---');
  const search = await client.search('NVDA');
  console.log('Status:', search.status, search.statusText);
  console.log('Raw Body:', search.rawBody);
}

testCall().catch(console.error);
