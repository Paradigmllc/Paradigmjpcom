# Manual Japan Entry `/work` production-readiness audit — 2026-07-21

## Executive verdict

The production surface observed before this change was **not ready for scaled customer-facing use**. The report was a 19,093 px desktop / 39,275 px mobile text document with zero semantic figures and zero tables. The current database also contains only five manual-work records and one measured durable-batch item, so neither report quality nor 500-item throughput had been proven at production scale.

This change removes the known code-level blockers: a visual report system, server-drained durable batches, provider preflight, delta Realtime updates, global history pagination, duplicate-copy rejection, and Twenty read-back preservation. Release and a staged live canary are still required before processing the 4,000-company target.

## Evidence observed before the fix

| Surface | Observed production state | Consequence |
| --- | ---: | --- |
| Customer report | 0 `<figure>`, 0 `<table>` | Long-form text was difficult to scan and not presentation-grade. |
| Desktop report | 19,093 px scroll height | Decision signals were buried in prose. |
| Mobile report | 39,275 px scroll height | Responsive, but excessively dense. |
| Manual-work history | 5 total: completed 2, needs review 3, failed 0 | Too little evidence to claim scaled readiness. |
| Message artifacts | 4/5 present | One incomplete artifact remains visible in the operating history. |
| Report artifacts | 5/5 present | Four were stored under the older V2 schema. |
| Verified forms | 3/5 | A missing form must remain a review state, not be guessed. |
| Twenty read-back | 3/5 synced | Two records are correctly outside the synced/send-ready set. |
| External sends | 0 | Zero-send safety is intact. |
| Durable-batch sample | 1 item, 31 seconds | Insufficient for a 500-item SLA or cost forecast. |

## P0 defects corrected in this change

1. **Text-wall report** — the report now has four executive figures, one decision table, and one evidence/action/decision figure in each of ten chapters. Visual values are derived from saved qualification, source-coverage, projection, form, and quality data; missing numeric evidence produces a visible no-number safeguard.
2. **Generic/raw internal labels in customer output** — internal enum values, crawl pipe dumps, duplicate evidence URLs, and unbounded source text are removed or converted to customer-safe language. Existing V4 payloads are rebuilt at read time so stale bad labels cannot survive a renderer upgrade.
3. **Repeated first-touch sentences** — near-duplicate long sentences now fail the deterministic quality gate, including the repetition observed in the Salesfire/Altairis production sample.
4. **Browser-dependent batch execution** — the browser no longer drives the normal drain loop. The accepted batch is persisted first, then the server continues bounded three-item slices through authenticated internal events.
5. **Public-CDN self-dispatch** — production self-dispatch defaults to the local Next.js process, avoiding Cloudflare/proxy duration limits and an ambiguous public-site environment variable.
6. **Provider balance cascade** — a four-token DeepSeek preflight runs before a batch is created. A missing key, insufficient balance, or unavailable provider rejects the batch before hundreds of doomed rows are written.
7. **500-item Realtime amplification** — the stream now sends changed item/batch rows instead of repeatedly reloading all 500 items. History refreshes are bounded to 25 completed items or terminal state.
8. **4,000-row history blind spot** — `/api/work` now supports server-side filtering, search, exact totals, and 100-row pages. Dashboard totals are global rather than calculated from the visible page.
9. **Stale report schema** — report resolution rebuilds every saved report through the current V4 contract while preserving the original generation timestamp.

## Remaining operational risks and required controls

### 1. The 4,000-company source list does not yet exist at final quality

The workbench processes supplied company URLs; it does not make an unqualified source corpus become 4,000 sendable companies. Previous source work recorded 3,257 approved inventory records, 2,342 website-preflight passes, 23 verified forms in 447 reviewed websites, and nine final Twenty approvals. Those figures show that list acquisition and qualification—not the input box—is the largest volume constraint.

**Control:** operate source acquisition as a separate funnel with counts for raw URL, reachable company site, overseas SMB evidence, offer fit, verified form, copy pass, report pass, and Twenty read-back. Never report raw URLs as a 4,000-company sales list.

### 2. No production 500-item canary has been completed

One 31-second item cannot establish latency, DeepSeek spend, Crawl4AI capacity, failure rate, or Twenty throughput. Extrapolating it would be misleading.

**Control:** run 20, then 100, then 500 fresh URLs. Capture p50/p95 duration, technical-failure rate, needs-review rate, verified-form rate, copy-pass rate, Twenty read-back rate, and actual DeepSeek usage before raising the batch size in practice.

### 3. A process/container interruption can still require recovery

Items and claim leases are durable and stale claims can be reclaimed. The normal chain is automatic and a recorded dispatch failure auto-recovers when the operator returns. A host outage during an in-flight slice cannot be made impossible inside a single web container.

**Control:** completion alert plus DB batch state is the operational source of truth. A batch that remains `running` without item updates for more than the claim lease is an incident; it must be resumed against the same batch, never recreated as a duplicate batch.

### 4. “Needs review” is not a technical failure

An overseas-SMB uncertainty, Japan-fit uncertainty, missing verified form, or insufficient public evidence must remain review-required. Converting these to apparent success would recreate the false-form and fabricated-claim defects.

**Control:** distinguish `failed` (technical) from `needs_review` (evidence/human decision), `rejected` (out of scope), and `completed` (all current gates passed). Only technical failures count against platform reliability.

### 5. Report design cannot substitute for company-specific evidence

The new figures improve decision usability, but charts are only valid when their source is visible. The report must not invent traffic, revenue, demand, legal exposure, or opportunity loss to make a graphic look complete.

**Control:** audit every 20-item canary report, then a random 10% sample per 100-item wave and 5% per 500-item wave. Reject raw enum labels, repeated sections, unrelated products, unsupported numbers, generic template language, or a recommendation that cannot be traced to a saved fact/hypothesis/action class.

### 6. Copy quality requires ongoing sampling even after automatic gates

The deterministic gate catches URLs, citations, commercial terms, unsupported claims, signatures, and sentence repetition. It cannot fully judge tone, recipient appropriateness, or whether a true fact is the best fact to lead with.

**Control:** human-read all first 20 drafts, then 20% of the 100 wave and 10% of each 500 wave. Track edits, repeated openings across companies, wrong product anchors, word count, and copy/paste readiness. Feed recurring edits into a regression test before the next wave.

### 7. Form availability and permission can change

A technically verified form may later change, use a no-solicitation policy, add CAPTCHA, or route to support rather than business development.

**Control:** the operator opens the form immediately before manual submission. The workbench must remain zero-send; verification is permission to review a route, not permission to contact automatically.

### 8. Twenty is a read-back requirement, not a fire-and-forget side effect

An HTTP success is insufficient if fields are missing, a duplicate company was updated incorrectly, or the worker is unhealthy.

**Control:** every completed company must have the same domain, report URL, verified form state, first-touch draft, readiness label, and unsent state on Twenty read-back. Any mismatch becomes `needs_review`/sync failure and blocks the wave.

## Staged operating gate for 4,000 companies

| Wave | Volume | Promotion gate |
| --- | ---: | --- |
| Canary A | 20 | 0 unintended sends; 100% Twenty read-back for eligible records; 100% human copy/report review; no false form URL. |
| Canary B | 100 | Technical failures ≤2%; copy gate results explainable; all false positives repaired before promotion. |
| Production pilot | 500 | Server completes without browser drain; Realtime remains usable; cost and p95 duration recorded; Twenty/readiness reconciliation complete. |
| Scale | 8 × 500 | Start the next wave only after the prior wave’s reconciliation and sampling audit passes. Stop on a repeated systemic defect. |

`needs_review` and legitimate target rejection are not forced into the ≤2% technical-failure threshold. No wave permits automated form/email/SNS sending.

## Definition of production-ready

Production-ready means all of the following are true at the same time:

- the formal release gate and public smoke checks pass;
- a fresh URL finishes from one submission without an operator retry click;
- its copy and current V4 visual report are persisted and readable after reload;
- an eligible record is visible in Twenty with field-by-field read-back and `sent=false`;
- the public report renders at least 14 semantic figures and one decision table on desktop and mobile without horizontal overflow;
- a 20-item live canary meets the first promotion gate;
- the source funnel reports honest stage counts toward 4,000 rather than a raw-URL headline.

Until those checks are recorded, the correct status is **release candidate**, not “4,000-company production-ready.”
