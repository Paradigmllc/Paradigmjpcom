## CURRENT STATUS - 2026-06-20 Cloudflare 524 origin timeout hardening

- 2026-06-20 追加監査: OpenCode が古い `coolify.appexx.me` を参照する原因は、OpenCode 本体の共通ルール未読込ではなく、dotfiles SSOT 配下の MCP/API registry・運用 runbook・同期対象漏れに古い Coolify/DigitalOcean 情報が残っていたこと。正本は `https://coolify.paradigmjp.com`、Hetzner は `paradigm-prod-01` / server id `142222420` / `178.105.138.55`。
- dotfiles 側で `sync.sh pull` に OpenCode global config 配布を追加し、macOS LaunchAgent `com.paradigm.agent-context-sync` を導入。dotfiles SSOT の AGENTS/CLAUDE/MCP/OpenCode/AI rules 変更はローカル Claude/Codex/OpenCode/Cline/Cursor/Windsurf/Antigravity へ自動反映される。
- Coolify API key / Hetzner API key は Keychain と reference memory に保存済み。API 実値は Task.md に書かない。デプロイコードは `scripts/lib/coolify-env.mjs` で env → reference memory → `~/.claude/mcp.json` → macOS Keychain の順に解決し、default URL は `https://coolify.paradigmjp.com`。
- 524 頻発時の実測: Hetzner metrics で CPU が約 795%・read IOPS 約 26k まで張り付き、SSH banner timeout / Cloudflare 524 / Coolify timeout が同時発生。Hetzner API reset 後、Coolify API・本番 `/api/ready`・`/ja` は HTTP 200 に復旧。
- 恒久対策追加: deploy 前フックが Hetzner CPU を Keychain 経由で確認し、過負荷時は deploy を止める。サイト全体で cron / 定期実行 / 常駐 polling は廃止し、同期・監視・ジョブ起動は webhook / queue / DB event / systemd.path / launchd WatchPaths / ユーザー操作のイベント駆動へ統一。ホストガード script は deploy/recovery event から one-shot 実行する方式に変更し、legacy cron/timer を削除する。大量リストの batch 作成はインライン解析・即時 Twenty 逐次同期を外し、既存 enrichment queue に寄せて HTTP リクエストを長時間占有しない。
- 2026-06-20 追加の cron 廃止実装: Next `instrumentation.ts` から常駐 sales watchdog 起動を削除。`sales-pipeline-watchdog` / `enrichment-worker` は timer loop ではなく webhook/API 起点の one-shot drain に変更。`/api/sales/pipeline/events` は DB polling をやめ Supabase Realtime channel に変更。host disk guard / Twenty sync installer は systemd timer を作らず legacy timer を削除する one-shot service/script へ変更。`pg_cron` 復元 migration は cron 再作成ではなく legacy job disable に変更。
- Verification: `bash -n sync.sh scripts/audit-api-keys.sh opencode-telegram/scripts/entrypoint.sh scripts/agent-context-sync/agent-context-sync.sh`、`node -c claude/hooks/pre-coolify-deploy-load-check.js`、`bash sync.sh pull`、`npm test -- src/lib/sales/enrich.test.ts src/lib/sales/twenty-sync.test.ts`、`npm exec -- tsc --noEmit --pretty false`、`git diff --check` が通過。PR #24 merge 後、Coolify deployment `h1405vdaebfuklh1arm6m59q` は `finished`。本番 `https://paradigmjp.com/api/ready` / `/ja` / `https://coolify.paradigmjp.com/login` は 200。
- Root-cause方向: Cloudflare 524 は Cloudflare が origin に接続できた後、origin が読み取りタイムアウト内に応答できない状態。公開ページが Payload/CMS 読み込みや `/` healthcheck に巻き込まれると、DB/Pooler遅延時に origin 全体が詰まりやすい。
- 公開サイトの恒久対策として、`withPayloadReadFallback` を `PAYLOAD_PUBLIC_READS_ENABLED=1` の明示 opt-in に変更。デフォルトでは Settings/Header/Footer/Home/Services/Pricing/Works/FAQ/Blog の公開 Payload 読み込みを開始せず、静的/ローカル fallback を即返す。
- `/ja` `/services` `/works` `/blog` `/faq` のトップレベル `getPayload` / `@payload-config` import を遅延 import に変更し、CMS opt-in 時以外は Payload 初期化を起動しない。`/pricing` は国判定 headers を使うため dynamic のまま、Payload import だけ遅延化。
- Docker healthcheck を DB/CMS 非依存の `/api/ready` に切り替え。公開トップページや Payload が重くてもコンテナ readiness が巻き添えにならないようにした。
- 検証: `npm test -- src/lib/payload-availability.test.ts src/lib/settings.test.ts`、`npm exec -- tsc --noEmit --pretty false`、`npm run quality:guard`、`npm audit --audit-level=high`、`npm run build` が通過。ローカル production server で `/api/ready` `/ja` `/ja/services` `/ja/pricing` が HTTP 200 / 0.3s 未満で応答。

## CURRENT STATUS - 2026-06-20 RevenueOS/Twenty list collection deep audit hardening

- Audited the Twenty blank-column issue beyond the visible screenshot symptoms: missing/optional CRM metadata was being silently removed during writeback, normalized enrichment columns were not consistently read by karte/coverage/report generation, report-phase coverage used stale company data, Twenty pull was capped to a single page, and the manual sync API only processed three records by default.
- Added a shared company data view so `pain_diagnosis`, `dify_result`, `tech_stack`, `japan_market_audit`, `demo_site`, `visual_evidence`, and form URL discovery are read from normalized columns and legacy `meta` consistently.
- Mirrored diagnosis/report enrichment back into `meta`, refreshed company rows before final source coverage persistence, and marked reports generated so Twenty receives fresh report/form/data-source state.
- Hardened Twenty CRM metadata/writeback: required operational fields now fail loudly if missing instead of being dropped; URL fields are created as LINKS, select/text fields are typed correctly, ZA/GB/CA/AU/IN/SG country options are seeded, and Source Coverage/Data Sources/Data Status/Next Action/Last Error are pinned near the front of the CRM view.
- Scaled Twenty intake/sync for large lists: pull now pages up to 10,000 records with cursor duplicate detection to avoid infinite loops, and `/api/sales/twenty-sync` now supports 60-record batches with `next_cursor_created_at` continuation for thousands of writebacks.
- 整理: the existing public-site/load-timeout workspace changes are kept separate from the Twenty hardening changes where possible; local-only `opencode.json` is ignored because it contains machine-specific absolute paths.
- Verification so far: targeted Vitest for Twenty pull, source coverage, and company karte passed; `npm exec -- tsc --noEmit --pretty false` passed.

## CURRENT STATUS - 2026-06-20 RevenueOS/Twenty load timeout mitigation

- Fixed RevenueOS initial load so `/[locale]/admin/sales` no longer waits for every secondary dashboard dataset before rendering. `getSalesDashboardData()` now wraps expensive Supabase/dashboard reads with a soft fallback timeout (`SALES_DASHBOARD_QUERY_TIMEOUT_MS`, default 2200ms) and returns a degraded dashboard with visible warnings instead of hanging into a 1-minute timeout.
- Reduced initial dashboard payload pressure by lowering non-critical list limits for enrichment jobs, source runs, batches, browser-search runs, Japan-readiness insights, pipeline runs, and video jobs.
- Stopped the client dashboard shell from immediately re-fetching the same heavy dashboard after receiving server `initialData`; the query key now includes locale and passes `report_locale` to `/api/sales/dashboard`.
- Added network timeouts to Sales Supabase fetches (`SALES_SUPABASE_FETCH_TIMEOUT_MS`, default 12000ms) including the direct PostgREST rewrite path.
- Added a Twenty API request timeout (`TWENTY_FETCH_TIMEOUT_MS`, default 8000ms) so Twenty pull/sync fails fast when Twenty is unreachable instead of tying up the request.
- Local degraded-path verification: with unreachable Supabase and `SALES_DASHBOARD_QUERY_TIMEOUT_MS=700`, `/api/sales/dashboard?report_locale=ja` returned HTTP 200 in 1.46s with `status=degraded` and fallback warnings. With unreachable Twenty and `TWENTY_FETCH_TIMEOUT_MS=1000`, `/api/sales/twenty/pull` returned HTTP 502 in 1.05s instead of hanging.
- Verification: `npm exec -- tsc --noEmit --pretty false` and `npm run build` passed.

## CURRENT STATUS - 2026-06-19 Site-wide dynamic delivery quality reset

- Reworked the public site from a static-looking animated shell into a dynamic, CMS-first business site: `/[locale]`, about, services, service details, pricing, works, contact, legal/privacy, LP, agency, and video routes are now dynamic-rendered where applicable.
- Replaced the over-animated shared inner-page hero and MagicUI-heavy CTA with restrained editorial components inspired by premium Japanese theme-site information architecture, without copying external assets/design.
- Toned down global Aurora/glass/glow styling so legacy `paradigm-glass` pages render as solid 8px business cards with low-motion shadows and no negative display letter spacing.
- Added CMS-empty fallback content for services, pricing, and works from existing `src/lib/data.ts`, so a fresh/empty DB still shows delivery-ready content while live Payload data remains the priority.
- Hid Dify chatbot across public marketing pages and kept conversion focused on contact/consultation CTAs.
- Fixed the dynamic-site Timeout risk by bounding public Payload/CMS reads with a short fail-soft fallback (`PAYLOAD_PUBLIC_READ_TIMEOUT_MS`, default 1200ms) plus a lightweight DB TCP probe before Payload initialization. Settings/Header/Footer, homepage, services, pricing, works, FAQ, blog list, and blog detail no longer hold the whole page open when Payload DB is slow or unavailable.
- DB-down verification: with `DATABASE_URI=postgresql://payload:payload@127.0.0.1:1/payload`, `/ja` returned 200 in 245ms and `/ja/services`, `/ja/pricing`, `/ja/works`, `/ja/blog` returned 200 in 16-25ms. Server logs no longer emit Payload connection stack traces or notification noise for public fallback reads; Playwright confirmed `/ja/services` and `/ja/pricing` render visible fallback content with `overflowX=0`.
- Verification: `tsc --noEmit`, `git diff --check`, `npm audit --audit-level=high`, `npm run quality:guard` (0 errors), targeted Vitest suite (29/29), `npm run build`, and Chrome screenshots for `/ja/services`, `/ja/pricing`, `/ja/works`, `/ja/contact` desktop/mobile all passed with `overflowX=0`, `chatbotButtons=0`, `consoleErrors=[]`, and no empty CMS text.

## CURRENT STATUS - 2026-06-19 RevenueOS audit hardening

- Fixed mojibake in RevenueOS outreach DB bell / Slack notification copy for CAPTCHA handling, first-5 approval, and form submission completion.
- Split Twenty sync helper responsibilities so RevenueOS quality guard no longer blocks on 500+ line Twenty files.
- Root TypeScript pre-check now excludes the separate `astro-demo` app from the Next.js tsconfig boundary.
- Pinned vulnerable transitive `hono` and `undici` versions through npm overrides and regenerated `package-lock.json`.
- Added a build-time-only Payload placeholder secret in `scripts/build-next.mjs` so disabled Payload reads do not fail page-data collection when local envs are absent.
- Repaired the mojibake handoff entry below so future agents can read the latest RevenueOS data collection status.

## CURRENT STATUS - 2026-06-19 Site quality reset

- Replaced the over-animated Aurora/MagicUI homepage with a restrained Revenue OS homepage for Japanese and English routes.
- Reduced global glow/mesh intensity and removed negative display letter spacing from the shared typography primitive.
- Hid the Dify chatbot on locale home routes and changed cookie consent from a full-width bottom bar to a smaller floating notice.
- Verification in progress: TypeScript, targeted tests, quality guard, build, and Chrome screenshots for `/ja` and `/en`.

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

- Twenty Companies上でRevenueOS取得データを確認できるよう、`Data Status` / `Data Sources` / `Next Action` / `Last Error` をCRM表示順とTwenty metadata DB反映対象に追加。
- enrichment結果のsource名を統一し、Wappalyzer / SSL Labs / form discovery / Cloudflare Radar / Mozilla Observatory / Stagehandなどの取得結果と失敗理由がmetaへ正しく残るよう修正。
- source_qualityの失敗・timeoutをSource Coverageの`error`として可視化し、Twenty同期時にも最終エラーを反映。
- Twentyからのpullは不正なreport/form URLを信用せず、低カバレッジ・古いデータ・source error・未生成artifactを検出した場合は再取得/診断レポート生成キューへ戻す。
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
