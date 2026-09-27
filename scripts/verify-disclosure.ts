import { NextRequest } from 'next/server';
import { GET } from '../apps/web/app/api/rwa/route';

async function runTest() {
  console.log('================================================================');
  console.log('   AFTERGAP FALLBACK PRICING DISCLOSURE VERIFICATION SUITE   ');
  console.log('================================================================\n');

  // --- TEST 1: Simulate 40304 CloudFront compliance restriction on resolve ---
  console.log('--- TEST 1: Simulate 40304 API Failure on Token Feeds (bStocks & Ondo) ---');
  const req40304 = new NextRequest('http://localhost:3000/api/rwa?action=resolve&keyword=NVDA&simulate40304=true');
  const res40304 = await GET(req40304);
  const json40304 = await res40304.json();

  console.log(`HTTP Status: ${res40304.status}`);
  console.log(`Envelope isFallback: ${json40304.isFallback}`);
  console.log(`bscTokens fallbackUsed: ${json40304.bscTokens?.debug?.fallbackUsed}`);
  
  const bstocksToken40304 = json40304.bscTokens?.data?.find((t: any) => t.tokenSymbol === 'NVDAB');
  const ondoToken40304 = json40304.bscTokens?.data?.find((t: any) => t.tokenSymbol === 'NVDAon');

  console.log(`bStocks (NVDAB) token isFallback: ${bstocksToken40304?.isFallback}`);
  console.log(`Ondo (NVDAon) token isFallback: ${ondoToken40304?.isFallback}`);

  if (json40304.isFallback === true && bstocksToken40304?.isFallback === true && ondoToken40304?.isFallback === true) {
    console.log('✅ PASS: When 40304 is simulated, both bStocks and Ondo tokens have isFallback: true.');
    console.log('         -> Triggers UI Banner: [⚠️ Estimated price — live feed unavailable from this region]');
  } else {
    console.error('❌ FAIL: Expected isFallback: true for all tokens.');
    process.exit(1);
  }

  // --- TEST 2: Simulate Live Binance API Success on Token Feeds ---
  console.log('\n--- TEST 2: Simulate Live Binance API Success on Token Feeds ---');
  const reqLive = new NextRequest('http://localhost:3000/api/rwa?action=resolve&keyword=NVDA&simulateLive=true');
  const resLive = await GET(reqLive);
  const jsonLive = await resLive.json();

  console.log(`HTTP Status: ${resLive.status}`);
  console.log(`Envelope isFallback: ${jsonLive.isFallback}`);
  console.log(`bscTokens fallbackUsed: ${jsonLive.bscTokens?.debug?.fallbackUsed}`);

  const bstocksTokenLive = jsonLive.bscTokens?.data?.find((t: any) => t.tokenSymbol === 'NVDAB');
  const ondoTokenLive = jsonLive.bscTokens?.data?.find((t: any) => t.tokenSymbol === 'NVDAon');

  console.log(`bStocks (NVDAB) token isFallback: ${bstocksTokenLive?.isFallback}`);
  console.log(`Ondo (NVDAon) token isFallback: ${ondoTokenLive?.isFallback}`);

  if (jsonLive.isFallback === false && bstocksTokenLive?.isFallback === false && ondoTokenLive?.isFallback === false) {
    console.log('✅ PASS: When live API succeeds, isFallback is strictly false.');
    console.log('         -> Triggers UI Badge: [● Live Binance Web3 Feed (HTTP 200 OK)] (NO fallback badge)');
  } else {
    console.error('❌ FAIL: Expected isFallback: false for live tokens.');
    process.exit(1);
  }

  // --- TEST 3: Simulate 40304 API Failure on Trading RFQ Quote ---
  console.log('\n--- TEST 3: Simulate 40304 API Failure on Trading RFQ Quote ---');
  const reqQuote40304 = new NextRequest('http://localhost:3000/api/rwa?action=quote&toTokenAddress=0x02fca66c1d1afb4e2a7884261eb00f63598a7436&simulate40304=true');
  const resQuote40304 = await GET(reqQuoteQuote(reqQuote40304));
  const jsonQuote40304 = await resQuote40304.json();

  console.log(`Quote envelope isFallback: ${jsonQuote40304.isFallback}`);
  console.log(`Quote data[0] isFallback: ${jsonQuote40304.quote?.data?.[0]?.isFallback}`);

  if (jsonQuote40304.isFallback === true && jsonQuote40304.quote?.data?.[0]?.isFallback === true) {
    console.log('✅ PASS: When quote API fails, quote.isFallback: true.');
    console.log('         -> Triggers Quote Badge: [⚠️ Estimated quote — live RFQ gateway unavailable from this region]');
  } else {
    console.error('❌ FAIL: Expected quote isFallback: true.');
    process.exit(1);
  }

  // --- TEST 4: Simulate Live Trading RFQ Quote Success ---
  console.log('\n--- TEST 4: Simulate Live Trading RFQ Quote Success ---');
  const reqQuoteLive = new NextRequest('http://localhost:3000/api/rwa?action=quote&toTokenAddress=0x02fca66c1d1afb4e2a7884261eb00f63598a7436&simulateLive=true');
  const resQuoteLive = await GET(reqQuoteLive);
  const jsonQuoteLive = await resQuoteLive.json();

  console.log(`Quote envelope isFallback: ${jsonQuoteLive.isFallback}`);
  console.log(`Quote data[0] isFallback: ${jsonQuoteLive.quote?.data?.[0]?.isFallback}`);

  if (jsonQuoteLive.isFallback === false && jsonQuoteLive.quote?.data?.[0]?.isFallback === false) {
    console.log('✅ PASS: When live quote API succeeds, quote.isFallback: false.');
    console.log('         -> Triggers Quote Badge: [● Live RFQ Executable Quote (Binance API 200)] (NO fallback badge)');
  } else {
    console.error('❌ FAIL: Expected quote isFallback: false.');
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('   ALL 4 DYNAMIC DISCLOSURE TESTS PASSED WITH 100% INTEGRITY    ');
  console.log('================================================================');
}

function reqQuoteQuote(r: NextRequest) {
  return r;
}

runTest().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
