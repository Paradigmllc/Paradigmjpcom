# Task.md

## CURRENT STATUS

- Revenue OS is being turned from a set of links into the operating surface for the full sales pipeline.
- Supabase remains the SSOT for company karte data, report URLs, video jobs, sync logs, and external studio state.
- New external studio sync work is implemented locally for Twenty, Directus, and Keystatic.
- Video studio legacy n8n errors are now treated as old migration notices with Trigger.dev re-dispatch actions.

## CODEX UPDATE - 2026-06-05 Sales OS External Studio Sync

- Added `/api/sales/companies/[companyId]/external-sync` to sync a selected company across Twenty, Directus, and Keystatic.
- Added `src/lib/sales/external-studio-sync.ts` for Supabase SSOT payload building, Directus push/pull, Keystatic webhook/worker sync, and Twenty push/pull orchestration.
- Added Revenue OS sync UI: `ExternalStudioSyncPanel` appears on Overview, Directus, and Keystatic tabs.
- Added `supabase/migration_035_sales_external_studio_sync.sql` so `sales_sync_logs` accepts Directus/Keystatic directions and `external_studio_sync` / `external_studio_pull` actions.
- Updated no-login deploy script to apply migration 035.
- Updated `.env.example` and production setup docs for `DIRECTUS_SALES_ASSETS_COLLECTION`, `KEYSTATIC_SYNC_WEBHOOK_URL`, `KEYSTATIC_SYNC_WEBHOOK_SECRET`, and `ASTRO_DEMO_WORKER_TOKEN`.
- Report and pro video studios now show old n8n job messages as amber migration notices and expose Trigger.dev re-dispatch.

## VERIFICATION

- `npx tsc --noEmit --pretty false` passed.
- `npm test -- --run src/lib/sales/external-studio-sync.test.ts src/lib/sales/integration-registry.test.ts src/lib/sales/company-karte.test.ts` passed.
- `git diff --check` passed with line-ending warnings only.
- `npm run build` passed on the second run with a longer timeout. The first 184s run timed out before completion.

## ACTIVE HANDOFF

- Main files: `src/lib/sales/external-studio-sync.ts`, `src/app/api/sales/companies/[companyId]/external-sync/route.ts`, `src/components/sales-dashboard/ExternalStudioSyncPanel.tsx`.
- UI entry: `/ja/admin/sales`, `/ja/admin/sales?tab=directus`, `/ja/admin/sales?tab=keystatic`.
- DB: apply `supabase/migration_035_sales_external_studio_sync.sql` before relying on Directus/Keystatic sync logs in production.
- Directus real sync needs `DIRECTUS_BASE_URL`, `DIRECTUS_TOKEN`, and a compatible `sales_assets` collection or configured collection name.
- Keystatic real sync needs `KEYSTATIC_SYNC_WEBHOOK_URL` or `ASTRO_DEMO_WORKER_URL`; Keystatic URL alone is only the GUI, not a write API.

## NEXT ACTIONS

- Commit and push the current change.
- Run `scripts/sales-os-no-login-deploy.mjs` so migration 035 and the new API/UI reach production.
- Production smoke: open sales dashboard, Directus tab, Keystatic tab, and confirm the sync panel renders.

## RISKS

- Directus schema mismatch will surface as a visible Directus API error in the sync panel until the collection fields are aligned.
- Keystatic is Git-backed; without a sync webhook/worker, Revenue OS can show the GUI link and log skipped sync, but cannot write demo-site changes.
