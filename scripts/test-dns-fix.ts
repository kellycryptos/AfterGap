import dns from 'dns';

console.log('Testing Node DNS lookup:');
dns.lookup('web3.binance.com', (err, address, family) => {
  if (err) {
    console.log('Default dns.lookup failed:', err.message);
  } else {
    console.log('Default dns.lookup succeeded:', address);
  }
});

// Test with dns.resolve4 and custom DNS servers
dns.setServers(['8.8.8.8', '1.1.1.1']);
dns.resolve4('web3.binance.com', (err, addresses) => {
  if (err) {
    console.log('dns.resolve4 failed:', err.message);
  } else {
    console.log('dns.resolve4 with 8.8.8.8 succeeded:', addresses);
  }
});
