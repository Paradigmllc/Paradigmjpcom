# Task.md

## CURRENT STATUS

- Revenue OS / Sales OS is the operating surface for company karte, reports, outreach approval, form-send lanes, post-outreach capture, and pipeline runs.
- Supabase remains the SSOT for sales companies, activity logs, operator queues, pipeline runs/steps, video jobs, sync logs, and artifact manifests.
- n8n is no longer the active orchestrator for new Sales OS work. Trigger.dev is the primary orchestration target; legacy `N8N_*` values are inbound/backward-compat only where explicitly noted.
- Form URL extraction and submission are now wired as one lane family: HTTP form submit, Crawl4AI discovery, Browserless rendered inspection, Crawlee SPA discovery, Playwright Stealth worker submission, and Stagehand agent discovery/submission.

## CODEX UPDATE - 2026-06-06 Trigger.dev + Stagehand Production Audit

- Replaced remaining active dashboard/orchestration references from n8n to Trigger.dev in Sales OS health, dashboard tool connections, enrichment runner dispatch, Chatwoot/LiveKit post-outreach forwarding, source coverage, API comments, and runbooks.
- Fixed shared webhook auth so `X-Webhook-Secret` checks `TRIGGER_WEBHOOK_SECRET` first and keeps `N8N_WEBHOOK_SECRET` only as legacy fallback.
- Added Stagehand SDK support in `worker/`: `/health`, `/discover-form`, and Stagehand `/submit` paths now run alongside existing Crawlee `/discover-spa` and Playwright Stealth `formUrl` submission.
- Updated worker environment contracts for Stagehand LLM keys, Browserbase/CDP/Browserless wiring, Bearer auth, and Browserless CDP auto-wiring.
- Updated worker Dockerfile to `mcr.microsoft.com/playwright:v1.60.0-noble` so the base image matches `playwright@^1.60.0`.
- Deployed/rebuilt the production `paradigm-stagehand` container on the Droplet and fixed its Traefik rule to `Host(\`stagehand.paradigmjp.com\`)`.
- Production Stagehand health is live at `https://stagehand.paradigmjp.com/health` and reports `ok=true`, `mode=local-cdp`, `model=deepseek-chat`.
- Production env presence check: Stagehand, Browserless, Crawlee worker, Playwright Stealth worker, Crawl4AI base URL, Supabase, and DeepSeek are set.
- Production env gap: Trigger.dev cloud dispatch is not fully live because `TRIGGER_SECRET_KEY` / `TRIGGER_ACCESS_TOKEN` / `TRIGGER_DEV_API_KEY` and task IDs are missing in Coolify production env. `TRIGGER_WEBHOOK_SECRET` is set.
- Residual dependency risk: `npm --prefix worker audit --omit=dev` still reports 17 low-severity transitive `@ai-sdk/provider-utils` advisories from Stagehand/AI SDK. `npm audit fix` did not clear them; prior forced override broke Stagehand runtime, so no unsafe override is applied.

## VERIFICATION

- `npx tsc --noEmit --pretty false` passed.
- `npm test -- --run src/lib/sales/outreach/activity.test.ts src/lib/sales/sources/form-discovery.test.ts src/lib/sales/outreach/browser-provider.test.ts src/lib/sales/outreach/http-form-provider.test.ts src/lib/sales/outreach/form-classifier.test.ts src/lib/sales/outreach/preflight.test.ts src/lib/sales/outreach/state-machine.test.ts src/lib/sales/integration-registry.test.ts src/lib/sales/sales-pipeline.test.ts` passed.
- `npm --prefix worker run typecheck` passed.
- `npm run build` passed.
- Additional auth fix verification: `npx tsc --noEmit --pretty false`, targeted `integration-registry` / `sales-pipeline` tests, and `git diff --check` passed.
- `docker compose build stagehand && docker compose up -d stagehand` passed on the Droplet.
- `https://stagehand.paradigmjp.com/health` returned HTTP 200 with Stagehand ready.

## ACTIVE HANDOFF

- Main app files: `src/app/api/sales/health/route.ts`, `src/lib/sales/dashboard.ts`, `src/lib/sales/enrichment-jobs.ts`, `src/lib/sales/post-outreach-webhooks.ts`, `src/lib/sales/oss-service-health.ts`, `src/lib/sales/integration-definitions.ts`, `src/lib/sales/source-coverage.ts`.
- Worker files: `worker/src/index.ts`, `worker/src/stagehand.ts`, `worker/Dockerfile`, `worker/package.json`, `worker/package-lock.json`, `worker/README.md`, `worker/.env.example`.
- Production worker: `paradigm-stagehand` on Droplet, public URL `https://stagehand.paradigmjp.com`, internal mode Browserless CDP.
- Needed to complete Trigger.dev cloud: set one of `TRIGGER_SECRET_KEY` / `TRIGGER_ACCESS_TOKEN` / `TRIGGER_DEV_API_KEY`, plus task IDs such as `TRIGGER_SALES_OS_PIPELINE_TASK_ID`, `TRIGGER_SALES_ENRICHMENT_TASK_ID`, `TRIGGER_POST_OUTREACH_TASK_ID`, `TRIGGER_CHATWOOT_REPLY_TASK_ID`, and `TRIGGER_LIVEKIT_DISCOVERY_TASK_ID`.

## NEXT ACTIONS

- Commit and push the current Trigger.dev + Stagehand changes.
- Deploy the main app through `node scripts/deploy.mjs`.
- Production smoke after deploy: `/ja`, `/ja/admin/sales`, authenticated `/api/sales/health`, and Stagehand `/health`.
- After Trigger.dev credentials/task IDs are available, rerun `/api/sales/health` and a safe dry-run pipeline dispatch.

## RISKS

- Trigger.dev code paths are implemented, but cloud execution is not complete until production credentials and task IDs are configured.
- Live outbound form submission remains intentionally gated by approval/dry-run settings; CAPTCHA, login, payment, and anti-bot challenges stop for manual review.
- Stagehand is operational, but its upstream AI SDK dependency currently carries low-severity audit advisories.
