import fs from 'fs';
import path from 'path';
import { BinanceRwaClient } from '../packages/api/src/client';

try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      process.env[k] = v;
    }
  }
} catch {}

const c = new BinanceRwaClient();
const USDT = '0x55d398326f99059fF775485246999027B3197955';
const NVDAB = '0x02fca66c1d1afb4e2a7884261eb00f63598a7436';
const NVDAON = '0xa9ee28c80f960b889dfbd1902055218cba016f75';
const TEST_WALLET = '0x0478047bb937e4e292275c6d09b997deb72d759d';

async function testReverse() {
  console.log('============================================================');
  console.log('  TESTING REVERSE (SELL) QUOTE: NVDAB -> USDT');
  console.log('============================================================');
  
  // Selling 0.0218 NVDAB (~$5 USD worth)
  const amountToSell = '21800000000000000';
  const quote = await c.getQuote({
    binanceChainId: 56,
    fromTokenAddress: NVDAB,
    toTokenAddress: USDT,
    amount: amountToSell,
    userWalletAddress: TEST_WALLET,
    slippagePercent: 1,
  });

  console.log(`HTTP Status: ${quote.status}, Success: ${quote.success}`);
  if (quote.data && (quote.data as any)[0]?.quoteId) {
    const best = (quote.data as any)[0];
    console.log(`✅ [HTTP 200] Live Reverse Quote ID: ${best.quoteId}`);
    console.log(`   Vendor: ${best.vendorName} | Execution: ${best.executionMode}`);
    console.log(`   Output: ${(Number(best.toTokenAmount) / 1e18).toFixed(4)} USDT`);
    console.log(`   Price: $${best.toToken?.tokenUnitPrice} / unit`);
    console.log(`   Approve Target (Router to approve NVDAB): ${best.approveTarget}`);
    if (best.dexRouterList?.length > 0) {
      console.log(`   Routing Hops:`);
      best.dexRouterList.forEach((r: any, i: number) => {
        console.log(`     ${i + 1}. ${r.dexProtocol?.dexName}: ${r.fromToken?.tokenSymbol} -> ${r.toToken?.tokenSymbol} (${r.dexProtocol?.percent}%)`);
      });
    }

    console.log('\n============================================================');
    console.log('  TESTING REVERSE SWAP CALLDATA: NVDAB -> USDT');
    console.log('============================================================');
    const swap = await c.getSwap({
      quoteId: best.quoteId,
      binanceChainId: 56,
      fromTokenAddress: NVDAB,
      toTokenAddress: USDT,
      amount: amountToSell,
      userWalletAddress: TEST_WALLET,
      slippagePercent: 1,
    });

    console.log(`HTTP Status: ${swap.status}, Success: ${swap.success}`);
    if (swap.data?.tx) {
      console.log(`✅ [HTTP 200] Live Reverse Swap Calldata:`);
      console.log(`   Router To: ${swap.data.tx.to}`);
      console.log(`   Selector: ${swap.data.tx.data?.slice(0, 10)}`);
      console.log(`   Gas Estimate: ${swap.data.tx.gas}`);
    } else {
      console.error('❌ Swap calldata construction failed:', swap.error || swap.rawBody);
    }
  } else {
    console.error('❌ Reverse quote failed:', quote.error || quote.rawBody);
  }

  console.log('\n============================================================');
  console.log('  TESTING REVERSE (SELL) QUOTE: NVDAon -> USDT');
  console.log('============================================================');
  const quoteOndo = await c.getQuote({
    binanceChainId: 56,
    fromTokenAddress: NVDAON,
    toTokenAddress: USDT,
    amount: '26000000000000000', // 0.026 NVDAon (~$5.90 USD)
    userWalletAddress: TEST_WALLET,
    slippagePercent: 1,
  });

  console.log(`HTTP Status: ${quoteOndo.status}, Success: ${quoteOndo.success}`);
  if (quoteOndo.data && (quoteOndo.data as any)[0]?.quoteId) {
    const bestOndo = (quoteOndo.data as any)[0];
    console.log(`✅ [HTTP 200] Live Reverse Quote ID: ${bestOndo.quoteId}`);
    console.log(`   Vendor: ${bestOndo.vendorName} | Execution: ${bestOndo.executionMode}`);
    console.log(`   Output: ${(Number(bestOndo.toTokenAmount) / 1e18).toFixed(4)} USDT`);
    console.log(`   Approve Target: ${bestOndo.approveTarget}`);
  } else {
    console.error('❌ Reverse quote failed for NVDAon:', quoteOndo.error || quoteOndo.rawBody);
  }
}

testReverse();
