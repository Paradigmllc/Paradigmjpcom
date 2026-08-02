# Paradigmjpcom Task

## CURRENT STATUS — 2026-08-02 Video Factory Commercial Studio + Direct Growth

- Commercial Studioは5テンプレート、拡張Brand Kit、音声/BGM/字幕、Storyboard差分再生成を本番提供済み。PR **#654**、deployment **d6u37wcjeje7wqq7i8o3qfdl**、Postgres 5テーブルのRLS/FORCE RLS/最小権限を確認済み。
- Studio案件からX、Instagram Reels、LinkedIn、コールドメール埋め込みの4媒体クリエイティブを一括作成するDirect Growth OSを実装した。媒体別尺・縦横比・コピー上限・Studio deliverable紐付けを台帳化した。
- キャンペーン、媒体variant、append-only監査eventの3テーブルとRPCを追加した。全テーブルはRLS/FORCE RLS、anon/authenticated権限なし、service-role最小権限。Studio最終承認、4媒体レビュー準備、人間承認、将来日時指定の順に状態遷移を強制する。
- `/ja/admin/video-growth`と`/api/sales/video-growth`にKPI、30秒更新、loading/empty/error、キャンペーン作成、コピー編集、承認、配信予定、手動公開URL、累積成果入力、監査ログを実装した。全mutationはDBベル+Slackへ通知する。
- 外部投稿・メール送信機能は意図的に持たせず、人間承認後に実際の公開URLだけを記録する。未保存コピーのレビュー移行、未承認配信、指標の巻き戻し、納品物不一致、revision競合はDB/APIの両方で拒否する。
- PR **#665**。ESLint警告0、TypeScript、Vitest **7件**、Next.js production build **564ページ**、Playwright PC/390×844 mobile、release-doctorをpass。

## CURRENT STATUS - 2026-08-02 Content API + x402 Wave 1 released

- Outcome: site content is distributed through the website and a public CORS-enabled API, with a pay-per-request x402 product lane. Production main `ba86ab9d`, implementation PR **#659**, fixes **#660-#662**, canonical deployment **lbxrxhx5vpcyvpolyzusi8qe** is finished and healthy.

### Public distribution

- Catalog: `GET /api/v1/content?locale=en|ja`; full article: `GET /api/v1/content/public/[slug]?locale=en|ja`; Markdown: add `format=markdown`.
- Live catalog returns HTTP 200, 26 entries, `partial: false`, CORS `*`. Existing JSON/Markdown return 200, unknown slugs return `CONTENT_NOT_FOUND` 404.
- Bilingual documentation is live at `/en/japan-opportunities/api` and `/ja/japan-opportunities/api`.

### x402 monetization and security

- Paid endpoint: `GET /api/v1/content/premium/[slug]?locale=en|ja`; three bilingual decision packets cost 0.25 USDC on Base using x402 v2.
- Paid delivery is fail-closed with HTTP 503 `X402_NOT_CONFIGURED` until the receiving address and CDP facilitator credentials are approved. Free API delivery remains available.
- No raw client IP or payment signature is stored. Sale completion uses DB bell+Slack. Both tables have RLS/FORCE RLS, PUBLIC/anon/authenticated grants 0, service-role policies 2; canonical DB verification passed 109/109 tables.
- Content Commerce Vitest 7/7, release wiring, TypeScript, ESLint, release-doctor, Linux standalone build, canonical release gates, public/Twenty/sales/origin-lock smoke all passed.

## CURRENT STATUS - 2026-08-02 Pet Life Movie market-readiness hardening

- Upgraded payments to the official Stripe SDK with signed webhooks, retries, idempotent Checkout/render creation, required delivery email, refunds, and fail-closed readiness across Stripe, Resend, and the internal renderer.
- Added the dedicated Video Factory pet render lane, signed-R2 validation, factual supplied-photo FFmpeg rendering, plan-specific 9:16/16:9/1:1 outputs, and mandatory draft/final human approval gates.
- Added private multi-format delivery ingestion with size/SHA-256 verification, R2 storage, durable deliverable records, delivery email, short-lived signed downloads, customer deletion, and 30-day free/90-day paid retention.
- Migration `20260802020742_pet_life_movie_market_ready.sql` adds customer/payment state, one-active-render uniqueness, deliverables, FORCE RLS, Data API revocation, and service-role-only access.
- Verification passed: Next.js build 552/552 pages, Pet TypeScript, ESLint, Vitest 9/9, Python compile/Ruff, targeted pytest, and production-mode Playwright five-photo preview flow.
- R2 lifecycle rule `pet-life-movie-retention-90d` is enabled for prefix `pet-life-movie/`, read back at 90 days, and preserves the pre-existing bucket rule.

## MONETIZATION DECISIONS

- Wave 1 uses free content APIs for reach and pay-per-request decision packets for immediate machine-to-machine revenue testing.
- Do not add subscription/API-key billing until access-event data shows repeat users or bundle demand. Review price, depth, and licenses after 100 payment-required events or 10 paid requests.
- Candidate Wave 2: metered API keys, monthly research bundles, and commercial redistribution licenses.

## ACTIVE HANDOFF

- Direct Growth: latest mainを統合したPR **#665**のdirect-growth、Video Factory test、production-containerをpassさせ、mainへsquash mergeする。
- Direct Growth: canonical `npm run release:prod`でmigrationを適用し、3テーブルのRLS/FORCE RLS、anon/authenticated grant 0、service-role policy/RPCをread-backする。
- Direct Growth: 本番管理画面の認証redirect、API未認証401/認証200、4媒体、外部送信controlなし、DBベル+Slackを確認する。架空キャンペーンや外部投稿は作成しない。
- Financial authorization required before x402 payment: approve the USDC receiving address and CDP facilitator identity, configure secrets programmatically, then execute one real 0.25 USDC purchase and verify settlement, persistence, DB bell, and Slack.
- Preserve the free catalog/article lane after paid settlement is enabled.
- Pet Life Movie: merge/release market-readiness hardening, apply/read back the migration, verify embedded Video Factory, and configure live Stripe/Resend only through authenticated control-plane access. Checkout remains disabled until all dependencies are present.
- Japan operator external outreach remains at zero; human approval is required before any send.
- Video Factory may use only the existing approved GPU instance for an actual production render; do not create another GPU by default.

## RELEASE REFERENCES

- Direct Growth: PR **#665** / branch `feat/video-direct-growth`.
- Content API: PR **#659**; release fixes **#660-#662**; deployment **lbxrxhx5vpcyvpolyzusi8qe**.
- Pet Life Movie market-readiness: PR **#664** / main **7eb0f92f**.
- Previous detailed status archive: `docs/handoff-archive/2026-08-02-pre-content-api-task.md`.
