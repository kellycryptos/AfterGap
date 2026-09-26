import { AfterGapAgentTools } from './tools.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'inspect';
  const param = args[1] || 'NVDA';
  const amount = args[2] ? Number(args[2]) : 10;

  const agent = new AfterGapAgentTools();

  console.log(`\n🤖 AfterGap Autonomous Agent CLI (BSC Chain 56)`);
  console.log(`─────────────────────────────────────────────────────`);

  if (command === 'inspect') {
    console.log(`🔍 Inspecting price gap for ticker: ${param.toUpperCase()}...`);
    const result = await agent.inspectStockGap(param);
    console.log(`\n💡 Best Route: ${result.recommendedAction}`);
    console.log(`\nConstituents across wrappers:`);
    for (const t of result.tokens) {
      console.log(`  • ${t.tokenSymbol.padEnd(8)} (${t.platformId}): $${t.onChainPrice.toFixed(2)} | Ref: $${t.referencePrice.toFixed(2)} | Status: ${t.marketStatus}`);
    }
    console.log(`\nSpread Analysis:`);
    console.log(`  • Cheapest Wrapper: ${result.cheapestWrapper.symbol} ($${result.cheapestWrapper.price.toFixed(2)})`);
    if (result.otherWrapper) {
      console.log(`  • Direct Savings:   +$${result.directSavingsUsdt.toFixed(2)} (${result.directSavingsPercent.toFixed(2)}%)`);
    }
    console.log(`  • Spread to Cash:   ${result.spreadToCashPercent > 0 ? '+' : ''}${result.spreadToCashPercent}%`);
    return;
  }

  if (command === 'basket') {
    console.log(`📊 Scanning Thematic Basket: [${param.toUpperCase()}]...`);
    const basket = await agent.scanThematicBasket(param);
    console.log(`\n${basket.basketName}`);
    console.log(`${basket.description}\n`);
    console.log(`Constituents ranked by arbitrage savings:`);
    for (const c of basket.constituents) {
      console.log(`  ${c.ticker.padEnd(6)} -> Buy ${c.cheapestWrapper.padEnd(8)} at $${c.price.toFixed(2)} (Saves $${c.directSavingsUsdt.toFixed(2)} | Spread: ${c.spreadToCashPercent > 0 ? '+' : ''}${c.spreadToCashPercent}%)`);
    }
    console.log(`\n🏆 Top Arbitrage Opportunity: ${basket.topArbitrageOpportunity.ticker} (Saves $${basket.topArbitrageOpportunity.savingsUsdt.toFixed(2)} via ${basket.topArbitrageOpportunity.cheapestWrapper})`);
    console.log(`Average Basket Spread: ${basket.averageSpreadToCashPercent}%`);
    return;
  }

  if (command === 'quote') {
    console.log(`⚡ Quoting best execution route for $${amount} USDT -> ${param.toUpperCase()}...`);
    const quote = await agent.quoteBestRoute(param, amount);
    console.log(`\n✅ Quote Generated:`);
    console.log(`  • Quote ID:         ${quote.quoteId}`);
    console.log(`  • Target Wrapper:   ${quote.targetWrapper} (${quote.contractAddress})`);
    console.log(`  • Venue / Mode:     ${quote.vendorName} (${quote.executionMode})`);
    console.log(`  • Input Amount:     ${quote.fromAmountUsdt} USDT`);
    console.log(`  • Expected Receive: ${quote.estimatedReceiveUnits} ${quote.targetWrapper}`);
    console.log(`  • Unit Price:       $${quote.unitPrice}`);
    console.log(`  • TTL Remaining:    ${quote.ttlSeconds}s`);
    return;
  }

  if (command === 'simulate') {
    console.log(`🧪 Quoting and simulating execution on BSC mainnet...`);
    const quote = await agent.quoteBestRoute(param, amount);
    const sim = await agent.simulateSwap(quote.quoteId, quote.contractAddress, amount);
    console.log(`\n✅ On-Chain eth_call Simulation:`);
    console.log(`  • Target Contract:   ${sim.toTokenAddress}`);
    console.log(`  • Simulation Status: ${sim.simulationStatus.toUpperCase()}`);
    console.log(`  • Gas Estimated:     ${sim.gasUsed} gas`);
    console.log(`  • Verified on BSC:   ${sim.verifiedOnBsc ? 'Yes (dataseed mainnet)' : 'No'}`);
    return;
  }

  console.log(`Usage:`);
  console.log(`  npx tsx packages/agent/src/cli.ts inspect <TICKER>`);
  console.log(`  npx tsx packages/agent/src/cli.ts basket <mag7|ai_semis|buffett>`);
  console.log(`  npx tsx packages/agent/src/cli.ts quote <TICKER> [USDT_AMOUNT]`);
  console.log(`  npx tsx packages/agent/src/cli.ts simulate <TICKER> [USDT_AMOUNT]`);
}

main().catch(console.error);
