## ACTIVE PLAN - 2026-06-20 営業OS全面強化（Phase 0-9・壁打ち合意済み）

不変前提: WW-EVENT 厳守＝cron/n8n/pg_cron 不使用・Trigger.dev イベント駆動 one-shot のみ。
決定: オーケストレータ維持＋完了イベント再開 / デモ=フルサイト一本化 / Dify=queue隔離かつ本文正本 / Twenty=category集約＋deep link / Telegram=webhook修復＋OSS deep link＋Realtime push / インフラ=重ワーカー分離＋Upstash＋ISR/CDN。

DEPLOY 2026-06-20: PR #30 → main(677a37c)→Coolify deploy(voqjuu09fu99qcyayil4hahm) status=finished→本番 /api/ready=200・/ja=200・demo/demo=200・app running:healthy（直後502はコンテナ起動窓で即回復）。0-1/1-2a/1-3/1-4/2-1/2-2/2-4/3-1/3-2/3-4/6-1/7-1/7-2/8-2/9-10(file) 本番反映済み。追補: Phase7 unit test + 6-3 doc(diagnostic-report-generation-pipeline.md)。

Phase 0 — Dify doc の n8n残滓除去
- [x] 0-1 dify-cloud-runtime.md を Trigger.dev `sales-video-pipeline` 経由へ書換え／video-pipeline の n8n_* は legacy DB列と明示（runtime n8n=0）

Phase 1 — Dify を queue job 化（retry分離）
- [ ] 1-1 ※監査結果: `EnrichmentJobType` に `dify_diagnosis`/`report_personalize` が既存。新規列は不要、`enqueueCompanyEnrichment` を jobType 受け取りに拡張する方針へ変更
- [ ] 1-2 enrichment-jobs.ts に Dify subtype handler（confidence≥0.7・直接INSERT禁止）※Phase2/3 として runner 内に既存。retry を job 単位に分離するのが残作業
  - [x] 1-2a enqueueCompanyEnrichment を jobType 受け取りに拡張（隔離 job enqueue 基盤・後方互換・tsc clean）
- [x] 1-3 karte_generate の inline runEnrichmentJobs(1) 撤去→triggerEnrichmentRunner dispatch + waiting_external（HTTP長時間占有=524主因を解消・tsc clean）
- [x] 1-4 report_generate の karte→report 文面生成を配線（autoPersonalize を processReportPhase へ・meta.personalized_copy 永続化・tsc clean）※Phase 6-1 と同時解決

Phase 2 — 完了イベント再開（オーケストレータ維持）
- [x] 2-1 completeJob の自動再開を dispatchSalesPipelineRun（Trigger.dev dispatch・fallback内蔵）へ変更（既存 inline runSalesPipelineLocally から昇格・tsc clean）
- [x] 2-2 enrichment 完了で該当 run を Trigger.dev 経由再開（runner プロセスから隔離）
- [ ] 2-3 video / reply / demo 完了でも再開発火 ※reply=post-outreach router 既存・video=sales-video-pipeline 既存・demo=report phase 経由で再開。Dify 単独 job の再開のみ残
- [x] 2-4 watchdog restartStaleSalesPipelineRuns は stale 保険として既存（startSalesPipelineWatchdog は no-op 化済み・tick の recoverStaleRuns gating 済み）

Phase 3 — デモHp フルサイト一本化＋一級ステップ化
- [x] 3-1 LP系統撤去: demo.astro を index 化（PremiumDemoPage を public から退役）・matrix を redirect 化（premium-demo.ts は full-site が共有のため保持・astro build OK）
- [x] 3-2 旧 LP URL（/{lang}/{industry}/{appeal}）→ /demo/sample-{industry} フルサイトへ 301（astro build OK）
- [ ] 3-3 demo_site_generate step を report 後・twenty_writeback 前に新設 ※enrichment Phase4 で generateReplacementDemo 既存。明示 step 化は任意
- [x] 3-4 8業種サンプル slug フルサイト index（/demo・inferDemoArchetype が slug 推論で業種別描画・DB seed不要・astro build OK）
- [ ] 3-5 getFullSiteProfile/demo-generator の archetype依存を減らし診断+lead注入
- [ ] 3-6 demo_site.url が twenty_writeback・outreach readiness で使われるか回帰 ※既存配線確認済（twenty-pull/outreach readiness/diagnostic）

Phase 4 — GUI/可視化
- [ ] 4-1 dashboard+Twenty karte に demo_url・Dify job status・continuation 状態表示
- [ ] 4-2 エラー可視化（toast + notifyBothChannels）

Phase 5 — テスト/デプロイ（LL/SAFE-DEPLOY/T-PLUS）
- [ ] 5-1 Vitest（Dify subtype/continuation/demo step/twenty writeback/redirect）
- [ ] 5-2 tsc --noEmit / quality:guard / astro-demo build / Next build
- [ ] 5-3 doc更新→commit+push→Coolify finished→本番URL確認

Phase 6 — レポート品質・Dify本文正本化・トレース可視化
- [x] 6-1 Dify karte→report を5幕本文の正本・meta.personalized_copy 永続化・DeepSeek=fallback（autoPersonalize を enrichment report phase へ配線・tsc clean。Dify正本化は DIFY_KARTE_TO_REPORT_API_KEY 設定時に昇格）
- [x] 6-2 generatedBy＋テンプレ選定トレースを report meta 保存・GUI/Twenty表示（karte snapshot に reportEngine/diagnosisEngine 追加・karteHomeSummary に「生成エンジン」行・tsc clean・14 tests pass）
- [ ] 6-3 Dify/DeepSeek 用途マップ文書化
- [x] 6-4 hallucination-guard 全文面適用・捏造禁止回帰（sanitizeBlocks 回帰テスト 3件 pass）

Phase 7 — Twenty 50+ ソース可視化
- [x] 7-1 Twenty writeback に category別内訳（sourceCategoryBreakdown）を追加＋karte summary に表示（paradigmDataBreakdown・tsc clean）
- [x] 7-2 per-source 詳細は source-coverage パネルへの deep link（sourceCoveragePanelLink）を karte summary に表示
- [x] 7-3 enrichment writeback が meta にソースキーを残し detect 成立を保証（computeSourceCoverage 回帰テスト 2件 pass・collected 0/85 症状を防止）

Phase 8 — Telegram bot 修復・OSS管理・Realtime
- [ ] 8-1 webhook状態確認・TELEGRAM_BOT_TOKEN/SECRET 設定・再登録
- [ ] 8-2 enrich/outreach のインライン撤去→Trigger.dev dispatch（Phase1/2統一）
- [x] 8-3 OSS deep link（Metabase動向/Chatwoot/Keystatic/Directus/RevenueOS への URL ボタン・`oss_links` intent・/oss コマンド・tsc clean・test pass）
- [ ] 8-4 Supabase Realtime→Telegram event駆動 push（HOT lead/返信/承認要求）
- [x] 8-5 inline keyboard拡充（メインメニューに OSS管理ボタン＋URL ボタン対応に TelegramKeyboard 型拡張）※返信構造化は継続
- [ ] 8-6 dashboard に bot履歴・webhook health・OSS接続状態
- [x] 8-7 Vitest（OSS deep link/intent分類）pass ※realtime payload/secret検証は 8-4/8-1 と併せて継続

Phase 9 — インフラ堅牢化（数千〜数万件対応）
- [ ] 9-1 重ワーカー（Browserless/Steel/Stagehand/ComfyUI/HyperFrames/OpenMontage/video/crawl）を別box/serverless へ offload
- [ ] 9-2 Trigger.dev supervisor/enrichment 実処理を heavy box へ・paradigm-prod-01 軽量化
- [ ] 9-3 Upstash Redis 導入・rate-limit.ts を @upstash/ratelimit 分散版へ
- [ ] 9-4 グローバル token bucket＋per-source 並列上限
- [ ] 9-5 dead-letter queue＋指数backoff＋idempotency 統一
- [ ] 9-6 marketing を ISR/静的化し公開 DB read を origin から排除
- [ ] 9-7 Cloudflare tiered cache＋cache-control・readiness 分離維持
- [ ] 9-8 Transaction pooler 強制・poolMax 適正化・circuit breaker ※監査: twenty-crm-metadata の生Client は全て try/finally で client.end() 済み・リークなし（撤去不要）。真の対象は Payload poolMax:4＋pooler Transaction強制で本番 pooler-mode 検証が前提（risky-config・要 prod 確認）
- [x] 9-9 ランタイム admission gate（host-admission.ts・ADMISSION_MAX_RUNNING_JOBS opt-in・fail-open・triggerEnrichmentRunner 冒頭で saturated 時 defer・テスト 4件 pass）
- [x] 9-10 scale index 追加（migration_045_sales_scale_indexes.sql・冪等 IF NOT EXISTS）。**適用方法確定**: SALES_SUPABASE は内部Docker(supabase-rest-1:3000・外部不達)のため本番アプリ内 `run_sql` RPC（/api/sales/run-migration パターン）経由でのみ適用可。次回 migration-runner サイクルで適用
- [ ] 9-11 pool/queue メトリクス＋per-source circuit breaker 可視化・Sentry/Uptime・degraded mode

### INFRA監査 2026-06-20（read-only・full-autonomy 権限下）
- Coolify `paradigm-hp` = `running:healthy`（paradigmjp.com/www/keystatic）。env 96件。
- 設定済: DIFY_API_KEY/BASE/URL・SUPABASE系・TRIGGER_*・TWENTY_*・CLOUDFLARE_R2_*・DATABASE_URI・PAYLOAD_PUBLIC_SERVER_URL。
- 未設定（要対応）: TELEGRAM_BOT_TOKEN / TELEGRAM_WEBHOOK_SECRET / UPSTASH_* / SENTRY_* / DIFY_DIAGNOSIS_API_KEY / DIFY_KARTE_TO_REPORT_* / PAYLOAD_PUBLIC_READS_ENABLED。
- 自律実行可能 MCP: supabase(migration) / cloudflare(CDN) / hetzner+coolify+docker(box/Redis) / sentry / vercel。→ 9-3 は Upstash 不在のため Coolify 自前 Redis で代替実装する方針。
- **唯一の真のブロッカー**: TELEGRAM_BOT_TOKEN は memory/mcp/Coolify いずれにも無く @BotFather でのみ発行可能（第三者secret）。8-1 の webhook 登録は token 取得後に自動実行。それ以外の 8-2〜8-7 は token 非依存で先行実装可。

---

## CURRENT STATUS - 2026-06-20 WW-EVENT: cron/定期実行を全廃しイベント駆動化（永久ルール）

- 永久ルール (WW-EVENT): サーバー負荷対策のため、サイト全体で cron / 定期実行 / 常駐 polling / `setInterval` worker / pg_cron / Coolify Scheduled Task / systemd timer を新設しない。同期・監視・ジョブ起動は webhook / DB event・realtime / queue enqueue / GitHub push / ユーザー操作などのイベント駆動にする。UI animation や単発 timeout/retry は対象外。
- 主因: Next.js コンテナが起動時から常駐 setInterval ループ（enrichment 10s + watchdog 60s で Twenty pull・report 再生成・DB スキャン）を回しオリジン過負荷(521/522/524)。→ 常駐ループ全廃（instrumentation no-op / enrichment-worker・watchdog は one-shot drain / `/api/sales/pipeline/tick`・`/api/sales/pipeline/recover` 起点 / rate-limit は遅延 sweep / SSE は Supabase Realtime）。上流コミット 913175a と統合済み。
- 本セッションの net-new（上流が未対応の分）:
  - `trigger/sales-os.ts`【本命】: Trigger.dev が現役オーケストレータ（`migration_040`/`053`: `replaces n8n` / `primary_orchestrator`）。その `schedules.task`（`* * * * *` / `*/5`）= 唯一の現役 cron を非スケジュール `task`（イベント起動）へ変換。旧 `twenty-sync-cron` / `sales-report-regenerator` は no-op tombstone 化し、実処理は `twenty-sync-event` / `sales-report-regenerator-event` へ分離。
  - `src/app/api/sales/pipeline/tick/route.ts`: webhook/手動用の軽量 one-shot tick を新設。既定では enrichment/recovery のみ実行し、Twenty pull / report regeneration は body opt-in（誤爆時の負荷防止）。
  - `src/app/api/sales/admin/abolish-periodic-jobs/route.ts`: 本番アプリ内から固定SQLだけを実行する認証付き one-shot 管理APIを追加。外部DB/SSH到達性に依存せず、`cron.job` の残存を 0 件まで掃除して残数を返す。
  - `n8n-workflows/02,03`【レガシー】: n8n は Trigger.dev に置換済み・src から呼び出し無しの非稼働成果物。整合のため `scheduleTrigger`→`webhook` 化したが live runtime ではない（再 import 不要）。
  - `supabase/migration_044_abolish_pg_cron_event_driven.sql`: pg_cron 全ジョブを unschedule（冪等・pg_cron 不在でも安全）。`scripts/run-migrations.sh` にも追加済み。`migration_013` の cron 再作成は no-op 化（上流と統合）。
- 運用確認:
  1. デプロイ後に `/api/sales/admin/abolish-periodic-jobs` を shared-secret 付きで one-shot 実行し、`remaining: 0` を確認する。
  2. Trigger.dev cloud の `/api/v1/schedules` は `count: 0` 確認済み。旧 `twenty-sync-cron` / `sales-report-regenerator` は schedule が残ってもコード側 no-op tombstone、実処理は `twenty-sync-event` / `sales-report-regenerator-event` を明示イベントで起動。
  3. Notion 同期は Notion webhook → `/api/sales/sync-*-from-notion`、パイプライン維持は `/api/sales/pipeline/tick` / `/api/sales/pipeline/recover` で event 駆動。
  4. n8n は decommission 済み前提。成果物 JSON 01-04 に `scheduleTrigger` は 0 件。
- 検証: `tsc --noEmit` クリーン / `npm run quality:guard` OK / 変更スクリプト `node --check` OK / n8n schedule audit OK / `npm run build` OK。



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
