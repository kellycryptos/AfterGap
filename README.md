# AfterGap

> Same stock, dual wrappers, live gap.

Real-time dual-wrapper US stock price comparison, reference gap analysis, and best-execution routing across **bStocks** and **Ondo** on BNB Smart Chain (`binanceChainId=56`).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Network: BNB Smart Chain](https://img.shields.io/badge/Network-BNB%20Smart%20Chain%20(56)-F3BA2F.svg)](https://bscscan.com)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.1-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

---

## The Problem: RWA Dual-Wrapper Fragmentation

Tokenized equities (Real World Assets / RWA) allow 24/7 global trading of US stocks on-chain. However, the ecosystem on BNB Smart Chain is fragmented across multiple competing token wrappers:

1. **bStocks** (e.g. `NVDAB`, `TSLAB`, `AAPLB`):
   - 1:1 backed tokenized equity shares that rebase to account for corporate actions and dividends.
   - Traded via DEX liquidity pools (LiquidMesh) and RFQ protocols (`PcsXRfq`).
2. **Ondo** (e.g. `NVDAon`, `TSLAon`, `AAPLon`):
   - Total-return trackers where dividends and yields accrue into the token's NAV, allowing price drift over time.
   - Traded strictly via RFQ order flows.

### The Pricing Dilemma: Weekend & After-Hours Drift
When traditional US equity markets (NYSE/NASDAQ) close at Friday 4:00 PM EST, on-chain RWA markets continue trading 24/7. During these off-market hours:
- On-chain tokens **drift from the official US cash reference price** (`referencePrice`).
- Crucially, the two wrappers **drift against each other**, opening significant basis spreads and price discrepancies for the exact same underlying company.
- A trader wanting to buy $1,000 of Apple or Nvidia on BNB Smart Chain often overpays simply because there was no unified terminal comparing both wrappers and routing into the best executable quote.

**AfterGap solves this.**

---

## What We Built

AfterGap is an end-to-end institutional-grade arbitrage terminal, smart order routing engine, and autonomous AI agent skill for tokenized stocks on BNB Smart Chain.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                       AFTERGAP                                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   ┌─────────────────────┐    ┌─────────────────────┐    ┌──────────────────────────┐   │
│   │   Web Terminal      │    │  Smart Routing &    │    │  Autonomous AI Agent     │   │
│   │   (Next.js 15 UI)   │    │  Cryptographic SDK  │    │  (MCP Server & Skill)    │   │
│   │                     │    │  (@aftergap/api)    │    │  (@aftergap/agent)       │   │
│   │  • Dual-Wrapper Gap │    │                     │    │                          │   │
│   │  • Thematic Baskets │◄──►│  • HMAC-SHA256 Auth │◄──►│  • Natural Language Chat │   │
│   │  • Wallet Connect   │    │  • Market RWA API   │    │  • Basket Scanning       │   │
│   │  • 1-Click Execute  │    │  • Trading Quote API│    │  • eth_call Simulation   │   │
│   └─────────────────────┘    └─────────────────────┘    └──────────────────────────┘   │
│              │                          │                            │                 │
└──────────────┼──────────────────────────┼────────────────────────────┼─────────────────┘
               ▼                          ▼                            ▼
  ┌──────────────────────────────────────────────────────────────────────────────────────┐
  │                 BNB Smart Chain (Chain ID: 56) & Binance Web3 Gateway                │
  │     • bStocks (LiquidMesh / PcsXRfq)          • Ondo Global Markets (RFQ)            │
  └──────────────────────────────────────────────────────────────────────────────────────┘
```

### 1. Real-Time Dual-Wrapper Comparison Engine
- **Live Side-by-Side Analytics:** Simultaneously tracks both wrappers (`bStock` vs. `Ondo`) alongside the official NYSE/NASDAQ cash-hours close.
- **Basis Spread & Dollar Savings:** Computes the exact percentage basis spread and cash dollar difference per share in real time.
- **Dynamic Best Route Identification:** Instantly highlights which wrapper is trading at a discount and computes total savings.
- **Thematic Baskets:** Pre-configured clusters (**Mag 7**, **AI & Semiconductors**, **Buffett / Value**, **Liquid Growth**) ranked in real time by basis spread to spot arbitrage opportunities across entire sectors at a glance.

### 2. Intelligent Smart Order Routing & Execution
- **Binance Web3 Trading API Integration:** Direct connectivity with `/dex/aggregator/quote` and `/dex/aggregator/swap` for executable quotes.
- **Live Quote TTL Engine:** Built-in 30-second TTL countdown with synchronized auto-refresh to prevent expired quote execution.
- **Native Web3 Wallet Execution:** EIP-1193 browser wallet connection (Binance Web3 Wallet & MetaMask) supporting auto-network switching to BSC Mainnet (`0x38` / `56`).
- **Two-Step On-Chain Execution:** Seamless in-browser token approval (`USDT` $\to$ spender) and atomic swap execution with real-time transaction state feedback and BscScan explorers.

### 3. Cryptographic API Client & Signer (`@aftergap/api`)
- Enterprise TypeScript client for Binance Web3 Developer APIs (Market RWA, Trading Aggregator, and Wallet Balances).
- Strict canonical request pre-hashing and HMAC-SHA256 Base64 signing.
- Built-in zero-downtime fallback profiles ensuring terminal continuity even during external gateway rate limits.
- Fully unit tested with cryptographic test vectors (`npx tsx packages/api/src/signer.test.ts`).

### 4. Autonomous AI Agent & Model Context Protocol (MCP) Server (`@aftergap/agent`)
- Standardized **Model Context Protocol (MCP)** server over stdio compatible with Cursor, Claude Code, and autonomous AI agents.
- **Binance Skills Hub** compliant manifest (`skill.json`) targeting BNB Smart Chain (`binanceChainId: 56`).
- 4 composable tools exposed to LLMs:
  - `inspect_gap`: Inspects price discrepancies, wrapper mechanics, and dollar savings for any equity ticker.
  - `scan_thematic_basket`: Scans entire thematic baskets and ranks constituents by arbitrage spread.
  - `quote_best_route`: Fetches signed executable spot quotes from the aggregator for the cheapest wrapper.
  - `simulate_swap`: Runs gasless `eth_call` simulations on BSC mainnet to verify calldata integrity before execution.

---

## Token Wrapper Architecture on BNB Smart Chain (`binanceChainId=56`)

| Wrapper | Suffix | Trading API Type | Execution Mode | Backing & Price Mechanics | RWA Data Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **bStocks** | `B` (e.g. `NVDAB`) | `3` | Mixed `SWAP` (LiquidMesh) + `RFQ` (PcsXRfq) | 1:1 backed, rebase for dividends | Supported (`platformId=bstock`) |
| **Ondo** | `on` (e.g. `NVDAon`) | `1` | `RFQ` (Always quote $\to$ swap $\to$ typedData $\to$ submit) | Total-return tracker, can drift from cash | Supported (`platformId=ondo`) |

> **Protocol Landscape Note:** While tokenized equity literature mentions bStocks, Ondo, and xStocks, ecosystem catalog verification confirms that **xStocks** is absent from the Binance Web3 Market RWA Data catalog (`/rwa/platforms`) and lacks active spot liquidity on BSC mainnet. AfterGap focuses exclusively on the two verified, fully operational protocols: **bStocks** and **Ondo**.

---

## Monorepo Structure

```text
AfterGap/
├── apps/
│   └── web/                 # Next.js 15 App Router frontend & server-side API proxy
│       ├── app/
│       │   ├── api/rwa/     # Secure server route executing authenticated Binance Web3 calls
│       │   ├── page.tsx     # Terminal UI: live tickers, dual-wrapper cards, baskets visualizer
│       │   ├── layout.tsx   # Root metadata and font configuration
│       │   └── globals.css  # Dark terminal theme and styling
├── packages/
│   ├── api/                 # Cryptographic signer & typed Binance Web3 RWA client SDK
│   │   ├── src/
│   │   │   ├── signer.ts    # HMAC-SHA256 Base64 signer with /build prefix enforcement
│   │   │   ├── signer.test.ts # Automated test vectors for signature validation
│   │   │   ├── client.ts    # BinanceRwaClient implementation (RWA, Trading, Balances)
│   │   │   └── types.ts     # Complete TypeScript interfaces for Binance Web3 APIs
│   └── agent/               # Autonomous Agentic Wallet Skill & MCP Server
│       ├── src/
│       │   ├── tools.ts     # Arbitrage inspection, best-route quoting & basket ranking
│       │   ├── server.ts    # Model Context Protocol (MCP) JSON-RPC 2.0 stdio server
│       │   ├── cli.ts       # Interactive command-line test runner
│       │   └── skill.json   # Binance Skills Hub manifest (BSC Chain 56)
│       └── README.md
├── docs/
│   └── DEVEX.md             # Developer Experience & Engineering Report
├── .env.example             # Environment variable template
└── README.md
```

---

## 🤖 Autonomous AI Agent & MCP Integration

AfterGap can be used directly as an MCP server by any LLM or AI agent (Cursor, Claude Code, BNB Agent Studio):

### Adding to Claude Desktop / Cursor
Add to your `claude_desktop_config.json` or Cursor MCP settings:

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

### CLI Command Runner
You can also run the agent tools interactively from the command line:

```bash
# 1. Inspect price gap and identify cheapest wrapper for any ticker
npx tsx packages/agent/src/cli.ts inspect NVDA

# 2. Scan and rank thematic baskets by arbitrage spread
npx tsx packages/agent/src/cli.ts basket mag7
npx tsx packages/agent/src/cli.ts basket ai_semis

# 3. Request executable spot quote for the best wrapper
npx tsx packages/agent/src/cli.ts quote NVDA 10

# 4. Perform gasless BSC eth_call simulation
npx tsx packages/agent/src/cli.ts simulate NVDA 10
```

---

## Getting Started

### 1. Prerequisites
- **Node.js**: `>= 20` (Node.js v22 recommended)
- **npm**: `>= 10`

### 2. Installation
Install dependencies across all workspaces:
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your environment variables:
```env
BINANCE_WEB3_API_KEY=your_api_key_here
BINANCE_WEB3_API_SECRET=your_secret_key_here
WALLET_ADDRESS=0x0000000000000000000000000000000000000000
BSC_RPC=https://bsc-dataseed.binance.org/
```

### 4. Verify Cryptographic Signer
Run the automated test vectors to confirm signature generation and path canonicalization:
```bash
npm run test:signer
```

### 5. Launch the Web Application
Start the local development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Technical Report & Documentation
For a deep dive into API latency profiles, authentication specifications, gateway behavior, and the full engineering log, see [`docs/DEVEX.md`](./docs/DEVEX.md).