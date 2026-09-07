# Studio quality benchmark: update-document implementation

## Scope and current truth

The owner's updated 1,862-line discussion document expands the target to genre-specific
shorts and long-form production, with repeatable quality and low all-in cost. It is
not permission to create a replacement repository, buy premium tools, approve footage,
or automatically route paid jobs to commercial providers.

This change improves **measurement and review**, not the generated image quality.
The owner-rated 10/100 editorial baseline remains rejected. No new GPU rental, model
download, human approval, customer delivery, or public posting accompanies this change.

## Existing architecture retained

- Next.js console and authorized `/api/sales/video-studio-control` API.
- Existing `video_factory_generation_quality_reviews` append-only PostgreSQL table,
  FORCE RLS, service-role-only access, and authenticated operator identity.
- Existing notification helper sends DB bell + Slack; degraded notification results
  remain visible in the API response/logs.
- Existing authenticated Python adapters, model/workflow registries and two human
  delivery gates remain unchanged. No new generation engine is declared ready.
- The existing control-plane migration is still undeployed. Add nullable `benchmark`
  JSONB and an insert trigger to that rerunnable migration; do not alter historic rows
  or the legacy generated six-axis score column.

## Eight-axis review contract

`studio-8axis-v1` uses identity 20, direction 15, motion 15, visual 15,
brand 10, audio 10, editing 10, delivery 5. Individual scores are 0–100 integers.
Identity, brand and audio may be explicitly not applicable; weights are then
renormalized. Required axes cannot be omitted. UI instructions require reasons for
non-applicability in the review note; there is no semantic verification of that note.

- No prefilled scores, selected run, approval, review justification or zero-cost claim.
- Local video comparison: files remain on the reviewer's device; only the selected
  candidate SHA-256 is persisted. Optional reference preview is not persisted.
- The protocol hash covers the reviewer-supplied fixed comparison conditions, not
  automatically attested worker settings. Keep the canonical conditions/reference
  asset identities in the case dossier and paste exactly the same conditions.
- Artifact-to-run binding, costs and full-viewing confirmation are reviewer assertions,
  **not server-verified artifacts, finalized billing, or legal clearance**.
- Approvals require no critical defects and provisional thresholds 75/85/90 by tier.
  Both the API schema and database enforce critical-defect blocking. The database
  checks the succeeded source run and tier threshold independently of the browser.
- Legacy review submissions can record rejection, but cannot newly approve a run.
- Existing delivery/cache approvals are not granted by a benchmark review.

## Aggregation limitations

Each run contributes only its latest review, including a newer legacy rejection.
Cache-hit and non-succeeded runs never count as fresh generated footage. Groups separate
provider, tier, genre, case ID, protocol hash and applicable axes. The old mixed-provider
aggregate is retired (its compatibility field is an empty list).

The bounded dashboard reads the latest 100 reviews and latest 100 runs. Scores and
acceptance rate describe that reviewed sample, not overall studio reliability or SaaS
parity. A run absent from the fetched window is excluded, not assigned to a guessed provider.
Cost per accepted shot sums all declared costs in the group (including rejected footage)
and divides by accepted footage. Any unknown cost, or zero accepted footage, yields
unknown rather than zero. Failed jobs with no footage are not automatically included;
their costs must be included in the operator's all-in case accounting. This is not a
replacement for dispatch/callback billing integration.

## Update-document mapping and next evidence

| Requirement | Current implementation / remaining evidence |
| --- | --- |
| Genre-specific production | Review labels exist; validated anime/avatar/product workflows still require real footage evidence |
| Golden Set | Case ID + conditions hash + rubric; curated approved reference sets and repeated candidate production still missing |
| Long-form | Authored chapter structure exists up to 30 minutes; no claim of publishable long-form or the document's 60-minute target |
| Stable Vast operation | Prior sandbox safety limits exist; bootstrap performance and reliable repeated starts remain unresolved |
| Quality improvement | Eight-axis review now measurable; no new footage improvement shown by this change |
| Delivery | Existing two human gates remain; benchmark approval cannot deliver or post |

Start with a small, rights-cleared set: product shape/camera, Japanese explainer
readability/audio, character continuity, and chapter-to-chapter narrative continuity.
Use frozen conditions across revisions, preserve all failed candidates, and compare
accepted footage plus repair time and cost. Do not spend on 20–50 shots per genre
until bootstrap success and a few usable examples justify expansion.

Existing OSS review: [VBench](https://github.com/Vchitect/VBench) provides automated video
evaluation dimensions; it is not installed here, nor treated as a substitute for
editorial, Japanese audio, brand, or rights review. Existing Zod, React and PostgreSQL
are sufficient for this review contract; no runtime dependency was added.

## Verification and operational notes

- Completed local checks: 34 isolated database assertions; 25 focused benchmark,
  schema, route and CSP unit tests plus 2 browser-config unit tests; desktop/mobile
  mocked-control E2E 2/2 using the prior real two-second cup file; targeted ESLint,
  Ruff and mypy (64 source files). Screenshots were visually inspected. The 95-point
  values in browser fixtures are fabricated UI test data, not a footage assessment.
- Full Python run: 152 passed / 2 failed (ephemeral Prefect startup timeout and a
  20ms wall-clock stop-test deadline). The two affected areas then passed 10/10 on
  a focused rerun with test-only Prefect startup allowance of 120 seconds. Do not
  represent this as a clean one-pass suite or stable production GPU startup.
  Existing Prefect shutdown logging warning remains; focused rerun exited zero.
- Quality guard passes with 0 errors / 99 pre-existing warnings. Its iOS inline-video
  check caught missing `playsInline`, now added to both local video players.
- Final root `tsc --noEmit` passes after the browser fixes. The local QA server is
  stopped; no paid resources were started by these checks.
- Isolated PostgreSQL/WASM exercises the actual migration twice and validates service
  role insertion, denied updates, run states, critical defects, missing/invalid scores,
  hashes, cost bounds, legacy rejection, and explicit non-applicability.
- Unit and route tests cover weighted scoring, grouping, latest rejection, unknown
  costs, authorization, persisted mutation dispatch and notification calls.
- Browser tests mock the control API; optional `E2E_VIDEO_REVIEW_FIXTURE` exercises
  local preview/hash and two review decisions. Mock scores are never production reviews.
- Dev verification found Webpack HMR/source-map eval blocked by the existing CSP.
  Development alone permits eval; a regression test verifies the production CSP is
  unchanged. See [Next.js CSP guidance](https://nextjs.org/docs/app/guides/content-security-policy).
- Browser verification also caught dynamic `process.env[name]` reads preventing
  public Supabase settings from being bundled. The browser client now uses literal
  `NEXT_PUBLIC_*` references; server-secret handling is unchanged. Missing settings
  remain explicit errors. See [Next.js environment guidance](https://nextjs.org/docs/app/guides/environment-variables).
- Prior release audit blocker remains; no production deploy or new-code public URL
  fingerprint has been verified. PR #740 remains draft.
