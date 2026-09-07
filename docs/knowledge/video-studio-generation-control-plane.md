# Video Studio generation control plane

## Purpose

**Deployment gate (2026-09-07): not connected to provider dispatch or GPU shutdown.** The seeded policy is disabled. Reservations only check caller-supplied estimates; they do not stop actual charges. Cache reuse is disabled until immutable artifact identity, rights, project scope and latest-review eligibility are implemented. Automatic retries are disabled until each attempt has a fresh atomic budget claim. Do not enable production generation based on this ledger alone.

Paid video generation must not begin until one atomic database decision has approved provider health, idempotency, cache eligibility, daily cost, per-run cost, LLM tokens, GPU time, and retry count. The control plane stores only a SHA-256 content identity; raw prompts remain outside this ledger.

## Execution contract

1. The caller estimates cost, LLM tokens, and GPU seconds before contacting a provider.
2. `video_factory_reserve_generation_run` takes a transaction advisory lock and returns `allow`, `block`, or `reuse`.
3. Only `allow` is a candidate for future provider dispatch; it is not itself an execution lease. `reuse` is reserved for a later artifact-aware integration and is currently never issued. `block` includes a machine-readable reason. Identical-key requests must match every input and caller, or they are rejected.
4. A provider request must use the run ID as its idempotency reference and complete through a callback. Fixed-interval polling is not part of this contract.
5. `video_factory_record_generation_attempt` records actual cost, token, GPU-time, and failure fingerprint. Overruns are recorded as failure after the fact, not physically stopped. Failures are terminal; automatic retry remains disabled. Callback idempotency and attempt-claim binding remain integration requirements.
6. Consecutive provider failures open the provider circuit. After cooldown, one half-open probe is allowed; concurrent probes are rejected.
7. Human review scores identity, motion, prompt adherence, artifacts, audio, and commercial fitness. Unapproved or under-threshold output is never a cache source.

## Provider routing baseline

- Avatar defaults to HeyGen.
- Premium defaults to Kling.
- Balanced defaults to Seedance.
- Economy defaults to the audited Vast.ai OSS lane.
- An explicit provider choice is retained, but cannot bypass its circuit or any budget.

This is a baseline router, not a quality claim. Provider benchmarks in the admin screen must accumulate representative, rights-cleared canaries before routing weights or commercial promises are changed.

## Operational safety

- Dashboard reads and preflight do not start Vast.ai or call paid APIs.
- Only unused, unstarted reservations expire out of the committed total. Active work retains the greater of reserved/actual cost across midnight and expiry. Cancelled actual spending is retained. The aggregate is deliberately conservative and can include earlier spending for unresolved runs.
- Reservation decisions and attempt accounting share a transaction lock. Real multi-connection concurrency, dispatch claims, provider estimates and stop confirmation still require validation before spending limits can be called enforced.
- Attempts and quality reviews are append-only through table grants.
- Tables use RLS and FORCE RLS; anon and authenticated roles have no access.
- Mutations emit both database-bell and Slack notification attempts.

## Next integration step

Regression command: install `@electric-sql/pglite` into a temporary directory, then run `node scripts/test-video-control-db.mjs <directory>/node_modules/@electric-sql/pglite/dist/index.js`. This executes the migration twice and tests key conflicts, budget expiry/day boundaries, cancelled spending, half-open probes, disabled reuse/retries and RPC/table grants against isolated PostgreSQL/WASM. It is single-connection testing, not production or concurrent-worker evidence.

Wrap each existing Video Factory production dispatch with the reservation RPC, then replace the current long Vast readiness loop with bounded lifecycle events and provider callbacks. Start with one non-billable canary per lane, verify stop confirmation and ledger totals, and keep customer charging disabled until all six quality axes meet the agreed tier threshold.
