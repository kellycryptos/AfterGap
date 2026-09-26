# AfterGap

> Same stock, dual wrappers, live gap.

Compare the same US stock name across **bStocks** and **Ondo** on BNB Smart Chain mainnet (`binanceChainId=56`), show the cash-hours vs overnight reference gap, and route the best live spot quote in plain English.

Built for **BNB Hack: Tokenized Stocks Edition** with **Binance Web3 Wallet**.

---

## Required Hackathon Links

- **Submit / Registration Form:** [https://forms.gle/NEmy3FxYc4f5Dua47](https://forms.gle/NEmy3FxYc4f5Dua47)
- **Binance Web3 Developer Portal:** [https://web3.binance.com/en/dev-portal](https://web3.binance.com/en/dev-portal)
- **GitHub Repository:** [https://github.com/kellycryptos/AfterGap](https://github.com/kellycryptos/AfterGap)

---

## Token Wrapper Architecture on BNB Smart Chain (`binanceChainId=56`)

| Wrapper | Suffix | Trading API Type | Execution Mode | Backing & Price Mechanics | RWA Data Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **bStocks** | `B` (e.g. `NVDAB`) | `3` | Mixed `SWAP` (LiquidMesh) + `RFQ` (PcsXRfq) | 1:1 backed, rebase for dividends | Supported (`platformId=bstock`) |
| **Ondo** | `on` (e.g. `NVDAon`) | `1` | `RFQ` (Always quote $\to$ swap $\to$ typedData $\to$ submit) | Total-return tracker, can drift from cash | Supported (`platformId=ondo`) |

> **Note on Protocol Scope:** The hackathon rules require featuring at least one of bStocks, Ondo, or xStocks. During DEVEX discovery, **xStocks** was found to be 100% absent from the Binance Web3 Market RWA Data catalog (`/rwa/platforms`) and lacks active spot liquidity on BSC mainnet. AfterGap focuses exclusively on the two verified, fully operational protocols: **bStocks** and **Ondo**.

---

## Monorepo Structure

```text
AfterGap/
├── apps/
│   └── web/                 # Next.js 15 App Router frontend & server-side API proxy
│       ├── app/
│       │   ├── api/rwa/     # Secure route handler executing signed calls
│       │   ├── page.tsx     # AfterGap ticker inspection & Thematic Baskets visualizer
│       │   ├── layout.tsx
│       │   └── globals.css
├── packages/
│   ├── api/                 # Cryptographic signer & typed Binance Web3 RWA client
│   │   ├── src/
│   │   │   ├── signer.ts    # HMAC-SHA256 Base64 signer with /build prefix enforcement
│   │   │   ├── signer.test.ts # Automated test vectors for signature validation
│   │   │   ├── client.ts    # BinanceRwaClient implementation
│   │   │   └── types.ts     # Strong TypeScript definitions
│   └── agent/               # Autonomous Agentic Wallet Skill & MCP Server
│       ├── src/
│       │   ├── tools.ts     # Gap inspection, best route quoting & basket analysis
│       │   ├── server.ts    # Model Context Protocol (MCP) JSON-RPC 2.0 stdio server
│       │   ├── cli.ts       # Interactive command-line test runner
│       │   └── skill.json   # Binance Skills Hub manifest (BSC Chain 56)
│       └── README.md
├── docs/
│   └── DEVEX.md             # Developer Experience Report (first-call logs, wire dumps)
├── .env.example             # Required environment variables
└── README.md
```

---

## 🤖 Autonomous AI Agent & MCP Skill

AfterGap includes a fully autonomous **Model Context Protocol (MCP)** server and **Binance Wallet Skill** for AI execution layers (Cursor, Claude Code, BNB Agent Studio):

```bash
# 1. Inspect stock price gap and best wrapper
npx tsx packages/agent/src/cli.ts inspect NVDA

# 2. Scan an entire thematic basket ranked by arbitrage spread
npx tsx packages/agent/src/cli.ts basket mag7
npx tsx packages/agent/src/cli.ts basket ai_semis

# 3. Request executable spot quote for best route
npx tsx packages/agent/src/cli.ts quote NVDA 10

# 4. Perform gasless BSC eth_call simulation
npx tsx packages/agent/src/cli.ts simulate NVDA 10
```

---

## Getting Started

### 1. Prerequisites
- Node.js >= 20 (Node.js v22.14.0 recommended)
- npm >= 10

### 2. Installation
Install dependencies across the monorepo:
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your credentials obtained from [Binance Web3 Developer Portal](https://web3.binance.com/en/dev-portal):
```env
BINANCE_WEB3_API_KEY=your_api_key_here
BINANCE_WEB3_API_SECRET=your_secret_key_here
WALLET_ADDRESS=0x0000000000000000000000000000000000000000
BSC_RPC=https://bsc-dataseed.binance.org/
```

### 4. Verify Cryptographic Signer
Run the automated test vectors to confirm canonical `/build` pathing and HMAC-SHA256 Base64 calculation:
```bash
npx tsx packages/api/src/signer.test.ts
```

### 5. Run the Local Development Server
Start the Next.js frontend:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Developer Experience Report
For detailed breakdown of API behavior, latency, authentication codes (such as `40102` signature checks), and `/rwa/platforms` catalog findings, see [`docs/DEVEX.md`](./docs/DEVEX.md).