# JSON POST payment-retry verification

Verified on 2026-10-14 UTC (2026-10-13 America/Chicago).
Baseline: `15805fd0d3c3300dce4ae2f23c62c5db4292d047`.
Related discussion: https://github.com/thebrierfox/x402-toolkit/issues/1.

## Result

The baseline preserves JSON string bodies and ordinary object headers during
the paid retry. It loses intended headers supplied as a `Headers` instance or
an array of header pairs. With ordinary object headers, a pre-existing payment
header with different casing can be combined with the new signature.

The correction copies headers through the standard `Headers` constructor and
uses case-insensitive `set` for `PAYMENT-SIGNATURE`. The request URL, method,
body, shared 20-second timeout and single paid retry remain unchanged. Caller
headers are not mutated. Payment requirement selection and signing remain
delegated to the existing SDK; no payment policy is disabled or changed.

## Evidence

Environment: Node.js 24.19.0. HTTP fetch and the EVM payment mechanism were
mocked in an isolated module context. The real installed `x402Client` performed
requirement selection. Only dummy account addresses and deliberately invalid
mock signatures/nonces were used. The context had no wallet loader or real
network fetch. Seller URLs were replaced by `https://seller.invalid/json-post`.

| Run | SDK versions (core / evm) | Existing checks | Retry checks |
| --- | --- | --- | --- |
| Baseline | 2.15.0 / 2.15.0 | Not rerun | 20 pass / 5 fail |
| Corrected | 2.15.0 / 2.15.0 | 11 pass / 0 fail | 25 pass / 0 fail |
| Corrected | 2.28.0 / 2.28.0 | 11 pass / 0 fail | 25 pass / 0 fail |

The five baseline failures were the two JSON fixtures using `Headers`, the two
fixtures using header-pair arrays, and replacement of a differently cased
pre-existing payment header in an ordinary object.

Coverage includes JSON POST bytes, content type, accept and request-ID headers,
all three standard header representations, unchanged Base exact requirements,
1000 and 15000 atomic-unit amounts, recipient/asset/extra preservation, default
GET, ungated responses, malformed/missing challenges, unsupported requirements,
payment creation failure, HTTP errors, invalid response JSON and network errors.
Each successful gated invocation makes two mocked HTTP calls and one payment
payload attempt. Paid failures produce no third fetch or second payload attempt.

Run the complete suite with `npm test`; run the targeted suite with
`npm run test:payment`.

The repository's existing `npm ci` fails because the optional CDP SDK entry is
missing from the lockfile. Validation used `npm install --ignore-scripts
--no-save --package-lock=false --omit=optional --no-audit --no-fund`, with exact
core/evm versions selected for each run. The committed lockfile was preserved
byte-for-byte (Git blob `5129d070666aaf3a565d90c773f841ef737a5660`). This
pre-existing clean-install problem is separate from the retry correction.

## Safety and limits

No requests were made to zFinia or VYTREL, no user wallet or credentials were
loaded, no valid payment authorization was created, and no blockchain requests
or paid transactions were made. The existing wallet test only derives an
address from its public Anvil fixture key.

The issue offers contain no seed/private-key request or installation command.
That observation does not establish either developer's identity or reliability.
An x402 payment signature is a real transfer authorization, not a harmless
connectivity check. The helper does not independently pin payment requirements
to the price, token, network or recipient advertised in a GitHub comment. SDK
protections differ by version: core 2.28.0 adds default-asset restrictions and a
default $1 per-payment cap; the helper does not configure an offer-specific cap.

These results address the client-side JSON POST retry question. They do not
prove either endpoint's live schema, valid-signature acceptance, on-chain
settlement, successful delivery, or trustworthiness. The batch JSON input is
synthetic, not a verified VYTREL request schema. Streaming/request bodies,
redirect behavior, cross-invocation retries and settlement reconciliation are
outside this test's scope. A funded live test is unnecessary for this result.

Protocol reference:
https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_evm.md.
