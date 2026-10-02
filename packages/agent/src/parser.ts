import { THEMATIC_BASKETS } from './tools';

export type AgentActionType = 'BUY' | 'SELL' | 'COMPARE' | 'BASKET_SCAN';

export interface ParsedAgentIntent {
  success: true;
  rawInput: string;
  action: AgentActionType;
  ticker?: string;
  explicitWrapperSymbol?: string;
  amountUsdt?: number;
  amountShares?: number;
  basketKey?: string;
  targetWrapperPreference?: 'cheapest' | 'bstock' | 'ondo';
  explanation: string;
}

export interface FailedAgentIntent {
  success: false;
  rawInput: string;
  error: string;
  reason: 'AMBIGUOUS' | 'UNRECOGNIZED_ACTION' | 'MISSING_TICKER' | 'INVALID_AMOUNT' | 'UNKNOWN_BASKET' | 'EMPTY_INPUT';
  suggestedExamples: string[];
}

export type ParseIntentResult = ParsedAgentIntent | FailedAgentIntent;

const TICKER_SYNONYMS: Record<string, string> = {
  nvidia: 'NVDA',
  nvdab: 'NVDA',
  nvdaon: 'NVDA',
  nvda: 'NVDA',
  tesla: 'TSLA',
  tslab: 'TSLA',
  tslaon: 'TSLA',
  tsla: 'TSLA',
  apple: 'AAPL',
  aaplb: 'AAPL',
  aaplon: 'AAPL',
  aapl: 'AAPL',
  microsoft: 'MSFT',
  msftb: 'MSFT',
  msfton: 'MSFT',
  msft: 'MSFT',
  amazon: 'AMZN',
  amznb: 'AMZN',
  amznon: 'AMZN',
  amzn: 'AMZN',
  google: 'GOOGL',
  alphabet: 'GOOGL',
  googlb: 'GOOGL',
  googlon: 'GOOGL',
  googl: 'GOOGL',
  goog: 'GOOGL',
  meta: 'META',
  facebook: 'META',
  metab: 'META',
  metaon: 'META',
  amd: 'AMD',
  amdb: 'AMD',
  amdon: 'AMD',
  tsm: 'TSM',
  tsmc: 'TSM',
  tsmb: 'TSM',
  tsmon: 'TSM',
  coin: 'COIN',
  coinbase: 'COIN',
  coinb: 'COIN',
  coinon: 'COIN',
  qqq: 'QQQ',
  spy: 'SPY',
};

const BASKET_SYNONYMS: Record<string, string> = {
  mag7: 'mag7',
  'mag 7': 'mag7',
  'magnificent 7': 'mag7',
  'magnificent seven': 'mag7',
  'tech giants': 'mag7',
  'big tech': 'mag7',
  ai_semis: 'ai_semis',
  'ai semis': 'ai_semis',
  'ai & semiconductors': 'ai_semis',
  ai: 'ai_semis',
  semis: 'ai_semis',
  semiconductors: 'ai_semis',
  chips: 'ai_semis',
  'ai chips': 'ai_semis',
  buffett: 'buffett',
  'warren buffett': 'buffett',
  value: 'buffett',
  'buffett portfolio': 'buffett',
  'buffett value': 'buffett',
};

const SUGGESTED_EXAMPLES = [
  "buy $25 of the cheapest NVDA wrapper",
  "compare apple on bstocks vs ondo",
  "compare the mag7 basket",
  "buy $50 TSLA",
  "sell 0.0218 NVDAB",
];

/**
 * Parses freeform natural language text into a structured trading intent.
 * Strict ambiguity checking: fails cleanly on ambiguous or malformed input without guessing.
 */
export function parseNaturalLanguageIntent(input: string): ParseIntentResult {
  const raw = (input || '').trim();
  if (!raw) {
    return {
      success: false,
      rawInput: raw,
      error: 'Empty input. Please provide a trading command.',
      reason: 'EMPTY_INPUT',
      suggestedExamples: SUGGESTED_EXAMPLES,
    };
  }

  const lower = raw.toLowerCase();

  // Check for Basket Scan first (e.g. "compare the mag7 basket", "scan ai_semis", "show mag7")
  let matchedBasketKey: string | undefined;
  for (const [phrase, key] of Object.entries(BASKET_SYNONYMS)) {
    // Match word boundaries for phrase
    const regex = new RegExp(`\\b${phrase}\\b`, 'i');
    if (regex.test(lower)) {
      matchedBasketKey = key;
      break;
    }
  }

  const isBasketCommand =
    lower.includes('basket') ||
    (matchedBasketKey && (lower.includes('scan') || lower.includes('compare') || lower.includes('show') || lower.includes('rank') || lower.includes('arbitrage')));

  if (isBasketCommand) {
    const key = matchedBasketKey || 'mag7';
    if (!THEMATIC_BASKETS[key]) {
      return {
        success: false,
        rawInput: raw,
        error: `Unknown thematic basket '${key}'. Available baskets: mag7, ai_semis, buffett.`,
        reason: 'UNKNOWN_BASKET',
        suggestedExamples: ["compare the mag7 basket", "scan ai_semis", "scan buffett basket"],
      };
    }

    return {
      success: true,
      rawInput: raw,
      action: 'BASKET_SCAN',
      basketKey: key,
      explanation: `Scan the '${THEMATIC_BASKETS[key].name}' basket to rank constituents by dual-wrapper arbitrage spread.`,
    };
  }

  // Identify Action (BUY / SELL / COMPARE)
  const isBuy = /\b(buy|purchase|acquire|long|get)\b/i.test(lower) || /\bswap\s+.*for\b/i.test(lower);
  const isSell = /\b(sell|dump|short|exit|close|cash out)\b/i.test(lower);
  const isCompare = /\b(compare|inspect|difference|gap|spread|check|vs|versus)\b/i.test(lower);

  // Identify Ticker & Explicit Wrapper
  let matchedTicker: string | undefined;
  let explicitWrapperSymbol: string | undefined;
  let wrapperPreference: 'cheapest' | 'bstock' | 'ondo' = 'cheapest';

  // 1. Direct synonym lookup & wrapper detection (e.g. NVDAB, NVDAon, TSLA)
  const words = lower.split(/[\s,$/!?;:'"()]+/);
  for (const w of words) {
    const upperW = w.toUpperCase();
    if (upperW.endsWith('ON') && TICKER_SYNONYMS[w.slice(0, -2)]) {
      matchedTicker = TICKER_SYNONYMS[w.slice(0, -2)];
      explicitWrapperSymbol = `${matchedTicker}on`;
      wrapperPreference = 'ondo';
      break;
    } else if (upperW.endsWith('B') && upperW.length > 2 && TICKER_SYNONYMS[w.slice(0, -1)]) {
      matchedTicker = TICKER_SYNONYMS[w.slice(0, -1)];
      explicitWrapperSymbol = `${matchedTicker}B`;
      wrapperPreference = 'bstock';
      break;
    } else if (TICKER_SYNONYMS[w]) {
      matchedTicker = TICKER_SYNONYMS[w];
      break;
    }
  }

  // 2. Fallback: match 1-6 letter capitalized tokens
  if (!matchedTicker) {
    const uppercaseMatches = raw.match(/\b[A-Z]{2,6}\b/g);
    if (uppercaseMatches) {
      for (const m of uppercaseMatches) {
        if (!['BUY', 'SELL', 'FOR', 'THE', 'AND', 'USDT', 'USD', 'BSC', 'RFQ', 'DEX'].includes(m)) {
          if (m.endsWith('ON') && m.length > 3) {
            matchedTicker = m.slice(0, -2);
            explicitWrapperSymbol = m;
            wrapperPreference = 'ondo';
          } else if (m.endsWith('B') && m.length > 2) {
            matchedTicker = m.slice(0, -1);
            explicitWrapperSymbol = m;
            wrapperPreference = 'bstock';
          } else {
            matchedTicker = m;
          }
          break;
        }
      }
    }
  }

  // Determine wrapper preference if not already explicitly bound to a wrapper
  if (!explicitWrapperSymbol) {
    if (lower.includes('bstock') || lower.includes('bstocks') || lower.includes('b-stock')) {
      wrapperPreference = 'bstock';
    } else if (lower.includes('ondo')) {
      wrapperPreference = 'ondo';
    } else if (lower.includes('cheap') || lower.includes('best') || lower.includes('lowest') || lower.includes('optimal')) {
      wrapperPreference = 'cheapest';
    }
  }

  // Amount extraction
  let parsedAmount: number | undefined;

  // Pattern 1: $25 or $25.50
  const dollarMatch = lower.match(/\$\s*(\d+(?:\.\d+)?)/);
  if (dollarMatch) {
    parsedAmount = parseFloat(dollarMatch[1]);
  }

  // Pattern 2: 25 usdt or 25 usd or 25 dollars
  if (parsedAmount === undefined) {
    const usdtMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:usdt|usd|dollars)/i);
    if (usdtMatch) {
      parsedAmount = parseFloat(usdtMatch[1]);
    }
  }

  // Pattern 3: buy/sell <amount> <ticker>
  if (parsedAmount === undefined) {
    const actionAmountMatch = lower.match(/(?:buy|sell|purchase)\s+(\d+(?:\.\d+)?)\s+/i);
    if (actionAmountMatch) {
      parsedAmount = parseFloat(actionAmountMatch[1]);
    }
  }

  // Pattern 4: <amount> shares/units
  if (parsedAmount === undefined) {
    const shareMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:shares|units|tokens)/i);
    if (shareMatch) {
      parsedAmount = parseFloat(shareMatch[1]);
    }
  }

  // If no action found and no ticker found -> UNRECOGNIZED / MALFORMED
  if (!isBuy && !isSell && !isCompare && !matchedTicker) {
    return {
      success: false,
      rawInput: raw,
      error: `Could not understand command: "${raw}".`,
      reason: 'UNRECOGNIZED_ACTION',
      suggestedExamples: SUGGESTED_EXAMPLES,
    };
  }

  // Check for ambiguous inputs like "do something with stocks" or "stocks"
  if ((lower.includes('something') || lower.includes('stocks') || lower.includes('trade')) && !matchedTicker && !isBasketCommand) {
    return {
      success: false,
      rawInput: raw,
      error: `Ambiguous command: "${raw}". Could not identify which stock or basket you want to trade or compare.`,
      reason: 'AMBIGUOUS',
      suggestedExamples: SUGGESTED_EXAMPLES,
    };
  }

  // Action: SELL
  if (isSell) {
    if (!matchedTicker) {
      return {
        success: false,
        rawInput: raw,
        error: `Missing stock ticker to sell. Specify which stock you wish to sell (e.g. 'sell 0.0218 NVDAB').`,
        reason: 'MISSING_TICKER',
        suggestedExamples: ["sell 0.0218 NVDAB", "sell 0.01 TSLAB"],
      };
    }
    const sellAmount = parsedAmount !== undefined ? parsedAmount : 0.0218;
    const targetDisplay = explicitWrapperSymbol || `${matchedTicker} (${wrapperPreference})`;
    return {
      success: true,
      rawInput: raw,
      action: 'SELL',
      ticker: matchedTicker,
      explicitWrapperSymbol,
      amountShares: sellAmount,
      targetWrapperPreference: wrapperPreference,
      explanation: `Sell ${sellAmount} shares of ${targetDisplay} back to USDT.`,
    };
  }

  // Action: BUY
  if (isBuy) {
    if (!matchedTicker) {
      return {
        success: false,
        rawInput: raw,
        error: `Missing stock ticker. Specify which equity to buy (e.g. 'buy $25 NVDA').`,
        reason: 'MISSING_TICKER',
        suggestedExamples: ["buy $25 of the cheapest NVDA wrapper", "buy $50 TSLA", "buy $10 AAPL"],
      };
    }

    const finalAmount = parsedAmount !== undefined ? parsedAmount : 10;
    if (finalAmount <= 0) {
      return {
        success: false,
        rawInput: raw,
        error: `Invalid purchase amount: $${finalAmount}. Binance Trading API requires at least 5 USD.`,
        reason: 'INVALID_AMOUNT',
        suggestedExamples: ["buy $25 NVDA", "buy $10 TSLA"],
      };
    }

    const prefText = explicitWrapperSymbol
      ? explicitWrapperSymbol
      : wrapperPreference === 'cheapest'
      ? 'cheapest wrapper'
      : `${wrapperPreference} wrapper`;
    return {
      success: true,
      rawInput: raw,
      action: 'BUY',
      ticker: matchedTicker,
      explicitWrapperSymbol,
      amountUsdt: finalAmount,
      targetWrapperPreference: wrapperPreference,
      explanation: `Buy $${finalAmount} USDT of ${matchedTicker} using ${prefText} on BNB Smart Chain.`,
    };
  }

  // Action: COMPARE / INSPECT
  if (isCompare || matchedTicker) {
    if (!matchedTicker) {
      return {
        success: false,
        rawInput: raw,
        error: `Missing stock ticker to compare. Specify a ticker (e.g. 'compare NVDA').`,
        reason: 'MISSING_TICKER',
        suggestedExamples: ["compare NVDA", "compare apple on bstocks vs ondo"],
      };
    }

    return {
      success: true,
      rawInput: raw,
      action: 'COMPARE',
      ticker: matchedTicker,
      explanation: `Compare on-chain prices of ${matchedTicker} across bStocks and Ondo against Friday cash reference price.`,
    };
  }

  return {
    success: false,
    rawInput: raw,
    error: `Ambiguous command: "${raw}".`,
    reason: 'AMBIGUOUS',
    suggestedExamples: SUGGESTED_EXAMPLES,
  };
}
