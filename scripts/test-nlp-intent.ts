import { parseNaturalLanguageIntent, AfterGapAgentTools } from '../packages/agent/src/index';

async function runTests() {
  console.log('=================================================================');
  console.log('🧪 AfterGap Natural Language Intent Parsing & Agent Tool Test');
  console.log('   (Offline / Simulation Mode - NO REAL SWAP EXECUTED)');
  console.log('=================================================================\n');

  const testCases = [
    {
      label: 'Sample 1: Clear Buy (Target Ticker, Amount, Wrapper Preference)',
      input: 'buy $25 of the cheapest NVDA wrapper',
    },
    {
      label: 'Sample 2: Basket Comparison (Thematic Basket Arb)',
      input: 'compare the mag7 basket',
    },
    {
      label: 'Sample 3: Ambiguous Command (Unclear Action / Missing Target)',
      input: 'do something with stocks',
    },
    {
      label: 'Sample 4: Malformed Command (Unrecognized Gibberish)',
      input: 'asdfghjk 123',
    },
    {
      label: 'Sample 5: Missing Ticker Error Guard (Action without Symbol)',
      input: 'buy stocks',
    },
    {
      label: 'Sample 6: Clean Sell Command (Direction, Share Amount, Ticker)',
      input: 'sell 0.0218 NVDAB',
    },
  ];

  const agent = new AfterGapAgentTools();

  for (let i = 0; i < testCases.length; i++) {
    const { label, input } = testCases[i];
    console.log(`─────────────────────────────────────────────────────────────────`);
    console.log(`Test [${i + 1}/${testCases.length}]: ${label}`);
    console.log(`Input: "${input}"`);

    // 1. Raw parser output
    const parsed = parseNaturalLanguageIntent(input);
    console.log(`\n1. Structured Intent Parsing:`);
    if (parsed.success) {
      console.log(`   Status:       SUCCESS ✅`);
      console.log(`   Action:       ${parsed.action}`);
      if (parsed.ticker) console.log(`   Ticker:       ${parsed.ticker}`);
      if (parsed.explicitWrapperSymbol) console.log(`   Explicit Token: ${parsed.explicitWrapperSymbol}`);
      if (parsed.amountUsdt !== undefined) console.log(`   Amount USDT:  $${parsed.amountUsdt}`);
      if (parsed.amountShares !== undefined) console.log(`   Shares:       ${parsed.amountShares}`);
      if (parsed.basketKey) console.log(`   Basket:       ${parsed.basketKey}`);
      if (parsed.targetWrapperPreference) console.log(`   Preference:   ${parsed.targetWrapperPreference}`);
      console.log(`   Explanation:  ${parsed.explanation}`);
    } else {
      console.log(`   Status:       REJECTED / FAILED ❌`);
      console.log(`   Reason:       ${parsed.reason}`);
      console.log(`   Error:        ${parsed.error}`);
      console.log(`   Suggestions:  ${parsed.suggestedExamples.join(' | ')}`);
    }

    // 2. High-level agent tool output (if parsed successfully)
    if (parsed.success) {
      console.log(`\n2. Agent Tool Resolution (Reusing packages/agent/src/tools.ts):`);
      try {
        const agentResult = await agent.processNaturalLanguage(input);
        if (agentResult.success) {
          console.log(`   Summary:      "${agentResult.plainLanguageReason}"`);
          if (agentResult.selectedWrapper) {
            console.log(`   Target Token: ${agentResult.selectedWrapper.symbol} (${agentResult.selectedWrapper.contractAddress})`);
            console.log(`   Unit Price:   $${agentResult.selectedWrapper.price.toFixed(2)}`);
          }
          if (agentResult.gapResult) {
            console.log(`   Cash Ref:     $${agentResult.gapResult.cashReferencePrice.toFixed(2)}`);
            if (parsed.action === 'BUY' || parsed.action === 'COMPARE') {
              console.log(`   Savings:      +$${agentResult.gapResult.directSavingsUsdt.toFixed(2)} (${agentResult.gapResult.directSavingsPercent.toFixed(2)}%)`);
            }
          }
          if (agentResult.basketResult) {
            console.log(`   Top Pick:     ${agentResult.basketResult.topArbitrageOpportunity.ticker} (Saves $${agentResult.basketResult.topArbitrageOpportunity.savingsUsdt.toFixed(2)} via ${agentResult.basketResult.topArbitrageOpportunity.cheapestWrapper})`);
          }
        }
      } catch (err: any) {
        console.log(`   Tool Execution Error: ${err.message}`);
      }
    }

    console.log('');
  }

  console.log('=================================================================');
  console.log('✅ All Parsing & Ambiguity Guard Tests Complete.');
  console.log('=================================================================');
}

runTests().catch(console.error);
