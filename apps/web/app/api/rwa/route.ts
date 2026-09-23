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

    // Fetch platforms, search, and BSC tokens sequentially to respect rate limits
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
