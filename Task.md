# Paradigmjpcom Task

## CURRENT STATUS - 2026-08-02 Content API + x402 Wave 1 released

- Outcome: site content is now distributed through the website and a public CORS-enabled API, with a pay-per-request x402 product lane for monetization diversification.
- Production main: `ba86ab9deb6c8d0f9b03dbb93cbcf0c2840896f4`.
- Implementation PR: #659. Release reliability fixes: #660, #661, #662.
- Canonical deployment: `lbxrxhx5vpcyvpolyzusi8qe`; Coolify status `finished`.
- Production container uses the matching main image and is healthy.

### Public distribution

- Catalog: `GET /api/v1/content?locale=en|ja`.
- Full public article: `GET /api/v1/content/public/[slug]?locale=en|ja`.
- Markdown delivery: add `format=markdown`.
- Catalog live result: HTTP 200, 26 entries, `partial: false`, CORS `*`.
- Existing article JSON and Markdown both return HTTP 200; unknown slugs return `CONTENT_NOT_FOUND` with HTTP 404.
- Bilingual documentation is live at `/en/japan-opportunities/api` and `/ja/japan-opportunities/api`.

### x402 monetization

- Paid endpoint: `GET /api/v1/content/premium/[slug]?locale=en|ja`.
- Three bilingual decision packets are seeded: Japan market entry, asset evaluation, and supplier qualification.
- Wave 1 price is 0.25 USDC per request on Base, using x402 protocol v2.
- The paid route is intentionally fail-closed with HTTP 503 `X402_NOT_CONFIGURED` until the receiving address and CDP facilitator credentials are approved and stored in the runtime secret store.
- Free API delivery remains available while settlement is unavailable.
- `OPTIONS` returns HTTP 204, accepts `PAYMENT-SIGNATURE`, and exposes `PAYMENT-REQUIRED` / `PAYMENT-RESPONSE`.
- No raw client IP or payment signature is stored. Sale completion is wired to DB bell plus Slack notification.

### Production data and security

- `content_products`: 6 rows, all active x402 products, price range 0.25 to 0.25 USDC.
- `content_access_events`: 8 verification events, 0 paid events.
- Both tables have RLS and FORCE RLS enabled.
- PUBLIC, anon, and authenticated table grants: 0.
- service_role policies: 2.
- Canonical DB verification passed 109/109 tables.

### Validation

- Content Commerce Vitest: 7/7 passed.
- Release wiring regression test, TypeScript, changed-scope ESLint, release-doctor, and production Next.js build passed.
- Linux GitHub validation passed the standalone production build.
- Canonical pre-deploy and post-deploy release gates passed.
- Production smoke passed for public readiness, Japanese and English pages, Twenty CRM, sales health, and origin-lock enforcement.

## CURRENT STATUS - 2026-08-02 Pet Life Movie market-readiness hardening

- Upgraded payments to the official Stripe SDK with signed webhooks, retries, idempotent Checkout/render creation, required delivery email, refunds, and fail-closed readiness across Stripe, Resend, and the internal renderer.
- Added the dedicated Video Factory pet render lane, strict signed-R2 input validation, factual supplied-photo FFmpeg rendering, plan-specific 9:16/16:9/1:1 outputs, and mandatory draft/final human approval gates.
- Added private multi-format delivery ingestion with size/SHA-256 verification, R2 storage, durable deliverable records, delivery email, and short-lived signed downloads.
- Added explicit unchecked consent, private management links, customer deletion, 30-day free/90-day paid retention, expiry enforcement, cleanup API, and R2 deletion support.
- Added migration `20260802020742_pet_life_movie_market_ready.sql`: customer/payment state, one-active-render uniqueness, deliverables, FORCE RLS, Data API revocation, and service-role-only access. All canonical migration and release verifiers include it.
- Verification passed: Next.js production build 552/552 pages, Pet TypeScript, changed-scope ESLint, Vitest 9/9, Python compile/Ruff, targeted pytest, and production-mode Playwright for the five-photo no-account preview flow.
- Production dependency gate is clear locally: Next.js `16.2.12`, Sharp `0.35.3` (including the nested Next.js dependency), full `npm audit` reports 0 vulnerabilities, and the 552/552 production build plus Pet TypeScript/Vitest checks pass.
- Cloudflare API credentials were restored from the approved local SSOT into Coolify. R2 lifecycle rule `pet-life-movie-retention-90d` is enabled for prefix `pet-life-movie/`, read back at 90 days, and preserves the pre-existing bucket rule.
- PR **#664** was squash-merged to main **7eb0f92f**. GitHub release **30730953842** completed Coolify deployment **sdldvalovxfxubub7z13edbn** and passed the public VaaS plus embedded Video Factory verification.
- Production migration `20260802020742_pet_life_movie_market_ready.sql` is applied. `pet_movie_deliverables` was read back with RLS/FORCE RLS, anon/authenticated grants 0, one service-role policy, nine columns, and the one-active-render index.
- Live smoke passed: public Pet page HTTP 200 with the new FFmpeg copy, Video Factory ready HTTP 200/true, anonymous project creation HTTP 201, owner load HTTP 200, deletion HTTP 200, and cleanup read-back HTTP 404. Production HTML reports `checkoutEnabled:false`.

## MONETIZATION DECISIONS

- Wave 1 uses free content APIs for reach and pay-per-request decision packets for immediate machine-to-machine revenue testing.
- Do not add a subscription/API-key billing layer until access-event data shows repeat users or bundle demand.
- Review price, product depth, and licenses after the first 100 premium payment-required events or first 10 paid requests, whichever comes first.
- Candidate Wave 2: metered API keys, monthly research bundles, and commercial redistribution licenses.

## ACTIVE HANDOFF

- Financial authorization required before accepting payment: approve the USDC receiving address and CDP facilitator identity. After approval, configure `X402_PAY_TO_ADDRESS`, `CDP_API_KEY_ID`, and `CDP_API_KEY_SECRET` programmatically and execute one real 0.25 USDC end-to-end purchase.
- After activation, verify HTTP 402 discovery metadata, payment settlement, paid JSON delivery, hashed payment reference persistence, DB bell, and Slack notification.
- Preserve the free catalog/article lane even after paid settlement is enabled.
- Pet Life Movie paid render remains disabled until live Stripe secret/webhook/three Price IDs and Resend are present. The embedded renderer is healthy, but one real paid purchase/refund/delivery proof is still required before launch.
- Merge and release the Pet dependency security gate, then repeat the public readiness and anonymous create/load/delete smoke against the exact deployed commit.
- Rotate the approved Cloudflare API token before market launch because it was exposed in a local diagnostic output. Coolify now has one corrected value per Cloudflare key and R2 lifecycle read-back passed, but the exposed credential must not be treated as safe.
- Japan operator external outreach remains at zero; human approval is required before any send.
- Video Factory may use only the existing approved GPU instance when an actual production render requires it; do not create an additional GPU by default.

## RELEASE REFERENCES

- Content API implementation: PR #659.
- Internal Supabase verification fix: PR #660.
- Single-session DB SSH release fix: PR #661.
- Updated release static guard: PR #662.
- Production deployment: `lbxrxhx5vpcyvpolyzusi8qe`.
- Previous detailed status archive: `docs/handoff-archive/2026-08-02-pre-content-api-task.md`.
