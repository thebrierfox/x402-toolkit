/**
 * wallet — x402 wallet management
 *
 * Two paths:
 *   1. CDP-managed wallet (requires @coinbase/cdp-sdk + CDP_API_KEY_NAME + CDP_API_KEY_PRIVATE_KEY env vars)
 *   2. BYO wallet via X402_PRIVATE_KEY env var (plain hex private key, 0x-prefixed)
 */

import { privateKeyToAccount } from "viem/accounts";

const STALL_BASE = "https://the-stall.intuitek.ai";

export function loadAccount() {
  const pk = process.env.X402_PRIVATE_KEY;
  if (!pk) {
    throw new Error(
      "X402_PRIVATE_KEY not set. Set it to a 0x-prefixed hex private key, or configure CDP wallet."
    );
  }
  return privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
}

export async function loadCdpAccount() {
  let cdp;
  try {
    const { CdpClient } = await import("@coinbase/cdp-sdk");
    cdp = new CdpClient();
  } catch {
    throw new Error(
      "CDP wallet requires @coinbase/cdp-sdk and CDP_API_KEY_NAME + CDP_API_KEY_PRIVATE_KEY env vars"
    );
  }
  const wallet = await cdp.evm.getOrCreateWallet({ networkId: "base-mainnet" });
  const address = (await wallet.listAddresses())[0]?.address;
  return { wallet, address };
}

export async function getBalance(address) {
  const res = await fetch(`${STALL_BASE}/cap/wallet-balance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, network: "base" }),
  });
  if (!res.ok) throw new Error(`balance check failed: ${res.status}`);
  const data = await res.json();
  return data;
}

export function printSetupInstructions(address) {
  console.log(`
x402-toolkit wallet setup
─────────────────────────
Address:  ${address}
Network:  Base (mainnet)
Token:    USDC

To fund your wallet:
  1. Send USDC on Base to the address above
  2. $5 USDC gets you 280–5,000 data calls
  3. Bridge from Ethereum: https://bridge.base.org/

Once funded, re-run your agent — payments are automatic.
`);
}
