import { Agent, setGlobalDispatcher } from 'undici';
import dns from 'dns/promises';

const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8', '1.1.1.1']);

const agent = new Agent({
  connect: {
    lookup: (hostname, options, callback) => {
      resolver
        .resolve4(hostname)
        .then((ips) => {
          if (!ips || ips.length === 0) {
            return callback(new Error(`No IPv4 address found for ${hostname}`), '' as any, 4);
          }
          if (typeof options === 'object' && options?.all) {
            callback(null, ips.map((ip) => ({ address: ip, family: 4 })) as any);
          } else {
            callback(null, ips[0], 4);
          }
        })
        .catch((err) => {
          callback(err, '' as any, 4);
        });
    },
  },
});

setGlobalDispatcher(agent);

async function testFetch() {
  console.log('Testing fetch with custom DNS dispatcher...');
  try {
    const res = await fetch('https://web3.binance.com/build/api/v1/dex/market/rwa/platforms', {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log('HTTP Status:', res.status, res.statusText);
    const text = await res.text();
    console.log('Raw Body:', text);
  } catch (err: any) {
    console.error('Fetch error:', err);
  }
}

testFetch();
