# AfterGap

> Same stock, dual wrappers, live gap.

Real-time dual-wrapper US stock price comparison, reference gap analysis, best-execution routing, and **natural-language trade execution** across **bStocks** and **Ondo** on BNB Smart Chain (`binanceChainId=56`).

**Live Production App:** [https://www.aftergap.xyz/](https://www.aftergap.xyz/)  
**Official X / Twitter:** [@aftergap](https://x.com/aftergap)  
**Track:** BNB Hack: Tokenized Stocks Edition (Chain ID: 56)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Network: BNB Smart Chain](https://img.shields.io/badge/Network-BNB%20Smart%20Chain%20(56)-F3BA2F.svg)](https://bscscan.com)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.1-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![X (Twitter)](https://img.shields.io/badge/X-@aftergap-000000?style=flat&logo=x&logoColor=white)](https://x.com/aftergap)

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
- The two wrappers **drift against each other**, opening significant basis spreads for the exact same underlying company.
- A trader wanting to buy $1,000 of Apple or Nvidia on BNB Smart Chain often overpays simply because there was no unified terminal comparing both wrappers and routing into the best executable quote.

**AfterGap solves this.**

---

## What We Built

AfterGap is an end-to-end arbitrage terminal, smart order routing engine, **natural-language execution layer**, and **simple-mode retail UI** for tokenized stocks on BNB Smart Chain.

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                        AFTERGAP                                          │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌────────────────────────┐  ┌──────────────────────┐  ┌──────────────────────────────┐  │
│  │  Simple Mode (Retail)  │  │  Pro Mode (Terminal) │  │  AI Agent / MCP Server       │  │
│  │  9-stock catalog grid  │  │  Dual-wrapper cards  │  │  (@aftergap/agent)           │  │
│  │  Plain-language UI     │  │  Thematic baskets    │  │                              │  │
│  │  No crypto jargon      │  │  Live gap analytics  │◄►│  • NL Intent Parser          │  │
│  │  Best-wrapper auto-    │  │  On-chain calldata   │  │  • inspect_gap tool          │  │
│  │  selected per stock    │  │  disclosure badges   │  │  • scan_thematic_basket tool │  │
│  └────────────────────────┘  └──────────────────────┘  │  • quote_best_route tool     │  │
│            ▲                          ▲                 │  • simulate_swap tool        │  │
│            └──────────────────────────┘                 └──────────────────────────────┘  │
│                    │ Natural-Language Execution Bar                   │                   │
│         "buy $25 of the cheapest NVDA wrapper"  ──► intent parser ──► agent tools         │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                               │                    │
              ┌────────────────▼────────────────────▼──────────────────┐
              │    BNB Smart Chain (Chain ID: 56) & Binance Web3 API    │
              │   bStocks (LiquidMesh/PcsXRfq)  •  Ondo (RFQ)          │
              └────────────────────────────────────────────────────────┘
```

### Binance Web3 API Modules & Tools Utilized

AfterGap deeply integrates **5 core Binance Web3 API modules** on BNB Smart Chain (`binanceChainId: 56`):

| Binance Web3 Module | Endpoints & Interface | Role in AfterGap |
| :--- | :--- | :--- |
| **Trading API** | `GET /build/api/v1/dex/aggregator/quote`<br>`GET /build/api/v1/dex/aggregator/swap` | Powers real-time DEX Aggregator RFQ quotes and calldata construction for Binance's LiquidMesh router. Verified live on BSC mainnet: [0x4933433f...](https://bscscan.com/tx/0x4933433f5b1991bc319775faef8cd2a9b5186bed1261d4f9b58cc980fce52444). |
| **RWA Data API** | `GET /build/api/v1/dex/market/rwa/platforms`<br>`GET /build/api/v1/dex/market/rwa/tokens`<br>`GET /build/api/v1/dex/market/rwa/search` | Discovers and indexes bStocks & Ondo token catalogs, metadata, underlying ticker mapping, and market hours status. |
| **Market API** | `/build/api/v1/dex/market/rwa/*` | Real-time RWA pricing, NYSE/NASDAQ cash-hours benchmark reference data, and off-market basis drift tracking. |
| **Wallet API** | `GET /build/api/v1/dex/balance/all-token-balances-by-address` | Fetches multi-token balances across non-custodial Web3 user wallets for USDT, NVDAB, and other equity wrappers. |
| **Agent Tools** | `@aftergap/agent` MCP Server & CLI | Standalone Model Context Protocol (MCP) server for autonomous arbitrage inspection, thematic basket execution, and gasless `eth_call` simulation. |

---

### 1. Simple Mode — Retail-Friendly Stock Catalog

A clean, jargon-free entry point for users who just want to buy a US stock on BNB Chain.

- **9-Stock Catalog Grid:** NVDA, TSLA, AAPL, MSFT, AMZN, GOOGL, META, AMD, TSM — one card per company, displayed in a responsive 1→2→3 column grid.
- **Auto Best-Wrapper Selection:** Each card independently compares bStock vs. Ondo prices and pre-selects the cheaper wrapper — no user configuration required.
- **Zero Crypto Jargon:** No contract addresses, no router names, no calldata, no RFQ/LiquidMesh terminology. Plain English: company name, price, savings line, one `Buy [TICKER]` button.
- **Plain-Language Dividend Explanation:** Each card explains wrapper mechanics in a single human-readable sentence (e.g. "NVDAB gets dividends added as extra shares").
- **Upfront Fallback Disclosure:** When live pricing is unavailable, cards show "Estimated Price / Reference price, updates delayed" *before* any interaction — not as a surprise after a failed click.
- **Quick-Amount Pills:** $10 / $25 / $50 / $100 pre-fill buttons for instant quote refresh.

### 2. Natural-Language Execution Bar

Type a plain-English command; AfterGap parses it into a structured intent and routes it through the same agent tools the CLI uses.

```
"buy $25 of the cheapest NVDA wrapper"      → BUY · NVDA · $25 · cheapest
"compare the mag7 basket"                    → BASKET_SCAN · mag7
"sell 0.0218 NVDAB"                          → SELL · NVDA · NVDAB explicit
"buy stocks"                                 → REJECTED (ambiguous — no ticker)
```

- **Intent Parser** (`packages/agent/src/parser.ts`): Extracts action (BUY/SELL/COMPARE/BASKET_SCAN), ticker, explicit wrapper token (NVDAB → bstock, NVDAon → ondo), and USD or share amount.
- **Explicit Wrapper Preservation:** If a user names `NVDAB` specifically, the parser preserves that preference instead of overriding it with "cheapest."
- **Ambiguity Guards:** Rejects underspecified commands with actionable suggestions rather than guessing with real funds.
- **Sell Direction Rationale:** SELL commands produce bid-price reasoning ("current on-chain bid of $229.11/share"), not buy-comparison output.
- **Fail-Closed Sell Lock:** Sell execution is locked pending live end-to-end verification — the guard lives inside `handleApproveAndExecute` (not just the UI layer), so it fires regardless of entry point.

### 3. Pro Mode — Institutional Terminal (unchanged)

The full dual-wrapper analytics terminal, toggled on via the Simple / Pro pill in the header.

- **Live Side-by-Side Analytics:** Simultaneously tracks both wrappers alongside the official NYSE/NASDAQ cash-hours close.
- **Basis Spread & Dollar Savings:** Computes exact percentage basis spread and cash dollar difference per share.
- **Thematic Baskets:** Pre-configured clusters (**Mag 7**, **AI & Semiconductors**, **Buffett / Value**, **Liquid Growth**) ranked in real time by basis spread.
- **On-Chain Calldata Inspection:** Full unsigned EVM calldata viewer before any wallet signing.
- **Benchmark Reference Pricing Disclosure:** Prominent banner when live Binance feed is unavailable (40304 datacenter restriction), showing reference prices rather than live quotes.

### 4. Intelligent Smart Order Routing & Real-Time Execution

- **Binance Web3 Trading API Integration:** Direct connectivity with `/dex/aggregator/quote` and `/dex/aggregator/swap`.
- **Secure Server-Side Architecture:** API credentials are held server-side, signed via HMAC-SHA256, and never exposed to the browser.
- **Verified LiquidMesh Protocol Routing:** Trades execute through Binance's LiquidMesh router (`0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5`, selector `0xad43f73d`).
- **Absolute Trade Safety Invariant:** Zero fallback token swaps. All trades execute into the requested equity wrapper or abort cleanly.
- **Live Quote TTL Engine:** 30-second TTL countdown with auto-refresh to prevent stale quote execution.
- **Two-Step On-Chain Execution:** Least-privilege USDT approval + atomic swap with real-time state feedback and BSCScan links.

### 5. Cryptographic API Client & Signer (`@aftergap/api`)

- Enterprise TypeScript client for Binance Web3 Developer APIs.
- Strict canonical request pre-hashing and HMAC-SHA256 Base64 signing.
- Built-in DNS-over-HTTPS (DoH) and verified CloudFront edge routing.
- Fully unit tested with cryptographic test vectors, dynamic disclosure verification, and live mainnet RFQ validation.

### 6. Autonomous AI Agent & Model Context Protocol (MCP) Server (`@aftergap/agent`)

- Standardized **Model Context Protocol (MCP)** server over stdio compatible with Cursor, Claude Code, and autonomous AI agents.
- Custom `skill.json` manifest targeting BNB Smart Chain (`binanceChainId: 56`).
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
| **Ondo** | `on` (e.g. `NVDAon`) | `1` | `RFQ` (Always quote → swap → typedData → submit) | Total-return tracker, can drift from cash | Supported (`platformId=ondo`) |

> **Protocol Landscape Note:** While tokenized equity literature mentions bStocks, Ondo, and xStocks, ecosystem catalog verification confirms that **xStocks** is absent from the Binance Web3 Market RWA Data catalog (`/rwa/platforms`) and lacks active spot liquidity on BSC mainnet. AfterGap focuses exclusively on the two verified, fully operational protocols: **bStocks** and **Ondo**.

---

## 🏆 Live BSC Mainnet Execution Proof

AfterGap features 100% verified, real-world on-chain execution on BNB Smart Chain Mainnet (`Chain ID: 56`):

| Field | Mainnet Proof & On-Chain Record |
| :--- | :--- |
| **Transaction Hash** | [`0x4933433f5b1991bc319775faef8cd2a9b5186bed1261d4f9b58cc980fce52444`](https://bscscan.com/tx/0x4933433f5b1991bc319775faef8cd2a9b5186bed1261d4f9b58cc980fce52444) |
| **Status** | **Success (`0x1`)** ✅ |
| **Block Number** | `124870830` |
| **Network** | BNB Smart Chain Mainnet (`binanceChainId=56`) |
| **Interacted With (Router)** | LiquidMesh Router [`0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5`](https://bscscan.com/address/0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5) |
| **Method Called** | `0xad43f73d` |
| **Input Amount** | **$5.00 USDT** (`5.000000000000000000`) |
| **Output Received** | **`0.021835450815514278 NVDAB`** (~$5.00 NVIDIA Corp tokenized stock wrapper) |
| **User Signer Wallet** | [`0x0478047BB937E4e292275c6d09b997deb72D759d`](https://bscscan.com/address/0x0478047bb937e4e292275c6d09b997deb72d759d) |
| **Transaction Fee** | `0.0000235275157 BNB` (~**$0.02 USD**) |

---

## Monorepo Structure

```text
AfterGap/
├── apps/
│   └── web/                 # Next.js 15 App Router frontend & server-side API proxy
│       ├── app/
│       │   ├── api/rwa/     # Secure server route executing authenticated Binance Web3 calls
│       │   ├── page.tsx     # Simple Mode catalog + Pro Mode terminal + NL execution bar
│       │   ├── layout.tsx   # Root metadata and font configuration
│       │   └── globals.css  # Dark terminal theme and styling
├── packages/
│   ├── api/                 # Cryptographic signer & typed Binance Web3 RWA client SDK
│   │   ├── src/
│   │   │   ├── signer.ts    # HMAC-SHA256 Base64 signer with /build prefix enforcement
│   │   │   ├── signer.test.ts # Automated test vectors for signature validation
│   │   │   ├── client.ts    # BinanceRwaClient implementation (RWA, Trading, Balances)
│   │   │   └── types.ts     # Complete TypeScript interfaces for Binance Web3 APIs
│   └── agent/               # AI Agent, NL Intent Parser & MCP Server
│       ├── src/
│       │   ├── parser.ts    # Natural-language intent parser (BUY/SELL/COMPARE/BASKET_SCAN)
│       │   ├── tools.ts     # Arbitrage inspection, best-route quoting & basket ranking
│       │   ├── server.ts    # Model Context Protocol (MCP) JSON-RPC 2.0 stdio server
│       │   ├── cli.ts       # Interactive command-line test runner
│       │   └── skill.json   # Agent skill manifest (BSC Chain 56)
│       └── README.md
├── scripts/
│   ├── verify-disclosure.ts # Dynamic fallback pricing disclosure test suite (4 tests)
│   ├── verify-ui-render.ts  # React SSR dual-mode UI compliance tests (8 assertions)
│   └── test-nlp-intent.ts   # NL intent parser & ambiguity guard tests (6 tests)
├── docs/
│   └── DEVEX.md             # Developer Experience & Engineering Report
├── .env.example             # Environment variable template
└── README.md
```

---

## 🤖 AI Agent & MCP Integration

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

```bash
# Inspect price gap and identify cheapest wrapper for any ticker
npx tsx packages/agent/src/cli.ts inspect NVDA

# Scan and rank thematic baskets by arbitrage spread
npx tsx packages/agent/src/cli.ts basket mag7
npx tsx packages/agent/src/cli.ts basket ai_semis

# Request executable spot quote for the best wrapper
npx tsx packages/agent/src/cli.ts quote NVDA 10

# Perform gasless BSC eth_call simulation
npx tsx packages/agent/src/cli.ts simulate NVDA 10
```

### Natural-Language Command Bar (Web App)

Type directly into the command bar in the web app:

```
"buy $25 of the cheapest NVDA wrapper"
"compare the mag7 basket"
"buy $50 TSLA"
"sell 0.0218 NVDAB"
```

The parser extracts a structured intent and routes it through the same `@aftergap/agent` tools used by the CLI and MCP server.

---

## Getting Started

### 1. Prerequisites
- **Node.js**: `>= 20` (Node.js v22 recommended)
- **npm**: `>= 10`

### 2. Installation
```bash
npm install
```

### 3. Environment Configuration
```bash
cp .env.example .env.local
```

```env
BINANCE_WEB3_API_KEY=your_api_key_here
BINANCE_WEB3_API_SECRET=your_secret_key_here
WALLET_ADDRESS=0x0000000000000000000000000000000000000000
BSC_RPC=https://bsc-dataseed.binance.org/
```

### 4. Run the Test Suite

```bash
# Cryptographic HMAC-SHA256 signer test vectors
npm run test:signer

# Dynamic fallback pricing & React UI disclosure tests (Pro + Simple Mode)
npm run test:disclosure

# NL intent parser & ambiguity guard tests (6 scenarios)
npx tsx scripts/test-nlp-intent.ts

# Live mainnet RFQ quote & swap route validation (BSC Chain 56)
npm run test:live
```

### 5. Launch the Web Application
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The app launches in **Simple Mode** by default — click **Pro** in the header to switch to the full terminal.

---

## Technical Report & Documentation
For a deep dive into API latency profiles, authentication specifications, gateway behavior, and the full engineering log, see [`docs/DEVEX.md`](./docs/DEVEX.md).

---

## Disclaimer

AfterGap is an experimental project built for the BNB Hack: Tokenized Stocks Edition hackathon. It is not financial advice. Tokenized RWA trading involves smart contract risk, liquidity risk, and off-market pricing risk. Sell execution is currently locked pending live end-to-end verification. Never invest more than you can afford to lose.