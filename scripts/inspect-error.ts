async function inspectError() {
  try {
    const res = await fetch('https://web3.binance.com/build/api/v1/dex/market/rwa/platforms', {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    console.log('Status:', res.status, res.statusText);
    const text = await res.text();
    console.log('Body:', text);
  } catch (err: any) {
    console.log('Error message:', err.message);
    console.log('Error cause:', err.cause);
    console.log('Error code:', err.code || err.cause?.code);
  }
}

inspectError();
