import { NextRequest, NextResponse } from 'next/server';
import { BinanceRwaClient } from '@aftergap/api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'resolve';
  const keyword = searchParams.get('keyword') || 'NVDA';
  const platformId = searchParams.get('platformId') || undefined;

  const apiKey = process.env.BINANCE_WEB3_API_KEY || '';
  const secretKey = process.env.BINANCE_WEB3_API_SECRET || '';

  const client = new BinanceRwaClient({
    apiKey,
    secretKey,
  });

  const authState = {
    hasApiKey: Boolean(apiKey),
    hasSecretKey: Boolean(secretKey),
    apiKeyPrefix: apiKey ? `${apiKey.slice(0, 6)}...` : 'not_set',
  };

  try {
    if (action === 'platforms') {
      const platformsRes = await client.getPlatforms();
      return NextResponse.json({
        auth: authState,
        platforms: platformsRes,
      });
    }

    if (action === 'search') {
      const searchRes = await client.search(keyword);
      return NextResponse.json({
        auth: authState,
        search: searchRes,
      });
    }

    if (action === 'tokens') {
      const tokensRes = await client.getTokens({
        binanceChainId: 56,
        platformId,
      });
      return NextResponse.json({
        auth: authState,
        tokens: tokensRes,
      });
    }

    if (action === 'quote') {
      const fromTokenAddress = searchParams.get('fromTokenAddress') || '0x55d398326f99059fF775485246999027B3197955'; // USDT
      const toTokenAddress = searchParams.get('toTokenAddress') || '';
      const amount = searchParams.get('amount') || '10000000000000000000'; // 10 USDT
      const userWalletAddress = searchParams.get('userWalletAddress') || undefined;
      const slippagePercent = searchParams.get('slippagePercent') || '1';

      const quoteRes = await client.getQuote({
        binanceChainId: 56,
        fromTokenAddress,
        toTokenAddress,
        amount,
        userWalletAddress,
        slippagePercent,
      });

      return NextResponse.json({
        auth: authState,
        quote: quoteRes,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'swap') {
      const quoteId = searchParams.get('quoteId') || '';
      const fromTokenAddress = searchParams.get('fromTokenAddress') || '0x55d398326f99059fF775485246999027B3197955';
      const toTokenAddress = searchParams.get('toTokenAddress') || '';
      const amount = searchParams.get('amount') || '10000000000000000000';
      const userWalletAddress = searchParams.get('userWalletAddress') || '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
      const slippagePercent = searchParams.get('slippagePercent') || '1';

      const swapRes = await client.getSwap({
        quoteId,
        binanceChainId: 56,
        fromTokenAddress,
        toTokenAddress,
        amount,
        userWalletAddress,
        slippagePercent,
      });

      return NextResponse.json({
        auth: authState,
        swap: swapRes,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'balances') {
      const address = searchParams.get('address') || '';
      if (!address) {
        return NextResponse.json({ error: 'Missing address parameter' }, { status: 400 });
      }

      const balancesRes = await client.getBalances(address, 56);
      return NextResponse.json({
        auth: authState,
        balances: balancesRes,
        timestamp: new Date().toISOString(),
      });
    }

    // Default: Fetch platforms, search, and BSC tokens sequentially to respect rate limits
    const platformsRes = await client.getPlatforms();
    const searchRes = await client.search(keyword);
    const bscTokensRes = await client.getTokens({ binanceChainId: 56, size: 500 });

    return NextResponse.json({
      auth: authState,
      keyword,
      platforms: platformsRes,
      search: searchRes,
      bscTokens: bscTokensRes,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        auth: authState,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'simulate';

  const apiKey = process.env.BINANCE_WEB3_API_KEY || '';
  const secretKey = process.env.BINANCE_WEB3_API_SECRET || '';

  const client = new BinanceRwaClient({
    apiKey,
    secretKey,
  });

  const authState = {
    hasApiKey: Boolean(apiKey),
    hasSecretKey: Boolean(secretKey),
    apiKeyPrefix: apiKey ? `${apiKey.slice(0, 6)}...` : 'not_set',
  };

  try {
    const body = await request.json();

    if (action === 'simulate') {
      const tx = body.tx;
      if (!tx || !tx.to || !tx.data) {
        return NextResponse.json(
          { error: 'Missing tx parameters (to, data required)' },
          { status: 400 }
        );
      }

      const simResult = await client.simulateSwap(tx);
      return NextResponse.json({
        auth: authState,
        simulation: simResult,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'swap') {
      const { quoteId, fromTokenAddress, toTokenAddress, amount, userWalletAddress, slippagePercent } = body;
      const swapRes = await client.getSwap({
        quoteId,
        binanceChainId: 56,
        fromTokenAddress,
        toTokenAddress,
        amount,
        userWalletAddress,
        slippagePercent,
      });

      return NextResponse.json({
        auth: authState,
        swap: swapRes,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        auth: authState,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
