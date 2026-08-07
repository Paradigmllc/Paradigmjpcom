## ACTIVE HANDOFF - 2026-08-07 開発環境をサーバー側へ移設 / YouTube パイプライン継続

### まずこれを読む
作業場所は**ローカルではなくサーバー上**に移った。`paradigm-prod-01` の `/opt/dev/paradigmjpcom`（ブランチ `codex/quote-recovery-vertical-saas`）。
入り方は private リポジトリ `Gracecom1/paradigm-workstation` を clone して `CONNECT.ps1`（Win）/ `connect.sh`（Mac・Linux）を実行するだけ。接続情報と鍵はそのリポジトリにある（**public 化厳禁**）。

移設理由: 操作対象（Coolify / Hetzner / Vast.ai / Supabase / Twenty）が全てリモートで、ローカルに置く意味がない。テストはローカル 114 秒に対しサーバー 2 秒。動画レンダリングは CPU を数分占有するのでサーバー向き。

- Claude Code のプロジェクトキーは `-opt-dev-paradigmjpcom`。**作業ディレクトリのパスを変えると会話履歴が別プロジェクト扱いになる**ので変えないこと。
- 過去の会話ログと memory は `/root/.claude/projects/-opt-dev-paradigmjpcom/` にある。続きは `/resume` で選ぶ。
- git 管理外のローカル限定ファイル（`creator/*` 一式、`scratch/`、`scripts/revenueos-readiness-gate.mjs`、`scripts/lib/sales-supabase-client.mjs`、`scripts/unlock-payload-users.sh`、`.env.local`、`.env.supabase`）は転送済み。`creator/*` は Task.md 記載のリリースブロッカー通り、この法人リポジトリにコミットしてはいけない。

### 次のアクション（優先順）
1. **Supabase 起動** — 最も詰まっている。Coolify にサービス定義済み（service `kw7m6sd5otbouk4h0ydpniwn`、5コンテナに削減、既存の anon/service キーがそのまま通るよう JWT シークレットを引き継ぎ済み）。起動操作のみ残。`.env.local` の URL は `supabase.paradigmjp.com` に修正済み（`supabase.appexx.me` ではない）。
2. **視覚素材の実装** — 現状の動画はテキスト主体で視覚的訴求が不足。Openverse と Wikimedia が API キー不要で使えることは確認済み。SVG 図表と ComfyUI 経路は未着手。
3. **投稿層** — YouTube Data API OAuth + private アップロード + Telegram 承認通知。

### 踏んだら壊れる箇所
- **本番サイト paradigmjp.com と Twenty CRM が同じサーバーに同居**している。重い処理の前に必ず `free -h`。このサーバーで `limits_memory`（設定値）を空き容量と読み違えて本番を 2 回落としている。実使用量を見ること。
- `paradigm-workstation` の `.gitattributes` にある `id_ed25519 -text` を消すと、clone 時に git が秘密鍵を CRLF に変換して壊す。Windows では鍵のパーミッションを絞らないと OpenSSH が鍵を無視する（`CONNECT.ps1` が実施）。
- Coolify API は権限不足のエンドポイントで 403 ではなく **200 + 空配列**を返す。空配列を「リソースが無い」と読むと誤診する。
- BullMQ で `priority` 付きジョブは `wait` ではなく `prioritized` に入る。`wait`/`active`/`delayed` が 0 でも滞留ゼロとは限らない（実際に 328,383 件の未処理ジョブを空と誤認しかけた）。
- API キーの正典は `~/.claude/projects/**/memory/reference_api_keys.md`。`**` の通り**全プロジェクト横断で探す**こと。Hetzner や Coolify の鍵は別プロジェクト配下にある。

## CURRENT STATUS - 2026-06-19 Astro demo full-stack HP delivery quality

- Replaced the generated demo renderer for `/{slug}` and `/demo/{slug}/{section}` with a delivery-quality full-site renderer instead of redirecting to broken static-looking lower pages.
- Added full-site data generation for home, services, pricing, cases, FAQ, about, blog, contact, privacy, terms, and tokushoho pages.
- Added industry-specific service/case/pricing copy for restaurant, construction, clinic, beauty, retail, advisory, and local-service archetypes.
- Added an Astro server API endpoint at `/api/inquiries` so contact forms POST through the demo app and emit tracking to `paradigmjp.com/api/track`.
- Repaired premium demo Japanese copy and kept industry-specific visual assets/colors.
- Local verification: `npm run build` in `astro-demo` passed; Playwright checked home/services/contact/pricing/FAQ for HTTP rendering, no mojibake, no horizontal overflow; contact form returned success.
- Production deploy: pushed `4786628` and `b73d835`, rebuilt `astro-demo:latest` on `paradigm-prod-01`, and restarted the `astro-demo` container.
- Public verification: `/demo/sample-restaurant`, `/services`, `/contact`, `/pricing`, `/faq`, and `/sample-restaurant` all returned clean Japanese, no mojibake, no desktop overflow; contact form returned success; mobile services page has no horizontal overflow.
- Screenshot evidence: `%TEMP%\\astro-demo-fullsite-contact.png`, `%TEMP%\\astro-demo-prod-fullsite-contact-final.png`, `%TEMP%\\astro-demo-prod-fullsite-mobile-final.png`.

## CURRENT STATUS - 2026-06-19 RevenueOS Twenty country/template routing repair

- Fixed Twenty -> Supabase intake so foreign ccTLDs such as `.co.za` infer the correct target country instead of falling back to `JP/ja`.
- Fixed `salesScopeFromCountry` so English-locale countries keep their own ISO target country (`ZA`, `CA`, etc.) instead of becoming `US`.
- Fixed company upsert to persist `report_locale`, `target_country`, and `template_variant` columns, not only `meta.routing`.
- Fixed Twenty writeback to send country/region/industry/source/status plus visible `Source Coverage` and `Data Sources` counts.
- CRM metadata normalization now pins important Twenty columns near the front: Name, Domain, country, Source Coverage, Data Sources, Data Status.
- Repair-routing now corrects already-bad foreign records that were saved as `JP/ja/website_diagnostic`.
- Verification: `npx tsc --noEmit --pretty false --skipLibCheck --types node -p tsconfig.json`; `npm test -- src/lib/sales/routing.test.ts src/lib/sales/locale-scope.test.ts src/lib/sales/twenty-sync.test.ts src/lib/sales/source-coverage.test.ts`; `git diff --check`.

## CURRENT STATUS - 2026-06-18 RevenueOS outreach quality gate

- Implemented shared outreach readiness gate for RevenueOS/Twenty/outreach worker.
- No diagnostic report URL now blocks outreach instead of falling back to `https://paradigmjp.com`.
- RevenueOS CRM tab now shows an operational queue: send-ready / review-required / blocked.
- Twenty company karte summary now includes `Outreach quality gate` and `Next action`.
- Verification: `npm test -- src/lib/sales/outreach/readiness.test.ts src/lib/sales/form-message.test.ts` and `npx tsc --noEmit --pretty false --skipLibCheck --types node -p tsconfig.json`.
## CURRENT STATUS - 2026-06-18 RevenueOS Twenty data collection GUI/retry

- Twenty Companies荳翫〒RevenueOS蜿門ｾ励ョ繝ｼ繧ｿ繧堤｢ｺ隱阪〒縺阪ｋ繧医≧縲～Data Status` / `Data Sources` / `Next Action` / `Last Error` 繧辰RM陦ｨ遉ｺ鬆・→Twenty metadata DB蜿肴丐蟇ｾ雎｡縺ｫ霑ｽ蜉縲・
- enrichment邨先棡縺ｮsource蜷堺ｸ堺ｸ閾ｴ繧剃ｿｮ豁｣縺励仝appalyzer/SSL Labs/form discovery/Cloudflare Radar/Mozilla Observatory/Stagehand縺ｪ縺ｩ縺ｮ蜿門ｾ礼ｵ先棡縺ｨ螟ｱ謨礼炊逕ｱ縺稽eta縺ｸ豁｣縺励￥谿九ｋ繧医≧縺ｫ縺励◆縲・
- source_quality縺ｮ螟ｱ謨・timeout繧担ource Coverage縺ｮ`error`縺ｨ縺励※蜿ｯ隕門喧縺励ゝwenty蜷梧悄譎ゅ↓譛邨ゅお繝ｩ繝ｼ繧ょ渚譏縲・
- Twenty縺九ｉ縺ｮpull縺ｯ荳肴ｭ｣縺ｪreport/form URL繧剃ｿ｡逕ｨ縺帙★縲∽ｽ弱き繝舌Ξ繝・ず繝ｻ蜿､縺・ョ繝ｼ繧ｿ繝ｻsource error繝ｻ譛ｪ逕滓・artifact繧呈､懷・縺励◆繧画里蟄倥Μ繧ｹ繝医〒繧ょ・蜿朱寔/險ｺ譁ｭ繝ｬ繝昴・繝育函謌舌く繝･繝ｼ縺ｸ謌ｻ縺吶・
- Verification: `npm test -- src/lib/sales/source-coverage.test.ts src/lib/sales/twenty-sync.test.ts src/lib/sales/enrich.test.ts src/lib/sales/external-studio-sync.test.ts`; `npx tsc --noEmit --pretty false --skipLibCheck --types node -p tsconfig.json`; `git diff --check`.

## CURRENT STATUS - 2026-06-18 RevenueOS production recovery

- Production RevenueOS deployed at `5fba242` and `/ja/admin/sales` returns HTTP 200.
- `/api/sales/health` is healthy for Supabase OSS, Payload DB pool, FlareSolverr, Dify, Trigger.dev, Crawl4AI, Stagehand, Steel, Crawlee worker, and Outreach worker.
- Coolify env routing repaired: Sales Supabase uses direct PostgREST compatibility, Crawl4AI/Steel use the live Docker service names.
- Twenty writeback verified on production: `synced=3`, `failed=0`, `rateLimited=false`, enforced limit `3`.
- Visual screenshot evidence verified on production: Figma screenshot saved to R2 through `outreach_worker`, and `sales_companies.meta.visual_evidence.screenshots.desktop` plus `visual_evidence` column were updated.
- Applied/repaired `sales_atomic_screenshot_append` on OSS Supabase and fixed the migration SQL so future restores keep the same behavior.
- Remaining non-blocking health note: optional envs for some paid/manual sources are still missing (`DIFY_DIAGNOSIS_API_KEY`, `DIFY_FORM_MESSAGE_API_KEY`, `NOTION_API_KEY`, `GBIZ_API_TOKEN`, `GOOGLE_PSI_API_KEY`, `HUNTER_API_KEY`). Core pipeline is green; those sources remain optional until keys are supplied.

## CURRENT STATUS - 2026-06-19 Astro demo production recovery

- `https://demo.paradigmjp.com/` restored through Traefik and returns HTTP 200.
- Fixed Astro compatibility routes for generated links:
  - `/demo/{slug}` and `/demo/{slug}/{section}` now redirect to the existing canonical demo/company section pages.
  - `/{lang}/{industry}/{appeal}` now redirects to `/demo?lang=...&industry=...&appeal=...`.
- Rebuilt and restarted the `astro-demo` production container with the new routes.
- Fixed the persistent Traefik file-provider service target for `astrodemo-svc` from `http://172.17.0.1:4321` to `http://astro-demo:4321`; backup saved on host as `/data/coolify/proxy/dynamic/paradigmjp.yml.bak-20260618T221703Z-astrodemo`.
- Verification:
  - `npm run build` in `astro-demo`: passed.
  - Container routing: 64/64 industry demo URLs returned 200 after redirects.
  - Public routing: 64/64 `https://demo.paradigmjp.com/{ja,en}/{industry}/{appeal}` URLs returned 200 after redirects.
  - Public sample routes passed: `/`, `/ja/accounting/brand`, `/en/restaurant/sales`, `/demo/astrowind-demo/services`.

## CURRENT STATUS - 2026-06-19 Astro demo visual CSS recovery

- Fixed `/demo` visual breakage caused by React-style `className` attributes in an Astro page. The public HTML now emits `class=` and `className=0`.
- Fixed `DemoLayout` theme variables so `--brand`, `--brand-dark`, and `--brand-light` render actual color values instead of `{accentColor}` literals.
- Added the missing dark page base (`bg-[#050510] text-white`) so white text and glass panels render correctly.
- Rebuilt and restarted the production `astro-demo` container.
- Verification:
  - `npm run build` in `astro-demo`: passed.
  - `https://demo.paradigmjp.com/demo`: HTTP 200.
  - Public HTML checks: `className=0`, `accentLiteral=0`, `--brand: #7c3aed`.
  - Chrome headless screenshot saved at `C:\Users\apple\AppData\Local\Temp\demo-paradigmjp-demo-fixed.png` and visually checked.
## CURRENT STATUS - 2026-08-02 Japan market operator Wave 1

- Read the two shared strategy chats and converted the core model into an executable external Japan market operator offer.
- Standardized the public package: $5,000 Paid Market Validation (credited), $20,000 total Japan Launch, then $2,500/month + 10% of Net Collected Japan Sales.
- Revalidated the historic candidate lists against current public sources; rejected brands with existing Japan distribution/export evidence.
- Added five evidence-backed Wave 1 prospects to production RevenueOS: CHEFCLEAN, Little Archive / DONGJIN BEDDING, B.FTER / Another Day, HOLEN and QURV / F.R.P. Industry.
- Updated the permission-first outbound draft to ask to send a three-page Japan Opportunity Memo; no external messages have been sent.
- Added `docs/knowledge/japan-market-operator-playbook.md` with ICP, package, outreach sequence, first-wave list and MSA/SOW/KPI-conditional exclusivity structure.
- Active handoff: run human review on the five memos, approve the first two sends, then route positive replies to the Paid Market Validation SOW in Docuseal.

## ACTIVE HANDOFF - 2026-08-02 Vertical SaaS direction

- Product direction is fixed on an industry-specific vertical SaaS; the global PLG/OSS-wrapper consumer SaaS discussion is explicitly out of scope for this initiative.
- Default first wedge: quote follow-up and dormant-opportunity recovery for Japanese industrial machinery manufacturers, machinery trading companies, and adjacent equipment businesses.
- Go-to-market model: one shared workflow engine, prove paid retention in one narrow industry, then expand only to adjacent industries that can reuse at least 80% of the product.
- Pricing hypothesis to validate: 14-day reverse trial, Starter at JPY 29,800/month, Team at JPY 49,800/month, annual prepayment, and optional migration/onboarding packages.
- Acquisition hypothesis: distribute a no-login quote-neglect diagnostic to companies with visible intent signals such as trade-show participation, quote-request forms, sales-operations hiring, or multiple sales offices; prioritize product-qualified usage over raw registrations.
- Existing RevenueOS company collection, signal scoring, CRM, pipeline, notifications, and operational monitoring should be reused for acquisition operations. The customer-facing vertical SaaS must remain a separately scoped product surface and data model.
- MVP scope was validated against current manufacturing workflow and CRM/quote-management competitors. The initial production slice deliberately validates the riskiest assumptions before building tenant/auth/billing: no-login CSV diagnostic, explainable recovery priority, aggregate-only measurement, and qualified 14-day pilot inquiry.
- Implemented `/[locale]/quote-recovery` with Japanese Stripe-style responsive UI, CSV upload/sample flow, visible parse errors, aging buckets, monetary KPIs, explainable candidate ranking, loading/empty/error states, and a pilot form.
- Implemented `/api/quote-recovery/diagnose` and `/api/quote-recovery/pilot` with Zod validation, request-size/rate limits, structured error responses, Supabase persistence, and DB + Slack notification for pilot inquiries.
- Added `migration_059_quote_recovery_validation.sql`: aggregate diagnostic events and pilot inquiries only, RLS enabled, anon/authenticated grants revoked, service-role policies explicit. Raw quote rows are never persisted by this slice.
- Added unit coverage for Japanese/quoted CSV parsing, required-field rejection, rule-based prioritization, and exclusion of closed quotes. `npx tsc --noEmit --pretty false` passes. Vitest is currently blocked before test discovery by the pre-existing incomplete `node_modules/@vitest/utils` installation (`dist/constants.js` missing); repair dependencies without overwriting the user's in-progress package/lock changes, then rerun.
- Validation gates before building the authenticated SaaS core: confirm actual CSV import completion, candidate-ranking acceptance, pilot conversion, and repeated weekly use. Only then add organization membership, quote/activity persistence, reminders, invites, and billing; email auto-send, quote creation, OCR, and black-box AI scoring remain out of scope.
## CURRENT STATUS - 2026-08-02 AI creator direct-pay vertical slice

- Character direction is fixed: no central rose/gun tattoo; only the supplied floral tattoo reference on the right lateral abdomen/flank. Added the safe clothed master at `public/creator/character-master-v1.png`.
- Added an age-gated creator LP at `/[locale]/creator` with DB-backed offers, empty/error/loading states, and external Solana Pay USDC checkout.
- Added server-side checkout creation with a unique Ed25519 reference, private status token, finalized on-chain USDC validation, expiry handling, entitlement creation, and one-use Telegram invite delivery.
- Added authenticated creator operations at `/[locale]/admin/creator` plus `/api/creator/content-jobs`; jobs persist in Supabase and can dispatch to the existing n8n/Vast.ai/ComfyUI lane with `start-on-demand-stop-after-upload` policy.
- Added Supabase migration `20260802022541_creator_platform_foundation.sql`; all five tables have RLS enabled, anon/authenticated access revoked, and service-role-only grants.
- Crossmint was excluded because its official review policy prohibits adult content including qualifying AI-generated content. MoonPay was excluded because its terms forbid certain sexually oriented materials/services. Telegram crypto is kept off-platform: the external LP uses Solana Pay, while Telegram only receives an invite after validated payment.
- Verification: creator payment core TypeScript files passed an isolated TypeScript compile before dependency repair was attempted; `git diff --check` passes. Full Vitest/build remain blocked by the pre-existing incomplete `node_modules` (`@vitest/utils/dist/constants.js`, React, Payload and other packages missing). `npm ci` and a no-save TypeScript restore both stalled without output and were stopped; tracked package/lock changes were not overwritten.
- Release blocker: current branch is the unrelated `codex/quote-recovery-vertical-saas` with user-owned dirty `package.json`/`package-lock.json` changes. Do not commit this creator slice into that branch or deploy adult content under the Paradigm corporate domain. Move the listed creator files into a dedicated repo/domain, configure `CREATOR_SOLANA_RECIPIENT`, Telegram bot/chat, Solana RPC, and creator content webhook, then apply the migration and run build/E2E before release.

## CURRENT STATUS - 2026-08-07 YouTube 複数チャンネル自動運用パイプライン

### 実装済み (src/lib/youtube/)
- **形式レジストリ** (`formats/`): チャンネル形式を型ではなくデータとして定義。`definitions/` に1ファイル追加すれば新形式が増える。現在6形式 (manim解説 / ニュース / 漫画風 / キャラアバター / アニメ風 / 英語Shorts)。
- **品質ゲート** (`quality/`): 収益化剥奪を防ぐ公開前検査。反復性(文字3-gram Jaccard + 構成指紋)、情報密度、未検証の断定、メタデータ整合、合成メディア開示を機械判定。inauthentic content 判定はチャンネル全体の反復性で決まるため、直近N本との差分を測る設計。
- **リサーチ層** (`research/`): Google News RSS + Hacker News (どちらも無認証)。Reddit は 2026-08 時点で匿名JSONが403のため OAuth 必須。YouTube Data API は quota.ts が太平洋時間の暦日で管理 (search=100 units)。
- **台本層** (`script/`): 構成案 → シーンごと本文 → メタ情報 の3段階逐次生成。一括生成では qwen2.5:14b が390〜490文字で頭打ちになり密度不足で通らなかったため。逐次化で985〜1284文字に到達しゲート通過を実測。
- **レンダリング** (`render/`): HyperFrames コンポジション生成。visualSpec の構造 (timeline/columns/stat/quote) を解釈し、項目ごとのビート、edge-tts の発話区間から同期字幕、全編背景モーションを付与。
- **審査層** (`review/`): 公開前の人間承認。ゲート通過 ≠ 公開可能 (実測でゲート通過台本が出典に無い税率を創作) のため必須。migration_060_youtube_review.sql + /api/youtube/review + /[locale]/admin/youtube。

### 検証状況
- 157テスト通過 / 型エラー0。`npm test -- src/lib/youtube` で実行可能。
- 実データ (Google News 実記事 → 台本 → 3分43秒の動画) を通しで生成済み。
- LLM は OSS 既定 (`YOUTUBE_SCRIPT_LLM=oss`、OpenAI互換)。Dify Cloud は環境変数で切替。

### 次のアクション
1. 視覚素材の実装 — 現状はテキスト主体で視覚的訴求が不足。無料経路(Openverse / Wikimedia / SVG図表)と ComfyUI 経路の両方が未着手。
2. Supabase 起動 — Coolify にサービス定義済み (5コンテナに削減、既存キーが通る env 設定済み)。起動操作のみ残。
3. 投稿層 — YouTube Data API OAuth + private アップロード + Telegram 承認通知。

### インフラで解決した問題 (2026-08-07)
- **Twenty CRM の worker が server として起動していた** (`/opt/twenty-compose.yml` に command 指定漏れ)。2026-06-17 から328,421件のジョブが未処理で蓄積し、redis が 10.39GB まで肥大、swap枯渇・load average 332・OOM Killer 発動の原因になっていた。`command: ["node", "dist/queue-worker/queue-worker"]` の追加で解決。redis 129MB / load 1.64 に回復。
- node_modules の破損は `npm ci` で解消済み。
