# Task.md

## CODEX UPDATE - 2026-06-08 Trigger.dev OSS セルフホスト移行 (進行中)

- Trigger.dev Cloud (`api.trigger.dev` / `cloud.trigger.dev`) から OSS セルフホスト (`trigger.paradigmjp.com`) への移行を開始。
- `docker-compose.trigger-oss.yml` 作成: webapp + supervisor + PostgreSQL + Redis + ClickHouse + MinIO + Registry + Electric + Docker Proxy の全コンテナを combined 構成で定義。v4-beta イメージにバージョンロック。
- `scripts/setup-trigger-oss.mjs` 作成: Coolify API 経由で新 Droplet に Trigger.dev OSS をデプロイするスクリプト。シークレット自動生成、レジストリ htpasswd 生成、サービス作成。
- コード変更: 全 dispatch コード（`sales-pipeline-helpers.ts`, `enrichment-jobs.ts`, `post-outreach-webhooks.ts`, `video-trigger.ts`）、health check（`route.ts`, `oss-service-health.ts`）、verify スクリプトの localhost フォールバックを `:3010` → `:8030`（OSS デフォルトポート）に統一。
- `trigger.config.ts`: project ref を `proj_ptaxneqibbeboxxboajw` → `paradigm-sales-os` に変更。
- `.env.example`: `TRIGGER_API_URL` を `https://trigger.paradigmjp.com`、`TRIGGER_DASHBOARD_URL` を同 URL に更新。`TRIGGER_PROJECT_REF=paradigm-sales-os` 追加。
- `docs/knowledge/trigger-dev-sales-os-runbook.md`: OSS セルフホスト版に完全書き換え（アーキテクチャ図、コンテナ一覧、セットアップ手順、運用ノート、Cloud→OSS 移行表）。
- 未完了: Coolify の新 Droplet 作成 + デプロイ + CLI login + task deploy + API key 発行はユーザーの手動操作が必要。
- コード変更のみでは本番影響なし（環境変数が未変更のため既存 Cloud 向け dispatch が継続）。

## ACTIVE HANDOFF

- Trigger.dev OSS 移行のコード準備は完了。新 Droplet に `setup-trigger-oss.mjs` を実行し、環境変数を差し替えることで本番切替可能。
- 既存の Trigger.dev Cloud はそのまま稼働中。

## NEXT ACTIONS

- Coolify で新 Droplet（4vCPU/8GB+）を作成し `TRIGGER_SERVER_UUID` を設定
- `node scripts/setup-trigger-oss.mjs` を実行して Trigger.dev OSS をデプロイ
- CLI login → project init → task deploy → PAT 発行
- Coolify 本番 env の `TRIGGER_API_URL`, `TRIGGER_DASHBOARD_URL`, `TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_REF` を OSS 向けに更新
- paradigm-hp を再デプロイして切替完了

## RISKS

- OSS 版は Cloud 版に比べて warm starts / auto-scaling / checkpoints が欠ける。ピーク時のタスク起動レイテンシに注意。
- 新 Droplet のリソース（4vCPU/8GB）が閾値を下回るとタスク実行が遅延または失敗する可能性あり。
- タスク実行用の Docker-in-Docker が supervisor 経由でホストの Docker socket を使用するため、ホストのディスク容量にも注意。

## CODEX UPDATE - 2026-06-06 Twenty Intake Pipeline Repair

- Fixed the Twenty intake gap where `/api/sales/twenty/pull` and `/api/sales/twenty/webhook` only updated matching Supabase companies and skipped newly added Twenty companies.
- `pullTwentyCompaniesToSupabase` now creates missing `sales_companies` records from Twenty, preserves Twenty HOME/custom fields in `meta`, and starts a Sales OS pipeline when report/form artifacts are missing or the company is not `report_ready`.
- Added duplicate protection: active queued/running/waiting pipeline runs are reused instead of creating another run for the same company.
- Twenty pull/webhook responses now expose `dryRun`, `created`, `pipelineRunsCreated`, `pipelineRunsDispatched`, `pipelineRunsReused`, and per-record `failures` so intake problems are visible instead of silently skipped.
- Hardened `/api/sales/twenty/webhook` with Sales API auth and added `scripts/smoke-twenty-intake.mjs` for authenticated non-mutating production/local dry-run checks.
- Extended `scripts/verify-trigger-sales-os.mjs` to dispatch a non-mutating `health_check` payload to the `sales-os-pipeline` Trigger.dev task; Trigger.dev API auth and dispatch returned HTTP 200.
- Deployed commit `198d0a3` through Coolify deployment `yph1mymw8qx9p0zxp0a326ks`; an earlier deploy `l129mpyj8zcya4pvrp15xvs5` failed during Docker image layer export because root disk pressure left only 22GB free.
- Recovered host capacity without touching Docker volumes: pruned stopped containers, build cache, and unused images only; root disk improved from 87% used / 22GB free to 81% used / 30GB free before redeploy.
- Updated `scripts/smoke-twenty-intake.mjs` to prefer Coolify production webhook secret when testing production URLs, avoiding false 401s from stale local env values.
- Production dry-run verified `https://paradigmjp.com/api/sales/twenty/pull`: scanned 5, created 2, updated 2, skipped 1, pipelineRunsCreated 4, pipelineRunsDispatched 0, failures 1.
- Production execution then ran with `dry_run=false` and `dispatch_pipeline=true`: scanned 5, created 2, updated 2, skipped 1, pipelineRunsCreated 4, pipelineRunsDispatched 4, failures 1. The skipped/failure record had no valid Twenty `domainName`, so report/form generation is blocked by missing source data rather than code.
- Verification: `node scripts/run-vitest.mjs src/lib/sales/twenty-sync.test.ts` (4 tests), `npx tsc --noEmit --pretty false`, `npm run build`, `git diff --check`, `npm run context:audit`, `node scripts/verify-trigger-sales-os.mjs`, and local production `node scripts/smoke-twenty-intake.mjs --base-url=http://localhost:3010 --limit=5 --dry-run=true --dispatch-pipeline=false` passed.
- Post-deploy verification: `node scripts/test-health.mjs`, `node scripts/audit-sales-os.mjs` (13 pass / 0 warn / 0 fail), `/ja` 200, `/ja/admin/sales` 200, and production Twenty dry-run smoke passed.

## CODEX UPDATE - 2026-06-06 Keystatic + Trigger.dev Production Closure

- Deployed Trigger.dev production tasks as version `20260606.3` with 6 detected Sales OS tasks.
- Replaced Coolify Trigger.dev envs with production runtime key, `TRIGGER_PROJECT_REF=proj_ptaxneqibbeboxxboajw`, and `TRIGGER_API_URL=https://api.trigger.dev` for production/preview without printing secrets.
- Coolify deployment `vtva4jxd52h2ebdso2qs2u6d` finished; authenticated `/api/sales/health` now returns HTTP 200, `status=healthy`, and Trigger.dev `ok`.
- Fixed Keystatic white screen: App Router was importing Keystatic through the React Server export that returns `null`; `/keystatic` now renders a dedicated client wrapper.
- Fixed Keystatic subdomain root routing: `keystatic.paradigmjp.com` now redirects to `/keystatic` so the Keystatic client router opens Dashboard instead of a root-path not-found state.
- Verification: `node scripts/verify-trigger-sales-os.mjs`, `node scripts/test-health.mjs`, `npx tsc --noEmit --pretty false`, `git diff --check`, and `npm run build` passed. Build artifact includes `app/keystatic/[[...params]]/page` client chunk.
- Final Coolify deployment `v37qtl33byr8cgua2tkupfp9` finished for commit `3fb58b4`. Smoke passed: `/ja` 200, `/ja/admin/sales` 200, authenticated `/api/sales/health` 200 with `status=healthy` and Trigger.dev `ok`, Stagehand `/health` 200, Keystatic root 307 to `/keystatic`, and Keystatic Dashboard rendered with no browser errors.

## CODEX UPDATE - 2026-06-06 Revenue OS Trigger.dev Runtime Closure

- Stored the provided Trigger.dev runtime key in approved non-git locations and upserted `TRIGGER_SECRET_KEY` into Coolify production and preview envs without printing the value.
- Fixed Trigger.dev health checks to use the v4 runs API (`/api/v1/runs?limit=1`) instead of the removed task-list endpoint that returned false `404` errors.
- Aligned Revenue OS audit scripts with Trigger.dev as the primary orchestrator: Trigger webhook secret is now preferred, n8n remains legacy fallback only.
- Added safe `health_check` handling to all local Trigger.dev task definitions so future task-level smoke checks can run without mutating Sales OS records.
- Fixed the build-blocking notification helper path by preserving the Slack/DB notification exports and validating the current `notifySlack`, `notifyHotLead`, and `notifyBothChannels` module through production build.
- Included the pending Trigger.dev database/tool-slug migrations and worker browser concurrency/reconnect hardening in the verified change set.
- Trigger.dev CLI task deploy is still blocked by missing `tr_pat_...` personal access token or interactive CLI login. The provided `tr_dev_...` key is valid for runtime API/dispatch, not non-interactive CLI deployment.

## CODEX UPDATE - 2026-06-06 Trigger.dev + Stagehand Production Audit

- Replaced remaining active dashboard/orchestration references from n8n to Trigger.dev in Sales OS health, dashboard tool connections, enrichment runner dispatch, Chatwoot/LiveKit post-outreach forwarding, source coverage, API comments, and runbooks.
- Fixed shared webhook auth so `X-Webhook-Secret` checks `TRIGGER_WEBHOOK_SECRET` first and keeps `N8N_WEBHOOK_SECRET` only as legacy fallback.
- Added Stagehand SDK support in `worker/`: `/health`, `/discover-form`, and Stagehand `/submit` paths now run alongside existing Crawlee `/discover-spa` and Playwright Stealth `formUrl` submission.
- Updated worker environment contracts for Stagehand LLM keys, Browserbase/CDP/Browserless wiring, Bearer auth, and Browserless CDP auto-wiring.
- Updated worker Dockerfile to `mcr.microsoft.com/playwright:v1.60.0-noble` so the base image matches `playwright@^1.60.0`.
- Deployed/rebuilt the production `paradigm-stagehand` container on the Droplet and fixed its Traefik rule to `Host(\`stagehand.paradigmjp.com\`)`.
- Production Stagehand health is live at `https://stagehand.paradigmjp.com/health` and reports `ok=true`, `mode=local-cdp`, `model=deepseek-chat`.
- Fixed Droplet runtime env mapping for `paradigm-stagehand`: `WORKER_SECRET`, `BROWSERLESS_TOKEN`, and `DEEPSEEK_API_KEY` now come from the non-git runtime `.env`; authenticated `/discover-spa` and `/submit` now reach validation (`400` on empty payload) instead of `503 WORKER_SECRET not configured`.
- Fixed Crawlee and Playwright Stealth health checks to call worker `/health` rather than `/`.
- Production env presence check: Stagehand, Browserless, Crawlee worker, Playwright Stealth worker, Crawl4AI base URL, Supabase, and DeepSeek are set.
- Production env gap: Trigger.dev cloud dispatch is not fully live because `TRIGGER_SECRET_KEY` / `TRIGGER_ACCESS_TOKEN` / `TRIGGER_DEV_API_KEY` is missing. `TRIGGER_WEBHOOK_SECRET`, `TRIGGER_API_URL`, `TRIGGER_DASHBOARD_URL`, and standard Sales OS task IDs are now set in Coolify production/preview env.
- Added Trigger.dev SDK/CLI, `trigger.config.ts`, and `trigger/sales-os.ts` task definitions for `sales-os-pipeline`, `sales-enrichment-runner`, `post-outreach-router`, `chatwoot-reply-router`, `livekit-discovery-router`, and `sales-video-pipeline`.
- Fixed Trigger/Sales OS continuity gaps: post-outreach events update pipeline reply/follow-up steps even when external forwarding succeeds, failed/needs-review pipeline runs enqueue valid `analysis` queue items, and app code uses standard Trigger task IDs when env-specific IDs are absent.
- Added `scripts/verify-trigger-sales-os.mjs` and `docs/knowledge/trigger-dev-sales-os-runbook.md` so Trigger.dev install/config/task readiness can be verified without printing secrets.
- Residual dependency risk: `npm --prefix worker audit --omit=dev` still reports 17 low-severity transitive `@ai-sdk/provider-utils` advisories from Stagehand/AI SDK. `npm audit fix` did not clear them; prior forced override broke Stagehand runtime, so no unsafe override is applied.
- Main app deployments completed: `uui2xsuvhg72aonrmx289reh`, `n11c1kkdqrgk172ug3e49jrh`, and final health-fix deploy `m5enbqnue0n65k4mu8uli3qe` all finished.

## ANTIGRAVITY UPDATE - 2026-06-06 Sales OS Audit Completion & Server Safety Guard

- **Server-Side Safety Guard**: Guarded `toast.error` calls in `BaseApiClient` (`src/lib/sales/data-sources/base-client.ts`) with `typeof window !== "undefined"` checks, preventing SSR runtime failures inside Next.js APIs or Trigger.dev background tasks.
- **Trigger.dev Webhook Config Compatibility**: Updated `scripts/sales-os-no-login-deploy.mjs` to prioritize checking `TRIGGER_WEBHOOK_SECRET` over `N8N_WEBHOOK_SECRET` when verifying integration statuses.
- **Utility Scripts Alignment**: Aligned environment audit script `scripts/audit-service-envs.mjs` and check health diagnostic script `scripts/test-health.mjs` with the Trigger.dev transition, adding Trigger.dev environment checks and marking n8n as legacy.
- **Verification Results**:
  - Root project static type check (`npx tsc --noEmit`) completed with 0 errors.
  - Worker type check (`npm --prefix worker run typecheck`) completed with 0 errors.
  - All 36 Vitest outreach tests across 8 test files (`activity.test.ts`, `form-discovery.test.ts`, `browser-provider.test.ts`, `http-form-provider.test.ts`, `form-classifier.test.ts`, `preflight.test.ts`, `state-machine.test.ts`, `integration-registry.test.ts`) passed successfully.

## ANTIGRAVITY UPDATE - 2026-06-06 Revenue OS Quality Audit & Cross-Platform Fix

- **n8n to Trigger.dev Migration Complete**: Checked for any active n8n dependencies. Confirmed that all main app, dashboard, webhook routing, enrichment, and video pipelines have been fully migrated to Trigger.dev tasks and API dispatches. Legacy Notion and n8n endpoints are inactive and guarded by `isNotionLegacySyncEnabled()`.
- **Cross-Platform Render API Fix**: Inspected `src/app/api/sales/video-pipeline/render/route.ts` and fixed a Windows-specific command bug where `cd /d` was used in `execSync`. Rewrote it to use standard cross-platform `cwd` options, ensuring flawless execution on the Linux Droplet.
- **Verification Run Results**:
  - Root project static typecheck (`npx tsc --noEmit`) compiles with 0 errors.
  - Outreach browser worker typecheck (`npm --prefix worker run typecheck`) compiles with 0 errors.
  - Full Sales OS Vitest test pass (33 files, 123 tests) passed successfully.
  - Video pipeline test suite passed successfully.
  - Next.js production build (`npm run build`) completed with 0 compile errors.
- **Trigger.dev Cloud Deployment Setup**: Local tasks verification script (`verify-trigger-sales-os.mjs`) is confirmed functional. Trigger.dev Cloud deployment is ready to be finalized via standard GHA/CLI deploy command once the production secret token is loaded.

## VERIFICATION

- Latest production deploy: Coolify deployment `v37qtl33byr8cgua2tkupfp9`, commit `3fb58b4`, status finished.
- Authenticated `https://paradigmjp.com/api/sales/health` returns HTTP 200, `status=healthy`, and no non-ok checks. Trigger.dev API auth is `ok`.
- `node scripts/audit-sales-os.mjs` passed: 13 pass / 0 warn / 0 fail across public LPs, tracking pixel, webhook auth, scan, weekly digest, and admin Sales OS pages.
- `node scripts/verify-trigger-sales-os.mjs` passed local Trigger.dev task/config/runtime API checks. Trigger.dev Cloud tasks are deployed in production as version `20260606.3`.
- `node scripts/test-health.mjs` passed for Supabase, SearxNG, Dify, Trigger.dev, and legacy n8n compatibility.
- Chatwoot service recovered on the Droplet: `chatwoot`, `postgres`, `redis`, and `sidekiq` containers are up; Chatwoot UI returns 200 on both `chatwoot.appexx.me` and `chatwoot.paradigmjp.com`; authenticated Chatwoot inbox API returns HTTP 200.
- Supabase migrations `040` and `041` were applied directly through the DB container because the REST `exec_sql` channel is unavailable; `trigger_dev` is active in `sales_tool_connections`, and `sales_video_jobs.trigger_endpoint` / `trigger_run_id` exist.

## CODEX UPDATE - 2026-06-08 Revenue OS Quality Sweep

- Fixed 5 `catch {}` silent suppression violations in Notion sync and KPI snapshot API routes (now log to `console.error`).
- Integrated React Query (`@tanstack/react-query`) into Sales OS dashboard via `QueryProvider` + `SalesDashboardShell`: server component passes `initialData` into `useQuery`, mutations invalidate query instead of `window.location.reload()`. Three full-page reloads eliminated.
- Split `SalesCommandPanels.tsx` (816 → 9 lines) into 7 individual panel files + shared utilities (`format-utils.ts`, `sales-panels-shared.tsx`). Existing imports preserved via barrel re-export.
- Removed hardcoded Supabase project ref from `SalesCommandCenter.tsx`; now resolves from `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_STUDIO_URL` env vars.
- Tightened `checkKeystaticHealth()` to distinguish 2xx/3xx/4xx/5xx responses instead of accepting <500 as "ok".
- Removed dead `abortSignal` variable in `dify-diagnosis.ts`.
- Added React Query `staleTime=60s` + `refetchInterval=120s` for background dashboard refresh.
- Fixed 3 broken health checks: `checkVastHealth()` now hits Vast.ai API, `checkFFmpegHealth()` verifies binary exists via `execSync`, `checkSlidevGotenbergHealth()` hits proper `/health` endpoints.
- Added 6 new diagnostic API live health checks: `checkPageSpeedHealth`, `checkGooglePlacesHealth`, `checkSimilarWebHealth`, `checkGbizinfoHealth`, `checkSearxngHealth`, `checkApolloHealth`; plus moved `checkDataForSeoHealth` from inline to `oss-service-health.ts`.
- Updated `integration-definitions.ts` balance types: pagespeed, google_places, similarweb, gbizinfo, searxng, apollo now have live balance checks instead of `"manual"`/`"none"`.
- Added 6 new `SalesIntegrationBalanceType` values and wired all into `liveBalance()` in `integration-registry.ts`.

### Diagnostic API Health Coverage (after this update)

| Before | After |
|--------|-------|
| 1/23 (4%) diagnostic APIs had live health checks | 7/23 (30%) now have live checks |
| PageSpeed, Google Places, SimilarWeb, gBizInfo, SearxNG, Apollo all reported "管理画面で確認" | Now report actual API reachability and key validity |

Remaining 16 diagnostic APIs (jgrants, urlscan, publicwww, ad_libraries, mobsf, serp_tavily, rsshub_wayback, fumadata, bizmap, houjin_bangou, apify, outscraper, public_web_corpora, niche_list_sources, wappalyzer_webanalyze, security_apis) still use `"manual"` balance — these either have no simple REST health endpoint or are low-priority public data sources.

## ACTIVE HANDOFF

- Revenue OS is live on Trigger.dev runtime API with n8n retained only as legacy compatibility.
- Production worker: `paradigm-stagehand`, public URL `https://stagehand.paradigmjp.com`, internal mode Browserless CDP.
- Keystatic is live at `https://keystatic.paradigmjp.com`; root redirects to `/keystatic` and opens Dashboard.

## NEXT ACTIONS

- Deploy commit with diagnostic health checks and verify `/api/sales/integration-status?live=1` shows live status for the 7 diagnostic APIs.

## RISKS

- Live outbound form submission remains intentionally gated by approval/dry-run settings.
- Stagehand AI SDK dependency carries low-severity audit advisories.
- `oss-service-health.ts` now exceeds 500 lines (added ~120 lines for new health checks). Consider extracting diagnostic-specific health checks to a separate module if further growth.
