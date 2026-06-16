/**
 * payment — x402 payment execution
 *
 * Implements the full EIP-3009 / x402 protocol flow:
 *   1. Fetch resource (expect 402 + PAYMENT-REQUIRED header)
 *   2. Parse payment requirements
 *   3. Sign EIP-3009 TransferWithAuthorization
 *   4. Submit to Coinbase facilitator
 *   5. Retry resource fetch with PAYMENT-SIGNATURE header
 */

import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";

const TIMEOUT_MS = 20_000;

/**
 * Execute an x402-gated HTTP GET request, auto-paying the 402 fee.
 *
 * @param {string} url  - Full URL of the x402 endpoint
 * @param {object} account - viem account (from loadAccount() or CDP)
 * @param {object} [opts]  - Optional: { method, body, headers }
 * @returns {Promise<any>} Parsed JSON response
 */
export async function x402Fetch(url, account, opts = {}) {
  const client = new x402Client();
  client.register("eip155:*", new ExactEvmScheme(account));

  const method = opts.method || "GET";
  const fetchInit = {
    method,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    ...(opts.headers ? { headers: opts.headers } : {}),
    ...(opts.body ? { body: opts.body } : {}),
  };

  // Step 1: Initial request — expect 402
  const r402 = await fetch(url, fetchInit);

  if (r402.status !== 402) {
    // Not gated (free or error)
    if (!r402.ok) {
      const body = await r402.text();
      throw new Error(`x402 request failed: ${r402.status} — ${body.slice(0, 300)}`);
    }
    return r402.json();
  }

  // Step 2: Parse payment requirements
  const reqHeader =
    r402.headers.get("PAYMENT-REQUIRED") || r402.headers.get("payment-required");
  if (!reqHeader) throw new Error("x402: missing PAYMENT-REQUIRED header on 402 response");

  const paymentRequired = JSON.parse(Buffer.from(reqHeader, "base64").toString("utf8"));

  // Step 3+4: Sign + submit via x402Client
  const paymentPayload = await client.createPaymentPayload(paymentRequired);
  const encoded = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");

  // Step 5: Retry with payment
  const resp = await fetch(url, {
    ...fetchInit,
    headers: {
      ...fetchInit.headers,
      "PAYMENT-SIGNATURE": encoded,
    },
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`x402 paid request failed: ${resp.status} — ${body.slice(0, 300)}`);
  }

  return resp.json();
}
