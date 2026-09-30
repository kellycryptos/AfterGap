const RPC = 'https://bsc-dataseed.binance.org/';

const USDT = '0x55d398326f99059fF775485246999027B3197955';
const NVDAB = '0x02fca66c1d1afb4e2a7884261eb00f63598a7436';
const NVDAON = '0xa9ee28c80f960b889dfbd1902055218cba016f75';

async function rpcCall(method: string, params: any[]) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

// ERC20 balanceOf(address) selector is 0x70a08231
function encodeBalanceOf(owner: string): string {
  const clean = owner.toLowerCase().replace('0x', '').padStart(64, '0');
  return '0x70a08231' + clean;
}

function parseHexToDecimal(hex: string, decimals: number = 18): string {
  if (!hex || hex === '0x') return '0';
  const raw = BigInt(hex);
  const factor = 10n ** BigInt(decimals);
  const intPart = raw / factor;
  const fracPart = (raw % factor).toString().padStart(decimals, '0');
  return `${intPart}.${fracPart.slice(0, 6)}`;
}

async function checkWallet(wallet: string) {
  console.log(`Checking balance for: ${wallet}`);
  
  // Native BNB
  const bnbHex = await rpcCall('eth_getBalance', [wallet, 'latest']);
  console.log(`  BNB:     ${parseHexToDecimal(bnbHex, 18)} BNB`);

  // USDT
  const usdtHex = await rpcCall('eth_call', [{ to: USDT, data: encodeBalanceOf(wallet) }, 'latest']);
  console.log(`  USDT:    $${parseHexToDecimal(usdtHex, 18)} USDT`);

  // NVDAB
  const nvdabHex = await rpcCall('eth_call', [{ to: NVDAB, data: encodeBalanceOf(wallet) }, 'latest']);
  console.log(`  NVDAB:   ${parseHexToDecimal(nvdabHex, 18)} shares`);

  // NVDAon
  const nvdaonHex = await rpcCall('eth_call', [{ to: NVDAON, data: encodeBalanceOf(wallet) }, 'latest']);
  console.log(`  NVDAon:  ${parseHexToDecimal(nvdaonHex, 18)} shares`);
}

async function main() {
  const tx = await rpcCall('eth_getTransactionByHash', ['0xaab6ea5fa34dbc126d019b4d8513042c83405f47140e680c00ea06fb460790b7']);
  const wallets = new Set<string>();
  if (tx?.from) wallets.add(tx.from);
  wallets.add('0x0478047bb937e4e292275c6d09b997deb72d759d');

  for (const w of wallets) {
    console.log('----------------------------------------------------');
    await checkWallet(w);
  }
}

main().catch(console.error);
