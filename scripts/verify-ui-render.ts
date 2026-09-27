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

  // By default, before live API fetch returns in useEffect, initial benchmark state is rendered:
  const hasFallbackBadge = html.includes('Estimated price — live feed unavailable from this region');
  const hasFallbackText = html.includes('Binance Web3 API CloudFront 40304 compliance restriction active');
  const hasBstocksFallback = html.includes('data-testid="bstocks-fallback-badge"');
  const hasOndoFallback = html.includes('data-testid="ondo-fallback-badge"');
  const hasSmartRouteFallback = html.includes('data-testid="smart-route-fallback-badge"');

  console.log(`Fallback Banner in HTML: ${hasFallbackBadge}`);
  console.log(`40304 Disclosure Explanation in HTML: ${hasFallbackText}`);
  console.log(`bStocks Fallback Badge: ${hasBstocksFallback}`);
  console.log(`Ondo Fallback Badge: ${hasOndoFallback}`);
  console.log(`Smart Route Fallback Badge: ${hasSmartRouteFallback}`);

  if (hasFallbackBadge && hasBstocksFallback && hasOndoFallback && hasSmartRouteFallback) {
    console.log('\n✅ PASS: Fallback disclosure banners render cleanly on BOTH bStocks and Ondo cards, and Smart Route header.');
  } else {
    console.error('❌ FAIL: Expected fallback disclosure banners in rendered markup.');
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
