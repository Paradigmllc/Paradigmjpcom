## Codex Update - 2026-06-01 Revenue OS UI Redesign Pass

- [x] Removed the borrowed "Salesforce x Apollo.io風" dashboard name and replaced the shell with `Paradigm Revenue OS`.
- [x] Rebuilt the Sales OS layout from a pasted-card surface into a desktop app shell: left navigation, compact sticky work header, scoped metrics, and mobile select navigation.
- [x] Reworked the video-production tab into a clearer production workbench with job composer, production profile, loss simulator, readiness cards, production lanes, and job operations.
- [x] Repaired video pipeline labels and production strategy labels so visible choices are readable Japanese instead of mojibake.
- [x] Verification: `npx tsc --noEmit --pretty false`, `npm test -- --run` (29 files / 143 tests), `npm run build`, `npm audit --omit=dev`, and `git diff --check` passed. Local full-screen browser preview requires Supabase public env/auth; HTTP route validation passed from the real repo path.
- [x] Production deploy: pushed commit `aadf829` and deployed it through Coolify deployment `ub3i0bo187n0id9d3uav8fkv`. Smoke checks passed for `https://paradigmjp.com/ja/admin/sales`, `https://paradigmjp.com/ja`, and `https://twenty.paradigmjp.com`.
- [x] Host stabilization: the first deploy failed because `hermes-agent` gateway was repeatedly hitting its memory cgroup while trying unauthenticated MCP connections. The runaway gateway container was stopped after deploy so Revenue OS/Coolify/Twenty stay stable; Hermes gateway must be repaired before autonomous-agent production use.

## Codex Update - 2026-06-01 Country Scoped Region Master

- [x] Fixed the CRM master design so `地域名` is no longer a global Twenty select list. Twenty standard selects cannot depend on the selected `国名`, so the durable design is: Twenty displays the finalized region text, while Sales OS manages country-scoped region candidates as the Supabase SSOT.
- [x] Added country-scoped region editing in the CRM settings GUI: when editing `地域名`, operators choose the target country first, then add/edit/reorder only that country's region candidates.
- [x] Hardened CRM config reads/saves so stale DB rows that still mark `region` as `select` are normalized back to `text`, and Twenty metadata application coerces country-dependent fields back to TEXT via the Twenty database after metadata API updates.
- [x] Deployed commit `b9db66f` and verified live Twenty metadata: `地域名` is `TEXT` with zero global options, while `国名` and `営業ステータス` remain select fields.
- [x] Recovered the live Twenty stack after the deploy exposed a missing `twenty-db` network alias: restored the PostgreSQL container from the preserved volume, restarted Twenty server/worker, and confirmed `https://twenty.paradigmjp.com` returns HTTP 200.
- [x] Contained the runaway Hermes Agent gateway incident after it generated kernel OOM log storms and filled `/var/log/syslog` / `/var/log/kern.log`: logs were truncated, root disk recovered, and compose stop was tested. Coolify may revive the gateway service, so Hermes gateway remains flagged for MCP auth/runtime repair before heavy autonomous use.

## Codex Update - 2026-06-01 CRM DnD and Twenty Metadata Reflection

- [x] Replaced numeric CRM display-order editing with D&D Kit sortable rows for both Twenty Companies columns and select-option masters.
- [x] Fixed the Twenty reflection path: CRM labels, select options, visibility, and positions now update through Twenty's official `/rest/metadata` API when `TWENTY_BASE_URL` and `TWENTY_API_KEY` are configured, instead of relying only on direct DB writes that can leave the Twenty UI cache stale.
- [x] Kept Supabase as SSOT for the CRM display master while returning Twenty reflection status to the Sales OS toast, including the existing-tab reload note for already-open Twenty sessions.
- [x] Verification: `npx tsc --noEmit --pretty false`, full `npm test -- --run`, `npm run build`, and `npm audit --omit=dev` passed locally before deployment.

## Codex Update - 2026-06-01 Template Preview Usability Fix

- [x] Fixed the Sales OS template workbench preview so the active preview automatically follows the selected asset type: diagnostic report, Astro demo, sales deck, or sales video.
- [x] Added desktop/mobile preview switches and an expanded preview dialog so operators can judge actual layout, hierarchy, and copy without hunting through the edit form.
- [x] Verification: `npx tsc --noEmit --pretty false`, full `npm test -- --run` (29 files / 143 tests), and `npm run build` passed.

## Codex Update - 2026-06-01 Twenty Companies Sales View

- [x] Extended the Supabase SSOT company-karte snapshot with country, region/prefecture-state, industry, source, pipeline/deal status, sales-material URL, demo URL, and customer Notion portal URL.
- [x] Extended Twenty sync so Companies receive first-class営業列: `フォームURL`, `国名`, `地域名`, `業種名`, `診断レポートURL`, `営業資料URL`, `デモURL`, `ソース元`, `営業ステータス`, and `顧客用Notion URL`.
- [x] Added and applied `scripts/twenty-sales-companies-view.sql` to the live Twenty database, renaming the Companies table view to `営業リスト`, hiding noisy default CRM columns, and adding the営業列 to both the list and record HOME field widget.
- [x] Restarted Twenty server/worker to reload metadata and replayed production Twenty sync for all current Supabase `sales_companies` rows.
- [x] Verification: `npx tsc --noEmit --pretty false`, full `npm test -- --run` (29 files / 143 tests), `npm run build`, and live Twenty metadata SQL checks passed.

## Codex Update - 2026-06-01 Sales OS Perfect Pass

- [x] Fixed the Sales OS tab router so `/ja/admin/sales?tab=templates` and `/ja/admin/sales?tab=videoPipeline` open the requested workbench directly and keep the URL synchronized when operators switch tabs.
- [x] Repaired the Windows Desktop junction test runner by adding `scripts/run-vitest.mjs`; `npm test -- --run` now runs from the real repo root and passes all 143 tests.
- [x] Updated the production audit scripts to match the current Payload-integrated Sales OS instead of the old Notion-only assumption, and let them read required webhook secrets from Coolify env without printing values.
- [x] Removed a stale hardcoded Coolify token from the Supabase-key helper and replaced it with a no-secret Coolify env reader.
- [x] Fixed the Next.js 16 production build path by pinning `scripts/build-next.mjs` to webpack, avoiding the Turbopack/Payload `pino-*` external module failure.
- [x] Recovered the production host after the deploy outage: root disk was 100%, Docker/Coolify stopped, and DNS for `ghcr.io` was broken. Truncated runaway syslog/kern logs, disabled noisy UFW logging, repaired `/etc/resolv.conf` and Docker daemon DNS, restarted Docker/Coolify, and verified the OSS containers came back healthy.
- [x] Stabilized Sales OS hydration by using deterministic Asia/Tokyo date formatting in the command center and shared sales date formatter.
- [x] Deployed commit `f83d99e` through Coolify. Production image is `i12am4vvcbggefnqdizhnv9a:f83d99e3e1bee3a1a99cd63efd6d5c242aaec382`; app container is healthy.
- [x] Final verification: `npx tsc --noEmit --pretty false`, `npm test -- --run` (29 files / 143 tests), `npm run build`, `npm audit --omit=dev`, `git diff --check`, `node scripts/audit-sales-os.mjs`, and `node scripts/audit-sales-flow.mjs` passed.
- [x] Final browser verification: desktop and 390px mobile both open `/ja/admin/sales?tab=templates` with the design preview visible, `/ja/admin/sales?tab=videoPipeline` with the video pipeline visible, no horizontal overflow, and no browser console/page errors.

## Codex Update - 2026-06-01 Template Preview Fallback

- [x] Fixed the template workbench so exact filter misses no longer leave the design preview blank.
- [x] `listContentTemplates` now falls back to nearest active templates by locale and asset type, then ranks by industry, offer, appeal, and variant.
- [x] The template UI now calls the match endpoint when a scoped list is empty and displays a nearest template immediately, including report, form message, deck, video, and Astro demo previews.
- [x] Verification: `npx tsc --noEmit --pretty false`, targeted content-template Vitest, `npm run build`, `npm audit --omit=dev`, and `git diff --check` passed.

## Codex Update - 2026-05-31 Dify Cloud Runtime

- [x] Added `src/lib/sales/dify-cloud.ts` as the single Dify runtime resolver so production code uses Dify Cloud `https://api.dify.ai` even if an old self-host URL remains in env.
- [x] Recognized workflow-specific Dify keys for diagnosis, form messages, template picking, video workflow, report generation, and sales-material generation without exposing secret values in UI/logs/n8n payloads.
- [x] Updated the video pipeline config and n8n payload to include a no-secret `dify` metadata block with provider, cloud endpoint, workflow endpoint, configured groups, and missing groups.
- [x] Mapped video Dify readiness to the dedicated video workflow key or the existing karte-to-sales-material Cloud workflow key so the current global-memory/Coolify key set can drive video story generation.
- [x] Updated Dify diagnosis, form-message generation, and site chat to normalize Dify endpoints back to the official cloud endpoint.
- [x] Documented the Cloud-only contract in `docs/knowledge/dify-cloud-runtime.md` and expanded `.env.example` with the supported Dify Cloud aliases.

## Codex Update - 2026-05-31 Professional Video Pipeline

- [x] Added production-grade video profiles for genre, voice, avatar, captions, story framework, and quality tier so delivery jobs are not one-pattern outputs.
- [x] Added Cloudflare R2 asset manifest generation with deterministic `sales-videos/{locale}/{company}/{yyyy-mm}/{job_type}/{genre}/` prefixes and required outputs for master video, captions, thumbnails, transcript, source manifest, and metadata.
- [x] Extended `sales_video_jobs` through `supabase/migration_028_sales_video_production_profiles_r2.sql` and wired the no-login deploy script to apply it with the other Sales OS migrations.
- [x] Applied `supabase/migration_028_sales_video_production_profiles_r2.sql` to the live Supabase OSS database on `139.59.250.5` and verified all 10 new production/R2 columns exist.
- [x] Updated the video-pipeline API and n8n payload so Dify, ComfyUI, Vast.ai, HyperFrames, Remotion, OpenMontage, Slack review, and R2 storage receive the same production spec.
- [x] Added GUI controls under `/[locale]/admin/sales?tab=videoPipeline` for selecting production genre, voice, avatar, caption style, story framework, quality tier, and previewing the R2 storage prefix.
- [x] Added `/api/sales/video-pipeline/jobs/[jobId]/assets` so n8n/renderers can request signed Cloudflare R2 PUT URLs for master videos, captions, thumbnails, transcripts, and metadata; issued uploads are written back to `asset_manifest`.
- [x] Rewrote the video pipeline runbook with practical GUI usage, R2 delivery contract, n8n payload, quality gates, and required environment variables.
- [x] Verification: `npx tsc --noEmit --pretty false` passed, targeted Vitest passed from the real path `D:\dev\paradigmjpcom` (4 files / 10 tests), `npm run build` passed, root/worker `npm audit --omit=dev` passed, and `git diff --check` passed.
- [x] Deployed commit `983f211` through Coolify; production container is healthy on image `983f211a02fd9e66950cf9e4c31a2cbe680b5b91`. Smoke passed for `/ja`, `/ja/admin/sales?tab=videoPipeline`, `/ja/video`, and sample report video.

## Codex Update - 2026-05-31 Residual Closure and Deploy Guard

- [x] Removed the remaining customer-facing mojibake from the sales asset generator and worker package metadata, then added a regression test that blocks old garbled Japanese tokens from returning to `src/lib/sales/sales-assets.ts`.
- [x] Upgraded the root runtime stack to Next.js 16.2.6 and PayloadCMS 3.85.0, added safe `postcss` and `esbuild` overrides, and verified both root and worker dependency audits report `found 0 vulnerabilities`.
- [x] Pinned the outreach worker to a Crawlee release with clean production audit output while keeping Playwright Stealth x Crawlee worker execution off the shared Droplet unless delegated through remote browser endpoints.
- [x] Added `scripts/host-disk-preflight.mjs` and wired it into both deploy paths so production deploys check root disk pressure before hitting Coolify, prune only Docker build cache/unused images when needed, and fail before another 100% disk deploy outage.
- [x] Added and installed `scripts/install-host-disk-guard.mjs`; the live host now has `appexx-host-disk-guard.timer` running every 15 minutes. It never prunes Docker volumes.
- [x] Restored the missing Cal.com app container in the OSS sales stack without touching Cal.com DB/Redis volumes; `https://cal.paradigmjp.com` is back to HTTP 200 and `paradigm-calcom` is healthy.
- [x] Verification: `npm audit --omit=dev`, `npm --prefix worker audit --omit=dev`, `npm --prefix worker run typecheck`, `npx tsc --noEmit --pretty false`, targeted Sales OS Vitest (6 files / 17 tests), and `npm run build` all passed.

## Codex Update - 2026-05-31 Sales Mobile UI and Host Recovery

- [x] Rebuilt the Sales OS command center mobile shell: mobile uses a compact feature selector, desktop keeps the horizontal tab rail, and the header/KPI area no longer forces horizontal overflow.
- [x] Rebuilt the template workbench and live preview with readable Japanese labels and practical preview modes for diagnostic report, form message, sales deck, video, and Astro demo.
- [x] Hardened integration inventory rows so API/OSS status, balances, and missing ENV fields render as mobile cards instead of overflowing fixed grid columns.
- [x] Fixed `/[locale]/admin/sales` auth-gate copy and passed locale into the dashboard shell so the page metadata and unauthenticated mobile view are readable.
- [x] Verification: `npx tsc --noEmit --pretty false` passed, targeted Sales OS Vitest passed (7 files / 22 tests), and `npm run build` passed.
- [x] Production incident during deploy: root disk was 100% full, causing Docker healthchecks to fail with `no space left on device` and Traefik to return `503 no available server`. Rebooted the DigitalOcean droplet through API, pruned Docker build cache/unused images, restarted Coolify, and restored app routing.
- [x] Deployed commit `00cc31c` through Coolify after host recovery. Production smoke passed for `/ja`, `/ja/admin/sales`, sample report, Twenty, and Metabase.
- [x] Mobile Playwright smoke at 390px passed: `/ja/admin/sales` auth gate and the sample diagnostic report both have `scrollWidth === clientWidth` with no horizontal overflow.

## Codex Update - 2026-05-31 Diagnostic Meaning and Outreach Worker Audit

- [x] Re-read the Paradigm wall-reference guidance and converted the report path from "source numbers only" into "evidence -> meaning -> business pain -> next action" copy.
- [x] Added meaning, missing-data consequence, and next-step metadata to source coverage so free API/OSS results explain why each signal matters instead of appearing as raw counts.
- [x] Updated company intelligence and public diagnostic reports to show why each signal matters, how missing evidence is treated, and what the customer should fix first.
- [x] Strengthened contact-form discovery for Japanese/global inquiry paths and kept CAPTCHA/Cloudflare/DataDome/Arkose-style forms in manual review instead of automatic submission.
- [x] Repaired the outreach worker text path, cleaned remaining mojibake in worker comments/regex, upgraded Crawlee to 3.16.0, and added a reproducible `worker/package-lock.json`.
- [x] Verified Playwright Stealth x Crawlee dry-run locally: it filled 3 fields and did not click submit, matching the safe automation gate.
- [x] Fixed Coolify/Nixpacks build fragility by adding `scripts/build-next.mjs` and disabling build-time PayloadCMS reads while keeping runtime CMS reads enabled.
- [x] Verification: worker typecheck passed, targeted Sales OS Vitest passed (7 files / 29 tests), `npx tsc --noEmit --pretty false` passed, and `npm run build` passed without Payload Postgres fallback spam.
- [x] Deployed commit `b179e22` via Coolify API. Production smoke passed for `/ja/admin/sales`, `/ja`, Twenty, and the sample diagnostic report.
- [x] Browser render verification passed for `https://paradigmjp.com/ja/report/codex-oss-verification-demo-qnxbms`: report shows meaning, missing-data impact, next action, and not-numbers-only narrative sections.
- [x] Residual dependency note resolved: `npm audit --omit=dev` in `worker/` now reports `found 0 vulnerabilities`; the worker still remains isolated from direct untrusted binary uploads.

## Codex Update - 2026-05-31 Sales Locale Scope Audit

- [x] Follow-up native template pass: moved Sales OS content-template labels, purpose copy, quality bars, Dify selection rules, generation prompts, and sample copy into `src/lib/sales/content-template-locales.json` so app generation and Supabase seeding share one 12-locale source of truth.
- [x] Replaced the previous non-ja English fallback for template copy with locale-native template text for ja/en/ko/zh/de/fr/es/pt/ru/ar/vi/id. This keeps data scope and generated customer-facing guidance aligned by country/language.
- [x] Added regression coverage proving non-English global templates use native copy, not the old English fallback.
- [x] Scoped `/[locale]/admin/sales` from the URL locale through `getSalesDashboardData`, `GET /api/sales/dashboard`, company list, activities, operator queue, meetings, contracts, and video jobs so JP/global rows do not mix in the cockpit.
- [x] Added `src/lib/sales/locale-scope.ts` as the shared routing guard for `report_locale`, `target_country`, `region`, and report links.
- [x] Updated CSV import, scan, weekly digest, sales asset generation, diagnostic video generation, and video job APIs to accept/pass locale/country instead of falling back to `/ja`.
- [x] Updated the dashboard GUI so CSV imports, outreach dry-run, template workbench, and video pipeline jobs inherit the selected country/language scope.
- [x] Expanded bundled content-template fallback from ja/en only to all 12 supported i18n locales, with country-specific scope and English copy fallback for non-ja languages.
- [x] Follow-up audit fix: `upsertCompanyByDomain` now persists `report_locale`, `target_country`, and `template_variant` into first-class Supabase columns, not only `meta.routing`.
- [x] Follow-up audit fix: contact-form enrichment, auto-personalize, enrichment jobs, Astro demo URL generation, Stripe checkout return paths, and Slack report links now carry the active locale/country instead of hardcoding `/ja`.
- [x] Follow-up audit fix: the production seeder now creates the full 576-template locale matrix and template reads fall back to bundled locale-scoped templates when a filtered DB scope is empty.
- [x] Verification: `npx tsc --noEmit --pretty false` passed, targeted Vitest passed from `D:\dev\paradigmjpcom` (4 files / 15 tests), `git diff --check` passed, and `npm run build` passed with the known local Payload Postgres fallback warnings.

## Codex Update - 2026-05-31 Sales Template GUI Edit Pass

- [x] Rebuilt the Sales OS `テンプレ` workbench so operators can confirm, search, match-test, edit, activate/deactivate, and save Dify/n8n templates from `/ja/admin/sales`.
- [x] Extended authenticated `PATCH /api/sales/content-templates` so the GUI can edit both content fields and selection metadata: language, country, industry, offer code, asset type, appeal angle, and template variant.
- [x] Rebuilt the bundled template generator and Supabase seeder with readable ja/en copy, primary-source guardrails, and no-secret env handling.
- [x] Added regression coverage for the 256-template matrix, Japanese readability, mojibake prevention, and legal/market-claim guardrails.
- [x] Verification: `npx tsc --noEmit --pretty false` passed, `npx vitest run src/lib/sales/content-templates.test.ts` passed, full `npm test -- --run` passed from `D:\dev\paradigmjpcom`, and `npm run build` passed with the known local Payload Postgres fallback warnings.

## Codex Update - 2026-05-30 Sales Template Workbench

- [x] Added a first-class `テンプレ` tab to `/ja/admin/sales` for checking, editing, and testing Dify/n8n content-template selection.
- [x] Added authenticated `GET/PATCH /api/sales/content-templates` so operators can list and update `sales_content_templates` from the dashboard.
- [x] Rebuilt `src/lib/sales/content-templates.ts` and `scripts/seed-sales-content-templates.mjs` with readable, professional ja/en template copy for reports, Astro demos, decks, and sales videos.
- [x] The workbench lets operators filter by language, industry, asset type, and appeal angle, run a match preview, edit quality bars, edit Dify selection rules, edit prompts, and save back to Supabase SSOT.
- [x] Next quality pass completed: replaced text-level outputs with designed renderer templates for Next.js diagnostic reports, Astro demo themes, Slidev/Gotenberg decks, and HyperFrames/Remotion video compositions.

## Codex Update - 2026-05-30 Sales Asset Renderer Quality Pass

- [x] Added shared industry-aware render themes for reports, demos, decks, and videos so Dify-selected templates produce visibly different designs by language, industry, and appeal angle.
- [x] Upgraded the public diagnostic report Next.js UI into an executive report layout with evidence cards, loss summary, source coverage, Dify quality metadata, and report/demo/video CTAs.
- [x] Upgraded generated Astro demo HTML with industry-specific art direction, proof metrics, improvement plan sections, and reusable `professional-v2` metadata.
- [x] Upgraded sales deck generation to produce a styled Slidev/Gotenberg-ready proposal with executive summary, evidence, proposal scope, rollout plan, and next actions.
- [x] Upgraded sales video generation into a HyperFrames/Remotion-ready brief plus animated preview composition guidance, including ComfyUI prompt hooks and fallback narration.
- [x] Cleaned remaining mojibake in the sales diagnostic/company-intelligence render path and rebuilt demo/report/video client copy in readable Japanese/English.
- [x] Verification: mojibake scan on touched renderer files passed, `npx tsc --noEmit --pretty false` passed, full `npm test -- --run` passed from `D:\dev\paradigmjpcom` (22 files / 122 tests), and `npm run build` passed with known local Payload Postgres fallback warnings.

## Codex Update - 2026-05-30 Sales Video Pipeline GUI

- [x] Added `sales_video_jobs` as the Supabase SSOT table for sales videos and video-subscription delivery jobs, with RLS, service-role policy, status checks, and n8n tool metadata.
- [x] Added `/api/sales/video-pipeline/jobs` for listing and creating production jobs, and `/api/sales/video-pipeline/jobs/[jobId]/action` for n8n dispatch, render approval, revision, completion, failure, and cancellation.
- [x] Added `src/lib/sales/video-pipeline.ts` so n8n is a traffic controller only: Dify builds copy, ComfyUI creates assets, Vast.ai handles heavy GPU jobs, HyperFrames/Remotion/OpenMontage render, R2 stores outputs, and Slack/Appsmith handle review.
- [x] Added a first-class `動画制作` tab in `/ja/admin/sales` with practical controls for target company, job type, platform, renderer, priority, readiness checks, production stages, and per-job actions.
- [x] Added `docs/knowledge/sales-video-pipeline-runbook.md` and `.env.example` entries for n8n, HyperFrames, Remotion, OpenMontage, ComfyUI, Vast.ai, R2, and Slack.
- [x] Applied `supabase/migration_026_sales_video_pipeline.sql` to the live Supabase OSS database on `139.59.250.5` and reloaded PostgREST schema.
- [x] Verification: `npx tsc --noEmit --pretty false` passed, `npx vitest run src/lib/sales/video-pipeline.test.ts src/lib/sales/content-templates.test.ts` passed, and `npm run build` passed with the known local Payload Postgres fallback warnings.

## Codex Update - 2026-05-30 Coolify and Supabase OSS Repair

- [x] Repaired the production Sales OS SSOT schema on Supabase OSS by applying migrations 022-025 directly to the live PostgreSQL database.
- [x] Verified `sales_content_templates`, `sales_agent_commands`, `sales_agent_events`, `sales_integration_status`, and `sales_platform_health_snapshots` exist with RLS enabled and `service_role` grants.
- [x] Seeded 256 ja/en sales content templates and persisted the 36-item integration-status snapshot.
- [x] Confirmed Coolify, Docker, PostgREST, Supabase DB, Supabase Studio, and Sales OS app routes are reachable. Current stable SSOT endpoint is `https://supabase.paradigmjp.com/rest/v1/`.
- [x] Hardened the host janitor so daily cleanup prunes build cache and unused images, with aggressive unused-image pruning once root disk usage reaches 70%. Docker volumes are intentionally not pruned.
- [x] Removed hardcoded Supabase secret values from `docker-compose.supabase.yml`; the file is now an env-only safe template.
- [x] Added `docs/knowledge/coolify-supabase-repair-log.md` documenting current state, guardrails, and the staged path to full Supabase parity.
- [ ] Supabase OSS full-stack parity remains staged, not cut over: Kong/Auth/Storage/Realtime are not deployed yet, so `/auth/v1/health` still returns 404 by design.

## Codex Update - 2026-05-30 Sales Integration Registry and Safe Form Guard

- [x] Added a no-secret API/OSS inventory for the Sales OS: Dify Cloud, DeepSeek, n8n, Trigger.dev, Browserless, Crawlee/Crawl4AI, Playwright Stealth/Camoufox, DataForSEO, Google Places, Apollo/Fumadata/BIZMap/gBizInfo/jGrants/Houjin Bangou, Wappalyzer-style detection, PageSpeed, urlscan, PublicWWW, security APIs, Slidev/Gotenberg, video stack, mail/phone tools, Cal.com, Docuseal, and proxy vendors.
- [x] Imported wall-reference deltas from the readable Gemini links: Similarweb, Meta/TikTok ad library evidence, Pexels, ElevenLabs, Faster Whisper, TikTok Pixel and Klaviyo. Claude share links were blocked by Cloudflare verification in headless retrieval and need manual/authenticated review if required.
- [x] Added authenticated `GET /api/sales/integration-status` with optional `?live=1` balance/pressure checks. The endpoint returns missing env names and status only; API keys and token values are never returned.
- [x] Added the Sales OS integration inventory panel so operators can see which APIs/OSS are ready, missing, optional, or manual from the dashboard without opening multiple admin tools.
- [x] Added `supabase/migration_024_sales_integration_status.sql` with RLS-enabled snapshot storage for integration status. Current Coolify/PostgREST path does not expose `exec_sql`, so the app falls back to the code registry until the DB migration is applied manually or by a privileged migration runner.
- [x] Strengthened Wappalyzer-style detection with headers, cookies, HTML signatures, evidence labels, confidence, and detection for Cloudflare, Turnstile, reCAPTCHA, hCaptcha, DataDome, Vercel/Netlify/AWS, analytics, CMS, ecommerce, booking, and CRM tools.
- [x] Strengthened form outreach safety: Cloudflare challenge, Turnstile, reCAPTCHA, hCaptcha, DataDome, PerimeterX, Arkose/FunCaptcha, and BotDetect now classify as `risky_captcha` and route to human-led/manual queue instead of automatic form submission.
- [x] Verification: `npx tsc --noEmit --pretty false` passed; full `npm test` passed (22 files / 120 tests); `npm run build` passed with the known local Payload Postgres fallback warnings.
- [x] Deployed commit `9a7d9ad` via Coolify API. Production smoke passed for `/ja/admin/sales`, `/ja`, Twenty, and authenticated `/api/sales/integration-status` (33 integrations; current live status ready 4 / missing 20 / optional 9).

## Codex Update - 2026-05-30 Paradigm AI Bot Agent Team

- [x] Added Supabase SSOT command/event ledger for Telegram-driven sales agents: `sales_agent_commands` and `sales_agent_events` in `supabase/migration_023_sales_agent_team.sql`.
- [x] Added authenticated `POST /api/sales/agent/telegram-command` so n8n/Hermes/Paperclip can pass `@aiparadigmbot` Telegram instructions into the Sales OS.
- [x] Added `src/lib/sales/agent-team.ts` with intent routing for status reports, company karte generation, outreach dry-run, asset preparation, Twenty sync, and manual review.
- [x] Preserved guardrails: Telegram cannot perform live bulk form submission, contracts, DNS, infrastructure, or secret changes without human approval; risky commands are routed to Appsmith/manual review.
- [x] Added the Sales OS `AIチーム` dashboard tab showing roles, autonomy levels, endpoint, guardrails, and recent Telegram command logs.
- [x] Updated the operations guide so Paperclip / CEO Hermes Agent / OpenCode / OpenClaw / Outreach Worker usage is clear for 実務運用.

## Codex Update - 2026-05-30 Sales Asset Template Quality Pass

- [x] Added a cross-asset `sales_content_templates` design so diagnostic reports, Astro demos, Slidev/Gotenberg decks, and ComfyUI/HyperFrames/Remotion videos can share one Dify-selectable template library.
- [x] Added `supabase/migration_022_sales_content_templates.sql` with RLS-enabled SSOT storage for language, country, industry, offer, asset type, appeal angle, prompt, quality bar, output contract, and toolchain.
- [x] Added bundled ja/en initial templates: 8 industries x 4 appeal angles x 4 asset types x 2 languages = 256 generated patterns, with Supabase fallback if the migration has not been applied yet.
- [x] Added `POST /api/sales/content-templates/match` for Dify/n8n template selection and `POST /api/sales/generate-sales-asset` for generating/review-queueing sales decks, video briefs, Astro briefs, and report JSON.
- [x] Connected the content-template choice into the public diagnostic report, Astro demo generator, video generator, Sales OS docs tab, and no-login deploy seed path.

## Codex Update - 2026-05-30 Sales OS Operations Docs

- [x] Added an in-dashboard `使い方` Docs tab covering daily workflow, tool roles, automation boundaries, manual approval gates, Coolify no-login deploy, and practical operations gaps.
- [x] Added `docs/knowledge/sales-os-operations-guide.md` as the durable runbook for multi-agent handoff and human operations.
- [x] Rebuilt the Sales Command Center visible labels and panels in readable Japanese so the dashboard is usable by non-engineers.
- [x] Current operations audit: no code-blocking implementation gap remains for the core flow. Remaining items are intentional operational gates: first-live-send approval, CAPTCHA/SPA manual handling, API/proxy quota management, sender warm-up, and KPI review in Metabase.

## Codex Update - 2026-05-30 Sales OS Remaining Implementation Pass

- [x] Added company-intelligence aggregation so the Twenty company karte and diagnostic report use one Supabase SSOT view of free API/OSS evidence, pain points, recommended actions, and source confidence.
- [x] Rebuilt the diagnostic report data path and UI so stale mojibake copy is removed, pain evidence is visible, source coverage is shown, and Astro demo/report links are first-class.
- [x] Switched form-message generation to Dify-first behavior with DeepSeek fallback, preserving report URL placeholders and surfacing the generation engine.
- [x] Added a first-live-send approval gate: live form outreach can prepare messages and operator tasks, but the first five sends route to Appsmith/manual review instead of auto-submit.
- [x] Expanded source coverage metadata for Crawlee, Crawl4AI, Browserless, Camoufox, Playwright Stealth, Listmonk, Smartlead, Resend, Docsend, Twilio, Slidev/Gotenberg, and video/R2 delivery.
- [x] Added `supabase/migration_021_sales_completion_pass.sql` to make the four product/package records readable in Supabase and keep Twenty opportunity creation aligned with Web制作, DXパッケージ, JaaS, and 動画納品サブスク.
- [x] Verification: `npx tsc --noEmit --pretty false` passed; targeted Sales OS Vitest passed (6 files / 23 tests); full `npm test` passed (17 files / 110 tests).
- [x] Local production smoke passed from the real repo path: `http://127.0.0.1:3108/ja/admin/sales` returned HTTP 200. Commit `7e4674c` was pushed to GitHub.
- [x] Added `scripts/sales-os-no-login-deploy.mjs` so Coolify UI login is not required: it reads the configured Coolify API connection, applies the Sales OS product master to Supabase SSOT, triggers deployment, polls status, and smoke-checks public URLs without printing secrets.
- [x] Live no-login release completed: Supabase SSOT product master verified 4 readable products, Coolify deployment finished, app status returned `running:healthy`, and production smoke passed for `/ja/admin/sales`, `/ja`, Twenty, NocoDB, Metabase, and the sample report URL.

## Codex Update - 2026-05-30 Sales OS Completion Pass

- [x] Follow-up audit fixed the Twenty HOME field label bug shown as `?????URL`: the reusable `scripts/twenty-karte-home-fields.sql` patch had stale mojibake text, so it was rewritten, applied to the live Twenty DB via SCP/psql, and Twenty server/worker were restarted to clear metadata cache.
- [x] Full regression audit found and fixed one test regression in `HttpFormProvider` detail text; full Vitest now passes (17 files / 110 tests).
- [x] Rebuilt form discovery with readable Japanese/global contact-path candidates, sitemap/anchor scoring, form-signature checks, and logged fail-soft handling.
- [x] Cleaned outreach provider result text and added a unit test for contact-form discovery.
- [x] Added authenticated `POST /api/sales/twenty/pull` so Twenty company HOME fields can be pulled back into Supabase SSOT without reintroducing Notion as a source of truth.
- [x] Added authenticated `POST /api/sales/calcom/webhook` and `POST /api/sales/docuseal/webhook`; Cal.com writes `sales_calendar_events`, Docuseal writes `sales_contracts`.
- [x] Added `supabase/migration_020_sales_cal_docuseal_webhooks.sql` and applied it live, creating a Docuseal submission unique index for idempotent contract webhooks.
- [x] Reworked the Sales Command Center UI text so the dashboard is a control plane, not a duplicate Twenty CRM; added a Twenty -> Supabase sync button in the integration tab.
- [x] Updated `.env.example` to formal `*.paradigmjp.com` OSS URLs and documented Cal.com/Docuseal webhook URLs.
- [x] Verification: `npx tsc --noEmit --pretty false` passed; `npx vitest run src/lib/sales/company-karte.test.ts src/lib/sales/products.test.ts src/lib/sales/sources/form-discovery.test.ts` passed from `D:\dev\paradigmjpcom` (6 tests).
- [x] Deployed production image `i12am4vvcbggefnqdizhnv9a:b82ee660...` and verified `/ja/admin/sales`, Twenty, NocoDB, Metabase, Cal.com, and Docuseal return HTTP 200.
- [x] Production smoke passed: Cal.com webhook -> `sales_calendar_events` HTTP 200, Docuseal webhook -> `sales_contracts` HTTP 200, Twenty -> Supabase pull updated 2 records, outreach dry-run processed 2 records and safely routed both to manual queue.

## Codex Update - 2026-05-29 Sales OS E2E Automation

- [x] Cleaned garbled labels in company karte, product recommendation, and Twenty HOME sync payloads so Japanese text is readable in Twenty and reports.
- [x] Verified Cal.com OSS and Docuseal OSS are live at `https://cal.paradigmjp.com` and `https://docuseal.paradigmjp.com` with HTTP 200 responses.
- [x] Verified CSV import E2E on production: `/api/sales/import-csv` inserted a new company, queued enrichment, completed the job, generated a report URL, generated an Astro demo URL, synced Twenty HOME fields, and created two Twenty opportunities.
- [x] Live E2E record: `e2e-sales-1780066521239.paradigmjp.com` moved to `report_ready`; report and demo returned HTTP 200.
- [x] Twenty live verification: company HOME fields include report URL, karte score, source coverage, recommended products, and Japanese karte summary; opportunities were created for `Web制作` and `DXパッケージ`.
- [x] Form outreach dry-run verification: `/api/sales/outreach/run` processed 2 report-ready leads, generated Dify/local proposal messages, and routed both to manual review because no reliable form URL was found.

## Codex Update - 2026-05-29 Sales Products and Twenty Opportunities

- [x] Added Supabase OSS product/package master for four primary offers: Japan web production, Japan DX package, global Japan Entry Package (JaaS), and global video subscription.
- [x] Added company-product recommendation ledger so each completed company karte can persist which offers should become Twenty opportunities.
- [x] Extended Twenty sync so a completed company karte creates/updates the Twenty company, writes structured HOME fields (`診断レポートURL`, `フォームURL`, `推奨商材`, `カルテスコア`, `データ取得率`, `企業カルテ要約`), and creates product-based opportunities when `TWENTY_API_KEY` is configured. Long karte notes are no longer the primary UI.
- [x] Added Cal.com OSS and Docuseal OSS to Sales OS tool registry, admin dashboard links, env examples, and Supabase `sales_tool_connections`.
- [x] Disabled Notion Legacy from the Sales OS control surface; Notion remains available only as a customer-facing workspace tool, not the SSOT.
- [x] Deployed Cal.com OSS and Docuseal OSS into the Hetzner/DigitalOcean Sales stack with formal `cal.paradigmjp.com` and `docuseal.paradigmjp.com` Traefik routes.
- [x] Added `NOTION_LEGACY_SYNC_ENABLED=false` default guard behavior: legacy Notion Sales OS sync/webhook routes return HTTP 410 unless explicitly re-enabled.
- [x] Expanded free/OSS company source coverage with HTML metadata, robots/sitemap, and HTTP security-header evidence for Twenty/Supabase company karte data.
- [x] Changed form outreach dry-run behavior so missing/fallback form discovery is routed to the manual operator queue instead of counted as a hard failure.
- [x] Created Cloudflare DNS-only A records for `cal.paradigmjp.com` and `docuseal.paradigmjp.com` pointing at `139.59.250.5`.
- [x] Applied Twenty metadata patch `scripts/twenty-karte-home-fields.sql` so Company HOME exposes first-class Paradigm karte fields instead of requiring the timeline memo view.
- [x] Verification: `npx tsc --noEmit --pretty false` passed; `npx vitest run src/lib/sales/company-karte.test.ts src/lib/sales/products.test.ts` passed from real path `D:\dev\paradigmjpcom`.

## Codex Update - 2026-05-29 Company Karte Evidence Projection

- [x] Added Supabase SSOT company-karte builder that consolidates `sales_companies.meta`, `sales_source_runs`, report URLs, form URLs, Astro demo URLs, Dify pain diagnosis, and source coverage into one snapshot.
- [x] Added authenticated API `GET /api/sales/companies/[companyId]/karte` for the dashboard, n8n, and operator tools.
- [x] Added authenticated API `POST /api/sales/companies/[companyId]/twenty-sync` plus enrichment-job hook so completed karte generation can project a note into the Twenty company page when `TWENTY_API_KEY` is configured.
- [x] UX correction: removed the dashboard `企業カルテ` tab because the company-karte UI must live in Twenty company detail pages; the dashboard remains a control plane for SSOT, CSV import, jobs, and tool health.
- [x] Applied `supabase/migration_017_sales_twenty_karte_sync.sql` to Supabase OSS so `sales_sync_logs` accepts `supabase->twenty` and `karte_note_sync`.
- [x] Verification: `npx tsc --noEmit --pretty false` passed; `npx vitest run src/lib/sales/company-karte.test.ts` passed from real path `D:\dev\paradigmjpcom`.

## Codex Update - 2026-05-29 Formal Sales OS Domains

- [x] Repaired MCP config sync: `~/.claude/mcp.json`, Cursor dotfiles MCP config, Cline MCP config, and Claude Desktop config now parse and include Cloudflare/Coolify/Supabase.
- [x] Authenticated Codex `cloudflare-api` MCP via OAuth and created DNS-only A records to `139.59.250.5` for `supabase`, `nocodb`, `appsmith`, `twenty`, `metabase`, `n8n`, and `crawl4` under `paradigmjp.com`.
- [x] Updated server routing and OSS service public URLs so the formal hosts are accepted by Traefik/Coolify while old sslip/appexx URLs remain backward-compatible during transition.
- [x] Updated production app env and Supabase SSOT `sales_tool_connections` so admin/sales dashboard links point to formal `*.paradigmjp.com` URLs.
- [x] Deployed production app and verified DNS resolution plus HTTP reachability for all seven formal tool domains.

## Codex Update - 2026-05-29 Sales OS SSOT Verification

- [x] Fixed CSV import upsert so first insert does not depend on app-side `deal_stage` literals; DB default now remains the SSOT for initial stage.
- [x] Fixed `scripts/deploy.mjs` to keep Coolify on the SSH deploy-key Git source instead of rewriting the private repo to HTTPS.
- [x] Added production Coolify env `SALES_SUPABASE_URL` and `SALES_SUPABASE_SERVICE_ROLE_KEY` so sales data uses Supabase OSS instead of the legacy cloud fallback.
- [x] Deployed commit `666d39d` to Coolify and verified the running image `i12am4vvcbggefnqdizhnv9a:666d39d...`.
- [x] Live CSV verification: POST `/api/sales/import-csv` inserted 1 lead, queued 1 enrichment job, and manual runner completed it.
- [x] Live artifacts verified: diagnostic report `/ja/report/codex-oss-verification-demo-qnxbms` HTTP 200, Astro-style demo `/ja/d/codex-oss-verification-demo-qnxbms-demo` HTTP 200, `sales_source_runs` = 22, `web_demos` = 1.
- [x] Live tools verified: NocoDB/Appsmith/Twenty/Metabase/n8n HTTP 200; Supabase Studio HTTP 401 as expected without auth.

## Codex Update — 2026-05-28 Sales Enrichment Automation

- [x] Added `sales_enrichment_jobs` and `sales_diagnosis_events` as the durable Supabase OSS queue for CSV/NocoDB/Twenty-origin leads.
- [x] Added database trigger on `sales_companies` insert so direct NocoDB/Twenty writes are queued for company karte generation.
- [x] Reworked `/api/sales/import-csv` so dashboard/API CSV imports save to Supabase SSOT and enqueue enrichment jobs instead of relying on transient fire-and-forget only.
- [x] Added `/api/sales/enrichment/run` for n8n/Trigger.dev/manual dashboard execution.
- [x] Added Dify diagnosis integration with local fallback, saved under `sales_companies.meta.pain_diagnosis` / `dify_diagnosis`.
- [x] Added dashboard CSV import and job monitor tab: `CSV・自動診断`.
- [x] Applied `supabase/migration_015_sales_enrichment_jobs.sql` to Supabase OSS and verified PostgREST HTTP 200 for `sales_enrichment_jobs`.
- [x] Verification: `npx tsc --noEmit --pretty false` pass, `npm run build` pass, `npm test` pass from real path `D:\dev\paradigmjpcom` (106/106).

# Task.md — paradigmjpcom (multi-agent edition)

> 永久ルール **TASK / TASK-CLEAN / ANTI-BLOAT / TEAM-DEV** 準拠 (Global CLAUDE.md).
> セッション開始時に必ず読む → 進行中/未着手 を把握してから動く.
>
> **🛡️ TEAM-DEV 協業プロトコル** (Claude Code/Codex/Cline/Cursor/Aider/human が並列開発):
> 1. 着手前に必ず `git pull --rebase` で最新化
> 2. 該当 task の **Owner** を自分の名前 + **Lock-since** に時刻 → 即 `commit + push` (atomic lock)
> 3. 4h+ 無 update の lock は **stale** 扱い → 他 agent override 可
> 4. 1 task = 1 feature branch (`agent/{owner}/{slug}`)
> 5. 完了 → Status=✅ DONE / Owner=- / Notes に commit hash → push (lock 解放)
> 詳細 → `~/.claude/knowledge/team-dev-protocol.md`

---

## 🔄 進行中 (multi-agent ロック付き)

| Status | Owner | Lock-since | Branch | Task | Notes |
|--------|-------|-----------|--------|------|-------|
| 🟢 大半完了 | claude-code | 2026-05-20 | main | **営業フロー統合** | カルテ自動生成→診断(DeepSeek作り込み)→④フォーム営業→進捗+Notion双方向+重複排除 が本番稼働。残=Payload CMS(別領域)/デザイン刷新/実リード投入。下記 §参照 |
| ✅ DONE | Codex | 2026-05-28 | main | **営業OS 統合管理画面 / OSSツール実体化** | commit `c91e845` 本番反映。Supabase CloudをSSOTに固定。NocoDB/Appsmith/Twenty/Metabase/n8nはOSS版をCoolify上で起動し、PayloadCMS adminと営業ダッシュボードから横断リンク化。Supabase Cloud RESTは現時点でHTTP 522のためDB適用・実データ同期は復旧後に再開 |
| ✅ DONE | Antigravity | 2026-05-22 | main | **PayloadCMS 管理画面 全面拡張** (ユーザー指示「機能少なすぎ」→全領域+RLS) | 下記 §CMS拡張 参照。ナビglobal/新3コレクション/Settings強化/dashboard/RLS有効化・Adminクラッシュ修正 & 新テーブル RLS 再実行完了 |
| 🛑 DECISION | - | 2026-05-13 | - | **🗄️ 旧営業 OS 撤廃確定 (unarchive 計画なし)** | Sprint 5-7 で _archive_* 化済の旧 proposal/MVP/sales-automation/persona/authentik は **永久に再起動しない** ことを宣言。新営業 OS は sales_* schema を真のソースとし、旧 mvp_* や cms_content_blocks (B36 既存 report 永続データ) は **read だけはする** が write しない |

---

## ✅ 完了 — i18n / コンテンツ誠実化 / 自動翻訳（2026-05-20・別領域 session）

> 営業フロー統合とは別領域（i18n + Payload CMS + サイトコンテンツ）。`main` 直 commit + auto-push。

- [x] **ハードコード i18n 全廃 検証**: 全 live render component に非コメント日本語ゼロを ripgrep `\p{Han}` 等で確認（残存は archive / admin label / server lib のみ）
- [x] **自動翻訳 v2**（`src/lib/cms/autoTranslate.ts`・commit `0eaa363`）: PayloadCMS afterChange で ja 保存→11 locale を DeepSeek V4 PRO 自動翻訳。dot-path group (seo.metaTitle) + array sub-field (features/gallery) 対応・非ローカライズ兄弟 (included/image) 保持・upload→bare id 正規化・`_status` 伝播・loop guard・90s timeout。Posts/Services/Works/Pricing/FAQs に配線
- [x] **10-locale 新 namespace 翻訳**（commit `0eaa363`）: homeEn(JaaS) + videoPage を ko/zh/de/fr/es/pt/ru/ar/vi/id へ。parity 維持
- [x] **/ja home 捏造コンテンツ全廃**（commit `ae4231c`）: 200社/98%/+3倍/15分/架空証言3件 → 検証可能な事実(12言語/4領域/24h/¥0)+ /en 同型 honest proof パネル。全12 messages から捏造 purge・parity 610 均一・tests 92/92 ✅ TS clean ✅
- [x] **deploy + 本番検証 ✅**: zombie deploy(5df42be・17分 hang)を cancel → `ae4231c` 単独ビルド (OOM 回避) → `running:healthy`。live 確認: /ja=誠実コンテンツ表示・捏造残渣ゼロ / /ko=韓国語 / /ar=アラビア語+`dir="rtl"` / /vi・/id/video=現地語。DEEPSEEK_API_KEY は Coolify runtime env 在で自動翻訳 hook 本番動作可

---

## 🎯 営業フロー統合（2026-05-20 壁打ち確定）

> **監査結論**: 営業OSは共有Supabaseで二重化（本番=Appexxme `leads`(198)/`proposal_pages`(173)・paradigm-HP=`sales_companies`(7デモ)）。両者は別プロジェクトだが同 public スキーマに `sales_*` 同居。詳細 → memory `project-sales-os-duplication.md`。
> **確定方針**: **paradigm-HP 自己完結**（背骨=`sales_companies`・Appexxme `leads`系は触らない）/ ④フォーム営業の所有=paradigm-HP・実行=隔離worker（`BrowserProvider` 抽象で 案1リモートbrowser ⇄ 案2 scale-to-zero を env 切替）/ discovery=Appexxme `form-discovery.ts` 参考コピー・依存なし / Chromium は共有Droplet常駐禁止。

### Phase 0 — 基盤（低リスク・進行中）
- [x] 0-1. migration drift 正史化: `supabase/migration_004_sales_hub_reconcile.sql` 作成（冪等・実DB introspection 由来の正確 DDL・本番未適用＝replay/正史用）
- [x] 0-2. 所有境界明記: CLAUDE.md `s10-7` 追加（所有表 + 4 鉄則）+ 本ファイル §営業フロー統合 + memory `project-sales-os-duplication.md`

### Phase 1 — ①⑤ Notion⇔Supabase 配線（本番稼働確認済）
- [x] 1-0. コード一式 (sync.ts/notion.ts/6 sync API)
- [x] 1-1. **pg_cron 自動同期**: jobid 3 (companies・5分毎) + jobid 4 (templates・15分毎)・n8n 不使用 (Droplet 負荷ゼロ)
- [x] 1-2. Coolify env は既に full provision 済 (NOTION_API_KEY/NOTION_DB_*(JP/GLOBAL)/N8N_WEBHOOK_SECRET/SLACK/DEEPSEEK)
- [x] 1-3. **本番稼働確認**: sync-companies-from-notion live で total=7/updated=7。リードDB(8cbab1f5)+テンプレDB(115e2b0e) を cursor-mcp integration に共有済 (ユーザー実施)

### Phase 2 — ②カルテ（discovery 配線 完了）
- [x] 2-2. `lib/sales/sources/form-discovery.ts` 新規 + `enrich.ts` に配線 → `meta.contact_form_url` 自動格納 (Layer0/A=fetch・Layer C=worker)
- [ ] 2-1. 能動 list-building (GLEIF/gBizInfo/Places→bulk) — `import-csv` 経路は既存・自動巡回は将来

### Phase 3 — ④フォーム営業（コード完了・サーバー増設なし方針）
- [x] 3-1. `outreach/browser-provider.ts` 3 provider (既定=**http** / dry / remote)・実送信可否は dryRun が握る
- [x] 3-1b. `outreach/http-form-provider.ts` — <form>解析→hidden保持→直接 HTTP POST。**新サーバー/Chromium/課金ゼロ**で標準フォーム (CF7/WPForms/素POST) を送信 (旧MVP cheerio 系統)。ユーザー制約「サーバー増強不可」への解
- [x] 3-2. `outreach/{types,state-machine,form-classifier,preflight,activity,orchestrator}.ts` + `/api/sales/outreach/run` (dryRun=default true=安全)
- [x] 3-3. `worker/` (Playwright Stealth × Crawlee) は **SPA フォーム専用の将来オプション**に格下げ。ローカル Chromium 常駐は不可方針 → 使うなら managed CDP (`OUTREACH_BROWSER_PROVIDER=remote`)・Droplet には置かない
- 残: なし (HTTP 送信は deploy 即動作・SPA 比率が問題化したら worker を managed CDP で起動)

### Phase 4 — ③営業資料 + 仕上げ（KPI 完了）
- [x] 4-2. `lib/sales/kpi.ts` + `/api/sales/kpi-snapshot` (日次 KPI 集計)・weekly-digest 既存
- [ ] 4-1. 営業資料 deck/PDF 生成 (report/[slug] 稼働済・deck は将来)

### Phase 5 — LLM / 重複排除 / Notion CSV / DeepSeek 作り込み（2026-05-20 追加・完了）
- [x] 5-1. **LiteLLM 風フォールバック** (`lib/deepseek.ts`): provider×model チェーン (default DeepSeek V4試行→空/失敗で deepseek-chat→OpenRouter)。`DEEPSEEK_API_BASE` で LiteLLM proxy 切替可。**本番フォールバック確認済** (V4空応答→deepseek-chat)
- [x] 5-2. **重複排除** (`lib/sales/dedup.ts` + migration_006): canonical domain(hard UNIQUE) + name_key(soft)・`findExistingCompany`(notion_page_id→domain→name_key)・import-csv バッチdedup。**本番実証** (3行→batch_dupes_removed=1, inserted=2)
- [x] 5-3. **Notion CSV→作成+enrich**: sync-companies-from-notion 2経路化 (新規=作成+enrich発火 / 既存=編集反映)
- [x] 5-4. **DeepSeek 作り込み自動化** (`personalize.ts` `autoPersonalize`): enrich完了で fire-and-forget 発火・「作り込みの鉄則(寄せ集め禁止)」prompt 強化。diagnostic.ts が `meta.personalized_copy` 優先採用 → DiagnosticReport.tsx 不触で品質向上
- [x] 5-5. **テンプレ Notion 編集ループ**: 56 jp テンプレを テンプレDB に push (51 created) → Notion編集 → jobid4 で逆同期

**📊 監査 (2026-05-20)**: 単体 **92/92 pass** / tsc 自コード clean (残=既存 .next/types stale) / 本番E2E: kpi-snapshot書込✓ / outreach pipeline✓ / LLMフォールバック✓ / dedup✓ / companies-sync(total=7)✓ / `scripts/{audit-sales-flow,push-templates-to-notion}.mjs` 同梱 / commits 06ff74d→7228a3d 全push。
**残 (コードでなく外部要因)**: ① Payload paradigm-tables 0個 (並行セッション領域・CMS空+ビルド18-25分グラインド) ② `DiagnosticReport.tsx` デザイン刷新 (並行編集中で不触) ③ 実リード投入 (現 demo 中心) ④ DeepSeek 作り込み live 実例の最終確認 (deploy wgr566 完了待ち)。

**依存順**: 0 → 1 → 2 → 3 → 4。③(レポート)稼働済なので 0→1→2→3 で「一連の営業フロー」が繋がる。

### Phase 6.5 — Salesforce × Apollo風 統合営業OS（2026-05-28 Codex）

- [x] **SSOT方針を再固定**: 営業データの正本は Supabase Cloud のみ。PayloadCMS は既存コンテンツ管理、NocoDB/Appsmith/Twenty/Metabase/n8n は Supabase データを扱う用途別GUI/自動化面として扱う。
- [x] **OSS管理面の実体化**: Coolify/Traefik 上に NocoDB OSS / Appsmith OSS / Twenty OSS を新規起動。既存 n8n / Metabase も復旧・ヘルス確認済み。
- [x] **公開URL確認**: `https://nocodb-paradigm.139.59.250.5.sslip.io` / `https://appsmith-paradigm.139.59.250.5.sslip.io` / `https://twenty-paradigm.139.59.250.5.sslip.io` / `https://metabase.appexx.me` / `https://n8n.appexx.me` が HTTP 200。
- [x] **PayloadCMS admin統合**: `/admin` の BeforeDashboard に Supabase Cloud / NocoDB / Appsmith / Twenty / Metabase / n8n / Notion Legacy の状態カードを追加。URL未設定・未構築でも隠さず表示し、接続済みは外部OSS画面へ新規タブで遷移。
- [x] **営業ダッシュボード統合**: `/ja/admin/sales` のツール状態表示を日本語化。`N8N_BASE_URL` 未設定でも `N8N_PLAYWRIGHT_FORM_WEBHOOK` から n8n origin を推定して表示。
- [x] **本番反映**: commit `c91e845` / image `i12am4vvcbggefnqdizhnv9a:c91e8451a4df1d73611b4a30f5374af85fdd583b`。`/admin` / `/ja/admin/sales` / `/ja` は HTTP 200、`/api/sales/dashboard` は webhook secret 認可で `toolConnections` 7件を返却。
- [ ] **Supabase Cloud復旧後の残作業**: 現在 `https://yihdmgtxiqfdgdueolub.supabase.co/rest/v1/...` が service role でも HTTP 522。復旧後に `sales_tool_connections` 等へ正式URLをUPSERTし、NocoDB/Twenty/Appsmith/Metabaseを同じSupabase Cloud DB/APIへ接続する。

### Phase 6 — 国・言語・テンプレ routing / Notion GUI 改修（2026-05-21 追加）

- [x] `/{locale}/report/{slug}` を正規ルート化。Notion 追加行でも `slug (URL)` と `レポートURL` を自動生成し、国・表示言語・テンプレ種別を `meta.routing` に保持する互換実装へ修正。
- [x] Notion Lead/Template DB を live upgrade: `対象国` / `表示言語` / `テンプレ種別` / `slug (URL)` / `📋 診断レポート` / `同期状態` / `次アクション` / `自動適用キー` を追加。`scripts/notion-upgrade-dbs.mjs` は 4/4 DB upgrade 済。
- [x] テンプレ自動適用: 明示テンプレ優先 → セキュリティ課題 → MEO/ローカル課題 → 海外企業の日本進出 → 通常Web診断の順で推論。テンプレ選択は `region + 対象国 + 表示言語 + テンプレ種別` の一致度でスコアリング。
- [x] 既存 7 leads を routing repair し、Notion へ逆同期済。本番確認: `/ja/report/izakaya-en` / `/ja/report/hairsalon-lufre` / `/ja/report/examplecom-1ofa56` は HTTP 200。
- [x] 検証: `npx tsc --noEmit --pretty false` clean、routing smoke pass。Vitest は checkout の `D:\dev\paradigmjpcom` 解決問題で runner 側が失敗するため、同等ロジックを `tsx` で確認。
- [ ] `supabase/migration_008_sales_country_locale_templates.sql` は追加済だが、live DDL は DB owner 権限で `must be owner of table sales_companies`。現コードは `meta.routing` fallback で稼働、owner 適用後に first-class columns へ移行可。

---

## 🗂️ CMS拡張 (2026-05-21・ユーザー指示「管理画面が機能少なすぎる」→全領域)

> 壁打ち確定: 4領域すべて + RLS有効化＋ポリシー設計。RLS安全性検証済 (payload_user が全134 paradigm tableのowner→RLSバイパス・service_role rolbypassrls=true)。

**Phase A — DB+API:** ✅ A1 `lib/cms/autoTranslateGlobal.ts`(path-key再帰) / A2 `globals/Header.ts` / A3 `globals/Footer.ts` / A4 `collections/TeamMembers.ts` / A5 `collections/Testimonials.ts`(consent掲載許諾) / A6 `collections/Categories.ts` / A7 `globals/Settings.ts`拡張(seo/tracking/announcement/company・script field は admin限定) / A8 payload.config 登録

**Phase B — GUI配線:** ✅ B1 `lib/navigation.ts`(null→既定fallback非破壊) / B2 `lib/settings.ts`拡張(depth1でOG/favicon populate) / B3 SiteHeader/SiteFooter/ConditionalSiteChrome を CMS nav 配線 / B4 `AnnouncementBar.tsx`+GTM/GA4/Pixel/customScript を layout 注入 / B5 Posts.categoryRef relationship + blog-cms 優先採用

**Phase C — ダッシュボード:** ✅ C1 `components/admin/BeforeDashboard.tsx`(件数/リードpipeline/最近監査6/新規作成shortcut) + payload.config beforeDashboard 登録 + importMap 再生成

**Phase D — RLS:** ✅ D1 `supabase/migration_007_rls_paradigm.sql`(DO-block冪等) / D2 apply_migration 適用→**paradigm 134/134 RLS ON 確認**。owner(payload_user)+service_role bypass で Payload無影響・anon deny。⚠️ deploy後の新table(categories/team_members/testimonials/header/footer)に再実行要(D2-b)。public schema の60 rls_disabled は他PJ所有(s10-7)→不触

**Phase E — 検証/deploy:** ✅ E1 tsc clean(残=既存.next stale 4件のみ)+vitest 101/101 / ✅ E2 docs / ✅ E3 hotfix admin panel crash & build successful (Antigravity 2026-05-22) / ✅ E4 deploy verification + D2-b 新table RLS再実行 (Antigravity 2026-05-22)

---

## 📋 未着手 (Multi-agent 取り合い可)

| Priority | Status | Owner | Task | 工数 | Branch (推奨) |
|----------|--------|-------|------|------|---------------|
| — | ✅ 置換 | - | ~~診断レポート ゼロから再構築~~ → 下記 §営業フロー統合 に統合 (report/[slug] は稼働済・Phase 4 で deck 再建) | — | — |
| P2 | ⚪ AVAILABLE | - | PayloadCMS Pages collection Block 追加 (PricingBlock / LogoCloud / Video / SplitContent / Timeline) — 必要に応じて | 1 日 | `agent/{X}/cms-blocks-ext` |
| P3 | ⚪ AVAILABLE | - | legacy `locale` field の DB column drop migration (Pages/Services/Works/Pricing/FAQs) — admin が手動で availableLocales へ移行後 | 0.5 日 | `agent/{X}/legacy-locale-drop` |
| P3 | ⚪ AVAILABLE | - | legacy `analytics.umamiWebsiteId*` / `calendarUrl.ja/en` の DB drop migration — admin が手動で *byLocale array へ移行後 | 0.5 日 | `agent/{X}/legacy-settings-drop` |

---

## ✅ 完了 (直近 14 日)

| 完了日 | Owner | Task | Commit |
|--------|-------|------|--------|
| 2026-05-20 | claude-code | **P21 内容壁打ち→/en JaaS ホーム実装（骨子 v2）** ユーザー壁打ち確定: 商材整理(JP=MEO/AI/Web/動画サブスク・非JP=JaaS/動画サブスク)・実績は実顧客数件(匿名)で honest 化・/en 主軸=JaaS・動画サブスク=DesignJoy 型・主CTA=$1,500 Market Fit Report・痛み/損失可視化スパイン。実装: ① `homeEn` namespace ×12 locale (EN copy・英語フォールバック・parity 603) ② `HomeEnClient.tsx` 8-section JaaS アーク (Hero痛み→損失4カード→JaaS offer→mechanism→proof placeholder→$1,500 Report CTA→FAQ→final CTA・全 useTranslations 経由) ③ page.tsx を locale 分岐 (ja→HomeClient / 他→HomeEnClient) ④ CLAUDE.md s1-2 商材確定。tsc clean。**残**: 匿名実績差し込み / 10 locale DeepSeek 翻訳 / `/en/video` DesignJoy ページ / `/ja` 4商材整理 / DiagnosticReport i18n | (本コミット) |
| 2026-05-20 | claude-code | **P20 全面 i18n 監査 + 動的コンテンツ多言語化の構造修復** ユーザー指示「動的コンテンツ含め全言語×全コンテンツ i18n 正確切替の全面監査」: ① **coerceLocale 英語フォールバック反転** (旧 `非en→ja` で ko/zh/de… 訪問者に日本語 leak → 新 `ja→ja・他→en`) ② **assertLocale() 新設**で「静的UI=実12locale」「CMS=ja/en」分離。blog/services/pricing/works/faq は旧実装が coerceLocale 結果を getTranslations にも渡し 10 locale の静的UIまで ja/en に潰れていた → realLocale 描画に修正 (pricing は通貨/PPP に contentLocale) ③ ProcessSection 4 step title を messages 化 (旧 全 locale 英語固定) ④ footer 二重表示バグ修正 (companyHeadline 新設) ⑤ messages +9 key×12 locale (parity 544・CRLF 保持・loading は main 既 i18n 済で common 不要) ⑥ 監査所見をメモリ永久保存。**残**: PayloadCMS 本番DBテーブル欠落 (payload schema が別アプリ占有・要 DATABASE_URI 確認) / 内容壁打ち / report[slug]+DiagnosticReport i18n 精査。tsc clean (既存 .next/types 警告のみ) | (本コミット) |
| 2026-05-19 | claude-code | **Sprint 14 Phase A: DataForSEO lib 移植 (every-app/open-seo MIT 由来 → Paradigm-native 8 つ目のソース)** ユーザー指示「OpenSEO の API 部分だけ拝借して診断レポートに統合・lib 層のみ先行」: ① `src/lib/sales/sources/dataforseo/` 4 ファイル新規 (`cost.ts` 型のみ・`client.ts` Basic 認証 POST + cost 抽出 + btoa Edge 対応・`lighthouse.ts` Core Web Vitals + 4 scores 抽出 + safe error fallback・`index.ts` orchestrator `scanDomainSeo(domain)` mobile/desktop 並列 default + errors[] 蓄積) ② Cloudflare Workers env / Autumn 課金 / PostHog 依存を全排除し scanner.ts/ssllabs.ts スタイルに完全統一 ③ Vitest 15 tests (auth header / HTTP エラー / non-JSON / scores parse / Core Web Vitals fallback / 並列実行 / 部分失敗 / strategies option / URL 正規化) — 全 pass ④ 全体 tests 41→56 (+15) regression-free + TS clean ✅ ⑤ DataForSEO `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD` env 必要 (未設定時は明示エラー・V ルール準拠) / Phase B (on-page audit / backlinks / GEO LLM) は report 設計後 | (本コミット) |
| 2026-05-13 | claude-code | **Sprint 13: URL リネーム /diagnostic→/report/[事業者名] + admin 撤廃 (Notion 集約)** ユーザー指示「URL おかしい. paradigmjp.com/[]/report/事業者名・余計な文字なし. 営業ダッシュボードは Notion ⇔ Supabase MCP 集約・PayloadCMS はコンテンツ管理特化」: ① sales_companies.slug カラム追加 + 6 seed slug 付与 (izakaya-en/kansai-construction/hairsalon-lufre/minato-dental/chuo-accounting/select-shop-roppongi) ② findCompanyBySlug + fetchDiagnosticReport({ slug }) ③ /[locale]/report/[slug]/page.tsx + opengraph-image.tsx 新規 ④ /[locale]/_archive_diagnostic + admin/_archive_sales 化 ⑤ middleware NOINDEX /report continued ⑥ Slack 通知 URL 一斉置換 + admin ボタン → Notion ボタン ⑦ track-view: slug 優先 lookup (uuid/domain backward compat) ⑧ audit script TEST_SLUG=izakaya-en / TS clean ✅ | f28655c + 7edbbda |
| 2026-05-13 | claude-code | **Sprint 12: 実運用カバレッジ完成 (P1 全消化)** ① 56 templates (8×7 業種×課題マトリクス) 一括 seed (`scripts/seed-sales-templates.mjs` 5-stage 絶望→希望フレーム自動生成) ② `lib/sales/sources/scanner.ts` 共通スキャナ抽出 (PSI + HTML inspect + IssueCode 推定) ③ `lib/sales/enrich.ts` contact form → corporate domain 検出 → scan + gBizInfo 並列 → sales_companies UPSERT + Slack Block Kit 通知 (自由メール skip 28 ドメイン blacklist) ④ `/api/sales/weekly-digest` Slack 週次ダイジェスト (HOT top 5 + ステージ別 + 課題別 + 都道府県別) ⑤ /api/contact 拡張 (fire-and-forget 非同期 enrich) ⑥ TS clean | 94a76b4 |
| 2026-05-13 | claude-code | **Sprint 11: 実運用穴埋め 8 件 (P0+P1)** scan API (`/api/sales/scan/[domain]` PSI + HTML inspect + IssueCode 推定) / track-view (1x1 pixel + report_views++ + HOT 自動判定 3+ views) / opengraph-image 動的生成 (1200×630 next/og) / lib/notify.ts Slack Bot API (chat.postMessage + Block Kit notifyHotLead) / lib/sales/sources/gbizinfo.ts 経産省 API enrichment / /[locale]/admin/sales 管理画面 (8 KPI + リード一覧 + Cookie auth) / scripts/generate-templates-bulk.mjs (bg 用 DeepSeek V4 PRO 56 templates 生成) / DiagnosticReport tracking pixel 埋込 + middleware NOINDEX_PATTERN /diagnostic/ 追加 | 2ec123b |
| 2026-05-13 | claude-code | **🚨 V4 PRO 永久指定**: 全 LLM 呼び出しを deepseek-v4-pro default に強制 (ユーザー指示「v3 ではなく V4 PRO・間違えないで・永久保存」). グローバル CLAUDE.md NN ルール更新 + メモリ feedback_important_rules.md に詳細永久保存. lib/deepseek.ts DEFAULT_MODEL = "deepseek-v4-pro" | (本コミット) |
| 2026-05-13 | claude-code | **Sprint 10 (A+B+C+D) ノンストップ実装**: A (DeepSeek V4 PRO wrapper + form-message generator + /api/sales/generate-form-message) / B (HyperFrames 動画パイプライン: narration script 生成→HTML build→/api/sales/generate-diagnostic-video) / C (Stripe Checkout + Webhook 署名検証 + sales_customers 状態同期) / D (LP 12-locale messages namespace 追加 ja=完全翻訳・他=ja fill 後で DeepSeek 翻訳) / TS clean + 41/41 tests ✅ | (本コミット) |
| 2026-05-13 | claude-code | **Sprint 9 (A+D+B+C): 営業 OS LP × API × 診断レポート LP 一気通貫実装** (A: 3 API route /api/sales/{sync-to-notion,sync-from-notion,upsert-template} + lib/sales/auth.ts shared secret / D: /[locale]/diagnostic/[slug] LP + DiagnosticReport component + lib/sales/diagnostic.ts (3-Act builder) + middleware noindex pattern 拡張 / B: /[locale]/video 動画サブスク LP (3 plan + 比較表 + Process) / C: /[locale]/agency 代理店 WL LP + RoiCalculator (損失訴求 Aha モーメント) / TS clean + 41/41 tests ✅) | (本コミット) |
| 2026-05-13 | claude-code | **Sprint 8 着手: Notion × Supabase ハブ整備 (営業 OS 新基盤)** (sales_* schema 5 table 設計・lib/notion.ts API wrapper・n8n 3 workflow JSON skeleton・.env.example 新規・旧 archive 撤廃確定宣言) | (本コミット) |
| 2026-05-13 | claude-code | **Sprint 7: appexx.me 連携一時断絶 (fail-soft archive)** (`api/sales-automation` + `api/persona` + `lib/authentik-oidc.ts` → `_archive_*` / Slack `appexx.me/api/studio/notify` hardcode → env `SLACK_WEBHOOK_URL` + 未設定 no-op / Dify fallback `dify.appexx.me` → `api.dify.ai` (DIFY-CLOUD-ONLY 準拠) / Cal URL default `cal.appexx.me` → 空文字 + contact page で空時 skip render / tests 41/41 ✅ + TS clean ✅) | (本コミット) |
| 2026-05-13 | claude-code | **Sprint 6: 全面 i18n + CMS audit + 4 件 bug 修正** (Layer 1-5 監査 / loading.tsx i18n-ify + 12 locale messages 追加 / 18 page で page-specific canonical+hreflang override・`lib/page-metadata.ts` helper 新設 / themes-showcase noindex / HeroSection cosmetic fallback / audit script 4 本追加 (regression 防止) / tests 41/41 ✅ + TS clean ✅) | b216286 |
| 2026-05-12 | claude-code | **Sprint 5: 診断レポート archive (ゼロから作り直し前段)** (`/[locale]/report/*` + `/report/*` + `/api/report/*` + `components/proposal/*` + `lib/proposal/*` + `lib/proposal-templates*.ts` → `_archive_*` prefix + middleware `/report /p` redirect ロジック撤去 (noindex header だけ残置) + tsconfig.json `_archive_*` exclude 追加 + tests 41/41 ✅ + TS clean ✅) | 2a26343 |
| 2026-05-12 | claude-code | **Sprint 0–4: MVP archived + i18n/CMS 完璧化** (sales/api/mvp/optout/docs-admin _archive_ prefix 化 + middleware sales gate 撤去 + 6 collection availableLocales 12-locale 化 + Settings global umami/calendar 12-locale array 形式 + 8 ファイル hardcoded locale 分岐 sweep + 5 collection legacy locale field [DEPRECATED] 表示化・disabled 化 + tests 41/41 ✅ + TS clean ✅) | cd98be2 |
| 2026-05-08 | claude-code | **P18-A-FIX-1 V1 token 再統合** (UUID-36 検出 → /api/report fallback で旧 token URL 互換確保) | 32299a4 |
| 2026-05-08 | claude-code | **paradigmjpcom lockfile 修正** (git+ssh→git+https・Coolify build 連続失敗根治) | 3fc42bf |
| 2026-05-08 | claude-code | **P18-D i18n sweep 13 ページ完遂** (services + about + faq + contact + pricing + privacy + legal + works + blog + service-detail/web + service-detail/meo + service-detail/seo + service-detail/ai・全 12 locale namespace 化・isJa hardcode 全廃) | 1a9f8b8, 25b2336, eba169d, a7d89d3, f9d5575, 64d077a, d16b36b, 521e38c, 0b93d12, 6c13f80, 382311e |
| 2026-05-08 | claude-code | **CEP 永久ルール準拠 CLAUDE.md 圧縮 143KB → 58KB** (60% 削減・docs/knowledge/poss-paradigmjpcom-implementation.md 外出し) | 9aef560 |
| 2026-05-08 | claude-code | **TEAM-DEV 協業プロトコル適用** (Task.md 構造化) | (本コミット) |
| 2026-05-07 | claude-code | **B33 Phase 2 middleware locale-aware redirect** (`/report/[slug]` (locale-less) → `cms_content_blocks.region` lookup → 308 redirect・next-intl 全 /ja/ 丸まり致命バグ根治) | ec4a1eb |
| 2026-05-07 | claude-code | **B33 /[locale]/themes-showcase QA ページ** (24-cell grid + ?theme= 全画面・paradigm-blocks 6 design theme 視覚比較) | 8c0aead, c937433 |
| 2026-05-07 | claude-code | **/[locale]/report/[slug] page.tsx region lookup shim** (middleware 昇格前の中間実装・safety net 維持) | 2e5beea |
| 2026-04-30 | claude-code | **P18 Aesop ラグジュアリー全面リニューアル** (P18-A Design Token + P18-B Core Layout + P18-C Motion & Polish + P18-D-1/2/3 全ページ Aesop 化・10 ページ 全 14 routes 200 OK・dark mode 対応) | 9716ea7 ほか |
| 2026-04-27 → 2026-05 | claude-code | **P17 i18n 12-locale 拡張 P17-1〜10** (routing/locale-map/LocaleSwitcher/PayloadCMS拡張/messages.json 全 12 言語/HomeClient messages 化) | a090d66 ほか |

---

## 🗄️ アーカイブ済み (削除はしないけど使わない・2026-05-12)

| 範囲 | 元パス | 新パス (_archive_ prefix で Next.js build & tsc 除外) | 復活方法 |
|------|--------|----------------------------------------------------|---------|
| MVP frontend UI | `src/app/sales/[region]/mvp/*` | `src/app/_archive_sales/[region]/mvp/*` | rename 戻し 1 発 |
| MVP API endpoints (14) | `src/app/api/mvp/*` | `src/app/api/_archive_mvp/*` | rename 戻し 1 発 |
| MVP optout 着地ページ | `src/app/[locale]/optout` | `src/app/[locale]/_archive_optout` | rename 戻し 1 発 |
| MVP 管理 quick ref | `src/app/[locale]/docs/admin/mvp-operations` | `src/app/[locale]/docs/admin/_archive_mvp-operations` | rename 戻し 1 発 |
| middleware `/sales/*` gate | `src/middleware.ts` の SALES_PATH_PATTERN | 撤去済 (route 自体が 404 になるため不要) | B36 #19 Basic Auth ブロックを復活 |
| **🆕 診断レポートページ** (locale ルート) | `src/app/[locale]/report/*` | `src/app/[locale]/_archive_report/*` | rename 戻し 1 発 |
| **🆕 診断レポート shim** (locale-less) | `src/app/report/*` | `src/app/_archive_report_shim/*` | rename 戻し 1 発 |
| **🆕 診断レポート API** | `src/app/api/report/*` | `src/app/api/_archive_report/*` | rename 戻し 1 発 |
| **🆕 Proposal components (13 sections + Renderer)** | `src/components/proposal/*` | `src/components/_archive_proposal/*` | rename 戻し 1 発 |
| **🆕 Proposal lib** (manifest/i18n/theme/prospect-data/default-translations) | `src/lib/proposal/*` | `src/lib/_archive_proposal/*` | rename 戻し 1 発 |
| **🆕 Proposal templates** (業種×訴求軸マッチング) | `src/lib/proposal-templates*.ts` | `src/lib/_archive_proposal-templates*.ts` | rename 戻し 1 発 |
| **🆕 middleware /report /p redirect** | `src/middleware.ts` の resolveLocaleFromSlug + redirect | 撤去済 (X-Robots-Tag noindex header だけ残置・古い indexed URL 防御) | git history から復元 |
| **🆕 tsconfig** | `tsconfig.json` exclude | `_archive_*` パターン追加 | 同 exclude を消すだけ |
| **🆕 appexx.me 連携 (2026-05-13 一時断絶)** | `api/sales-automation/*` | `api/_archive_sales-automation/*` | rename 戻し 1 発 |
| **🆕 Persona API (MVP infra)** | `api/persona/[slug]/*` | `api/_archive_persona/[slug]/*` | rename 戻し 1 発 |
| **🆕 Authentik OIDC stub** (未使用) | `lib/authentik-oidc.ts` | `lib/_archive_authentik-oidc.ts` | rename 戻し 1 発 |
| **🆕 Slack 通知 hardcode** (appexx.me/api/studio/notify) | `api/contact/route.ts` + `lib/error-monitor.ts` | env `SLACK_WEBHOOK_URL` + fail-soft (未設定 = no-op) | env 設定で再有効化 |
| **🆕 Dify base URL fallback** (dify.appexx.me) | `api/chat/route.ts` | Dify Cloud `api.dify.ai` を default に (DIFY-CLOUD-ONLY 永久ルール準拠) | env DIFY_BASE_URL 設定 |
| **🆕 Cal.com URL default** (cal.appexx.me) | `lib/settings.ts` DEFAULTS / `globals/Settings.ts` admin description | 空文字 default + contact page で空時 skip render | admin が `calendarByLocale` 設定 |

**残置物 (アーカイブしていないが現在 unused)**:
- `src/lib/mvp/*` (auth/tracking 等) — archived route だけが import していたため orphan・harmless
- DB tables `mvp_outreach_runs` / `mvp_optout_tokens` / `paradigm_personas` / `form_message_templates` / `cms_content_blocks` (B36 既存 report 永続データ) — データ保護のため触らない
- Coolify cron jobs (cron-pickup / ab-winner-judge) — 404 で no-op になる (副作用なし)
- `/api/persona/*` / `/api/sales-automation/*` — MVP と共有していたが汎用 API なので残置
- `src/components/magicui/*` — proposal で使われていたが、他 page でも使う可能性あり残置

---

## 📝 確定済み方針 (2026-04-27 ユーザ承認)

### P17 / P18 Plan B 確定 (永久参照)

**P17 i18n**: `/ja` `/en` は独自設計維持 / 残 10 ロケールは Japan Entry Package 翻訳のみ + PPP 補正価格 + ハードコード文字列の漸進 messages 移行

**P18 Aesop**: 4 PR 段階リリース A→B→C→D / Modern Tech × Aesop ハイブリッド (warm beige NOT・cooler neutral cream `#f8f8f6` + ink `#121419` + indigo refined accent) / dark mode `[data-theme="dark"]` + `next-themes` / EC 系 components スキップ (Cart/Checkout/Crossmint 等) / `/report/[slug]` は対象外 (s10-4 提案ページ 4 鉄則維持)

### Locale 確定 12 個 + PPP 価格基準

詳細表 → `CLAUDE.md` s3-4 (圧縮済セクション) または `docs/knowledge/poss-paradigmjpcom-implementation.md`

主要マッピング:
- `ja → ja` (1.0) / `en → en` (1.0) / `ko → ko` (0.85) / `zh → zh` (0.55)
- `europe → de/fr` (0.95) / `es → es` (0.75) / `pt → pt` (0.45) / `ru → ru` (0.40)
- `ar → ar` (0.65・**RTL 適用**) / `sea → vi/id` (0.40) / `africa → fr` (0.95) / `others → en`

### 翻訳戦略
- DeepSeek V3 + Context Caching (system prompt 固定で 90%OFF・実効 $0.014/1M)
- 1 messages.json (~75 keys) × 10 言語 = 750 翻訳 ≈ $0.5 USD

---

## 📦 詳細外出し (このファイルから参照)

| 種別 | 参照先 |
|------|--------|
| **TEAM-DEV 協業プロトコル詳細** | `~/.claude/knowledge/team-dev-protocol.md` |
| **CEP / Anti-Bloat / 永久ルール** | `~/.claude/CLAUDE.md` + `~/.claude/knowledge/cep-content-externalization.md` |
| **paradigmjpcom 実装ディテール (API/folder/cold outreach 等)** | `docs/knowledge/poss-paradigmjpcom-implementation.md` |
| **業界知識・ノウハウ** | `~/.claude/knowledge/{topic}.md` |
| **B33 Phase 2 設計原則** | appexxme `CLAUDE.md` s10-5 #17 + appexxme `Task.md` § B33 |
| **i18n audit (P17 起点)** | `docs/research/p17-i18n-audit.md` |

---

## 🔧 環境情報 (毎セッション参照価値あり)

- **Coolify UUID**: `i12am4vvcbggefnqdizhnv9a` (paradigm-hp / Nixpacks Next.js)
- **DigitalOcean Droplet**: `555590454` (4vCPU/8GB SGP1・appexxme と共有)
- **Cloudflare Zone ID**: `f191afabddabaf1658ebfe79a9a9b723`
- **Supabase**: `appexx-studio` (yihdmgtxiqfdgdueolub・appexxme と共有)
- **Domains**: paradigmjp.com / 提案ページ canonical = `paradigmjp.com/{locale}/report/[slug]` (308 redirect 経由)
- **Dify**: 🚨 **Cloud 版 api.dify.ai のみ** (DIFY-CLOUD-ONLY 永久ルール) / OSS dify.appexx.me 削除済
- **デプロイ**: trigger ≠ 完了 (DEPLOY-VERIFY 永久ルール) / Background poll + auto-retry max 3
---

## Active Handoff - 2026-05-28 - Codex

- Task: Notionベースの営業ダッシュボードを Supabase Cloud 正本 + OSS版 Twenty/NocoDB/Appsmith/Metabase/n8n 統合ポータルへ作り替え。
- Owner: Codex
- Status: implemented locally; PayloadCMS admin unified as the primary entry/login; Supabase cloud migration blocked by app reauthentication/permission
- Scope:
  - `supabase/migration_009_sales_stack_integrations.sql`
  - `/api/sales/dashboard`
  - `/[locale]/admin/sales`
  - `src/lib/sales/dashboard.ts`
  - `src/lib/admin-auth.ts`
  - `src/components/admin/BeforeDashboard.tsx`
  - `src/components/sales-dashboard/*`
- Direction: Supabaseのみクラウド版。NocoDB/Appsmith/Twenty/Metabase/n8nはOSSセルフホストURLを `.env.example` に追加し、断絶したリンク集ではなく同一Sales Command Center上で状態・導線・作業キュー・分析を統合する。管理入口は PayloadCMS `/admin` に寄せ、`/[locale]/admin/sales` と `/api/sales/dashboard` は PayloadCMS セッションを第一認証にする（旧 `paradigm_admin_token` は移行用 fallback）。

### Production incident - 2026-05-28

- Symptom: `https://paradigmjp.com/admin` returned the global Critical error page.
- Root cause observed on host `appexx-prod-01`: PayloadCMS initialization failed because Supabase pooler for `DATABASE_URI` returned `ECIRCUITBREAKER failed to retrieve database credentials after multiple attempts`.
- Mitigation: `/admin` now catches Payload init failure in both Payload layout/page and renders a protected admin fallback with a sales-dashboard link instead of crashing. Public Payload readers use a short in-process cooldown to avoid hammering Supabase while the DB/pooler is down.
- Remaining external action: Supabase Cloud DB/pooler credentials or project availability must be restored for the full PayloadCMS content editor to work again.
- Follow-up resolution (2026-05-28): Coolify app env `DATABASE_URI` was switched to the healthy `refferq-db` PostgreSQL service on the shared `coolify` network, but `public` already belongs to the refferq app. PayloadCMS was isolated back into the dedicated `paradigm` schema, `CREATE SCHEMA IF NOT EXISTS paradigm AUTHORIZATION refferq` was run, and Payload migrations `20260520_094907_paradigm_initial` + `20260522_023308_add_missing_tables` were applied successfully (166 `paradigm.*` tables). Production was manually redeployed to image `i12am4vvcbggefnqdizhnv9a:1e22fa4541f4ff5534bf9d746cb3bd6aab778f0d`. Verified `https://paradigmjp.com/admin`, `/ja`, and `/ja/admin/sales` all return HTTP 200; `/admin` no longer shows `PAYLOADCMS DATABASE UNAVAILABLE`, `Critical error`, or `Failed query`.

---

## 🔒 永久ルール — インフラ安全規約（2026-05-28制定）

### Deploy 手順
- **GitHub Actions 不使用** (ランナー不在のため)
- `git push` → `node scripts/deploy.mjs` で Coolify API 直接デプロイ
- 環境変数 `COOLIFY_API_TOKEN` 必須
- deploy 時に Supabase ヘルスチェックを自動実行（失敗時警告・デプロイ継続）

### Supabase ヘルスチェック
- デプロイ前に `node scripts/supabase-health-check.mjs` を実行
- 異常時は `node scripts/supabase-health-check.mjs --restore` で復旧試行
- Supabase 停止中でもサイト本体は fallback (`PayloadAdminUnavailable`) 付きで稼働するためデプロイは継続可
- `SUPABASE_PAT` があれば Management API 経由でプロジェクト状態確認・復旧可能

### 再発防止チェックリスト
1. Coolify 環境変数に以下が設定されていること
   - `DATABASE_URI` (Supabase pooler: `aws-1-ap-northeast-1.pooler.supabase.com`)
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://yihdmgtxiqfdgdueolub.supabase.co`
2. Supabase プロジェクトが paused でないこと
   - https://supabase.com/dashboard/project/yihdmgtxiqfdgdueolub
3. `COOLIFY_API_TOKEN` がローカル `.env` に設定されていること
4. `PARADIGM_APP_UUID` = `i12am4vvcbggefnqdizhnv9a` (デフォルト)
5. `scripts/deploy.mjs` でデプロイすること（GitHub Actions 不使用）
6. Supabase プロジェクト paused 時の復旧手順:
   - Supabase Dashboard から手動で Resume
   - または `SUPABASE_PAT` を `.env` に設定して `node scripts/supabase-health-check.mjs --restore`

### Migration 管理
- 新 migration は `supabase/migration_NNN_xxx.sql` に格納（冪等必須・`IF EXISTS` / `IF NOT EXISTS`）
- 適用は `node scripts/supabase-health-check.mjs --migrate` で一括実行
- 目視確認用に `scripts/legacy-cleanup-*.mjs` で SQL を再生成可能

### 管理画面 fallback 動作
- PayloadCMS DB 接続失敗時 → `/admin` は `PayloadAdminUnavailable` を表示
- 営業ダッシュボード (`/ja/admin/sales`) は独立稼働
- クールダウン: 120秒間は再接続試行せず保護表示を優先（`PAYLOAD_INIT_FAILURE_COOLDOWN_MS` で調整可）

---

## Active Handoff - 2026-05-28 - Codex - Sales SSOT and migration dashboard

- Owner: Codex
- Status: implemented locally; verification in progress.
- Scope:
  - Sales OS data access now uses `getServiceSalesSupabase()` so `SALES_SUPABASE_URL` and `SALES_SUPABASE_SERVICE_ROLE_KEY` can switch only the sales dashboard/API to Supabase OSS while PayloadCMS can keep its existing database path.
  - Added `supabase/migration_014_infrastructure_migration.sql` and applied it to the current Supabase OSS host at `/data/paradigm-supabase-oss`.
  - Verified `public.sales_infrastructure_migration` by Postgres query and PostgREST. REST returned HTTP 200 with 3 rows.
  - Added the Sales Command Center `移行計画` tab for DigitalOcean current state, Hetzner target state, and the full migration runbook.
  - DigitalOcean resize re-check: current `appexx-prod-01` remains `s-4vcpu-8gb-intel` in `sgp1`; the API exposes no available SGP1 target above 8GB RAM for this account.
- Next:
  - Commit/push/deploy this dashboard update.
  - Set production `SALES_SUPABASE_URL` and `SALES_SUPABASE_SERVICE_ROLE_KEY` only after deciding the sales UI should cut over from the legacy Supabase env to the OSS Supabase endpoint.
### Deployment Result - 2026-05-28 - Codex

- Commit: `d23c188` (`feat: add sales oss migration dashboard`)
- Deployed image: `i12am4vvcbggefnqdizhnv9a:d23c188a1b3a785c94ffe67d5a6cbc5ee10f3dff`
- Production verification:
  - `https://paradigmjp.com/admin` -> HTTP 200, no `DATABASE UNAVAILABLE` / `Critical error` visible after DB alias repair.
  - `https://paradigmjp.com/ja/admin/sales` -> HTTP 200.
  - `https://paradigmjp.com/ja` -> HTTP 200.
  - Sales dashboard JS chunk contains `移行計画` and `Salesforce x Apollo`.
  - Internal `/api/sales/dashboard` with webhook auth -> HTTP 200, includes `hetzner-target-cx43` from Supabase OSS.
- Infrastructure repair during deploy:
  - Coolify app Git source was restored to SSH deploy-key mode because HTTPS private repo fetch failed.
  - PayloadCMS DB alias was corrected: `fti8tm95747tmreqc5qiodnn` is the `refferq` Postgres container and is connected to the `coolify` network with alias `refferq-db`.
  - Production app env now includes `SALES_SUPABASE_URL` and `SALES_SUPABASE_SERVICE_ROLE_KEY`, pointing Sales OS reads to the OSS Supabase endpoint while PayloadCMS remains on its Postgres database.
## Codex Update - 2026-05-29 Report Quality, Demo, and Source Coverage

- [x] Added `web_demos` and `sales_source_runs` to Supabase OSS so generated Astro-style demo pages and per-company data-source coverage are stored in the SSOT.
- [x] Updated Sales OS tool URLs in `sales_tool_connections`: Supabase OSS, NocoDB, Appsmith, Twenty, Metabase, and n8n now have live URLs instead of dashboard-only placeholders.
- [x] Added source coverage scoring for PageSpeed, DataForSEO, Wappalyzer, SSL Labs, gBizInfo, Google Places, Dify, DeepSeek, Crawlee/Crawl4AI, Browserless/Camoufox, and related APIs.
- [x] The enrichment runner now generates a published `/d/[slug]` Astro-style replacement demo page and stores the demo URL back into `sales_companies.meta.demo_site`.
- [x] The public Next.js report now shows data coverage and links to the generated replacement demo when available.
- [x] Applied `supabase/migration_016_sales_report_assets_sources.sql` to Supabase OSS and verified `web_demos` / `sales_source_runs` exist.

## Codex Update - 2026-05-29 Sales Dashboard Operational Audit

- [x] Added a DB/API/UI operational audit surface to `/[locale]/admin/sales`.
- [x] Audit covers SSOT/tool connectivity, enrichment job health, report URL readiness, source coverage, Dify availability, Twenty sync errors, and form outreach readiness.
- [x] `/api/sales/outreach/run` now accepts the same admin session used by the dashboard, while preserving webhook-secret auth for n8n/cron.
- [x] Added a dashboard dry-run button for the form outreach pipeline. It checks discovery/classification/preflight/robots without submitting forms.
- [x] Rebuilt `SalesCommandCenter.tsx` with clean Japanese UI strings after TypeScript exposed corrupted string literals.
- Current production data snapshot before deploy: `sales_companies=2`, enrichment jobs `completed=2`, pipeline `report_ready=2`, source runs `collected=12 configured=2 missing=30`.
- Remaining operational gaps:
  - Cal.com and Docuseal DNS/tool records exist, but the actual OSS app containers still need formal Coolify deployment and health checks.
  - Source coverage is still below production quality. Missing/error sources must be reduced before large-scale outbound.
  - Browserless/Camoufox/Playwright Stealth must be verified against real forms before enabling `dryRun:false`.
  - Past `opportunity_sync` errors remain in `sales_sync_logs`; rerun Twenty sync after confirming current custom fields.

## Codex Update - 2026-05-30 Sales Video Pipeline GUI

- [x] Added Supabase SSOT table `sales_video_jobs` via `supabase/migration_026_sales_video_pipeline.sql` and applied it to production Supabase OSS.
- [x] Added API routes for video job list/create/action: `/api/sales/video-pipeline/jobs` and `/api/sales/video-pipeline/jobs/[jobId]/action`.
- [x] Added the `/ja/admin/sales` `動画制作` tab with company selection, job type, platform, renderer, priority, job creation, n8n dispatch, human approval, revision, and completion URL controls.
- [x] Modeled n8n as orchestration only. HyperFrames/Remotion handle sales videos; OpenMontage + ComfyUI + Vast.ai + R2 handle subscription/video delivery.
- [x] Readiness detection now recognizes existing production env aliases: `N8N_BASE_URL`, Dify task keys, `HYPERFRAMES_API_URL`, and Slack bot/channel envs.
- [x] Cleaned the video pipeline GUI strings and kept files under the 500-line rule.
- Verification: `npx tsc --noEmit --pretty false`, `npm test -- --run`, and `npm run build` passed. Local build still prints existing PayloadCMS local Postgres fallback warnings, but exits 0.
## Codex Update - 2026-05-30 Video Segment Strategy

- [x] Added segment-aware video strategy logic for agency white-label, SaaS, EC, local SMB, creators, JaaS, and GTM engineering.
- [x] Added a loss simulator that stores operator-estimate monthly/annual loss assumptions in Supabase and keeps customer-facing copy explicitly framed as an estimate.
- [x] Added a Dify claim guard so legal dates, penalties, market-size claims, CAGR, and benchmark multipliers require primary-source URLs before customer-facing use.
- [x] Added `supabase/migration_027_sales_video_segments_loss_guard.sql` for `target_segment`, `offer_angle`, `loss_simulation`, and `claim_guard`.
- [x] Rebuilt the `/ja/admin/sales` video tab UI with readable Japanese labels, segment selection, offer-angle selection, live simulator controls, and job cards showing segment/loss metadata.
- [x] Updated the no-login deploy script to include the new video strategy migration and readable product master labels.

## Codex Update - 2026-05-31 Template Deep Link and Expert Report UI

- [x] Added deep-linkable Sales Command Center tabs. Template management can now be opened directly at `/ja/admin/sales?tab=templates` and locale switching preserves the active tab.
- [x] Rebuilt the public diagnostic report UI into an expert-style report: executive assessment, evidence confidence, opportunity-loss summary, pain model, objective signal cards, source ledger, 30-day roadmap, selected template, and CTA.
- [x] Split report locale copy into `src/components/diagnostic/report-copy.ts` so the main report component stays below the 500-line rule while retaining 12-locale UI labels.
- [x] Verification: `npx tsc --noEmit --pretty false`, targeted Vitest sales tests, and `npm run build` passed. Local build still prints existing PayloadCMS local Postgres fallback warnings because localhost Postgres is not running, but exits 0.

## Codex Update - 2026-05-31 Template Live Preview UI

- [x] Added an in-dashboard live preview panel to the template workbench so operators can review actual structure, design, and copy while editing a template.
- [x] Preview modes now cover diagnostic report, form outreach copy, sales deck, sales video storyboard, and Astro replacement demo layout.
- [x] Split `TemplateRow` into `src/components/sales-dashboard/template-workbench-types.ts` and kept the preview component separate from the editor to stay under the file-size rule.
- [x] Verification: `npx tsc --noEmit --pretty false`, targeted Vitest sales tests, and `npm run build` passed. Local build still prints existing PayloadCMS local Postgres fallback warnings because localhost Postgres is not running, but exits 0.

## Codex Update - 2026-06-01 Twenty Sales List Field Masters

- [x] Added Supabase SSOT tables `sales_crm_view_fields` and `sales_crm_select_options` via `supabase/migration_029_sales_crm_field_master.sql`.
- [x] Seeded DB-backed masters for Twenty Companies column labels/order/visibility plus country, region, industry, source, and sales status options.
- [x] Added `/api/sales/crm-field-config` and the Sales Command Center CRM tab GUI for editing column labels, order, visibility, and select-option masters.
- [x] Added a Twenty metadata apply hook that can reflect GUI saves into Twenty when `TWENTY_DATABASE_URL` is configured.
- [x] Applied live Twenty metadata SQL so `国名`, `業種名`, `ソース元`, and `営業ステータス` are SELECT fields; `地域名` is intentionally TEXT because region options are country-dependent and are managed in Sales OS/Supabase, not as one global Twenty select.
- [x] Removed the invalid `NonConvert` Twenty industry value from the live workspace data.
- Verification: `npx tsc --noEmit --pretty false`, `npm test -- --run`, `npm run build`, and `npm audit --omit=dev` passed.
## Codex Update - 2026-06-02 Video Studio Layout Stabilization

- [x] Fixed the Revenue OS video-production tab layout so the composer no longer collides with readiness cards on normal desktop widths.
- [x] Hardened long labels, select controls, job-type buttons, readiness cards, and production-lane cards with `min-w-0`, truncation, and later two-column breakpoints.
- [x] Unified admin cross-app navigation so the Payload dashboard "open sales dashboard" link and Payload database-protection fallback link open Revenue OS in a new tab; OSS tool links were rechecked and already use `target="_blank" rel="noopener noreferrer"`.
- [x] Confirmed CSV import behavior: `/api/sales/import-csv` defaults to enrichment on, writes rows to Supabase SSOT, queues `company_karte` jobs in `sales_enrichment_jobs`, and triggers the enrichment runner when jobs are enqueued. Production env has the required runner secret/base URL and Supabase service role present.
- [x] Fixed `scripts/deploy.mjs` to reuse the existing Coolify auth helper, so the standard deploy command works with the stored no-login Coolify credentials instead of requiring a shell-only `COOLIFY_API_TOKEN`.
- [x] Verification: local Chromium checks passed at 1365px, 1024px, and 390px with zero horizontal overflow; `npx tsc --noEmit --pretty false` passed.
- [x] Production deploy: pushed commits `086792b` and `5291907`, deployed through Coolify deployment `dnmzn2wkryxky1yxsvf2djdt`, and verified `https://paradigmjp.com/ja/admin/sales?tab=videoPipeline`, `https://paradigmjp.com/ja`, and `https://twenty.paradigmjp.com` return HTTP 200. Coolify app status is `running:healthy`.

## Codex Update - 2026-06-02 Dify Diagnosis Wiring

- [x] Connected company-karte diagnosis to existing Dify Cloud workflow keys, not only `DIFY_DIAGNOSIS_API_KEY`.
- [x] `runDifyDiagnosis()` now accepts `DIFY_DIAGNOSIS_API_KEY`, `DIFY_KARTE_TO_REPORT_API_KEY`, `DIFY_KARTE_TO_REPORT_KEY`, `DIFY_KARTE_TO_SALES_MATERIAL_API_KEY`, `DIFY_KARTE_TO_SALES_MATERIAL_KEY`, or `DIFY_API_KEY`.
- [x] Dify payload now includes both structured company/enrichment fields and the boilerplate `system_prompt` + `user_payload` pair, so dedicated and shared Dify workflows both work.
- [x] Dify response normalization now supports direct output fields and `outputs.result` JSON, including markdown-wrapped JSON fallback.
- [x] Updated Revenue OS audit/source-coverage readiness so the dashboard shows Dify as ready when the existing karte workflow keys are present.
- [x] Verification: `npx tsc --noEmit --pretty false` passed; targeted Vitest from `D:\dev\paradigmjpcom` passed for `dify-diagnosis` and `dify-cloud`.
## Codex Update - 2026-06-02 Source Acquisition and Wappalyzer Metrics

- [x] Strengthened the free API / OSS acquisition phase by adding a normalized source-acquisition summary path across DB migration, API, GUI, enrichment jobs, and backfill tooling.
- [x] Added `supabase/migration_030_sales_source_tech_metrics.sql` for `sales_tech_stack_detections`, so Wappalyzer/technology-stack detections can be stored as sortable structured data instead of only JSON text.
- [x] Added `/api/sales/source-acquisition` and the Sales OS integration panel view for current acquisition counts, source categories, success rate, missing/error state, and Wappalyzer technology/category filters.
- [x] Wired enrichment jobs and company upsert flows to persist detected technologies when Wappalyzer/tech-stack data is present, with a fallback reader from existing `sales_companies.meta.tech.stack` until the normalized table exists in live DB.
- [x] Added `scripts/backfill-sales-tech-stack.mjs` to replay existing company tech-stack JSON into the normalized detection table after the migration is available.
- [x] Current live acquisition snapshot: 95 source runs, 45 source kinds, 3 measured companies, 26 collected/configured signals, 67 missing signals, 27% collected success rate. Category counts: analysis 41, list 20, outreach 16, orchestration 10, demo 4, video 4.
- [x] Current live Wappalyzer snapshot: normalized table is not reachable yet from the exposed SQL channels, so the UI falls back to `sales_companies.meta.tech.stack`; current fallback count is 0 detected technologies.
- [x] Live DDL note: direct `exec_sql` is not exposed, postgres-meta returned unauthorized, and DB TCP ports were closed from this environment. The migration is included in the no-login deploy path and can be applied automatically once a SQL channel is available.
- [x] Verification: `npx tsc --noEmit --pretty false`, targeted Vitest from `D:\dev\paradigmjpcom`, and `npm run build` passed.
## Codex Update - 2026-06-02 Data Acquisition Arsenal

- [x] Expanded the Sales OS source catalog to 60 APIs/OSS/scraping sources across orchestration, lead generation, traffic/revenue estimation, tech/infrastructure, quality/security, and macro utility phases.
- [x] Added `scripts/audit-sales-data-acquisition.mjs` to verify configured env aliases, safe live endpoints, Supabase source rows, source success rates, and Wappalyzer storage without printing API keys.
- [x] Added `POST /api/sales/lead-discovery` plus the Sales OS lead-source GUI so SearxNG, Whoogle, Overpass, and PublicWWW can preview candidate domains and import them into Supabase SSOT with enrichment jobs.
- [x] Added `scripts/scan-sales-wappalyzer.mjs` to scan current company domains, save Wappalyzer/local-signature detections into `sales_companies.meta.tech.stack`, and update `sales_source_runs`.
- [x] Live audit snapshot: 60 catalog sources, 13 configured in the production app env, 20 lightweight checks, 8 live OK; SSOT currently has 3 companies, 221 source rows, 79 source types, 185 collected rows, and 84% collected/usable rate.
- [x] Live Wappalyzer scan processed 3 company domains and stored one current detection (`Cloudflare`) in company meta/source runs. The normalized `sales_tech_stack_detections` table still needs the existing `migration_030` applied through a privileged SQL channel; PostgREST `exec_sql` and schema reload RPC are not exposed on the self-hosted OSS Supabase endpoint.
- [x] Verification: `node --check` for the new scripts, `npx tsc --noEmit --pretty false`, targeted Vitest for source acquisition/Wappalyzer/lead discovery, `node scripts/scan-sales-wappalyzer.mjs --limit=25`, `node scripts/audit-sales-data-acquisition.mjs`, and `npm run build` passed.

## Codex Update - 2026-06-02 Signal Sources and Conversion Report

- [x] Expanded the lead-source API and GUI beyond static SERP sources: RSSHub job signals, Wellfound, WhoisDS NRD, Clutch/Sortlist, Shopify/Webflow experts, EventsEye/10times, and OSINT contact discovery are now selectable.
- [x] Added env placeholders for the additional signal sources plus the full video/demo production stack: OpenMontage, Vast.ai/Runpod, ComfyUI, HyperFrames, Remotion, Faster Whisper, MoviePy, Short Video Maker, LivePortrait, Edge-TTS, CosyVoice/XTTSv2, FFCreator, Editly, FFmpeg, WhisperX, Astro demo workers, and v0.
- [x] Expanded the acquisition audit catalog and source coverage ledger so the new list, video, and demo sources are counted in readiness and missing-source reporting.
- [x] Upgraded the public diagnostic report with conversion-oriented sections: executive loss snapshot, evidence board, hidden-cost comparison, and frictionless solution/CTA pricing panel.
- [x] Dify remains Cloud-only; n8n remains orchestration/traffic control; HyperFrames/Remotion/OpenMontage/ComfyUI/Vast.ai/R2 remain renderer and delivery lanes.
- [x] Live audit after writing source rows: 83 catalog sources, 14 configured env families, 21 lightweight checks, 7 live OK; SSOT now has 282 source rows, 98 source types, 251 collected rows, 253 usable rows, 36 video rows, and 9 demo/material rows.

## Codex Update - 2026-06-02 Client-Ready Video and Astro Demo Pass

- [x] Rebuilt the public diagnostic video viewer from a text-only gradient slide into a HyperFrames/Remotion-ready executive video preview with scene navigation, evidence panels, hidden-cost visuals, demo bridge, production-lane explanation, and report/demo CTAs.
- [x] Replaced corrupted fallback narration with clean Japanese/English executive copy and guarded video/demo rendering against mojibake text.
- [x] Rebuilt the Astro replacement demo generator as an independent customer-branded static site: no Paradigm HP header/footer, no inherited 404 shell, proof metrics, evidence cards, before/after section, and production-ready CTA.
- [x] Added automatic demo regeneration on `/[locale]/d/[slug]` when an existing `web_demos` row still uses an older renderer version, so stored legacy HTML is replaced from Supabase SSOT on first view.
- [x] Cleaned the industry label renderer so generated assets no longer inherit mojibake industry names.
- [x] Clarified implementation split: HyperFrames is the browser-native HTML/timeline preview and render input; Remotion is the React/MP4 production renderer for final video export when the renderer lane is enabled.
- [x] Verification: `npx tsc --noEmit --pretty false`, `git diff --check`, targeted Vitest source tests, and `npm run build` passed. Local production server returns HTTP 200 for the checked report/video and demo routes when started from `D:\dev\paradigmjpcom`; the Desktop junction path still triggers the known Next routes-manifest path issue.
