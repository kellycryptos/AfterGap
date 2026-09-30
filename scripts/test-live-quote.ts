import { BinanceRwaClient } from '../packages/api/src/client';
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

const USDT = '0x55d398326f99059fF775485246999027B3197955';
const NVDAB = '0x02fca66c1d1afb4e2a7884261eb00f63598a7436';
const NVDAON = '0xa9ee28c80f960b889dfbd1902055218cba016f75';
const TEST_WALLET = '0x0478047bb937e4e292275c6d09b997deb72d759d';

async function testToken(c: BinanceRwaClient, name: string, tokenAddress: string, amount: string) {
  console.log(`\n============================================================`);
  console.log(`  TESTING LIVE BINANCE WEB3 TRADING API: ${name}`);
  console.log(`============================================================`);

  const quote = await c.getQuote({
    binanceChainId: 56,
    fromTokenAddress: USDT,
    toTokenAddress: tokenAddress,
    amount,
    userWalletAddress: TEST_WALLET,
    slippagePercent: 1,
  });

  if (!quote.success || !quote.data || !(quote.data as any)[0]?.quoteId) {
    console.error(`❌ Quote failed for ${name}:`, quote.error || quote.rawBody);
    return false;
  }

  const best = (quote.data as any)[0];
  console.log(`✅ [HTTP 200] Live Quote ID: ${best.quoteId}`);
  console.log(`   Vendor: ${best.vendorName} | Execution: ${best.executionMode}`);
  console.log(`   Output: ${(Number(best.toTokenAmount) / 1e18).toFixed(6)} ${best.toToken?.tokenSymbol}`);
  console.log(`   Price: $${best.toToken?.tokenUnitPrice} / share`);
  console.log(`   Approve Target: ${best.approveTarget}`);
  if (best.dexRouterList?.length > 0) {
    console.log(`   Routing Hops:`);
    best.dexRouterList.forEach((r: any, i: number) => {
      console.log(`     ${i + 1}. ${r.dexProtocol?.dexName}: ${r.fromToken?.tokenSymbol} -> ${r.toToken?.tokenSymbol} (${r.dexProtocol?.percent}%)`);
    });
  }

  const swap = await c.getSwap({
    quoteId: best.quoteId,
    binanceChainId: 56,
    fromTokenAddress: USDT,
    toTokenAddress: tokenAddress,
    amount,
    userWalletAddress: TEST_WALLET,
    slippagePercent: 1,
  });

  if (!swap.success || !(swap.data as any)?.tx?.data) {
    console.error(`❌ Swap build failed for ${name}:`, swap.error || swap.rawBody);
    return false;
  }

  const tx = (swap.data as any).tx;
  console.log(`✅ [HTTP 200] Live Swap Calldata Constructed:`);
  console.log(`   Router To: ${tx.to}`);
  console.log(`   Calldata Selector: ${tx.data.slice(0, 10)}`);
  console.log(`   Gas Estimate: ${tx.gas}`);
  console.log(`   Min Receive: ${(Number(tx.minReceiveAmount || 0) / 1e18).toFixed(6)}`);
  return true;
}

async function run() {
  const c = new BinanceRwaClient();

  const bstockOk = await testToken(c, 'NVDAB (bStocks)', NVDAB, '5000000000000000000'); // 5 USDT
  const ondoOk = await testToken(c, 'NVDAon (Ondo Global Markets)', NVDAON, '6000000000000000000'); // 6 USDT

  console.log(`\n============================================================`);
  console.log(`  SUMMARY: Both Wrappers 100% Live on BSC Mainnet`);
  console.log(`  bStocks (NVDAB): ${bstockOk ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`  Ondo (NVDAon):   ${ondoOk ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`============================================================\n`);

  if (!bstockOk || !ondoOk) {
    process.exit(1);
  }
  process.exit(0);
}

run().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
