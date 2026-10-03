import React from 'react';
import { renderToString } from 'react-dom/server';
import Home from '../apps/web/app/page';

async function verifyUiRendering() {
  console.log('================================================================');
  console.log('   AFTERGAP REACT UI DYNAMIC BADGE RENDERING VERIFICATION       ');
  console.log('================================================================\n');

  // 1. Verify Pro Mode rendering and disclosures
  (globalThis as any).__AFTERGAP_TEST_MODE__ = 'pro';
  const proHtml = renderToString(React.createElement(Home));

  console.log('--- TEST 1: PRO MODE (Terminal UI) ---');
  console.log('Rendered length:', proHtml.length, 'bytes');

  const hasBenchmarkTitle = proHtml.includes('Benchmark Reference Pricing');
  const hasDatacenter40304Text = proHtml.includes('Binance Web3 Gateway restricts serverless datacenter IPs (40304)');
  const hasBstocksFallback = proHtml.includes('data-testid="bstocks-fallback-badge"');
  const hasOndoFallback = proHtml.includes('data-testid="ondo-fallback-badge"');
  const hasOnChainVerified = proHtml.includes('On-Chain Verified');
  const noMisleadingLiveFeed = !proHtml.includes('Live Binance Web3 Feed');

  console.log(`Benchmark Reference Pricing Title: ${hasBenchmarkTitle}`);
  console.log(`40304 Datacenter Disclosure:       ${hasDatacenter40304Text}`);
  console.log(`bStocks Fallback Badge:            ${hasBstocksFallback}`);
  console.log(`Ondo Fallback Badge:               ${hasOndoFallback}`);
  console.log(`On-Chain Verified Badges Present:  ${hasOnChainVerified}`);
  console.log(`Misleading Live Feed Removed:      ${noMisleadingLiveFeed}`);

  if (
    !hasBenchmarkTitle ||
    !hasDatacenter40304Text ||
    !hasBstocksFallback ||
    !hasOndoFallback ||
    !hasOnChainVerified ||
    !noMisleadingLiveFeed
  ) {
    console.error('❌ FAIL: Expected honest benchmark disclosures and on-chain verified status in Pro Mode markup.');
    process.exit(1);
  }
  console.log('✅ PASS: Pro Mode terminal renders complete benchmark disclosures and verified on-chain badges.\n');

  // 2. Verify Simple Mode rendering (Retail UI)
  (globalThis as any).__AFTERGAP_TEST_MODE__ = 'simple';
  const simpleHtml = renderToString(React.createElement(Home));

  console.log('--- TEST 2: SIMPLE MODE (Retail UI) ---');
  console.log('Rendered length:', simpleHtml.length, 'bytes');

  const hasSimpleHero = simpleHtml.includes('Buy US Stocks on BNB Chain');
  const hasCompanyName = simpleHtml.includes('Nvidia Corp');
  const hasTicker = simpleHtml.includes('NVDA');
  const hasSavingsLine = simpleHtml.includes('Estimated savings:') || simpleHtml.includes('Buying this way saves you') || simpleHtml.includes('Saves you $');
  const hasBuyButton = simpleHtml.includes('Buy NVDA');
  const hasPlainWrapper = simpleHtml.includes('gets dividends added as extra shares');
  const hasUpfrontFallbackDisclosure =
    simpleHtml.includes('Benchmark Reference Price') ||
    simpleHtml.includes('Estimated Price (Benchmark)');
  const noMisleadingLivePrice = !simpleHtml.includes('Live Binance Web3 Price');
  const noRawAddress = !simpleHtml.includes('0x02fca66c1d1afb4e2a7884261eb00f63598a7436');
  const noRouterTerms = !simpleHtml.includes('LiquidMesh');

  console.log(`Simple Mode Hero Present:          ${hasSimpleHero}`);
  console.log(`Company Name & Ticker Present:     ${hasCompanyName && hasTicker}`);
  console.log(`Plain Savings Line Present:        ${hasSavingsLine}`);
  console.log(`Buy [TICKER] Button Present:       ${hasBuyButton}`);
  console.log(`Plain Wrapper Dividend Sentence:   ${hasPlainWrapper}`);
  console.log(`Upfront Fallback Price Disclosure: ${hasUpfrontFallbackDisclosure}`);
  console.log(`No Misleading Live Price:          ${noMisleadingLivePrice}`);
  console.log(`No Raw Contract Hex Address:       ${noRawAddress}`);
  console.log(`No Technical Router Terms:         ${noRouterTerms}`);

  if (
    !hasSimpleHero ||
    !hasCompanyName ||
    !hasTicker ||
    !hasSavingsLine ||
    !hasBuyButton ||
    !hasPlainWrapper ||
    !hasUpfrontFallbackDisclosure ||
    !noMisleadingLivePrice ||
    !noRawAddress ||
    !noRouterTerms
  ) {
    console.error('❌ FAIL: Simple Mode failed compliance checks (found misleading live price, missing plain language, or missing card elements).');
    process.exit(1);
  }
  console.log('✅ PASS: Simple Mode renders approachable stock card with zero technical jargon and honest benchmark disclosure.\n');

  console.log('================================================================');
  console.log('   REACT UI DUAL-MODE VERIFICATION COMPLETED SUCCESSFULLY       ');
  console.log('================================================================');
}

verifyUiRendering().catch((err) => {
  console.error('UI verification error:', err);
  process.exit(1);
});
