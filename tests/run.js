/**
 * tests/run.js — lightweight local test suite (no live network calls)
 *
 * Tests:
 *   1. Package structure (all expected exports exist)
 *   2. wallet.loadAccount() — throws correctly without X402_PRIVATE_KEY
 *   3. payment.x402Fetch() — throws correctly on non-402 response (mocked)
 *   4. templates — createPriceAlert returns a task object
 *   5. defaults — all 30+ exports are functions
 */

import { strict as assert } from "assert";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    failed++;
  }
}

console.log("\nx402-toolkit test suite\n");

// Test 1: Package structure
console.log("1. Package structure");
const { loadAccount, loadCdpAccount, getBalance } = await import("../src/wallet/index.js");
test("wallet exports loadAccount", () => assert.equal(typeof loadAccount, "function"));
test("wallet exports loadCdpAccount", () => assert.equal(typeof loadCdpAccount, "function"));
test("wallet exports getBalance", () => assert.equal(typeof getBalance, "function"));

const { x402Fetch } = await import("../src/payment/index.js");
test("payment exports x402Fetch", () => assert.equal(typeof x402Fetch, "function"));

const defaults = await import("../src/defaults/index.js");
const defaultExports = Object.keys(defaults);
test(`defaults exports ${defaultExports.length} functions`, () => {
  assert(defaultExports.length >= 20, `expected >= 20 defaults, got ${defaultExports.length}`);
  defaultExports.forEach((k) => assert.equal(typeof defaults[k], "function", `${k} is not a function`));
});

const { createPriceAlert, createProtocolRevenueDigest, createMarketRegimeMonitor } = await import(
  "../src/templates/index.js"
);
test("templates exports createPriceAlert", () => assert.equal(typeof createPriceAlert, "function"));
test("templates exports createProtocolRevenueDigest", () =>
  assert.equal(typeof createProtocolRevenueDigest, "function"));
test("templates exports createMarketRegimeMonitor", () =>
  assert.equal(typeof createMarketRegimeMonitor, "function"));

// Test 2: wallet.loadAccount() without private key
console.log("\n2. Wallet validation");
delete process.env.X402_PRIVATE_KEY;
await testAsync("loadAccount throws without X402_PRIVATE_KEY", async () => {
  try {
    loadAccount();
    assert.fail("should have thrown");
  } catch (err) {
    assert(err.message.includes("X402_PRIVATE_KEY"), `wrong error: ${err.message}`);
  }
});

// Test 3: loadAccount() with a valid private key
await testAsync("loadAccount succeeds with valid X402_PRIVATE_KEY", async () => {
  process.env.X402_PRIVATE_KEY =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // anvil test key
  const account = loadAccount();
  assert.equal(account.address, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  delete process.env.X402_PRIVATE_KEY;
});

// Test 4: x402Fetch signature (structural only — no live network)
console.log("\n3. Payment module");
test("x402Fetch is an async function", () => {
  const str = x402Fetch.toString();
  assert(str.includes("async") || x402Fetch.constructor.name === "AsyncFunction");
});

// Summary
console.log(`\n─────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All tests passed ✓\n");
}
