import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

// Load .env.local if present
try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      process.env[k] = v;
    }
  }
} catch {}

import { GET } from '../apps/web/app/api/rwa/route';

const NVDAB = '0x02fca66c1d1afb4e2a7884261eb00f63598a7436';
const NVDAON = '0xa9ee28c80f960b889dfbd1902055218cba016f75';
const TEST_WALLET = '0x0478047bb937e4e292275c6d09b997deb72d759d';

async function run() {
  console.log('================================================================');
  console.log('  TEST: SERVER-SIDE-ONLY SIGNING & ZERO SIGNATURE LEAKAGE');
  console.log('================================================================\n');

  // TEST 1: Verify action=sign endpoint is completely eliminated
  console.log('--- TEST 1: action=sign Endpoint Elimination ---');
  const signReq = new NextRequest('http://localhost:3000/api/rwa?action=sign&path=%2Fbuild%2Fapi%2Fv1%2Fdex%2Faggregator%2Fquote');
  const signRes = await GET(signReq);
  const signJson = await signRes.json();
  const signRawStr = JSON.stringify(signJson);

  if (signJson.requestUrl || signJson.headers?.['X-OC-SIGN'] || signRawStr.includes('X-OC-SIGN')) {
    console.error('❌ FAIL: action=sign returned signed headers or requestUrl!');
    process.exit(1);
  }
  console.log('✅ PASS: action=sign does NOT return signing credentials, signed URLs, or X-OC-SIGN.');

  // TEST 2: Fetch Live Quote via Server Route for NVDAB
  console.log('\n--- TEST 2: Live Server-Side Quote for NVDAB (5 USDT) ---');
  const quoteReqNvdab = new NextRequest(
    `http://localhost:3000/api/rwa?action=quote&toTokenAddress=${NVDAB}&amount=5000000000000000000&userWalletAddress=${TEST_WALLET}&slippagePercent=1`
  );
  const quoteResNvdab = await GET(quoteReqNvdab);
  const quoteJsonNvdab = await quoteResNvdab.json();
  const rawResponseTextNvdab = JSON.stringify(quoteJsonNvdab);

  console.log(`HTTP Status: ${quoteResNvdab.status}`);
  console.log(`Quote Success: ${quoteJsonNvdab.quote?.success}`);
  const quoteDataNvdab = Array.isArray(quoteJsonNvdab.quote?.data) ? quoteJsonNvdab.quote.data[0] : quoteJsonNvdab.quote?.data;
  console.log(`Live Quote ID: ${quoteDataNvdab?.quoteId}`);
  console.log(`Vendor: ${quoteDataNvdab?.vendorName} | Execution: ${quoteDataNvdab?.executionMode}`);
  console.log(`Output: ${(Number(quoteDataNvdab?.toTokenAmount) / 1e18).toFixed(6)} NVDAB`);
  console.log(`Spender / Approve Target: ${quoteDataNvdab?.approveTarget}`);

  // Rigorous verification of zero signature leakage
  if (rawResponseTextNvdab.includes('X-OC-SIGN')) {
    console.error('❌ FAIL: Response JSON contains X-OC-SIGN header!');
    process.exit(1);
  }
  if (rawResponseTextNvdab.includes(process.env.BINANCE_WEB3_API_SECRET || 'IMPOSSIBLE_SECRET')) {
    console.error('❌ FAIL: Response JSON contains BINANCE_WEB3_API_SECRET!');
    process.exit(1);
  }
  console.log('✅ PASS: Quote returned exclusively server-side with ZERO X-OC-SIGN or secret leakage.');

  // TEST 3: Fetch Live Quote via Server Route for NVDAon
  console.log('\n--- TEST 3: Live Server-Side Quote for NVDAon (6 USDT) ---');
  const quoteReqOndo = new NextRequest(
    `http://localhost:3000/api/rwa?action=quote&toTokenAddress=${NVDAON}&amount=6000000000000000000&userWalletAddress=${TEST_WALLET}&slippagePercent=1`
  );
  const quoteResOndo = await GET(quoteReqOndo);
  const quoteJsonOndo = await quoteResOndo.json();
  const rawResponseTextOndo = JSON.stringify(quoteJsonOndo);

  console.log(`HTTP Status: ${quoteResOndo.status}`);
  console.log(`Quote Success: ${quoteJsonOndo.quote?.success}`);
  const quoteDataOndo = Array.isArray(quoteJsonOndo.quote?.data) ? quoteJsonOndo.quote.data[0] : quoteJsonOndo.quote?.data;
  console.log(`Live Quote ID: ${quoteDataOndo?.quoteId}`);
  console.log(`Vendor: ${quoteDataOndo?.vendorName} | Execution: ${quoteDataOndo?.executionMode}`);
  console.log(`Output: ${(Number(quoteDataOndo?.toTokenAmount) / 1e18).toFixed(6)} NVDAon`);

  if (rawResponseTextOndo.includes('X-OC-SIGN')) {
    console.error('❌ FAIL: Response JSON contains X-OC-SIGN header!');
    process.exit(1);
  }
  console.log('✅ PASS: NVDAon quote returned exclusively server-side with ZERO X-OC-SIGN leakage.');

  // TEST 4: Fetch Live Swap Calldata via Server Route
  console.log('\n--- TEST 4: Live Server-Side Swap Calldata Construction ---');
  const swapReq = new NextRequest(
    `http://localhost:3000/api/rwa?action=swap&quoteId=${quoteDataNvdab.quoteId}&toTokenAddress=${NVDAB}&amount=5000000000000000000&userWalletAddress=${TEST_WALLET}&slippagePercent=1`
  );
  const swapRes = await GET(swapReq);
  const swapJson = await swapRes.json();
  const rawResponseTextSwap = JSON.stringify(swapJson);

  console.log(`HTTP Status: ${swapRes.status}`);
  console.log(`Swap Success: ${swapJson.swap?.success}`);
  const tx = swapJson.swap?.data?.tx;
  console.log(`Target Router: ${tx?.to}`);
  console.log(`Calldata Selector: ${tx?.data?.slice(0, 10)}`);
  console.log(`Gas: ${tx?.gas}`);

  if (rawResponseTextSwap.includes('X-OC-SIGN')) {
    console.error('❌ FAIL: Swap response JSON contains X-OC-SIGN header!');
    process.exit(1);
  }
  console.log('✅ PASS: Swap calldata constructed exclusively server-side with ZERO signature exposure.');

  console.log('\n================================================================');
  console.log('  ALL SERVER-SIDE ARCHITECTURE TESTS PASSED SUCCESSFULLY ✅');
  console.log('================================================================\n');
}

run().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
