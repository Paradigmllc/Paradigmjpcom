# Video Studio generation control plane

## Purpose

Paid video generation must not begin until one atomic database decision has approved provider health, idempotency, cache eligibility, daily cost, per-run cost, LLM tokens, GPU time, and retry count. The control plane stores only a SHA-256 content identity; raw prompts remain outside this ledger.

## Execution contract

1. The caller estimates cost, LLM tokens, and GPU seconds before contacting a provider.
2. `video_factory_reserve_generation_run` takes a transaction advisory lock and returns `allow`, `block`, or `reuse`.
3. Only `allow` may proceed to a provider. `reuse` points to a previously succeeded run with an approved quality review at the tier threshold. `block` is terminal and includes a machine-readable reason.
4. A provider request must use the run ID as its idempotency reference and complete through a callback. Fixed-interval polling is not part of this contract.
5. `video_factory_record_generation_attempt` records actual cost, token, GPU-time, and failure fingerprint. Actual overruns fail closed. Ordinary failures are retryable only while the database-owned attempt ceiling permits them.
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
- Reservations expire; expired reservations do not consume the daily committed total.
- Budget enforcement is server-side and transaction-serialized, so parallel workers cannot overspend by racing browser checks.
- Attempts and quality reviews are append-only through table grants.
- Tables use RLS and FORCE RLS; anon and authenticated roles have no access.
- Mutations emit both database-bell and Slack notification attempts.

## Next integration step

Wrap each existing Video Factory production dispatch with the reservation RPC, then replace the current long Vast readiness loop with bounded lifecycle events and provider callbacks. Start with one non-billable canary per lane, verify stop confirmation and ledger totals, and keep customer charging disabled until all six quality axes meet the agreed tier threshold.
