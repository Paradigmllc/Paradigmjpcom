# Task.md

## CURRENT STATUS

- Revenue OS is being turned from a set of links into the operating surface for the full sales pipeline.
- Supabase remains the SSOT for company karte data, report URLs, video jobs, sync logs, and external studio state.
- New external studio sync work is implemented locally for Twenty, Directus, and Keystatic.
- Video studio legacy n8n errors are now treated as old migration notices with Trigger.dev re-dispatch actions.
- Unified Sales OS pipeline runs now link Twenty/CSV intake, Supabase normalization, karte generation, report generation, optional video jobs, R2 artifact manifests, Directus/Keystatic sync, Twenty writeback, outbound preflight/send gates, reply capture, and follow-up queues through one run/step state model.

## CODEX UPDATE - 2026-06-06 Full Form Outreach Lanes

- Implemented real external form-discovery lanes in `src/lib/sales/sources/external-form-discovery.ts`: Crawl4AI `/discover-form`, Crawlee/worker `/discover-spa`, and Browserless `/content` rendered contact-page inspection.
- Extended `discoverFormUrl()` so cheap homepage/sitemap checks now fall through to Crawl4AI, heuristics, LLM, Browserless, and provider SPA discovery instead of leaving Crawl4AI/Browserless as registry-only labels.
- Changed outreach provider default to `OUTREACH_BROWSER_PROVIDER=auto`: HTTP handles standard server-rendered forms; SPA/client-rendered forms escalate to the remote Playwright/Crawlee worker and then Stagehand when configured, with conservative no-double-submit fallback rules.
- Added Stagehand discovery support via `/discover-form`, Crawl4AI live health checks in the integration registry, and worker Browserless CDP auto-wiring from `BROWSERLESS_URL` + `BROWSERLESS_TOKEN`.
- Audit hardening: external discovery and stored `contact_form_url` values now block unrelated external domains before automatic submission, while still allowing same-domain/subdomain and known hosted-form providers.
- Audit hardening: remote worker and Stagehand endpoint URLs now tolerate trailing slashes instead of accidentally calling `//submit` or `//discover-form`.
- Updated `.env.example`, `worker/.env.example`, and `worker/README.md` with the new full-lane env contract.

## CODEX UPDATE - 2026-06-05 Non-JA HP Pricing Table

- Added a Japan Entry Package pricing table to the non-Japanese homepage fallback with Essential/Growth/Scale at `$3,000`, `$5,000`, and `$8,000`.
- Added `homeEn.pricing` keys across all 12 message files so non-JA routes render without missing translation keys.
- Fixed `formatPricePPP` so CMS/Payload pricing rows marked `currency="usd"` display as fixed USD instead of being treated as JPY and divided down.
- Updated `EN_BASE_PRICES` to the new USD package prices and added `src/lib/ppp.test.ts` coverage.

## CODEX UPDATE - 2026-06-05 Dynamic AI Prompts Management

- Added `supabase/migration_038_sales_ai_prompts.sql` to extract hardcoded Dify and DeepSeek system prompts into the SSOT `sales_ai_prompts` table.
- Added `src/lib/sales/ai-prompts.ts` to dynamically fetch prompts before executing diagnosis and form message generation, gracefully falling back to defaults if the DB is unavailable.
- Updated `src/lib/sales/dify-diagnosis.ts` and `src/lib/sales/form-message.ts` to consume the dynamic prompts.
- Added `/api/sales/ai-prompts` GET/PUT endpoints.
- Added `AiPromptsPanel.tsx` and integrated it into `SalesCommandCenter.tsx` under the `?tab=prompts` view. Operators can now edit Dify prompts directly from the Sales OS admin GUI, with changes applied instantly.
- Fixed prompt loading failure: `/api/sales/ai-prompts` now accepts the legacy admin cookie, returns fallback prompts instead of HTTP 500 when Supabase prompt storage is unavailable, and the GUI fetches/saves with credentials included.
- Added `supabase/migration_039_sales_ai_prompts_auth_and_defaults.sql` to repair the prompt table service-role RLS policy/grants and replace corrupted seed prompt text where early mojibake defaults were inserted.

## CODEX UPDATE - 2026-06-05 Pipeline Outreach Link Audit Fix

- Added `supabase/migration_037_sales_pipeline_outreach_links.sql` to allow outreach/reply steps and add nullable `pipeline_run_id` links on `sales_activity_log`, `sales_operator_queue_items`, `sales_video_jobs`, and `sales_sync_logs`.
- Extended `src/lib/sales/sales-pipeline.ts` so karte generation no longer completes until the company is `report_ready`, video jobs carry the pipeline run id, Directus/Keystatic/Twenty sync logs carry the run id, and pipeline runs continue into outbound preflight/send/reply/follow-up state.
- Added guarded outbound behavior: live form sending requires explicit `payload.allow_live_outreach=true`; otherwise the pipeline creates an operator approval queue item and stops at `needs_review`.
- Updated Chatwoot/LiveKit webhook persistence so `pipeline_run_id` from external payload/custom attributes updates `reply_capture` and `follow_up_queue` pipeline steps.
- Aligned Trigger.dev integration status with the actual Sales OS envs: `TRIGGER_SALES_OS_PIPELINE_TASK_ID` plus `TRIGGER_SECRET_KEY` or `TRIGGER_ACCESS_TOKEN`.
- Updated `scripts/run-migrations.sh`, `scripts/sales-os-no-login-deploy.mjs`, and `SalesPipelinePanel` for migration 037 and live-outreach approval options.

## CODEX UPDATE - 2026-06-05 Unified Sales OS Pipeline

- Added `supabase/migration_036_sales_os_pipeline.sql` with `sales_pipeline_runs`, `sales_pipeline_steps`, and `sales_artifact_manifest` as the Supabase SSOT for end-to-end sales execution.
- Added `src/lib/sales/sales-pipeline.ts` to create/list/dispatch/run unified pipeline runs and bind existing enrichment, report asset, video job, R2 manifest, external studio sync, and Twenty writeback functions into one flow.
- Added `/api/sales/pipeline-runs` and `/api/sales/pipeline-runs/[runId]/action` for Sales OS run creation, local execution, and Trigger.dev dispatch.
- Added `SalesPipelinePanel` to the Revenue OS overview so operators can start a company-level pipeline, choose optional video and CMS sync, see step state, rerun locally, or dispatch to Trigger.dev.
- Added dashboard support for latest pipeline runs with graceful warnings when migration 036 has not reached production yet.
- Updated deploy/run-migration scripts, `.env.example`, and production service docs for `TRIGGER_SALES_OS_PIPELINE_TASK_ID`.
- Added `src/lib/sales/sales-pipeline.test.ts` for pipeline plan and status aggregation coverage.

## CODEX UPDATE - 2026-06-05 Sales OS External Studio Sync

- Added `/api/sales/companies/[companyId]/external-sync` to sync a selected company across Twenty, Directus, and Keystatic.
- Added `src/lib/sales/external-studio-sync.ts` for Supabase SSOT payload building, Directus push/pull, Keystatic webhook/worker sync, and Twenty push/pull orchestration.
- Added Revenue OS sync UI: `ExternalStudioSyncPanel` appears on Overview, Directus, and Keystatic tabs.
- Added `supabase/migration_035_sales_external_studio_sync.sql` so `sales_sync_logs` accepts Directus/Keystatic directions and `external_studio_sync` / `external_studio_pull` actions.
- Updated no-login deploy script to apply migration 035.
- Updated `.env.example` and production setup docs for `DIRECTUS_SALES_ASSETS_COLLECTION`, `KEYSTATIC_SYNC_WEBHOOK_URL`, `KEYSTATIC_SYNC_WEBHOOK_SECRET`, and `ASTRO_DEMO_WORKER_TOKEN`.
- Report and pro video studios now show old n8n job messages as amber migration notices and expose Trigger.dev re-dispatch.

## VERIFICATION

- Full form outreach lanes: `npm test -- --run src/lib/sales/sources/form-discovery.test.ts src/lib/sales/outreach/browser-provider.test.ts src/lib/sales/outreach/http-form-provider.test.ts src/lib/sales/outreach/form-classifier.test.ts src/lib/sales/outreach/preflight.test.ts src/lib/sales/integration-registry.test.ts` passed.
- Full form outreach audit: added tests for unrelated external URL rejection and trailing-slash remote worker URLs; focused rerun `npm test -- --run src/lib/sales/sources/form-discovery.test.ts src/lib/sales/outreach/browser-provider.test.ts` passed.
- Full form outreach lanes: `npx tsc --noEmit --pretty false` passed.
- Full form outreach lanes: `npm run typecheck` in `worker/` passed.
- Full form outreach lanes: scoped `git diff --check` for touched files passed. Unscoped `git diff --check` still reports pre-existing whitespace in unrelated modified files such as `src/components/diagnostic/DiagnosticReport.tsx`, `src/lib/sales/diagnostic.ts`, and `src/lib/sales/sources/places.ts`.

- `npx tsc --noEmit --pretty false` passed after the prompt loading fix.
- `npm test -- --run src/lib/sales/dify-diagnosis.test.ts src/lib/sales/dify-cloud.test.ts src/lib/sales/searxng-normalize.test.ts src/lib/sales/source-acquisition.test.ts src/lib/sales/sales-pipeline.test.ts` passed.
- `git diff --check` passed with line-ending warnings only after the prompt loading fix.
- Local route check against existing dev server: `http://localhost:3000/ja/admin/sales?tab=prompts` returned HTTP 200.
- Local unauthenticated API check: `http://localhost:3000/api/sales/ai-prompts` returned HTTP 401, confirming the prompt API remains behind admin auth.
- Pre-deploy check from `D:\dev\paradigmjpcom`: `npx tsc --noEmit --pretty false` passed.
- Pre-deploy check from `D:\dev\paradigmjpcom`: `npm test -- --run src/lib/sales/dify-diagnosis.test.ts src/lib/sales/dify-cloud.test.ts src/lib/sales/searxng-normalize.test.ts src/lib/sales/source-acquisition.test.ts src/lib/sales/sales-pipeline.test.ts src/lib/sales/external-studio-sync.test.ts src/lib/sales/video-pipeline.test.ts src/lib/sales/outreach/state-machine.test.ts src/lib/sales/outreach/preflight.test.ts src/lib/sales/outreach/form-classifier.test.ts` passed.
- Pre-deploy check from `D:\dev\paradigmjpcom`: `npm run build` passed. Next.js emitted existing warnings about `middleware` convention deprecation and edge runtime static generation.
- Commit `1972338 fix: harden sales os prompt deployment` was pushed to `origin/main`.
- Coolify deployment `lirylz9ci3ot33e3n4tods42` finished.
- Production smoke passed for `https://paradigmjp.com/ja/admin/sales`, `https://paradigmjp.com/ja`, and `https://twenty.paradigmjp.com`.
- Supabase OSS migrations 035/036/037/038/039 were applied through SSH to `paradigm-supabase-db` because REST `exec_sql` is unavailable.
- Production authenticated prompt API check passed: `https://paradigmjp.com/api/sales/ai-prompts` returned HTTP 200, `ok=true`, two prompt rows, and no fallback warning.
- `npm test -- --run src/lib/sales/sales-pipeline.test.ts src/lib/sales/external-studio-sync.test.ts src/lib/sales/video-pipeline.test.ts` passed.
- `npx tsc --noEmit --pretty false` passed perfectly after AI Prompts GUI integration.
- `npx tsc --noEmit --pretty false` passed.
- `npm test -- --run src/lib/sales/sales-pipeline.test.ts src/lib/sales/external-studio-sync.test.ts src/lib/sales/outreach/state-machine.test.ts src/lib/sales/outreach/preflight.test.ts src/lib/sales/outreach/form-classifier.test.ts` passed.
- `npx tsc --noEmit --pretty false` passed after pipeline outreach link changes.
- `git diff --check` passed with line-ending warnings only.
- `npm run context:audit` passed.
- Non-JA HP pricing check: `npm run build` passed with `PAYLOAD_READS_DISABLED=1`; `next start -p 3001` from `D:\dev\paradigmjpcom` returned HTTP 200 for `/en`, and Playwright visible-text checks confirmed `/en` shows `$3,000`, `$5,000`, `$8,000` while `/ja` does not.
- `npm test -- --run src/lib/ppp.test.ts` passed.
- `npx tsc --noEmit --pretty false` passed.
- `npm run build` passed. Next.js emitted existing warnings about `middleware` convention deprecation and edge runtime static generation.
- Local dev server verification: `npx next dev --webpack -p 3000` from `D:\dev\paradigmjpcom` returned HTTP 200 for `/ja/admin/sales`; unauthenticated view correctly stopped at the admin login gate, so the new overview panel was not visually reachable without admin session cookies.
- `npx tsc --noEmit --pretty false` passed.
- `npm test -- --run src/lib/sales/external-studio-sync.test.ts src/lib/sales/integration-registry.test.ts src/lib/sales/company-karte.test.ts` passed.
- `git diff --check` passed with line-ending warnings only.
- `npm run build` passed on the second run with a longer timeout. The first 184s run timed out before completion.
- Commit `f65f820 feat: sync external sales studios` was pushed and Coolify deployment `loevq5y3xcdhf3s6xh8kbbbx` finished.
- Production smoke passed for `https://paradigmjp.com/ja/admin/sales`, `https://paradigmjp.com/ja`, and `https://twenty.paradigmjp.com`.
- Production chunk check found the new sync panel and `external-sync` route in the deployed sales dashboard JS.
- Unauthenticated production API check returned 401 for `/api/sales/companies/:id/external-sync`, confirming the route is deployed behind auth.

## ACTIVE HANDOFF

- New main files: `src/lib/sales/sales-pipeline.ts`, `src/app/api/sales/pipeline-runs/route.ts`, `src/app/api/sales/pipeline-runs/[runId]/action/route.ts`, `src/components/sales-dashboard/SalesPipelinePanel.tsx`, `supabase/migration_036_sales_os_pipeline.sql`, `supabase/migration_037_sales_pipeline_outreach_links.sql`.
- UI entry: `/ja/admin/sales` overview now shows the unified Sales OS pipeline panel above external studio sync.
- DB: `supabase/migration_035_sales_external_studio_sync.sql` through `supabase/migration_039_sales_ai_prompts_auth_and_defaults.sql` have been applied to production through SSH/psql.
- Trigger.dev dispatch needs `TRIGGER_SECRET_KEY` or `TRIGGER_ACCESS_TOKEN` plus `TRIGGER_SALES_OS_PIPELINE_TASK_ID`; without it, the pipeline can still run locally/manual and displays `needs_review` for dispatch.
- Main files: `src/lib/sales/external-studio-sync.ts`, `src/app/api/sales/companies/[companyId]/external-sync/route.ts`, `src/components/sales-dashboard/ExternalStudioSyncPanel.tsx`.
- UI entry: `/ja/admin/sales`, `/ja/admin/sales?tab=directus`, `/ja/admin/sales?tab=keystatic`.
- Coolify REST `exec_sql` is unavailable; production Supabase OSS migrations must be applied through SSH/psql against `paradigm-supabase-db`.
- Directus real sync needs `DIRECTUS_BASE_URL`, `DIRECTUS_TOKEN`, and a compatible `sales_assets` collection or configured collection name.
- Keystatic real sync needs `KEYSTATIC_SYNC_WEBHOOK_URL` or `ASTRO_DEMO_WORKER_URL`; Keystatic URL alone is only the GUI, not a write API.

## NEXT ACTIONS

- Commit and push the unified pipeline change.
- Run `scripts/sales-os-no-login-deploy.mjs` so migrations 036/037 and the new API/UI reach production.
- Production smoke: open `/ja/admin/sales`, start a create-only/local pipeline run for a test company, and confirm `sales_pipeline_runs`, `sales_pipeline_steps`, `sales_artifact_manifest`, and approval queue/reply linkage rows are created as expected.
- Commit and push the current change.
- Run `scripts/sales-os-no-login-deploy.mjs` so migration 035 and the new API/UI reach production.
- Production smoke: open sales dashboard, Directus tab, Keystatic tab, and confirm the sync panel renders.

## RISKS

- The unified pipeline creates and records the execution chain through outbound gates, but real Trigger.dev completion still requires a deployed task that updates Supabase step state from the worker side.
- Live outbound form submission is intentionally gated; without `allow_live_outreach=true`, the run pauses in `needs_review` and creates an operator queue item.
- `report_generate` depends on existing diagnostic report data; companies without enough report inputs can fail the required report step and surface as a pipeline failure.
- R2 manifest rows are now created as SSOT delivery intent; actual upload/write completion still depends on downstream workers or renderer callbacks.
- Directus schema mismatch will surface as a visible Directus API error in the sync panel until the collection fields are aligned.
- Keystatic is Git-backed; without a sync webhook/worker, Revenue OS can show the GUI link and log skipped sync, but cannot write demo-site changes.
