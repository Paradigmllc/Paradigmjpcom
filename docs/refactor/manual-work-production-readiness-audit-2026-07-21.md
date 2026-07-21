# Manual Japan Entry `/work` production-readiness audit — 2026-07-21

## Executive verdict

The known code-level blockers have been released: a visual report system, server-drained durable batches, provider preflight, delta Realtime updates, global history pagination, deterministic copy recovery, DeepSeek message-usage persistence, and field-by-field Twenty read-back. The final production canary is **20/20 copy-pass, 0 technical failures, 20/20 exact Twenty read-back, and 0 external sends**.

The current system supports up to 20 durable batches of 500 supplied URLs (10,000 companies queued), with one DB-leased three-company runner, automatic next-batch promotion, bounded dispatch retry, startup recovery, human review, and manual form submission. Measured throughput supports the 4,000-company daily target mathematically. It is not yet certified as a 4,000-company/day SLA until the released queue completes fresh 100/500/24-hour production soaks.

## Production verification after the fix

| Check | Production evidence | Verdict |
| --- | --- | --- |
| Visual customer report | 14 semantic `<figure>` elements, one decision `<table>`, ten strategy chapters, 67 headings, 0 horizontal overflow | Passed for the inspected desktop report; mobile and sampled-company visual review remains part of each wave. |
| Latest release | main `68edee4c`; Coolify deployment `ek09966retkwnrkcl5ylq1si`; DB 93/93, Sales health JSON `ok:true`, Twenty HTTP 200, worker restart 0, and final release gate passed | Passed. |
| Final production canary | 20/20 drafts passed; 20 unique message hashes; quality score minimum 92; 120-157 body words; correct greeting/signature; no URL, source citation, or placeholder | Passed. Recovery wording is deliberately cautious and still requires human pre-send review. |
| Technical reliability | 0/20 technical failures after the final targeted recovery; the final Formbricks and Dub retries completed in 31.2 and 36.5 seconds | Passed for the 20-record canary. |
| Twenty independent read-back | 20/20 exact by Twenty company ID: company identity, report URL, normalized verified-form URL, full draft in `paradigmKarteSummary`, and unsent state | Passed. Three stale CRM rows were reconciled from saved `/work` artifacts without re-analysis or external delivery. |
| DeepSeek Cache Hit | Final saved message generations: 83,712 hit / 106,558 miss / 190,270 prompt tokens = 44.0% hit; earlier waves measured 48.1-51.6% | Cache is active and measured from API usage, not inferred. This ledger currently covers first-touch message generation only. |
| External delivery | Form/email/SNS sends 0; all outcome timestamps remain null | Passed. |

Meaningful production retry waves measured 38.2-40.6 seconds of work per company. With three concurrent claims, observed throughput was 224-258 companies/hour: approximately 1.9-2.2 hours per 500-item batch, or 15.5-17.9 hours for eight sequential batches and 4,000 items. The target requires 166.7 companies/hour, so observed raw capacity has 34-55% headroom. This is production evidence, but not yet a 24-hour reliability SLA.

At DeepSeek V4 Pro's documented rates (cache-hit input $0.003625/M, cache-miss input $0.435/M, output $0.87/M), the saved final-message usage cost $0.0717 for 20 companies, or $0.00359/company. The same message generations without caching would have cost about $0.1078, so Cache Hit saved 33.5% of total generation cost and 43.6% of input cost. A 4,000-company extrapolation is about $14.34/day with the observed cache mix versus $21.57 without it. This is **first-touch generation only**, not the full crawl/profile/report pipeline cost.

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
10. **Cross-company template drift** — the first live two-company canary passed the old score gate but reused an effectively identical routing paragraph and four-paragraph evidence order. Distinctness now compares the whole draft and final routing/permission paragraph against the 20 most recent drafts, rejects repeated phrases inside a sentence, and requires a three-to-five-paragraph architecture with a materially different evidence sequence and CTA construction. A second live canary proved that matching every paragraph was too strict because a required audit observation can legitimately recur; the role-aware gate preserves that fact while rejecting reusable CTAs. The exact Paperform/SavvyCal production pair and the shared-audit control are retained as regression tests.

## Remaining operational risks and required controls

### 1. The 4,000-company source list does not yet exist at final quality

The workbench processes supplied company URLs; it does not make an unqualified source corpus become 4,000 sendable companies. Previous source work recorded 3,257 approved inventory records, 2,342 website-preflight passes, 23 verified forms in 447 reviewed websites, and nine final Twenty approvals. Those figures show that list acquisition and qualification—not the input box—is the largest volume constraint.

**Control:** operate source acquisition as a separate funnel with counts for raw URL, reachable company site, overseas SMB evidence, offer fit, verified form, copy pass, report pass, and Twenty read-back. Never report raw URLs as a 4,000-company sales list.

### 2. A production 500-item soak has not been completed

The 20-record canary proves the corrected copy and CRM paths and gives a useful throughput range. It does not establish p95 latency, provider throttling, crawl-domain variance, or day-long dispatch recovery at 500/4,000 scale.

**Control:** run 100 fresh URLs, then 500. Capture p50/p95 duration, technical-failure rate, needs-review rate, verified-form rate, copy-pass rate, Twenty read-back rate, and all DeepSeek usage before certifying a daily SLA.

### 3. Eight 500-item batches now have a durable queue, but still need a live soak

Up to 20 batches can be queued while a partial unique index permits exactly one `running` batch. Completion atomically promotes the oldest queued batch. A batch-level six-minute drain lease prevents the browser, request chain, and startup recovery from multiplying the intended three-company concurrency. Item claims remain reclaimable after ten minutes; dispatch has bounded retries; two bounded startup events cover the normal boot path and a lease left by a terminated process.

**Control:** prove the released migration with two small consecutive batches, then 100, 500, and eight queued 500-item batches. Confirm a single running row, no duplicate work IDs, maximum observed processing concurrency three, automatic promotion, restart recovery, and final reconciliation.

### 4. Full-pipeline AI cost is not yet attributable

`message_review.generation_usage` provides exact Cache Hit/Miss and completion usage for first-touch generation. New analyses also persist model, requests, input/output, Cache Hit/Miss, and elapsed time for company classification in `profile.analysisUsage`; `/work` aggregates the two tracked stages. The historical $0.00359/company remains a first-touch-only figure because the 20-row canary predates classification usage persistence and optional form-discovery LLM usage is not yet attributed.

**Control:** use fresh production rows to establish classification plus message unit cost, then attribute any optional form-discovery LLM call. Aggregate per-company, per-batch, and daily totals before calling the 4,000-company cost forecast final.

### 5. “Needs review” is not a technical failure

An overseas-SMB uncertainty, Japan-fit uncertainty, missing verified form, or insufficient public evidence must remain review-required. Converting these to apparent success would recreate the false-form and fabricated-claim defects.

**Control:** distinguish `failed` (technical) from `needs_review` (evidence/human decision), `rejected` (out of scope), and `completed` (all current gates passed). Only technical failures count against platform reliability.

### 6. Report design cannot substitute for company-specific evidence

The new figures improve decision usability, but charts are only valid when their source is visible. The report must not invent traffic, revenue, demand, legal exposure, or opportunity loss to make a graphic look complete.

**Control:** audit every 20-item canary report, then a random 10% sample per 100-item wave and 5% per 500-item wave. Reject raw enum labels, repeated sections, unrelated products, unsupported numbers, generic template language, or a recommendation that cannot be traced to a saved fact/hypothesis/action class.

### 7. Copy quality requires ongoing sampling even after automatic gates

The deterministic gate catches URLs, citations, commercial terms, unsupported claims, signatures, sentence repetition, repeated paragraph construction, and same-template CTAs. It cannot fully judge tone, recipient appropriateness, or whether a true fact is the best fact to lead with.

**Control:** human-read all first 20 drafts, then 20% of the 100 wave and 10% of each 500 wave. Track edits, repeated openings across companies, wrong product anchors, word count, and copy/paste readiness. Feed recurring edits into a regression test before the next wave.

### 8. Form availability and permission can change

A technically verified form may later change, use a no-solicitation policy, add CAPTCHA, or route to support rather than business development.

**Control:** the operator opens the form immediately before manual submission. The workbench must remain zero-send; verification is permission to review a route, not permission to contact automatically.

### 9. Twenty is a read-back requirement, not a fire-and-forget side effect

An HTTP success is insufficient if fields are missing, a duplicate company was updated incorrectly, or the worker is unhealthy.

**Control:** every completed company must have the same domain, report URL, verified form state, first-touch draft, readiness label, and unsent state on Twenty read-back. Any mismatch becomes `needs_review`/sync failure and blocks the wave.

## Staged operating gate for 4,000 companies

| Wave | Volume | Promotion gate |
| --- | ---: | --- |
| Canary A | 20 | **Completed:** 0 unintended sends; 20/20 draft pass; 20/20 independent Twenty read-back; no false form URL promoted. |
| Canary B | 100 | Technical failures ≤2%; p50/p95 and full-stage usage recorded; all false positives repaired before promotion. |
| Production pilot | 500 | Server completes without browser drain; Realtime remains usable; cost and p95 duration recorded; Twenty/readiness reconciliation complete. |
| Scale | 8 × 500 | Queue all eight batches before the run; verify automatic promotion, single drain lease, 24-hour recovery, and reconciliation; stop on a repeated systemic defect. |

`needs_review` and legitimate target rejection are not forced into the ≤2% technical-failure threshold. No wave permits automated form/email/SNS sending.

## Definition of production-ready

Production-ready means all of the following are true at the same time:

- the formal release gate and public smoke checks pass;
- a fresh URL finishes from one submission without an operator retry click;
- its copy and current V4 visual report are persisted and readable after reload;
- an eligible record is visible in Twenty with field-by-field read-back and `sent=false`;
- the public report renders at least 14 semantic figures and one decision table on desktop and mobile without horizontal overflow;
- the completed 20-item live canary remains reproducible on 100 and 500 fresh URLs;
- company classification and first-touch generation expose cache, token, latency, and model telemetry, with any form-discovery LLM usage attributed;
- the implemented 20-batch queue proves promotion, recovery, and reconciliation without an open browser in a 24-hour production soak;
- the source funnel reports honest stage counts toward 4,000 rather than a raw-URL headline.

Until those checks are recorded, the correct status is **operator-ready for up to 500 URLs and capacity-capable of 4,000/day, but not yet an unattended 4,000/day SLA**.
