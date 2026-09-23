# Developer Experience Report (DEVEX.md)

**Product:** AfterGap  
**Tagline:** Same stock, three wrappers, live gap.  
**Event:** BNB Hack: Tokenized Stocks Edition with Binance Web3 Wallet  
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
2. **xStocks status confirmed:**
   - `xStocks` is **100% absent** from both `/rwa/platforms` and `/rwa/search`.
   - Verified that neither `xstock`, `xstocks`, nor any `...x` token appears in RWA Data.
   - The UI correctly maintains an explicit empty state badge for xStocks ("Not in RWA Data catalog") and does not invent or fake a row.
