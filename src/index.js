/**
 * x402-toolkit — main entry point
 *
 * A zero-config x402 payment client for AI agents.
 * Default provider: the-stall.intuitek.ai
 *
 * Quick start:
 *   export X402_PRIVATE_KEY=0x...your_base_wallet_key...
 *   import { getStockPrice } from "x402-toolkit";
 *   const price = await getStockPrice("AAPL");
 */

export * from "./defaults/index.js";
export * from "./wallet/index.js";
export * from "./payment/index.js";
export * from "./templates/index.js";
