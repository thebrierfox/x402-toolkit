# x402-toolkit

**Zero-config x402 payment client for AI agents.** 210+ data tools — market data, chain analytics, research, weather — all paid automatically in USDC on Base. No API keys.

```bash
npx -y x402-toolkit        # start MCP server (exposes all tools to Claude Code, Cursor, etc.)
npm install x402-toolkit   # or use programmatically
```

## Quick Start

```bash
export X402_PRIVATE_KEY=0x...your_base_wallet_private_key...
npx -y x402-toolkit
```

Add to Claude Code:
```json
{
  "mcpServers": {
    "x402-toolkit": {
      "command": "npx",
      "args": ["-y", "x402-toolkit"],
      "env": { "X402_PRIVATE_KEY": "0x..." }
    }
  }
}
```

`$5 USDC` covers 280–5,000 data calls. Each call runs against the best available x402 endpoint — pre-wired, no configuration.

## Tools

| Category | Functions | Price |
|---|---|---|
| US Equities | `getStockPrice`, `getOptionsChain`, `getGEX`, `getInsiderTrades`, `getAnalystRatings` | $0.001–$0.015/call |
| Crypto & DeFi | `getCryptoPulse`, `getDeFiYields`, `getKimchiPremium` | $0.003–$0.008/call |
| Prediction Markets | `getPolymarket`, `getPolymarketWhales` | $0.004–$0.007/call |
| Company Intel | `getCompanyDueDiligence`, `getSecFilings` | $0.008–$0.012/call |
| Chain Analytics | `getWalletBalance`, `getChainPulse`, `getEVMLogs` | $0.003–$0.005/call |
| Research | `searchArxiv`, `getClinicalTrials`, `searchLegal` | $0.004–$0.008/call |
| Weather / Travel | `getWeather`, `getAirQuality`, `getFlightTracker` | $0.005–$0.007/call |
| Web Intelligence | `scrapeContent`, `getWhois` | $0.003–$0.006/call |
| Macro | `getMacroIndicators`, `getTreasuryYields`, `getFOMC` | $0.003–$0.005/call |
| Sentiment | `getNewsSentiment`, `getMarketOverview`, `getCommodityFutures` | $0.003–$0.005/call |
| Forex | `getForexRates` | $0.003/call |

Default provider: [the-stall.intuitek.ai](https://the-stall.intuitek.ai) — override with `X402_BASE_URL`.

## Wallet Setup

```bash
npx x402-toolkit wallet    # print your wallet address + funding instructions
```

Or use a CDP-managed wallet:
```bash
export CDP_API_KEY_NAME=...
export CDP_API_KEY_PRIVATE_KEY=...
```
CDP path auto-creates a wallet on first run. No private key management.

## Programmatic Use

```javascript
import { getStockPrice, getMarketOverview } from "x402-toolkit";

// X402_PRIVATE_KEY must be set in env
const price = await getStockPrice("AAPL");
const market = await getMarketOverview();
```

## Weekly Watch Templates

Templates create recurring paid jobs:

```javascript
import { createPriceAlert, createMarketRegimeMonitor } from "x402-toolkit/templates";

// Fire daily at 9am if AAPL drops below $180
createPriceAlert({
  ticker: "AAPL",
  threshold: { below: 180 },
  schedule: "0 9 * * 1-5",
  notify: process.env.NOTIFY_WEBHOOK,
});

// Weekly market regime digest every Monday 7am
createMarketRegimeMonitor({
  schedule: "0 7 * * 1",
  notify: process.env.NOTIFY_WEBHOOK,
});
```

## Override Defaults

Point to any x402-compatible endpoint:

```bash
export X402_BASE_URL=https://your-x402-provider.example.com/cap
```

## License

MIT
