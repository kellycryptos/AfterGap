import { BinanceRwaClient } from '../packages/api/src/client.js';

async function testSignedCall() {
  console.log('Testing signed call with test API key & secret...');
  const client = new BinanceRwaClient({
    apiKey: 'test_api_key_sample',
    secretKey: 'test_secret_key_sample_1234567890',
  });

  const platforms = await client.getPlatforms();
  console.log('Signed Call Status:', platforms.status, platforms.statusText);
  console.log('Signed Call Headers:', JSON.stringify(platforms.headers, null, 2));
  console.log('Signed Call Raw Body:', platforms.rawBody);
}

testSignedCall().catch(console.error);
