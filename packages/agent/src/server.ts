import { AfterGapAgentTools } from './tools.js';
import * as readline from 'readline';

// Model Context Protocol (MCP) JSON-RPC 2.0 Server over stdio
const tools = new AfterGapAgentTools();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

function sendResponse(id: any, result?: any, error?: any) {
  const payload: any = {
    jsonrpc: '2.0',
    id,
  };
  if (error) {
    payload.error = error;
  } else {
    payload.result = result;
  }
  process.stdout.write(JSON.stringify(payload) + '\n');
}

rl.on('line', async (line) => {
  if (!line.trim()) return;

  let request: any;
  try {
    request = JSON.parse(line);
  } catch (err) {
    sendResponse(null, undefined, { code: -32700, message: 'Parse error' });
    return;
  }

  const { id, method, params } = request;

  try {
    // 1. MCP Handshake / Initialization
    if (method === 'initialize') {
      sendResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'aftergap-agent-server',
          version: '1.0.0',
        },
      });
      return;
    }

    if (method === 'notifications/initialized') {
      // Notification, no response required
      return;
    }

    // 2. List Tools
    if (method === 'tools/list') {
      sendResponse(id, {
        tools: [
          {
            name: 'inspect_gap',
            description:
              'Compare on-chain prices of a tokenized stock across bStocks and Ondo on BSC against the Friday cash reference price. Returns the cheapest wrapper, basis spread, and direct dollar savings.',
            inputSchema: {
              type: 'object',
              properties: {
                ticker: {
                  type: 'string',
                  description: "The underlying stock ticker (e.g. 'NVDA', 'TSLA', 'AAPL', 'MSFT', 'COIN').",
                },
              },
              required: ['ticker'],
            },
          },
          {
            name: 'quote_best_route',
            description:
              'Fetches a live executable spot quote for the optimal stock wrapper on BSC using the Binance Web3 Trading API aggregator (LiquidMesh / RFQ mode).',
            inputSchema: {
              type: 'object',
              properties: {
                ticker: {
                  type: 'string',
                  description: 'The stock ticker symbol (e.g. NVDA).',
                },
                amountUsdt: {
                  type: 'number',
                  description: 'Amount in USDT to swap (default: 10).',
                },
                userWalletAddress: {
                  type: 'string',
                  description: 'Optional BSC wallet address.',
                },
              },
              required: ['ticker'],
            },
          },
          {
            name: 'simulate_swap',
            description:
              'Performs an on-chain eth_call dry-run simulation on BNB Smart Chain mainnet without spending gas to verify execution before committing funds.',
            inputSchema: {
              type: 'object',
              properties: {
                quoteId: { type: 'string', description: 'The quoteId returned by quote_best_route.' },
                toTokenAddress: { type: 'string', description: 'Contract address of the tokenized stock.' },
                amountUsdt: { type: 'number', description: 'Amount of USDT.' },
              },
              required: ['quoteId', 'toTokenAddress'],
            },
          },
          {
            name: 'scan_thematic_basket',
            description:
              "Scans an entire thematic stock basket ('mag7', 'ai_semis', or 'buffett') across all token wrappers and returns constituents ranked by largest arbitrage spread.",
            inputSchema: {
              type: 'object',
              properties: {
                basket: {
                  type: 'string',
                  enum: ['mag7', 'ai_semis', 'buffett'],
                  description: 'Name of the thematic basket.',
                },
              },
              required: ['basket'],
            },
          },
        ],
      });
      return;
    }

    // 3. Call Tool
    if (method === 'tools/call') {
      const toolName = params?.name;
      const args = params?.arguments || {};

      if (toolName === 'inspect_gap') {
        const result = await tools.inspectStockGap(args.ticker || 'NVDA');
        sendResponse(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        });
        return;
      }

      if (toolName === 'quote_best_route') {
        const result = await tools.quoteBestRoute(args.ticker || 'NVDA', args.amountUsdt || 10, args.userWalletAddress);
        sendResponse(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        });
        return;
      }

      if (toolName === 'simulate_swap') {
        const result = await tools.simulateSwap(args.quoteId, args.toTokenAddress, args.amountUsdt || 10);
        sendResponse(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        });
        return;
      }

      if (toolName === 'scan_thematic_basket') {
        const result = await tools.scanThematicBasket(args.basket || 'mag7');
        sendResponse(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        });
        return;
      }

      sendResponse(id, undefined, {
        code: -32601,
        message: `Unknown tool: ${toolName}`,
      });
      return;
    }

    sendResponse(id, undefined, {
      code: -32601,
      message: `Method not found: ${method}`,
    });
  } catch (err: any) {
    sendResponse(id, undefined, {
      code: -32000,
      message: err.message || 'Internal tool execution error',
    });
  }
});
