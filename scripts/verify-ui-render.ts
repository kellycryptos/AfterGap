import React from 'react';
import { renderToString } from 'react-dom/server';
import Home from '../apps/web/app/page';

async function verifyUiRendering() {
  console.log('================================================================');
  console.log('   AFTERGAP REACT UI DYNAMIC BADGE RENDERING VERIFICATION       ');
  console.log('================================================================\n');

  // Verify that Home component can be evaluated and server-rendered
  const html = renderToString(React.createElement(Home));

  console.log('Rendered length:', html.length, 'bytes');

  // Verify benchmark pricing disclosures and verified on-chain badges:
  const hasBenchmarkTitle = html.includes('Benchmark Reference Pricing');
  const hasDatacenter40304Text = html.includes('Binance Web3 Gateway restricts serverless datacenter IPs (40304)');
  const hasBstocksFallback = html.includes('data-testid="bstocks-fallback-badge"');
  const hasOndoFallback = html.includes('data-testid="ondo-fallback-badge"');
  const hasOnChainVerified = html.includes('On-Chain Verified');
  const noMisleadingLiveFeed = !html.includes('Live Binance Web3 Feed');

  console.log(`Benchmark Reference Pricing Title in HTML: ${hasBenchmarkTitle}`);
  console.log(`40304 Datacenter Disclosure Explanation in HTML: ${hasDatacenter40304Text}`);
  console.log(`bStocks Fallback Badge: ${hasBstocksFallback}`);
  console.log(`Ondo Fallback Badge: ${hasOndoFallback}`);
  console.log(`On-Chain Verified Badges Present: ${hasOnChainVerified}`);
  console.log(`Misleading "Live Binance Web3 Feed" Removed: ${noMisleadingLiveFeed}`);

  if (
    hasBenchmarkTitle &&
    hasDatacenter40304Text &&
    hasBstocksFallback &&
    hasOndoFallback &&
    hasOnChainVerified &&
    noMisleadingLiveFeed
  ) {
    console.log('\n✅ PASS: Benchmark reference pricing disclosure banners render cleanly on BOTH bStocks and Ondo cards.');
    console.log('✅ PASS: Badges accurately point to On-Chain Verified contracts without misleading "Live" claims.');
  } else {
    console.error('❌ FAIL: Expected honest benchmark disclosures and on-chain verified status in rendered markup.');
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('   REACT UI DISCLOSURE VERIFICATION COMPLETED SUCCESSFULLY       ');
  console.log('================================================================');
}

verifyUiRendering().catch((err) => {
  console.error('UI verification error:', err);
  process.exit(1);
});
