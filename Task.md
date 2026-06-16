## CURRENT STATUS - 2026-06-16 RevenueOS comprehensive audit + hardening

### Audit scope
- Full RevenueOS audit across 8 categories: list collection, form URL/discovery, diagnostic report, Dify, Twenty CRM sync, error handling, env vars, DB schema.
- 75+ issues found; all CRITICAL and HIGH issues fixed. MEDIUM/LOW warnings remain for future sprints.

### CRITICAL fixes (16 items)

**Schema**
- `supabase/migrations/migration_053`: Added `queue_type`, `region`, `assigned_to`, `completed_at` columns to `sales_operator_queue_items` bootstrap + made `title` nullable (was NOT NULL without default).
- `supabase/migrations/migration_055`: New repair migration to backfill missing columns on existing Cloud Supabase instances (idempotent ALTER TABLE IF NOT EXISTS).
- `supabase/migration_014`: Added missing RLS policy for `sales_infrastructure_migration`.

**List collection**
- `lead-candidates.ts` / `lead-candidate-runs.ts`: Fixed `observation_count` hardcoded to 1 (was never incrementing across multiple observations).

**Twenty CRM sync**
- `twenty-pull.ts`: Fixed broken `parseSalesStatusLabel` — was comparing English enum keys against Japanese Twenty labels. Now uses `PIPELINE_LABELS` reverse-map from `twenty-sync-utils.ts`.
- `twenty-sync-companies.ts`: Fixed malformed opportunity payload (duplicate variant with typo `amountAmountMicros` removed).
- `twenty-sync-contacts.ts`: Deleted dead file (entire 234 lines never imported).
- `twenty-crm-metadata.ts`: Moved `await client.connect()` inside try-catch blocks for both DB functions.

**Dify / Diagnostic**
- `mvp/dify-prompts.ts`: Fixed region type in `SYSTEM_PROMPT_KARTE_TO_REPORT` — replaced invalid values `europe/sea/africa/others` with valid `de/fr/vi/id`.
- `diagnostic.ts`: Wired `sanitizeBlocks` from `hallucination-guard.ts` into diagnostic report pipeline.

**Error handling**
- `ai-insights/route.ts`: Fixed two silent empty catches — `.catch(() => ({}))` and `.then(() => {}, () => {})`.
- `outreach/orchestrator.ts`: `enqueueOperatorTask` now returns boolean + failures are logged; `applyOutcome`/`persistDiscoveredFormUrl` return errors; `logActivity` wrapped in try-catch.
- `oss-health-infra.ts`: Fixed silent empty catches in Morphic/Perplexica health checks.
- `cf-pages-deploy.ts`, `lead-discovery.ts`, `status/route.ts`: Added `console.warn` to all previously-empty catch blocks.

**Config / Env**
- `.env.example`: Added `DIRECTUS_ADMIN_EMAIL`, `DIRECTUS_ADMIN_PASSWORD`, `GOTENBERG_URL`, `ASTRO_DEMO_FACTORY_URL`.
- `oss-service-health-diagnostic.ts` / `integration-defs-sources.ts`: Standardized `GBIZINFO_API_KEY` → `GBIZ_API_TOKEN`.
- `db-tables.ts`: Marked 18 phantom tables as Appexxme-managed/legacy with clarifying comments.

**Outreach pipeline**
- `outreach/orchestrator.ts`: Pushed `detected_issues` filter into DB query (was in-memory); extracted side-effect functions to `outreach/side-effects.ts`.
- `post-outreach-webhooks.ts`, `sales-pipeline-execution.ts`, `agent-team-telegram.ts`: Added `title` field to operator queue inserts.
- `products.ts`: Return early when existing recommendation fetch fails (was continuing with empty data).
- `crm-field-config.ts`: Handle partial query failures — use valid data from succeeded query instead of discarding both.
- `customer-handoff.ts`: Slack notification failure now appended to warnings array.

### Verified
- `npx tsc --noEmit`: 0 errors (was 2 pre-existing before audit).
- `node scripts/paradigm-quality-guard.mjs`: 0 errors, 0 silent catch blocks, 57 pre-existing line-length warnings.
- `orchestrator.ts` split under 500-line limit (375 lines).
- `git diff --check`: clean.

### Active handoff
- Do not restore `SUPABASE_POSTGRES_*`, `MUBENG_*`, `SCRAPOXY_*`, or any Refferq reference.
- `scripts/unlock-payload-users.sh` remains intentionally untracked.
- `migration_055` needs to be applied on next deploy (safe idempotent ALTER TABLEs).
- Next audit: focus on real workload runs (form outreach dry-run, Twenty sync bulk, lead candidate multi-source).

