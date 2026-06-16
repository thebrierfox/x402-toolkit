/**
 * mcp.js — x402-toolkit MCP server
 *
 * Exposes all default capabilities as MCP tools. Run with:
 *   npx -y x402-toolkit
 *
 * Each tool corresponds to one x402 capability call. Payment is automatic
 * when X402_PRIVATE_KEY is set. Without a key, tools return setup instructions.
 *
 * Provider: the-stall.intuitek.ai (overridable via X402_BASE_URL)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as defaults from "./defaults/index.js";

const server = new McpServer({
  name: "x402-toolkit",
  version: "0.1.0",
});

function walletRequired() {
  return {
    error:
      "X402_PRIVATE_KEY not set. Add your Base wallet private key to use paid tools. " +
      "See: https://github.com/thebrierfox/x402-toolkit#wallet-setup",
  };
}

function registerTool(name, description, schema, fn) {
  server.tool(name, description, schema, async (params) => {
    if (!process.env.X402_PRIVATE_KEY) {
      return { content: [{ type: "text", text: JSON.stringify(walletRequired()) }] };
    }
    try {
      const result = await fn(params);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (err) {
      return { content: [{ type: "text", text: JSON.stringify({ error: err.message }) }] };
    }
  });
}

// ── US Equities ──────────────────────────────────────────────────────────────
registerTool(
  "getStockPrice",
  "Current US stock price and key metrics. $0.001/call.",
  { ticker: z.string().describe("Stock ticker symbol (e.g. AAPL, TSLA)") },
  ({ ticker }) => defaults.getStockPrice(ticker)
);

registerTool(
  "getOptionsChain",
  "Full options chain with Greeks and IV. $0.008/call.",
  { ticker: z.string().describe("Underlying stock ticker") },
  ({ ticker }) => defaults.getOptionsChain(ticker)
);

registerTool(
  "getGEX",
  "Gamma exposure (GEX) profile for a ticker. $0.015/call.",
  { ticker: z.string().describe("Stock ticker symbol") },
  ({ ticker }) => defaults.getGEX(ticker)
);

registerTool(
  "getInsiderTrades",
  "Recent insider trading activity for a ticker. $0.012/call.",
  { ticker: z.string().describe("Stock ticker symbol") },
  ({ ticker }) => defaults.getInsiderTrades(ticker)
);

registerTool(
  "getAnalystRatings",
  "Analyst ratings and price targets for a ticker. $0.008/call.",
  { ticker: z.string().describe("Stock ticker symbol") },
  ({ ticker }) => defaults.getAnalystRatings(ticker)
);

// ── Crypto & DeFi ────────────────────────────────────────────────────────────
registerTool(
  "getCryptoPulse",
  "Crypto market pulse — price, volume, sentiment. $0.003/call.",
  { asset: z.string().optional().describe("Asset symbol (e.g. BTC, ETH) or omit for overview") },
  (params) => defaults.getCryptoPulse(params)
);

registerTool(
  "getDeFiYields",
  "Top DeFi yield opportunities across protocols. $0.004/call.",
  { protocol: z.string().optional().describe("Filter by protocol name, or omit for all") },
  (params) => defaults.getDeFiYields(params)
);

registerTool(
  "getKimchiPremium",
  "Korean crypto exchange premium (kimchi premium) vs global markets. $0.004/call.",
  {},
  () => defaults.getKimchiPremium()
);

// ── Prediction Markets ────────────────────────────────────────────────────────
registerTool(
  "getPolymarket",
  "Polymarket prediction market data and active markets. $0.004/call.",
  { query: z.string().optional().describe("Market search query, or omit for top markets") },
  (params) => defaults.getPolymarket(params)
);

registerTool(
  "getPolymarketWhales",
  "Large Polymarket positions and whale wallet activity. $0.007/call.",
  { market_id: z.string().optional().describe("Polymarket market ID, or omit for all") },
  (params) => defaults.getPolymarketWhales(params)
);

// ── Company Intelligence ──────────────────────────────────────────────────────
registerTool(
  "getCompanyDueDiligence",
  "Company due diligence report — overview, financials, risks. $0.008/call.",
  { company: z.string().describe("Company name or ticker") },
  ({ company }) => defaults.getCompanyDueDiligence(company)
);

registerTool(
  "getSecFilings",
  "Recent SEC filings for a company (10-K, 10-Q, 8-K). $0.012/call.",
  { ticker: z.string().describe("Stock ticker symbol") },
  ({ ticker }) => defaults.getSecFilings(ticker)
);

// ── Chain Analytics ────────────────────────────────────────────────────────────
registerTool(
  "getWalletBalance",
  "USDC and ETH balance for any wallet on Base. $0.003/call.",
  {
    address: z.string().describe("0x wallet address"),
    network: z.string().optional().default("base").describe("Chain (base, ethereum)"),
  },
  ({ address, network }) => defaults.getWalletBalance(address, network)
);

registerTool(
  "getChainPulse",
  "Current Base chain metrics — gas, block time, activity. $0.003/call.",
  { chain: z.string().optional().default("base").describe("Chain identifier") },
  (params) => defaults.getChainPulse(params)
);

registerTool(
  "getEVMLogs",
  "EVM event logs for a contract address or topic. $0.005/call.",
  {
    address: z.string().optional().describe("Contract address"),
    topic: z.string().optional().describe("Event topic hash"),
    from_block: z.number().optional().describe("Start block"),
  },
  (params) => defaults.getEVMLogs(params)
);

// ── Research ───────────────────────────────────────────────────────────────────
registerTool(
  "searchArxiv",
  "Search arXiv preprints by keyword or topic. $0.004/call.",
  { query: z.string().describe("Research query") },
  ({ query }) => defaults.searchArxiv(query)
);

registerTool(
  "getClinicalTrials",
  "FDA clinical trial data by condition, drug, or sponsor. $0.008/call.",
  { query: z.string().describe("Search query — condition, drug name, or sponsor") },
  (params) => defaults.getClinicalTrials(params)
);

// ── Weather / Travel ──────────────────────────────────────────────────────────
registerTool(
  "getWeather",
  "Current weather and 7-day forecast for any location. $0.005/call.",
  { location: z.string().describe("City name, zip code, or coordinates") },
  ({ location }) => defaults.getWeather(location)
);

registerTool(
  "getAirQuality",
  "Air quality index (AQI) and pollutant breakdown. $0.005/call.",
  { location: z.string().describe("City name or coordinates") },
  ({ location }) => defaults.getAirQuality(location)
);

// ── Web Intelligence ───────────────────────────────────────────────────────────
registerTool(
  "scrapeContent",
  "Extract clean readable content from any URL. $0.003/call.",
  { url: z.string().describe("URL to extract content from") },
  ({ url }) => defaults.scrapeContent(url)
);

registerTool(
  "getWhois",
  "WHOIS and domain registration data. $0.003/call.",
  { domain: z.string().describe("Domain name (e.g. example.com)") },
  ({ domain }) => defaults.getWhois(domain)
);

// ── Macro ─────────────────────────────────────────────────────────────────────
registerTool(
  "getMacroIndicators",
  "US macro indicators — CPI, GDP, unemployment, PMI. $0.003/call.",
  {},
  () => defaults.getMacroIndicators({})
);

registerTool(
  "getTreasuryYields",
  "Live US Treasury yield curve (2y, 5y, 10y, 30y). $0.003/call.",
  {},
  () => defaults.getTreasuryYields()
);

registerTool(
  "getFOMC",
  "FOMC meeting schedule, decisions, and Fed commentary. $0.005/call.",
  {},
  () => defaults.getFOMC()
);

// ── Sentiment ─────────────────────────────────────────────────────────────────
registerTool(
  "getNewsSentiment",
  "News sentiment analysis for a ticker or topic. $0.003/call.",
  { query: z.string().describe("Ticker, company name, or topic") },
  (params) => defaults.getNewsSentiment(params)
);

registerTool(
  "getMarketOverview",
  "Broad market overview — SPY, QQQ, VIX, sector performance. $0.005/call.",
  {},
  () => defaults.getMarketOverview()
);

registerTool(
  "getCommodityFutures",
  "Live commodity futures prices — oil, gold, natgas, grains. $0.005/call.",
  {},
  () => defaults.getCommodityFutures()
);

registerTool(
  "getForexRates",
  "Live forex exchange rates. $0.003/call.",
  { base: z.string().optional().default("USD").describe("Base currency code") },
  (params) => defaults.getForexRates(params)
);

const transport = new StdioServerTransport();
await server.connect(transport);
