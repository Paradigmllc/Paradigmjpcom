## CURRENT STATUS - 2026-06-16 RevenueOS production hardening complete

### What changed
- RevenueOS now uses Supabase Cloud as the default Sales SSOT. Dedicated/self-hosted Sales Supabase is only used when `SALES_SUPABASE_PRIMARY=true`.
- Coolify env reads now prefer production rows over preview rows, preventing preview Supabase/Refferq values from shadowing production.
- Refferq fallback paths were removed from runtime DB resolution, deploy migration fallback, unlock scripts, audits, and `.env.example`.
- Passive/list collection, Twenty sync, webhook logs, outreach runs, video jobs, external studio sync, and activity logs now tolerate missing owner-only optional columns through explicit safe insert/select fallbacks.
- Health checks now distinguish configured, degraded, missing, and internal OSS service fallback states for Supabase, Twenty, Trigger.dev, Dify, SearXNG, Crawl4AI, Stagehand, Steel, Crawlee, and outreach worker.
- Deployment script now applies required Sales migrations through Supabase Cloud/Postgres, refuses deploy when required tables are missing, refreshes integration status, and does not depend on local env by accident.
- Supabase migrations were repaired/added for candidate acquisition, run tracking, race-condition guards, product/tool bootstrap, optional column repair, service-role grants, and content template constraints.
- Refferq application and `refferq-db` were deleted from Coolify after confirming no non-Refferq app/service env still referenced `refferq`.

### Production verification
- Cloud Supabase required table check: 78/78 present, 0 missing.
- `node scripts/sales-os-no-login-deploy.mjs --skip-deploy`: passed.
- Smoke URLs passed: `https://paradigmjp.com/ja/admin/sales`, `https://paradigmjp.com/ja`, `https://twenty.paradigmjp.com`.
- Integration status refresh saved 79 rows.
- Sales content templates seeded: 576.
- Refferq Coolify post-delete check: `/api/v1/applications` hits 0, `/api/v1/databases` hits 0.

### Local verification
- `npx tsc --noEmit --pretty false --incremental false`: passed.
- Targeted RevenueOS Vitest suite: 8 files / 30 tests passed.
- `node scripts/paradigm-quality-guard.mjs`: 0 errors, 56 existing line-length warnings.
- `git diff --check`: pending final run.
- `npm run context:audit`: pending final run.

### Active handoff
- Do not restore `SUPABASE_POSTGRES_*`, `MUBENG_*`, `SCRAPOXY_*`, or any Refferq reference.
- `scripts/unlock-payload-users.sh` remains intentionally untracked and must not be staged unless the user explicitly requests it.
- Next required step in this turn: final checks, commit, push, production deploy, and live verification.
