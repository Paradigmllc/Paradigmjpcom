# Public release and operations runbook

This is the operator checklist for `paradigmjp.com`. It covers the public Japan
Entry site, the application path, the Signal Check utility, CMS seed, origin
protection, notifications, and recovery. The repository is complete only when
the checks below are reproducible; a Coolify webhook returning `200` alone is
not a successful release.

## Release contract

The production offer and public promise are fixed:

- `USD 15,000` one-time setup.
- Standard monthly service is included for the first 90 days; month four is
  continuation pricing is agreed separately after the included period in the signed scope.
- Payment is collected only from the invoice or payment instruction issued
  after fit review: Wise, bank transfer, USDC, or credit card through a Stripe
  invoice/payment link. The invoice is authoritative for the recipient,
  reference, fees, and (for USDC) network and wallet. Never publish or request
  bank credentials or wallet addresses in the public form.
- The Start Date is the timestamp recorded after written scope acceptance,
  cleared payment, complete source materials, required access, and one
  empowered approver are present. The agreed fixed setup must be delivered
  within 14 business days of that date. If it is not, 100% of the USD 15,000
  setup fee is refunded. Client-requested scope changes or holds are logged and
  pause the clock. This is a delivery guarantee, not a promise of sales,
  rankings, traffic, conversion, or revenue.
- The public audience is fast-decision SMBs in North America, the UK, Europe,
  and Australia. Employee count and industry are not eligibility gates.
- The standard setup envelope is: Japan Opportunity analysis; one Japanese LP
  plus normally eight to ten core pages and 15,000–20,000 source words;
  payment setup coordination; up to two Social Media channels; launch creative;
  a Notion or Trello client workspace; regulatory-readiness coordination; and
  launch management/handover. The signed scope is authoritative.
- During the included operating period, publish only the written operating
  boundaries: normally up to four pages or 5,000 words per month, one active
  creative request at a time, up to two Social Media channels, and a
  48-business-hour start commitment for standard requests. Do not publish a
  continuation price unless it has been agreed in writing.
- The free utility uses public signals and self-reported answers. It must never
  claim private monthly visits, country traffic share, or revenue when those
  values are not publicly observable.

Any copy or CMS edit that changes these points requires a new review before
release. Do not add anonymous case-study numbers, guaranteed outcomes, or
unverified market-size claims.

### Payment and refund evidence

The operator must be able to reconstruct every paid Japan Entry application
without relying on chat history. Store the following with the lead, invoice,
and engagement record:

1. The selected payment rail and the issued invoice/payment instruction ID.
2. Payment-cleared timestamp and the recorded Start Date.
3. The signed fixed scope, required inputs/access checklist, named approver,
   dependency/hold log, and any approved scope changes.
4. Delivery URL or artifact list, acceptance timestamp, and handover record.
5. If the guarantee is triggered, the refund decision, amount (100% of
   USD 15,000), approval, provider receipt, and customer notification.

The public form records only the preferred rail. It must never collect card
numbers, bank credentials, wallet addresses, or seed phrases. Credit-card
collection remains an invoice/payment-link flow because the direct checkout
endpoint is intentionally retired.

### Async delivery operations

Every engaged client receives a private, isolated delivery workspace. Use a
separate Notion parent page and guest boundary for each client (or a separate
Trello board when requested); never expose multiple clients through one shared
filtered database. Grant least-privilege access and verify that parent-page
sharing does not expose unrelated subpages.

The workspace must contain, at minimum, Home, Request Queue, Launch Roadmap,
Deliverables, Approvals, Reports, and Meeting & Loom Archive. Each request
follows the visible state machine `Submitted → Active → Review → Completed` or
`Blocked`, with owner, priority, submitted/started timestamps, delivery estimate,
dependencies, approval state, and the next action recorded. Queue size is not
artificially capped, but only one primary request is active at a time; large
work is split into reviewable tasks and a material change to the original
requirement becomes a new request.

The operating SLA is: acknowledge a new request within one business day and
normally start active production within two business days (the public wording
may also say within 48 business hours). “Start” means requirement review,
research, copy, wireframe, design, translation, or technical investigation has
begun; it does not mean completion. Missing inputs, access, or client approval
must be logged as a dependency and pause the delivery clock.

Keep normal updates asynchronous. Link short Loom recordings to the relevant
request and preserve a written summary of what changed, why it matters for
Japan, requested approval, and the next action. Typical synchronous touchpoints
are a 45–60 minute kickoff, an optional 30-minute setup check-in every two
weeks, and a 30-minute monthly review after launch; use Zoom for decisions,
material blockers, or key approvals rather than routine status reporting.
Translated captions or AI interpretation may assist a live call where
available, but they are assistive only. The written English scope, acceptance
record, and post-call summary govern commercial, contractual, and regulatory
meaning; use a human interpreter or specialist review when nuance is material.
Never place card data, bank credentials, seed phrases, or private wallet keys in
Notion, Trello, Loom, comments, or uploads.

### Contract packet operations

Do not treat “SSOR” as a public or internal contract type. Use the following
names consistently in the engagement record:

1. **Master service terms (MSA)** for recurring legal, confidentiality,
   security, ownership, reusable tooling, liability, suspension, termination,
   and governing-law provisions.
2. **Setup SOW (Statement of Work)** for the fixed USD 15,000 setup: pages,
   source-word envelope, channels, assets, responsibilities, dependencies,
   acceptance criteria, exclusions, payment conditions, and change control.
3. **Order Form + service schedule/SLA** for the selected operating period,
   queue rules, one-active-request capacity, business-hour acknowledgement and
   start timing, review cadence, pause conditions, and any continuation terms
   agreed separately in writing. Never insert an unconfirmed continuation price.
4. **DPA, NDA, or payment addendum** only when the data, pre-contract
   disclosure, or USDC payment route requires it. The payment addendum records
   the invoice route, network, refund route, and verification steps; it must not
   place wallet or bank secrets in a public form.

The public site is an overview, not an offer acceptance or a substitute for the
signed packet. The application, chat, Loom, and meeting notes must not override
the signed documents. Record electronic-signature status, signer authority,
version, timestamp, and final PDF or immutable export with the engagement. A
material change to an accepted direction or a new deliverable is a written
Change Request, with impact on scope, timing, dependencies, and any fee
confirmed before work starts.

The SOW must identify one empowered approver and a review window. Record
submission, feedback, approval, rejection reason, and any client-side wait in
the Request Queue. Client-specific deliverables are handed over according to
the agreed ownership or usage right after payment; reusable portal structures,
templates, automation code, prompts, design systems, methods, and OSS or
third-party material remain Paradigm or their respective owners unless the
written terms say otherwise.

### Commercial readiness and capacity controls

Before outbound activity or a proposal, record the internal definition of a
counted contract in the CRM. A signature, a reservation, a cleared payment,
and recognized revenue are different events; never report one as another. The
public site does not publish a deposit amount, cohort size, or continuation
price unless that value has been approved and written into the applicable
Order Form.

For selected launch partners, record the `Managed Operations Commencement
Date` separately from the setup Start Date. Kickoff windows are allocated in
the confirmed order sequence and may be staggered so that setup work does not
overload the operating queue. The 48-business-hour start commitment applies
after the agreed kickoff window and only when the required inputs are ready.

The internal capacity model is a planning tool, not a public promise. Review
the expected hours before accepting a wave: market strategy 8–12 hours, web
and localization 25–35, payment/Social Media/workspace 10–15, initial assets
10–15, and PM/QA 8–12 (normally 60–90 setup hours in total); included monthly
operation is normally planned at 8–15 hours. Record the assigned PM/analyst,
web/localization owner, design/video owner, and native-quality reviewer. If the
planned capacity is unavailable, pause acceptance or narrow the SOW rather than
promising a queue the team cannot service.

### Trust stack and evidence discipline

Every proposal and public proof review must pass a trust-stack checklist:
verified Paradigm legal identity and Tokyo operating timezone; a business
email; payment recipient and legal entity match; privacy, terms, security, and
refund links; an identifiable operator profile; and a clear support/escalation
route. Capability samples may include an Opportunity Snapshot, sample proposal,
Japanese LP before/after, isolated portal demo, Loom walkthrough, workflow, and
48-hour start rules. Label every sample “Illustrative — not a client case
study” unless a client has authorized the name and source data.

Classify every material claim as `Observed`, `Modeled`, or `Hypothesis`.
Observed claims require a source, `captured_at`, screenshot or immutable
snapshot where practical, confidence, and human approval. Modeled claims also
require assumptions, retrieval date, formula, low/base/high cases, confidence,
and a disclaimer. Hypotheses require a next verification action. Use “potential
uncaptured opportunity”, “modeled opportunity”, or “conversion friction”; do
not tell a prospect that an unsourced amount is being lost. The report reader
must be able to identify the claim, classification, source, date, confidence,
and next action in under 30 seconds.

Maintain an expert/partner inventory for work that cannot be performed by
Paradigm: international/IT counsel, tax adviser, administrative or permit
expert, EC/import specialist, payment implementer, Japanese copy reviewer, web
engineer, and video/design support. For each partner record industries,
estimated fee, response time, NDA status, English availability, and whether the
work is direct or outsourced. Expert fees are passed through at cost unless the
written scope says otherwise; coordination and implementation belong in the
approved operating scope. “Leave legal or payment to experts” is not a public
claim until this inventory has a real reachable partner.

### Client onboarding, acceptance, and offboarding

The intake checklist must name one decision-maker/approver, confirm who can
grant brand and web access, list product/price and existing analytics, provide
approved terms and past materials, identify payment and fulfilment owners, and
state a client response target of five business days. Client waits are recorded
in the queue and excluded from the relevant delivery clock. Keep client pages,
Drive folders, Loom links, and credentials isolated per client; export the
accepted record and revoke guest access on termination.

Track-specific acceptance is explicit in the SOW. Digital offers must have a
live or testable product, a clear price and buyer path, Japan accessibility,
and a self-serve or short-sales-cycle route. Web3 work requires an identifiable
contracting entity, a decision owner, commercial fees, and a B2B or low-risk
scope; anonymous DAOs, token-only treasury, licensing, custody, or solicitation
are not silently included. Commerce work requires viable cross-border shipping,
rich product assets, Japan delivery/returns ownership, workable margin, and no
exclusive distributor conflict; impossible logistics, fragile low-margin goods,
or all-fulfilment-in-monthly-scope requests are rejected or rescoped.

At handover, export the final deliverables, Japanese copy, account and
permission list, Social Media ownership, analytics and measurement notes,
content calendar, manuals, unfinished tasks, open dependencies, and next
recommendations. Retain reusable templates, automation, ComfyUI workflows,
scoring logic, portal structure, and know-how unless the signed terms expressly
transfer them.

### Funnel, outreach, and measurement controls

The internal funnel stages are: `Identified → Qualified → Form Located →
Submitted → Delivered/Unknown → Reply → Positive Reply → Meeting Booked →
Meeting Held → Proposal Sent → Contract Signed → Deposit Paid → Fully Paid →
Kickoff Scheduled`. Report counts and elapsed time by stage; do not infer a
payment or contract from a form submission. Positive replies receive an
immediate standardized response plus a tailored answer, available timezone
slots, pre-meeting material, same-day proposal/invoice where appropriate, and a
short reserve window only when the written process supports it.

Any European or UK contact-form outreach is reviewed as direct marketing. Keep
the source record, purpose, legitimate-interest assessment where relied upon,
minimum personal data, first-contact reason, opt-out text, Do Not Contact list,
retention/deletion date, and country-specific review. Exclude support, legal,
security, and privacy forms from prospecting; do not bypass CAPTCHA or a site's
stated restrictions. Initial messages must identify the sender and provide a
plain opt-out. Do not launch a wave until the privacy and suppression checks
pass.

Use leading indicators (source coverage, evidence completeness, Japanese path
readiness, qualified replies, response time, accepted setup scope) separately
from lagging indicators (qualified inquiries, activation, paid conversion,
repeat usage, and client-supplied revenue). Define the 30/60/90-day review in
the Order Form or operating plan: 30 days for foundation and measurement, 60
for initial content/channel tests and message learning, and 90 for continue,
stop, or scale decisions. No indicator is a revenue guarantee.

### Tax and settlement review

Before issuing an invoice, verify the contracting entity, customer business or
consumer status, service nature and place of supply, currency, tax
classification, VAT/GST or tax ID needs, Wise recipient, USDC network and JPY
conversion record, card/payment-provider fees, refund FX treatment, third-party
recharges, and revenue-recognition treatment with the tax adviser. Never state
that an overseas customer automatically makes a service zero-rated or tax-free.

## Required production settings

The following values belong in the Coolify production environment, never in git
or `Task.md`:

| Area | Required names | Acceptance condition |
| --- | --- | --- |
| Legal disclosure | `PARADIGM_LEGAL_REPRESENTATIVE_NAME`, `PARADIGM_LEGAL_POSTAL_CODE`, `PARADIGM_LEGAL_ADDRESS`, `PARADIGM_LEGAL_PHONE` | Values are confirmed by the legal owner and match the `/en/legal` and `/ja/legal` disclosure. |
| Operator alerts | `SLACK_WEBHOOK_URL`, or `SLACK_BOT_TOKEN` + `SLACK_CHANNEL_ID` | A test contact produces both a DB bell/outbox record and a Slack message. |
| Backup | `OSS_SUPABASE_BACKUP_GPG_PASSPHRASE` plus either SSH target or `CLOUDFLARE_R2_BUCKET` + `CLOUDFLARE_R2_ACCOUNT_ID` + R2 access/secret keys | The passphrase is root-only; the encrypted archive and checksum reach an off-host SSH or R2 target. |
| Public form security | `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `CONTACT_FORM_CHALLENGE_SECRET`, `TRUSTED_PROXY_MODE=cloudflare`, `CLOUDFLARE_ORIGIN_LOCKED=1` | `release-doctor` passes the public-funnel environment section. |
| Content and CRM | `ADMIN_SCRIPT_SECRET`, `TWENTY_API_KEY`, and a Dify form-message credential | The English blog seed and Twenty handoff can be run without a fallback model or silent failure. |

Set values with the Coolify UI/API, then verify names (not secret values) with
the release gate. Never bypass a failed gate by setting `--skip-remote` or by
calling a Coolify deploy endpoint directly.

## Standard release sequence

Run from a clean checkout on the approved release machine:

```bash
git status --short
npm ci
npm exec -- tsc --noEmit --pretty false
npm run lint
npm test -- --run
npm run build
npm run quality:guard
npm run release:doctor -- --pre-deploy
npm run release:prod
```

`release:prod` performs the database migration/verification path, seeds the
English Japan Entry editorial set, deploys through Coolify, refreshes the
Traefik route to the new container, and runs the post-deploy public smoke.
Do not treat a deployment UUID or an HTTP `200` webhook response as completion.

After the command finishes, independently verify the public surface:

```bash
for path in /en /en/about /en/services /en/pricing /en/faq /en/works \
  /en/blog /en/contact /en/tools/japan-entry-score /en/legal /en/privacy /api/ready; do
  code="$(curl -L -sS -o /tmp/paradigmjp-smoke.html -w '%{http_code}' "https://paradigmjp.com${path}")"
  test "$code" = 200 || { echo "FAIL ${path} ${code}"; exit 1; }
done
rg -q 'Visual proof|package-scope|japan-entry-score' /tmp/paradigmjp-smoke.html
```

The post-deploy page checks must show the three product visuals, a working
Signal Check route, the fixed USD price, and the application CTA. Check both
`/en` and `/ja`; check the browser at desktop and a narrow mobile width before
calling the release complete.

## CMS and content acceptance

The CMS seed is idempotent. After a successful release, the deploy script must
report the expected article count with zero errors. If content is edited in
Keystatic/Payload, verify all of the following before publishing:

1. English and Japanese titles, descriptions, and CTA labels are present.
2. Every public article has non-empty body content, a locale, and a canonical
   route; no placeholder or internal diagnostic metadata is exposed.
3. `/en/services`, `/en/pricing`, and `/en/contact` agree on `$15,000`, six
   included months for selected launch partners, and separately agreed continuation terms after the included period.
4. `/en/pricing`, `/en/contact`, `/en/faq`, and `/en/legal` list Wise, bank
   transfer, USDC, and credit card via Stripe invoice/payment link, and use the
   same Start Date and 14-business-day full-refund condition.
5. `/en/legal` renders the confirmed legal identity, not the fallback wording.
6. Images have meaningful alt text and the visual proof cards remain product
   artifacts, not fabricated people or customer results.

## Backup and restore acceptance

Run `scripts/backup-oss-supabase.sh --validate-config` on the host first. The
backup job must then produce:

- an AES-256 GPG archive when encryption is required;
- an adjacent `.sha256` file that verifies with `sha256sum -c`;
- the same archive and checksum on the configured off-host SSH target or R2
  prefix;
- a 3-day local retention window without deleting the newest archive (every generation is retained in Cloudflare R2; local copies are only the staging area).

For the quarterly restore drill, copy one archive to an isolated disposable
PostgreSQL instance, verify the checksum, inspect it with `pg_restore --list`,
restore it, and run `node scripts/verify-db-tables.mjs` against that instance.
Record the measured restore time and row-count comparison in the incident log.
Never test a restore by overwriting production.

## 502 / origin route recovery

If Cloudflare returns `502` while the app container's `/api/ready` is `200`,
assume Traefik upstream drift first. Do not redeploy repeatedly. Confirm the
current container and network IP on `paradigm-droplet`, then use the tracked
helper so the Cloudflare CIDR allow-list and route are updated atomically:

```bash
ssh paradigm-droplet 'docker ps --filter "name=n8i2sjiqvr2d8hrzppop2m2i" --format "{{.Names}}"'
ssh paradigm-droplet 'docker inspect <container> --format "{{with index .NetworkSettings.Networks \"coolify\"}}{{.IPAddress}}{{end}}"'

# Prepare the cached official Cloudflare ranges.
cat scripts/lib/refresh-traefik-origin-lock.py | ssh paradigm-droplet \
  'python3 - --prepare /data/coolify/proxy/dynamic/paradigmjp.yml /data/coolify/proxy/.paradigmjp-origin-lock-cidrs.json'

# Apply only after the current container is healthy.
cat scripts/lib/refresh-traefik-origin-lock.py | ssh paradigm-droplet \
  'python3 - --apply /data/coolify/proxy/dynamic/paradigmjp.yml /data/coolify/proxy/.paradigmjp-origin-lock-cidrs.json n8i2sjiqvr2d8hrzppop2m2i <container> <coolify-ip>'

curl -fsS https://paradigmjp.com/api/ready
```

The helper creates a `600` backup of the route and validates the protected app,
Keystatic, and alias routers. A direct-origin request and a forged
`CF-Connecting-IP` request must remain blocked. If the app is not healthy,
stop and inspect the container logs instead of changing the route.

## Incident and rollback rules

- A failed release gate is a stop condition, not a reason to weaken validation.
- A failed Slack send must remain visible as a DB outbox/notification error;
  never report a successful operator notification when no credential exists.
- A failed CMS seed, migration, or post-deploy smoke is a failed release even
  when the container is running. Roll back through the approved Coolify release
  mechanism, then re-run the full gate.
- Preserve the failing deployment UUID, release commit, UTC timestamp, doctor
  output, and public HTTP status codes in the incident record.
- Do not remove Twenty or Stagehand as an incident workaround. They are kept as
  the CRM and on-demand worker boundaries; their runtime must remain disabled
  unless the separate outreach operation is explicitly approved.

## Current completion rule

The site is “publicly complete” only when the code checks pass, the production
environment table above is satisfied, `npm run release:prod` passes both doctor
phases, and the public URLs show the current visuals and utility. Until the
external legal and Slack values are supplied, the repository intentionally
remains release-blocked; the encrypted off-host R2 backup is already active.
That is safer than claiming an operationally incomplete site is ready.
