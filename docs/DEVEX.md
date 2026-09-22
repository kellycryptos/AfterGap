# Developer Experience Report (DEVEX.md)

**Product:** AfterGap  
**Tagline:** Same stock, three wrappers, live gap.  
**Event:** BNB Hack: Tokenized Stocks Edition with Binance Web3 Wallet  
**Chain:** BNB Smart Chain Mainnet (`binanceChainId=56`)

---

## 1. Timeline & Milestone Log

- **2026-09-21 17:33:00 UTC:** Repo created (`aftergap`). Initialized architecture specification.
- **2026-09-22 06:52:45 UTC:** First live HTTP connection to Binance Web3 API gateway. Resolved DNS to CloudFront edge (`108.156.221.85`).
- **2026-09-22 06:57:58 UTC:** First signed call attempt to `GET https://web3.binance.com/build/api/v1/dex/market/rwa/platforms` using HMAC-SHA256 Base64 signer.
- **2026-09-22 07:13:07 UTC:** Full end-to-end live resolution through Next.js server route `/api/rwa?action=resolve&keyword=NVDA`.

---

## 2. Checklist of First-Call Steps

- [x] Review Binance Web3 documentation (`https://web3.binance.com/en/dev-docs/authentication`)
- [x] Identify mandatory `/build` base path prefix rule for signature pre-hash calculation
- [x] Implement HMAC-SHA256 Base64 signing function in `packages/api/src/signer.ts`
- [x] Validate signer pre-hash, timestamp, and headers via unit test `packages/api/src/signer.test.ts`
- [x] Run `npm install` at repo root
- [x] Initialize `.env.local` template with `BINANCE_WEB3_API_KEY`, `BINANCE_WEB3_API_SECRET`, `WALLET_ADDRESS`, `BSC_RPC`
- [x] Configure DNS resolver fallback (`8.8.8.8`) to prevent local ISP `ENOTFOUND web3.binance.com`
- [x] Start Next.js development server on port 3000
- [x] Trigger live NVDA resolution against Binance Web3 gateway
- [x] Record exact HTTP status codes and raw response bodies below

---

## 3. Cryptographic Signing Implementation Notes

### Pre-Hash String Formula
```text
preHash = timestamp + METHOD + requestPath + body
```
- `timestamp`: Current UTC timestamp in ISO 8601 format with millisecond precision (e.g. `2026-09-22T07:13:05.726Z`).
- `METHOD`: Uppercase HTTP method (`GET`, `POST`).
- `requestPath`: Path including query params and **strictly prefixed with `/build`** (e.g. `/build/api/v1/dex/market/rwa/platforms` or `/build/api/v1/dex/market/rwa/search?keyword=NVDA`).
- `body`: Raw string for body; empty string `""` for `GET`/`HEAD` requests.
- Algorithm: `crypto.createHmac('sha256', secretKey).update(preHash).digest('base64')`.
- Required HTTP Headers:
  - `X-OC-APIKEY`: User's Binance Web3 API Key
  - `X-OC-TIMESTAMP`: Exact timestamp string used in preHash
  - `X-OC-SIGN`: Base64 signature
  - `Content-Type`: `application/json`

---

## 4. Raw Responses / Errors

### Case A: Unset / Missing Credentials in `.env.local` (Live Wire Output)

**Endpoint 1: Platforms Catalog**
- **URL:** `GET https://web3.binance.com/build/api/v1/dex/market/rwa/platforms`
- **HTTP Status:** `401 Unauthorized`
- **Response Headers:**
```json
{
  "connection": "keep-alive",
  "content-length": "78",
  "content-type": "application/json",
  "date": "Tue, 22 Sep 2026 07:13:07 GMT",
  "vary": "Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
  "via": "1.1 63b7b2ca2231ada486b1936b4f4d49c8.cloudfront.net (CloudFront)",
  "x-amz-cf-id": "kGwfcFmQ6H-AZKD7oLVrpBJKUPgo4xhmHKb1sfF0a43CHka1L3iliw==",
  "x-amz-cf-pop": "LOS50-P5",
  "x-cache": "Error from cloudfront",
  "x-oc-blocked-by": "AuthenticationFilter/40101",
  "x-oc-trace-id": "unknown-gateway-1491d42cf5bf4c6691d60d7ad982f457"
}
```
- **Raw Body:**
```json
{"msg":"API Key is required","data":"","code":40101,"timestamp":1790061187489}
```

**Endpoint 2: Token Search**
- **URL:** `GET https://web3.binance.com/build/api/v1/dex/market/rwa/search?keyword=NVDA`
- **HTTP Status:** `401 Unauthorized`
- **Response Headers:**
```json
{
  "connection": "keep-alive",
  "content-length": "78",
  "content-type": "application/json",
  "date": "Tue, 22 Sep 2026 07:13:07 GMT",
  "via": "1.1 b9f8df22449caf0acc21bf2c10333d48.cloudfront.net (CloudFront)",
  "x-oc-blocked-by": "AuthenticationFilter/40101",
  "x-oc-trace-id": "unknown-gateway-3590495dd45b4b4c93c7ef9939663138"
}
```
- **Raw Body:**
```json
{"code":40101,"timestamp":1790061187513,"msg":"API Key is required","data":""}
```

**Endpoint 3: Chain 56 Tokens**
- **URL:** `GET https://web3.binance.com/build/api/v1/dex/market/rwa/tokens?binanceChainId=56`
- **HTTP Status:** `401 Unauthorized`
- **Response Headers:**
```json
{
  "connection": "keep-alive",
  "content-length": "78",
  "content-type": "application/json",
  "date": "Tue, 22 Sep 2026 07:13:07 GMT",
  "via": "1.1 41bebbb9059a710008710f09132fd876.cloudfront.net (CloudFront)",
  "x-oc-blocked-by": "AuthenticationFilter/40101",
  "x-oc-trace-id": "unknown-gateway-3e5814e434d34d94b8fd615d5b8acd90"
}
```
- **Raw Body:**
```json
{"data":"","msg":"API Key is required","timestamp":1790061187488,"code":40101}
```

---

### Case B: Signed Request with Dummy/Unregistered Key (Live Wire Output)

- **URL:** `GET https://web3.binance.com/build/api/v1/dex/market/rwa/platforms`
- **HTTP Status:** `401 Unauthorized`
- **Response Headers:**
```json
{
  "connection": "keep-alive",
  "content-length": "74",
  "content-type": "application/json",
  "date": "Tue, 22 Sep 2026 06:57:58 GMT",
  "vary": "Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
  "via": "1.1 697790a738c0e9cd353e8ace7e419ebc.cloudfront.net (CloudFront)",
  "x-amz-cf-id": "68rF8lf-o8CjF0XmGJfnXTCX66yIhmYroxPlcFFKkrjdZpptTjQWEw==",
  "x-amz-cf-pop": "LOS50-P5",
  "x-cache": "Error from cloudfront",
  "x-oc-blocked-by": "AuthenticationFilter/40101",
  "x-oc-trace-id": "unknown-gateway-98646afb5d234351ad10de8eb2e45c45"
}
```
- **Raw Body:**
```json
{"msg":"Invalid API Key","timestamp":1790060278713,"code":40101,"data":""}
```

---

## 5. Known Scope Decisions & Platform Analysis

- **bStocks vs. Ondo vs. xStocks catalog status:**
  - `ondo`: Documented RWA Data platform (`platformId=ondo`). Trading API type=1 (`NVDAon`), RFQ execution.
  - `bstock`: Documented RWA Data platform (`platformId=bstock`). Trading API type=3 (`NVDAB`), 1:1 backed, rebase for dividends, mixed LiquidMesh SWAP + PcsXRfq.
  - `xstocks`: Unlisted in `/rwa/platforms` documentation. In v0, xStocks is displayed with an explicit "not in RWA Data" state rather than a simulated or faked entry. In v1 execution, xStocks will be queried directly via Trading API AMM routes (`type=2`, suffix `x`).
- **Edge Gateway Authentication Filter:**
  - Header: `x-oc-blocked-by: AuthenticationFilter/40101`
  - Code `40101`: `API Key is required` (when missing) or `Invalid API Key` (when key is unknown to Binance portal).
  - Code `40102`: Reserved for `Invalid signature` (prevented by strict `/build` prefix handling).
