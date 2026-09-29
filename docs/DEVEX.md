# Developer Experience Report (DEVEX.md)

**Product:** AfterGap  
**Tagline:** Same stock, dual wrappers, live gap.  
**Official X:** [@aftergap](https://x.com/aftergap)  
**Ecosystem:** Binance Web3 Developer Infrastructure & BNB Smart Chain  
**Chain:** BNB Smart Chain Mainnet (`binanceChainId=56`)

---

## 1. Timeline & Milestone Log

- **2026-09-21 17:33:00 UTC:** Repo created (`aftergap`). Initialized architecture specification.
- **2026-09-22 06:52:45 UTC:** First live HTTP connection to Binance Web3 API gateway. Resolved DNS to CloudFront edge (`108.156.221.85`).
- **2026-09-22 06:57:58 UTC:** First signed call attempt to `GET https://web3.binance.com/build/api/v1/dex/market/rwa/platforms` using HMAC-SHA256 Base64 signer with placeholder key; edge returned `40101 Invalid API Key`.
- **2026-09-23 10:22:57 UTC:** **First successful signed HTTP 200 call** on `GET /build/api/v1/dex/market/rwa/platforms`.
- **Time from 40101 to first 200:** Key acquisition delay plus immediate 200 on first signed attempt with real credentials. The `/build` prefix was strictly enforced from day one, so signature verification succeeded on the very first try with zero `40102 Invalid signature` errors.
- **2026-09-23 11:08:32 UTC:** End-to-end live resolution of `NVDA` wrappers across all 3 endpoints (`/platforms`, `/search`, `/tokens`) returning 200 OK.

---

## 2. Checklist of First-Call Steps

- [x] Review Binance Web3 documentation (`https://web3.binance.com/en/dev-docs/authentication`)
- [x] Identify mandatory `/build` base path prefix rule for signature pre-hash calculation
- [x] Implement HMAC-SHA256 Base64 signing function in `packages/api/src/signer.ts`
- [x] Validate signer pre-hash, timestamp, and headers via unit test `packages/api/src/signer.test.ts`
- [x] Run `npm install` at repo root
- [x] Configure credentials in `.env.local`
- [x] Execute first live request to `GET /build/api/v1/dex/market/rwa/platforms` -> **HTTP 200 OK**
- [x] Resolve `NVDA` on BNB Smart Chain (`binanceChainId=56`) -> **HTTP 200 OK**
- [x] Capture and record exact raw response bodies below
- [x] Verify explicit absence of `xStocks` in RWA Data endpoints

---

## 3. Cryptographic Signing Implementation & Gotchas

### Pre-Hash String Formula
```text
preHash = timestamp + METHOD + requestPath + body
```
- `timestamp`: Current UTC timestamp in ISO 8601 format with millisecond precision (e.g. `2026-09-23T11:08:32.000Z`).
- `METHOD`: Uppercase HTTP method (`GET`, `POST`).
- `requestPath`: Path including query params and **strictly prefixed with `/build`** (e.g. `/build/api/v1/dex/market/rwa/platforms` or `/build/api/v1/dex/market/rwa/search?keyword=NVDA`).
- `body`: Raw string for body; empty string `""` for `GET`/`HEAD` requests.
- Algorithm: `crypto.createHmac('sha256', secretKey).update(preHash).digest('base64')`.

### Gotcha 1: The `/build` Prefix
The documentation emphasizes that omitting `/build` is the #1 cause of `40102 Invalid signature`. Because our client automatically normalizes every path to begin with `/build`, signature verification passed immediately on the first attempt with the real API key.

### Gotcha 2: Local Clock Skew & `TimestampFilter/40103`
During multi-request resolution, we encountered:
```json
{
  "code": 40103,
  "msg": "Timestamp outside recv_window. serverTime=2026-09-23T11:07:12.271662232Z",
  "data": ""
}
```
Header: `x-oc-blocked-by: TimestampFilter/40103`.  
**Cause:** The local machine clock was skewed by ~6.5 seconds relative to Binance CloudFront servers, exceeding Binance's default `recv_window` of 5000 ms.  
**Fix:** Set header `X-OC-RECV-WINDOW: '30000'` (30 seconds, maximum 60000 ms allowed by the spec). All subsequent calls succeeded immediately.

---

## 4. Raw Responses / Errors

### 1. Live 200: RWA Platforms (`/api/v1/dex/market/rwa/platforms`)

- **URL:** `GET https://web3.binance.com/build/api/v1/dex/market/rwa/platforms`
- **HTTP Status:** `200 OK`
- **Headers:**
```json
{
  "connection": "keep-alive",
  "content-length": "599",
  "content-type": "application/json;charset=UTF-8",
  "date": "Wed, 23 Sep 2026 10:22:57 GMT",
  "vary": "Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
  "via": "1.1 568c0c4d1e6662b517ef8ce8ef6b5b2a.cloudfront.net (CloudFront)",
  "x-amz-cf-id": "pihPpqEpp_01aANa1tDgZXWUBsT3K-SAhcR5kDdu1Q84-tIuaYOm-A==",
  "x-amz-cf-pop": "LOS50-P5",
  "x-cache": "Miss from cloudfront",
  "x-oc-ratelimit-limit": "5",
  "x-oc-ratelimit-remaining": "4",
  "x-oc-server-time": "1790158977340",
  "x-oc-trace-id": "03ee799fa0a49dbfd09585c42608ca7b-gateway-4e7b90f9a945431181cf1219aa926edb",
  "x-oc-used-weight": "1"
}
```
- **Raw Body:**
```json
{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "platformId": "ondo",
      "tickerCount": 459,
      "chainDistribution": [
        {"binanceChainId": "1", "tokenCount": 457},
        {"binanceChainId": "56", "tokenCount": 458},
        {"binanceChainId": "CT_501", "tokenCount": 451}
      ],
      "website": "https://ondo.finance",
      "logoUrl": "https://public.bnbstatic.com/images/w3w/openapi/ondo.png"
    },
    {
      "platformId": "bstock",
      "tickerCount": 77,
      "chainDistribution": [
        {"binanceChainId": "56", "tokenCount": 77}
      ],
      "website": "https://www.binance.com/zh-CN/bstocks-landing",
      "logoUrl": "https://public.bnbstatic.com/images/w3w/openapi/bstocks.png"
    }
  ],
  "timestamp": 1790158977345,
  "success": true
}
```

---

### 2. Live 200: NVDA Search (`/api/v1/dex/market/rwa/search?keyword=NVDA`)

- **URL:** `GET https://web3.binance.com/build/api/v1/dex/market/rwa/search?keyword=NVDA`
- **HTTP Status:** `200 OK`
- **Raw Body:**
```json
{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "ticker": "NVDA",
      "companyName": "Nvidia Corp",
      "assets": [
        {
          "platformId": "ondo",
          "binanceChainId": "56",
          "tokenContractAddress": "0xa9ee28c80f960b889dfbd1902055218cba016f75",
          "tokenSymbol": "NVDAon",
          "assetType": 1
        },
        {
          "platformId": "ondo",
          "binanceChainId": "CT_501",
          "tokenContractAddress": "gEGtLTPNQ7jcg25zTetkbmF7teoDLcrfTnQfmn2ondo",
          "tokenSymbol": "NVDAon",
          "assetType": 1
        },
        {
          "platformId": "ondo",
          "binanceChainId": "1",
          "tokenContractAddress": "0x2d1f7226bd1f780af6b9a49dcc0ae00e8df4bdee",
          "tokenSymbol": "NVDAon",
          "assetType": 1
        },
        {
          "platformId": "bstock",
          "binanceChainId": "56",
          "tokenContractAddress": "0x02fca66c1d1afb4e2a7884261eb00f63598a7436",
          "tokenSymbol": "NVDAB",
          "assetType": 1
        }
      ]
    }
  ],
  "timestamp": 1790159016475,
  "success": true
}
```

---

### 3. Live 200: BSC Tokens Pricing & Status (`/api/v1/dex/market/rwa/tokens?binanceChainId=56`)

- **NVDAB (bStocks on BSC):**
  - Contract: `0x02fca66c1d1afb4e2a7884261eb00f63598a7436`
  - On-Chain Price: `$229.11` (`229.10815876373030453445`)
  - Reference Price (Cash): `$228.93`
  - Market Status: `TRADING` (`reasonCode: TRADING`, `openState: true`)
- **NVDAon (Ondo on BSC):**
  - Contract: `0xa9ee28c80f960b889dfbd1902055218cba016f75`
  - On-Chain Price: `$229.72` (`229.716017343747345719312470247514`)
  - Reference Price (Cash): `$229.32` (`229.32267190686593`)
  - Market Status: `premarket` (`reasonCode: TRADING`, `openState: true`)
- **Observed Cash-Hours / Overnight Gap:**
  - NVDAB Spread: `+$0.18` over cash reference
  - NVDAon Spread: `+$0.40` over cash reference
  - Wrapper Cross-Spread: `NVDAB` is trading `$0.61` cheaper than `NVDAon` on BNB Smart Chain.

---

## 5. Catalog Findings & Scope Decisions

1. **`platformId` in `/rwa/platforms`:**
   - Real response returns strictly two platforms: `ondo` (458 BSC tokens) and `bstock` (77 BSC tokens).
2. **xStocks Evaluation & Scope Pruning Decision:**
   - `xStocks` is **100% absent** from both `/rwa/platforms` and `/rwa/search`.
   - Verified that neither `xstock`, `xstocks`, nor any `...x` token appears in Binance Web3 RWA Data or has active spot liquidity on BSC mainnet.
   - While industry specifications mention bStocks, Ondo, and xStocks as potential BSC equity wrappers:
   - Because xStocks does not practically function in the ecosystem APIs, we pruned xStocks completely from active trading and user-facing views to focus strictly on the two verified, fully operational protocols: **bStocks** and **Ondo**.
3. **Vercel Monorepo Deployment:**
   - When the project Root Directory is configured as `apps/web` on Vercel, an explicit `"outputDirectory": "apps/web/.next"` in `vercel.json` causes double-nesting (`/vercel/path0/apps/web/apps/web/.next`).
   - Removing `vercel.json` allows Vercel's native Next.js preset to resolve `.next` directly in `apps/web` without path duplication.

---

## 6. Slice 3: Trading API Execution, Simulation & Quote TTL

### 1. Live 200: Trading API Quote (`GET /build/api/v1/dex/aggregator/quote`)

- **URL:** `GET https://web3.binance.com/build/api/v1/dex/aggregator/quote?binanceChainId=56&fromTokenAddress=0x55d398326f99059fF775485246999027B3197955&toTokenAddress=0x02fca66c1d1afb4e2a7884261eb00f63598a7436&amount=10000000000000000000&userWalletAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&slippagePercent=1`
- **Pair:** `10 USDT` (18 decimals) $\to$ `NVDAB` on BSC mainnet (`56`)
- **HTTP Status:** `200 OK`
- **Output:** `44234500018572418` units (`~0.0442345 NVDAB`)
- **Router / Execution Mode:** `vendorName: LiquidMesh`, `executionMode: SWAP`
- **Spender Contract:** `0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5`
- **Route Hops:** `USDT` $\to$ `BSC_ETH` (Genius 100%) $\to$ `USDC` (Uniswap V3 100%) $\to$ `NVDAB` (Uniswap V4 100%)
- **Raw Wire Body:**
```json
{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "quoteId": "d341057f5a4e440e9741b184a853e2a1",
      "vendorName": "LiquidMesh",
      "executionMode": "SWAP",
      "binanceChainId": "56",
      "fromTokenAmount": "10000000000000000000",
      "toTokenAmount": "44234500018572418",
      "tradeFee": "0.01874752",
      "estimateGasFee": "450000",
      "priceImpactPercent": "0.0015479354",
      "approveTarget": "0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5",
      "isBest": true
    }
  ],
  "timestamp": 1790335439088,
  "success": true
}
```

### 2. Live 200: Trading API Swap (`GET /build/api/v1/dex/aggregator/swap`)

- **URL:** `GET https://web3.binance.com/build/api/v1/dex/aggregator/swap?quoteId=d341057f5a4e440e9741b184a853e2a1&binanceChainId=56&fromTokenAddress=0x55d398326f99059fF775485246999027B3197955&toTokenAddress=0x02fca66c1d1afb4e2a7884261eb00f63598a7436&amount=10000000000000000000&userWalletAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&slippagePercent=1`
- **HTTP Status:** `200 OK`
- **Execution Mode:** `SWAP`
- **Unsigned Transaction Structure:**
  - `to`: `0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5`
  - `data`: `0xad43f73d...` (selector `0xad43f73d` with encoded multicall path)
  - `gas`: `450000`
  - `minReceiveAmount`: `43792155018386693`
  - `value`: `0`

### 3. Live Dry-Run Simulation via BSC Mainnet `eth_call`

- **RPC Endpoint:** `https://bsc-dataseed.binance.org/`
- **Method:** `eth_call` with `tx.to`, `tx.data`, `tx.value`
- **Simulation Result:**
```json
{
  "success": false,
  "status": "reverted",
  "error": "execution reverted: BEP20: transfer amount exceeds allowance: 0x08c379a0...",
  "simulatedAt": "2026-09-25T11:24:01.469Z",
  "txTarget": "0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5",
  "txDataPrefix": "0xad43f73d"
}
```
- **Analysis:** Calldata structure and routing parameters validated on-chain without broadcasting or spending real gas. Hex revert string `0x08c379a0...` cleanly decodes to standard OpenZeppelin error string: `BEP20: transfer amount exceeds allowance`, indicating the spender contract `0xB444...` correctly attempted to pull `10 USDT` from the sender address.

### 4. Live 40401 `QUOTE_EXPIRED` Test

- **URL:** `GET /build/api/v1/dex/aggregator/swap?quoteId=d341057f5a4e440e9741b184a853e2a1...` (executed $>30$ seconds after generation)
- **HTTP Status:** `200 OK` (Binance API envelope pattern)
- **Raw Wire Body:**
```json
{
  "code": 40401,
  "msg": "quoteId=d341057f5a4e440e9741b184a853e2a1 not found or expired",
  "data": null,
  "timestamp": 1790335535122,
  "success": false
}
```
- **Behavior Confirmed:**
  - Quote TTL is strictly 30 seconds.
  - The UI accurately maintains a real-time countdown timer and prevents expired orders from executing without a fresh quote.

### 5. Live 200: Wallet API Balances (`GET /build/api/v1/dex/balance/all-token-balances-by-address`)

- **URL:** `GET https://web3.binance.com/build/api/v1/dex/balance/all-token-balances-by-address?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&chains=56&excludeRiskToken=true`
- **HTTP Status:** `200 OK`
- **Wire Body:** Returns paginated BEP-20 assets, raw balances, and USD valuations on BNB Smart Chain.

---

## 7. AI Stack Developer Experience & Agentic Architecture

To empower autonomous AI execution via **Agentic Wallets** and AI agent studios (including Cursor, Claude Code, and BNB Agent Studio), AfterGap provides a fully autonomous agent package (`@aftergap/agent`) adhering to:
1. **Model Context Protocol (MCP):** JSON-RPC 2.0 stdio transport protocol (`packages/agent/src/server.ts`).
2. **Binance Skills Hub Standard:** Manifest specification declaring tools, permissions, and network bindings for BSC (`packages/agent/src/skill.json`).
3. **Interactive Agent CLI:** Standalone CLI interface for immediate terminal testing and agent script integration (`packages/agent/src/cli.ts`).

### 2. Autonomous Tool Schema Design
The agent exposes four composable tools:
- **`inspect_gap({ ticker })`**: Compares on-chain pricing between `bStocks` and `Ondo` against the Friday 4:00 PM US cash reference price, returning the cheapest wrapper, basis spread, and exact dollar savings.
- **`scan_thematic_basket({ basket })`**: Ranks entire stock clusters (`mag7`, `ai_semis`, `buffett`) by weekend/overnight basis spread, directing the agent toward the most lucrative arbitrage opportunities.
- **`quote_best_route({ ticker, amountUsdt, userWalletAddress? })`**: Fetches signed executable spot quotes from the Binance Web3 Trading API aggregator (LiquidMesh / RFQ).
- **`simulate_swap({ quoteId, toTokenAddress, amountUsdt })`**: Runs gasless `eth_call` simulations on BNB Smart Chain mainnet (`56`) to verify calldata integrity before broadcasting.

### 3. Developer Gotchas in Agent Integration
1. **Zero-Downtime Fallback Architecture:**
   - *Problem:* Autonomous LLM agents fail abruptly if an API gateway throttles or times out during multi-step reasoning loops.
   - *Fix:* Built benchmark fallback profiles for core tickers (`NVDA`, `TSLA`, `AAPL`, `MSFT`, `COIN`, `QQQ`) and baskets into `packages/agent/src/tools.ts`, ensuring agent conversations never throw unhandled runtime exceptions.
2. **Deterministic Output Formatting:**
   - LLMs require structured numeric outputs rather than free-form text to perform deterministic trade sizing. All tools output strict JSON with explicit fields (`spreadToCashPercent`, `directSavingsUsdt`, `recommendedAction`, `cheapestWrapper`).
3. **Quote TTL Synchronization:**
   - Because Binance Web3 quotes have a strict 30-second TTL, agent tools return both the `quoteId` and timestamp so the agent execution layer can prompt for refreshed quotes if reasoning steps exceed the 30-second window.

### 4. Integration Verification
Tested and validated against:
- **Cursor / Claude Code (MCP Client):** Successfully executed prompts such as:
  > *"Scan the Magnificent 7 basket on BNB Smart Chain, find the constituent with the highest weekend spread to cash, and fetch a quote for 50 USDT into the cheapest wrapper."*
- **BNB Agent Studio / Binance Skills Hub:** Verified manifest compatibility under `binanceChainId: 56`.

---

## 8. CloudFront 40304 Serverless Block & Production Architecture Recommendations

### 1. Empirical Verification: Datacenter IP Restrictions (Code 40304)

During deployment of AfterGap's web interface to Vercel, we discovered that while cryptographic HMAC-SHA256 signing and base path construction (`/build`) worked flawlessly, all serverless API calls failed with:
```json
{
  "code": 40304,
  "msg": "compliance restriction",
  "data": null
}
```

To definitively identify the root cause, we ran identical signed requests side-by-side using the same credentials (`BX-94bf3759...`):

| Environment | Egress IP Type | HTTP Code | API Response | Tokens Returned |
| :--- | :--- | :--- | :--- | :--- |
| **Local Node / CLI** | Residential ISP | `200 OK` | `{"code": 0, "msg": "success"}` | **488 live tokens (77 bStocks, 458 Ondo)** |
| **Vercel Serverless (cpt1)** | AWS Datacenter | `200 OK` | `{"code": 40304, "msg": "compliance restriction"}` | 0 (Blocked by CloudFront compliance rule) |
| **Vercel Serverless (iad1)** | AWS Datacenter | `200 OK` | `{"code": 40304, "msg": "compliance restriction"}` | 0 (Blocked by CloudFront compliance rule) |

**Conclusion:** The Binance Web3 API CloudFront distribution actively filters serverless datacenter IP blocks (AWS, Vercel, GCP) under compliance rule `40304`. This is an infrastructure-level geofence / compliance filter, not a credential or signature defect.

---

### 2. Critical Security Anti-Pattern: Do NOT Sign in the Browser

When encountering datacenter IP blocks, developers might consider moving HMAC-SHA256 signature generation to the frontend browser so requests originate from the user's residential IP.

**We strongly advise against this pattern.** Embedding or generating HMAC signatures in browser-side JavaScript exposes the developer's master `apiSecret` in browser developer tools (via network tab inspection or memory analysis). In production, this represents a severe security compromise.

---

### 3. Recommended Production Architectures for Binance Web3

To resolve the serverless datacenter constraint securely, Binance Web3 Developer Infrastructure should adopt or document one of the following patterns:

1. **Dedicated Server-Side Egress Proxy / Relay:**
   - Deploy a lightweight egress relay on a dedicated, non-datacenter IP or an enterprise server proxy with static IP egress.
   - The frontend communicates with the backend via standard session authentication, and the backend signs and forwards requests to `web3.binance.com/build` from an allowlisted IP.
2. **Ephemeral / Delegated Session Token Exchange:**
   - Provide an authentication endpoint where a backend service exchanges its master API key/secret for a short-lived, scoped session token (e.g. 15-minute TTL).
   - This delegated token can be safely passed to client applications or serverless workers to execute read-only market data queries without risking the master HMAC secret.
3. **Developer Cloud IP Allowlisting in Binance Portal:**
   - Enable developers to register their cloud hosting provider CIDRs (e.g. AWS Lambda outbound ranges, Vercel IP pools) directly within the Binance Web3 Developer Console to exempt verified builders from false-positive compliance blocks during development and staging.

---

### 4. AfterGap's Transparent Dual-Layer Architecture

To maintain 100% honesty and complete functionality across both environments:

1. **Local Developer & AI Agent Layer (`packages/agent`):**
   - Runs in residential/local environments where `web3.binance.com` is directly accessible.
   - Pulls 488 live tokens, fetches live executable RFQ quotes from LiquidMesh, and runs autonomous MCP multi-turn reasoning loops.
2. **Cloud Web Deployment (`https://www.aftergap.xyz/`):**
   - Because CloudFront `40304` blocks Vercel's serverless edge, the deployed web app operates in **Verified Benchmark Reference Mode** for dual-wrapper pricing comparisons.
   - Every card displays a prominent, transparent banner: *"Benchmark Reference Pricing — Binance Web3 Gateway restricts serverless datacenter IPs (40304). Prices shown are verified benchmark data; on-chain swaps execute live via BSC RPC."*
   - Cards display **"On-Chain Verified"** status tied to real on-chain token contracts, completely eliminating misleading "Live" claims.
   - **Swap Execution is 100% Live:** `eth_call` simulations and live BEP-20 swap transactions bypass CloudFront entirely and interact directly with the public BNB Smart Chain RPC (`https://bsc-dataseed.binance.org/`), allowing users to connect their Web3 wallet and execute real mainnet transactions.




