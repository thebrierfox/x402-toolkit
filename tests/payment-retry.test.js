/**
 * Offline x402Fetch regression tests. Fetch and the EVM payment mechanism are
 * mocked; the installed x402Client performs real requirement selection. No
 * private keys, valid signatures, RPC calls, or seller requests are used.
 */
import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";
import { x402Client } from "@x402/core/client";

const source = await readFile(new URL("../src/payment/index.js", import.meta.url), "utf8");
const ENDPOINT = "https://seller.invalid/json-post";
const ACCOUNT = Object.freeze({ address: "0x1111111111111111111111111111111111111111" });
const PAY_TO = "0x2222222222222222222222222222222222222222";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const HEADER_ENTRIES = [
  ["Content-Type", "application/json"],
  ["Accept", "application/json"],
  ["X-Request-ID", "offline-fixture"],
];
const headerForms = {
  object: (entries) => Object.fromEntries(entries),
  Headers: (entries) => new Headers(entries),
  tuples: (entries) => entries.map((entry) => [...entry]),
};

function requirement(amount = "1000", extra = {}) {
  return {
    scheme: "exact", network: "eip155:8453", asset: USDC, amount,
    payTo: PAY_TO, maxTimeoutSeconds: 60,
    extra: { name: "USD Coin", version: "2", ...extra },
  };
}

function challenge(accepts = [requirement()]) {
  return {
    x402Version: 2,
    resource: { url: ENDPOINT, description: "Offline POST fixture", mimeType: "application/json" },
    accepts,
  };
}

function paymentResponse(required = challenge()) {
  return new Response("payment required", {
    status: 402,
    headers: { "PAYMENT-REQUIRED": Buffer.from(JSON.stringify(required)).toString("base64") },
  });
}

function success(data = { ok: true }) {
  return new Response(JSON.stringify(data), { status: 200 });
}

async function harness(responses, { paymentError } = {}) {
  const calls = [];
  const requests = [];
  const selected = [];
  const registrations = [];
  const timeouts = [];

  class ObservedClient extends x402Client {
    register(network, mechanism) {
      registrations.push({ network, account: mechanism.account });
      return super.register(network, mechanism);
    }
    async createPaymentPayload(required) {
      requests.push(structuredClone(required));
      if (paymentError) throw paymentError;
      return super.createPaymentPayload(required);
    }
  }

  class MockExactEvmScheme {
    constructor(account) { this.account = account; this.scheme = "exact"; }
    // Newer SDKs use this mechanism interface to apply their default spend
    // controls. Keep those controls active rather than disabling them in tests.
    findDefaultAsset(asset, network) {
      if (network === "eip155:8453" && asset.toLowerCase() === USDC.toLowerCase()) {
        return { address: USDC, decimals: 6, symbol: "USDC" };
      }
    }
    async createPaymentPayload(version, accepted) {
      selected.push(structuredClone(accepted));
      return {
        x402Version: version,
        payload: {
          signature: "offline-mock-not-a-valid-signature",
          authorization: {
            from: this.account.address, to: accepted.payTo, value: accepted.amount,
            validAfter: "0", validBefore: "1", nonce: "offline-mock-not-a-valid-nonce",
          },
        },
      };
    }
  }

  const context = vm.createContext({
    Buffer, Headers,
    AbortSignal: { timeout(ms) { timeouts.push(ms); return AbortSignal.timeout(ms); } },
    async fetch(url, init) {
      const index = calls.length;
      calls.push({ url, method: init.method, body: init.body,
        headers: new Headers(init.headers), signal: init.signal });
      assert(index < responses.length, "unexpected additional fetch/retry");
      const response = responses[index];
      if (response instanceof Error) throw response;
      return response;
    },
  });
  const dependencies = new Map([
    ["@x402/core/client", ["x402Client", ObservedClient]],
    ["@x402/evm/exact/client", ["ExactEvmScheme", MockExactEvmScheme]],
  ]);
  const module = new vm.SourceTextModule(source, { context });
  await module.link((specifier) => {
    assert(dependencies.has(specifier), `unexpected import: ${specifier}`);
    const [name, value] = dependencies.get(specifier);
    return new vm.SyntheticModule([name], function () { this.setExport(name, value); }, { context });
  });
  await module.evaluate();
  return { run: (opts) => module.namespace.x402Fetch(ENDPOINT, ACCOUNT, opts),
    calls, requests, selected, registrations, timeouts };
}

function counts(h, fetches, payloads, mechanisms) {
  assert.equal(h.calls.length, fetches, "HTTP fetch count");
  assert.equal(h.requests.length, payloads, "payment payload attempt count");
  assert.equal(h.selected.length, mechanisms, "mock EVM mechanism count");
}

// These are offer-shaped local inputs, not captured responses from either seller.
const fixtures = [
  { name: "contrast/1000 atomic", amount: "1000",
    body: JSON.stringify({ foreground: "#000000", background: "#ffffff", large_text: false }),
    output: { contrast_ratio: 21 } },
  { name: "batch/15000 atomic", amount: "15000",
    body: JSON.stringify({ domains: ["example.org", "example.com"] }),
    output: { ok: true, results: [] } },
];

for (const fixture of fixtures) {
  for (const [form, makeHeaders] of Object.entries(headerForms)) {
    test(`JSON POST preserves URL, body and ${form} headers: ${fixture.name}`, async () => {
      const required = challenge([requirement(fixture.amount)]);
      const headers = makeHeaders(HEADER_ENTRIES);
      const before = [...new Headers(headers)];
      const opts = Object.freeze({ method: "POST", body: fixture.body, headers });
      const h = await harness([paymentResponse(required), success(fixture.output)]);
      assert.deepEqual(await h.run(opts), fixture.output);
      counts(h, 2, 1, 1);
      assert.deepEqual(h.requests[0], required, "challenge passed intact to SDK");
      assert.deepEqual(h.selected[0], required.accepts[0], "Base exact selected unchanged");
      assert.deepEqual(h.registrations, [{ network: "eip155:*", account: ACCOUNT }]);
      for (const call of h.calls) {
        assert.equal(call.url, ENDPOINT);
        assert.equal(call.method, "POST");
        assert.equal(call.body, fixture.body, "JSON bytes preserved");
        for (const [name, value] of before) assert.equal(call.headers.get(name), value);
      }
      assert.equal(h.calls[0].headers.has("PAYMENT-SIGNATURE"), false);
      const payload = JSON.parse(Buffer.from(h.calls[1].headers.get("PAYMENT-SIGNATURE"), "base64").toString());
      assert.deepEqual(payload.accepted, required.accepts[0]);
      assert.deepEqual(payload.resource, required.resource);
      assert.equal(payload.payload.authorization.value, fixture.amount);
      assert.equal(payload.payload.authorization.to, PAY_TO);
      assert.deepEqual([...new Headers(headers)], before, "caller headers not mutated");
      assert.equal(opts.body, fixture.body);
      assert.deepEqual(h.timeouts, [20_000]);
      assert.equal(h.calls[0].signal, h.calls[1].signal, "shared overall timeout budget");
    });
  }
}

for (const [form, makeHeaders] of Object.entries(headerForms)) {
  test(`paid retry replaces existing payment header case-insensitively (${form})`, async () => {
    const headers = makeHeaders([...HEADER_ENTRIES, ["pAyMeNt-SiGnAtUrE", "stale-mock"]]);
    const before = [...new Headers(headers)];
    const h = await harness([paymentResponse(), success()]);
    await h.run({ method: "POST", headers, body: "{}" });
    counts(h, 2, 1, 1);
    const value = h.calls[1].headers.get("PAYMENT-SIGNATURE");
    assert(!value.includes("stale-mock"), "old signature must not be combined with new payload");
    assert.equal(JSON.parse(Buffer.from(value, "base64").toString()).x402Version, 2);
    assert.deepEqual([...new Headers(headers)], before);
  });
}

test("default GET without headers or body retries once", async () => {
  const h = await harness([paymentResponse(), success()]);
  assert.deepEqual(await h.run(), { ok: true });
  counts(h, 2, 1, 1);
  assert(h.calls.every((call) => call.method === "GET" && call.body === undefined));
  assert(h.calls[1].headers.has("PAYMENT-SIGNATURE"));
});

test("ungated success creates no payment payload", async () => {
  const h = await harness([success()]);
  assert.deepEqual(await h.run(), { ok: true });
  counts(h, 1, 0, 0);
});

test("initial HTTP error fails without payment", async () => {
  const h = await harness([new Response("unavailable", { status: 503 })]);
  await assert.rejects(h.run(), /x402 request failed: 503/);
  counts(h, 1, 0, 0);
});

test("missing PAYMENT-REQUIRED fails before payment creation", async () => {
  const h = await harness([new Response("missing", { status: 402 })]);
  await assert.rejects(h.run(), /missing PAYMENT-REQUIRED/);
  counts(h, 1, 0, 0);
});

test("malformed challenge JSON fails before payment creation", async () => {
  const h = await harness([new Response("bad challenge", { status: 402,
    headers: { "PAYMENT-REQUIRED": Buffer.from("not-json").toString("base64") } })]);
  await assert.rejects(h.run(), (error) => error.name === "SyntaxError");
  counts(h, 1, 0, 0);
});

for (const [name, required] of [
  ["unsupported version", { ...challenge(), x402Version: 1 }],
  ["unsupported network", challenge([{ ...requirement(), network: "solana:unsupported" }])],
  ["unsupported scheme", challenge([{ ...requirement(), scheme: "upto" }])],
  ["no accepted requirements", challenge([])],
]) {
  test(`${name} is rejected by SDK without EVM payment creation`, async () => {
    const h = await harness([paymentResponse(required)]);
    await assert.rejects(h.run(), /No (client|network\/scheme) registered/);
    counts(h, 1, 1, 0);
  });
}

test("SDK selects supported Base exact requirement without changing amount/recipient/extra", async () => {
  const accepted = requirement("15000", { fixtureMetadata: "preserve" });
  const required = challenge([{ ...accepted, scheme: "unsupported" }, accepted]);
  const h = await harness([paymentResponse(required), success()]);
  await h.run({ method: "POST", body: "{}" });
  counts(h, 2, 1, 1);
  assert.deepEqual(h.requests[0], required);
  assert.deepEqual(h.selected[0], accepted);
  const payload = JSON.parse(Buffer.from(h.calls[1].headers.get("PAYMENT-SIGNATURE"), "base64").toString());
  assert.deepEqual(payload.accepted, accepted);
});

test("payment creation failure causes no retry", async () => {
  const h = await harness([paymentResponse()], { paymentError: new Error("mock signer refused") });
  await assert.rejects(h.run(), /mock signer refused/);
  counts(h, 1, 1, 0);
});

for (const status of [402, 500]) {
  test(`paid HTTP ${status} causes no second payment or third fetch`, async () => {
    const h = await harness([paymentResponse(), new Response("failed", { status })]);
    await assert.rejects(h.run(), new RegExp(`x402 paid request failed: ${status}`));
    counts(h, 2, 1, 1);
  });
}

test("paid response with invalid JSON does not retry or pay again", async () => {
  const h = await harness([paymentResponse(), new Response("not-json", { status: 200 })]);
  await assert.rejects(h.run(), (error) => error.name === "SyntaxError");
  counts(h, 2, 1, 1);
});

test("initial network failure causes no payment or retry", async () => {
  const h = await harness([new Error("mock initial network failure")]);
  await assert.rejects(h.run(), /mock initial network failure/);
  counts(h, 1, 0, 0);
});

test("paid network failure causes no re-sign or retry", async () => {
  const h = await harness([paymentResponse(), new Error("mock paid network failure")]);
  await assert.rejects(h.run(), /mock paid network failure/);
  counts(h, 2, 1, 1);
});
