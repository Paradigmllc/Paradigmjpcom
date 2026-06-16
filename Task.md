## CURRENT STATUS - 2026-06-16 RevenueOS production-ready handoff

### Operational state

- RevenueOS passive inventory and lead collection are production deployed and verified.
- Current production code commit: `69f941d` (`fix: update passive inventory command note`).
- Latest pushed documentation/archive commit: `e7d1f38`.
- Production container verified healthy: `i12am4vvcbggefnqdizhnv9a:69f941d7209ca9de81a4d536b76e49ab386c41d2`.
- Full previous handoff history is archived at `docs/handoff-archive/2026-06-16-revenueos-passive-inventory-full-task-archive.md`.

### What is now shipped

- OpenCode/Telegram list collection uses persisted multi-source acquisition and app-side fallback recovery.
- `all + technology` commands start a durable passive inventory run with a separate scan budget (`PASSIVE_INVENTORY_COMMAND_LIMIT`, default `100000`) instead of shrinking the inventory scan to the requested display count.
- Passive inventory sources include CZDS/local zone files, optional local/remote passive domain feeds, Common Crawl domains, Tranco, DNS/CNAME evidence, and Common Crawl archived HTML stack evidence.
- Non-CNAME stacks such as WooCommerce and CRM/SMS script footprints can be detected from archived HTML.
- Long-running passive inventory segments write heartbeat/cursor progress so watchdog recovery does not misread them as stalled.
- Promoted candidates enqueue enrichment, produce diagnostic reports, and sync back to Twenty.

### Production verification

- Public smoke passed: `https://paradigmjp.com/ja/admin/sales`, `https://paradigmjp.com/ja`, and `https://twenty.paradigmjp.com` returned HTTP 200.
- OpenCode command `OpenCode Egypt Shopify 1 sites collect list` returned HTTP 200 and now reports free passive inventory + public bulk sources, not Common Crawl-only.
- Passive run `5744eaf6-7756-4003-b392-81a34fb8ed63` started with `requested_limit=100000`, 9 segments, per-segment `batch_limit=11112`, and visible heartbeat progress.
- OpenCode command `OpenCode ZA all 3 sites collect list` completed run `48c21cef-ad47-4e60-9463-3fb1c629aaab` with `fetched=3`, `upserted=3`, `verified=3`, `matched=3`, `promoted=3`, `jobs_enqueued=3`, `failure=0`.
- Current-run enrichment jobs completed for `google.co.za`, `betway.co.za`, and `amazon.co.za`; all produced report URLs and `twenty_sync=synced`.
- Corresponding company rows are `pipeline_status=report_ready`.

### Verification commands

- `npx tsc --noEmit --pretty false --incremental false`: passed.
- `node scripts/run-vitest.mjs src/lib/sales/passive-inventory-utils.test.ts src/lib/sales/agent-team-collector.test.ts src/lib/sales/agent-team.test.ts src/lib/sales/source-registry.test.ts src/lib/sales/lead-candidates.test.ts`: passed.
- `node scripts/paradigm-quality-guard.mjs`: 0 errors.
- `git diff --check`: passed.
- `npm run context:audit`: passed after global script literal-path fix and Task.md compaction.
- `npm audit --audit-level=low`: passed with 0 vulnerabilities after dependency patching and overrides.
- `node scripts/paradigm-quality-guard.mjs`: 0 errors; remaining line-count messages are advisory warnings below hard limits.

### Known notes

- No paid APIs, proxies, server upgrade, or manual infrastructure steps were required.
- Trigger.dev connectivity remains non-critical because app-side fallback/watchdog paths are live.
- Global context audit script fixed at `C:\Users\apple\.agents\scripts\context-audit.ps1` by switching wildcard-sensitive filesystem reads to literal paths.
- `scripts/unlock-payload-users.sh` is an unrelated pre-existing untracked local file and is intentionally not part of this handoff.
