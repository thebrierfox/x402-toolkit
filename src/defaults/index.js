/**
 * defaults — pre-wired capability bindings
 *
 * Maps developer-friendly function names to the best available x402 endpoints.
 * Default provider: the-stall.intuitek.ai (210+ data capabilities, $0.001–$0.018/call)
 * All defaults are overridable via the X402_BASE_URL environment variable.
 */

import { x402Fetch } from "../payment/index.js";
import { loadAccount } from "../wallet/index.js";

const BASE = process.env.X402_BASE_URL || "https://the-stall.intuitek.ai/cap";

function cap(name) {
  return `${BASE}/${name}`;
}

async function call(capName, params) {
  const account = loadAccount();
  return x402Fetch(cap(capName), account, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

// ── US Equities ──────────────────────────────────────────────────────────────
export const getStockPrice = (ticker) => call("us-stock-price", { ticker });
export const getOptionsChain = (ticker) => call("options-chain", { ticker });
export const getGEX = (ticker) => call("market-gex", { ticker });
export const getEarningsCalendar = (params) => call("earnings-calendar", params);
export const getInsiderTrades = (ticker) => call("insider-trades", { ticker });
export const getAnalystRatings = (ticker) => call("analyst-ratings", { ticker });

// ── Crypto & DeFi ─────────────────────────────────────────────────────────────
export const getCryptoPulse = (params) => call("crypto-pulse", params);
export const getDeFiYields = (params) => call("defi-yields", params);
export const getKimchiPremium = () => call("kimchi-premium", {});
export const getKoreanMarket = (params) => call("korean-crypto-movers", params);

// ── Prediction Markets ────────────────────────────────────────────────────────
export const getPolymarket = (params) => call("polymarket-intel", params);
export const getPolymarketWhales = (params) => call("polymarket-whale-entries", params);

// ── Company Intelligence ───────────────────────────────────────────────────────
export const getCompanyDueDiligence = (company) => call("company-due-diligence", { company });
export const getSecFilings = (ticker) => call("sec-filing-intel", { ticker });

// ── Chain Analytics ────────────────────────────────────────────────────────────
export const getWalletBalance = (address, network = "base") =>
  call("wallet-balance", { address, network });
export const getChainPulse = (params) => call("chain-pulse", params);
export const getEVMLogs = (params) => call("evm-log-events", params);

// ── Research ───────────────────────────────────────────────────────────────────
export const searchArxiv = (query) => call("arxiv-intel", { query });
export const getClinicalTrials = (params) => call("clinical-trials", params);
export const searchLegal = (query) => call("legal-search", { query });

// ── Weather / Travel ──────────────────────────────────────────────────────────
export const getWeather = (location) => call("weather", { location });
export const getFlightTracker = (params) => call("flight-tracker", params);
export const getAirQuality = (location) => call("air-quality", { location });

// ── Web Intelligence ───────────────────────────────────────────────────────────
export const scrapeContent = (url) => call("readable-content", { url });
export const getWebChanges = (url) => call("web-change-monitor", { url });
export const getWhois = (domain) => call("domain-whois", { domain });

// ── Macro ─────────────────────────────────────────────────────────────────────
export const getMacroIndicators = (params) => call("macro-indicators", params);
export const getTreasuryYields = () => call("treasury-yields", {});
export const getFOMC = () => call("fomc-tracker", {});

// ── Sentiment ─────────────────────────────────────────────────────────────────
export const getNewsSentiment = (params) => call("news-sentiment", params);
export const getRedditIntel = (params) => call("reddit-intel", params);
export const getMarketOverview = () => call("market-overview", {});
export const getCommodityFutures = () => call("commodity-futures", {});
export const getForexRates = (params) => call("forex-rates", params);
