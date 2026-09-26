# @aftergap/agent

> AfterGap Autonomous Agentic Wallet Skill & Model Context Protocol (MCP) Server for Tokenized Stock Arbitrage on BNB Smart Chain (`binanceChainId=56`).

Built for **BNB Hack: Tokenized Stocks Edition** competing for:
- **Best Use of Agentic Wallet / Wallet Skills ($2,000 Special Prize)**
- **Best Use of BNB Agent Studio ($2,000 Special Prize)**

---

## 🌟 What This Skill Does

This package exposes AfterGap's cross-wrapper arbitrage engine directly to autonomous AI agents:
1. **`inspect_gap`**: Scans live prices across **bStocks** and **Ondo** against Friday 4:00 PM US cash reference prices, computing basis spreads and direct dollar savings.
2. **`quote_best_route`**: Fetches signed executable spot quotes via Binance Web3 Trading API (LiquidMesh RFQ).
3. **`simulate_swap`**: Executes gasless `eth_call` dry-runs on BNB Smart Chain mainnet to verify calldata before broadcast.
4. **`scan_thematic_basket`**: Scans entire baskets (`mag7`, `ai_semis`, `buffett`) and ranks constituents by largest arbitrage spread.

---

## 🚀 Quickstart & Interactive CLI

Run directly via `npx` or `tsx`:

```bash
# 1. Inspect price gap for any stock ticker
npx tsx packages/agent/src/cli.ts inspect NVDA
npx tsx packages/agent/src/cli.ts inspect TSLA

# 2. Scan an entire thematic basket
npx tsx packages/agent/src/cli.ts basket mag7
npx tsx packages/agent/src/cli.ts basket ai_semis

# 3. Get executable spot quote for best wrapper
npx tsx packages/agent/src/cli.ts quote NVDA 10

# 4. Perform on-chain dry-run simulation
npx tsx packages/agent/src/cli.ts simulate NVDA 10
```

---

## 🤖 Using as an MCP Server (Cursor / Claude Code / BNB Agent Studio)

Add the AfterGap MCP server to your `claude_desktop_config.json` or Cursor settings:

```json
{
  "mcpServers": {
    "aftergap": {
      "command": "npx",
      "args": ["tsx", "packages/agent/src/server.ts"]
    }
  }
}
```

Now, you can ask your AI Agent in plain English:
> *"Scan the Magnificent 7 basket on BNB Smart Chain and find the tokenized stock with the largest weekend price gap. Then get a quote for $50 USDT into the cheapest wrapper."*

The agent will automatically:
1. Call `scan_thematic_basket({ basket: "mag7" })`
2. Identify the top spread (e.g. `META` / `METAB`)
3. Call `quote_best_route({ ticker: "META", amountUsdt: 50 })`
4. Return the executable quote and direct savings!

---

## 📦 Binance Skills Hub Integration

In accordance with the Binance Agentic Wallet developer standard:
- Manifest: [`skill.json`](./src/skill.json)
- Chain ID: `56` (BNB Smart Chain)
- Compatible with: `npx skills add binance/binance-skills-hub`
