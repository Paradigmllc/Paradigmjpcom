# Paradigmjpcom Task

## CURRENT STATUS — 2026-08-02 Japan Market Operator Operations OS（実装・release候補検証完了）

- Wave 1の案件ボードを、候補収集から契約獲得・SKU準備・運用・精算・KPI・終了処理まで一貫して扱う実務OSへ拡張した。同一企業の再契約はEngagement番号と不変のoffer snapshotで分離し、操作者は認証済みserver principalから記録する。
- 外部送信の中央抑止を実装した。全送信経路はグローバル配信停止を確認し、operator案件は宛先・チャネル・本文SHA-256が完全一致する一回限りの承認を送信直前に消費する。dry-runは承認を消費せず、DB障害時のlive送信はfail-closedとする。
- 証跡、役割割当、申請/承認、送信許可、配信停止、収集ソース、契約、請求/入金、SKU法規・通関、成果物/変更依頼、月次精算/明細、受注/在庫/返品/CS、インシデント、KPI/独占、offboarding、retryable outboxをRLS強制・service-role最小権限で追加した。
- 案件の直接更新はDB triggerで拒否し、revision付きRPCだけが監査eventと原子的に更新する。DocuSealはメール/SMSを送らない下書きを冪等に生成して契約SSOTへ紐付け、Stripe webhookは入金証跡・30日以内の検証費充当・請求台帳を冪等に更新する。
- 承認済み収集ソースのinventory run、SLA期限通知、DBベル+Slack、指数backoff/dead-letter outboxを既存daily-report実行経路へ統合した。email outboxは未対応として明示拒否し、ブランドへの外部送信0件を維持する。
- 管理画面に認証主体、証跡必須gate、完全一致送信申請/承認、実務レコード登録、loading/empty/error、件数/状態要約を追加した。DocuSeal下書きURLを外部共有する場合も中央送信承認を通す。
- SQL全chainを同一transaction内で2回再生してROLLBACKし、直接UPDATE拒否とRPC更新成功を実Postgresで確認した。TypeScript、対象ESLint、Vitest 24件、品質guard 0 error、Next.js production build、認証済みPlaywright E2Eをpassした。
- Active handoff: PR/merge後にcanonical releaseを実行し、本番DBのRLS/権限/RPC、認証API、管理画面fingerprint、dry-run許可と未承認live送信拒否をread-backする。検証中も外部メッセージは送らない。

## CURRENT STATUS - 2026-08-02 Content API + x402 Wave 1 released

- Outcome: site content is distributed through the website and a public CORS-enabled API, with a pay-per-request x402 product lane.
- Production main: `ba86ab9deb6c8d0f9b03dbb93cbcf0c2840896f4`. Implementation PR: #659. Release reliability fixes: #660, #661, #662.
- Canonical deployment: `lbxrxhx5vpcyvpolyzusi8qe`; Coolify status `finished`. The matching production container is healthy.

### Public distribution

- Catalog: `GET /api/v1/content?locale=en|ja`; full article: `GET /api/v1/content/public/[slug]?locale=en|ja`; add `format=markdown` for Markdown.
- Production catalog returns HTTP 200, 26 entries, `partial:false`, and CORS `*`. Unknown slugs return `CONTENT_NOT_FOUND` with HTTP 404.
- Bilingual documentation is live at `/en/japan-opportunities/api` and `/ja/japan-opportunities/api`.

### x402 monetization

- Paid endpoint: `GET /api/v1/content/premium/[slug]?locale=en|ja`; three bilingual decision packets are seeded at 0.25 USDC per request on Base using x402 v2.
- The paid route remains fail-closed with HTTP 503 `X402_NOT_CONFIGURED` until the receiving address and CDP facilitator credentials are approved and stored in the runtime secret store. Free API delivery remains available.
- `OPTIONS` returns HTTP 204 and exposes the required payment headers. No raw client IP or payment signature is stored; completed sales notify DB bell plus Slack.

### Production data and validation

- `content_products`: 6 active rows. `content_access_events`: 8 verification events and 0 paid events.
- Both tables have RLS and FORCE RLS, zero PUBLIC/anon/authenticated grants, and two service-role policies. Canonical DB verification passed 109/109 tables.
- Vitest 7/7, TypeScript, changed-scope ESLint, release-doctor, Linux standalone build, canonical release gates, and production smoke passed.

## CURRENT STATUS - 2026-08-02 Pet Life Movie market-readiness hardening

- Upgraded payments to the official Stripe SDK with signed webhooks, retries, idempotent Checkout/render creation, required delivery email, refunds, and fail-closed readiness across Stripe, Resend, and the internal renderer.
- Added the dedicated Video Factory pet render lane, strict signed-R2 input validation, factual supplied-photo FFmpeg rendering, plan-specific 9:16/16:9/1:1 outputs, and mandatory draft/final human approval gates.
- Added private multi-format delivery ingestion with size/SHA-256 verification, R2 storage, durable deliverable records, delivery email, and short-lived signed downloads.
- Added explicit unchecked consent, private management links, customer deletion, 30-day free/90-day paid retention, expiry enforcement, cleanup API, and R2 deletion support.
- Added migration `20260802020742_pet_life_movie_market_ready.sql`: customer/payment state, one-active-render uniqueness, deliverables, FORCE RLS, Data API revocation, and service-role-only access. All canonical migration and release verifiers include it.
- Verification passed: Next.js production build 552/552 pages, Pet TypeScript, changed-scope ESLint, Vitest 9/9, Python compile/Ruff, targeted pytest, and production-mode Playwright for the five-photo no-account preview flow.
- Cloudflare API credentials were restored from the approved local SSOT into Coolify. R2 lifecycle rule `pet-life-movie-retention-90d` is enabled for prefix `pet-life-movie/`, read back at 90 days, and preserves the pre-existing bucket rule.
- Release handoff: merge and run the canonical deployment; apply/read back the migration; verify the embedded internal Video Factory; configure live Stripe products/webhook and Resend only through authenticated control-plane access. Checkout remains disabled until every dependency is present, so customers cannot be charged prematurely.
## MONETIZATION DECISIONS

- Keep free content APIs for reach and pay-per-request decision packets for immediate machine-to-machine revenue testing.
- Do not add subscription/API-key billing until access-event data shows repeat users or bundle demand.
- Review price, product depth, and licenses after the first 100 premium payment-required events or first 10 paid requests.
- Candidate Wave 2: metered API keys, monthly research bundles, and commercial redistribution licenses.

## ACTIVE HANDOFF

- Japan operatorは外部送信0件のまま。release後、CHEFCLEAN→HOLENの順に証跡・memo・人間承認を完了し、宛先/チャネル/本文が完全一致する一回限りの許可を別担当者が承認する。中央送信guardを迂回せず、全実務記録を同じ案件IDへ保存する。
- Financial authorization is required before accepting x402 payment. After approval, configure `X402_PAY_TO_ADDRESS`, `CDP_API_KEY_ID`, and `CDP_API_KEY_SECRET` programmatically and execute one real 0.25 USDC purchase.
- After x402 activation, verify discovery metadata, settlement, paid delivery, hashed payment reference persistence, DB bell, and Slack. Preserve the free content lane.
- Pet Life Movie paid render remains disabled until the GPU renderer URL and all three Stripe Price IDs are configured.
- Video Factory may use only the existing approved GPU instance for an actual production render; do not create an additional GPU by default.

## RELEASE REFERENCES

- Content API implementation: PR #659.
- Internal Supabase verification fix: PR #660.
- Single-session DB SSH release fix: PR #661.
- Updated release static guard: PR #662.
- Content production deployment: `lbxrxhx5vpcyvpolyzusi8qe`.
- Previous detailed status archive: `docs/handoff-archive/2026-08-02-pre-content-api-task.md`.
