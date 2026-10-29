# SERICIA recurring operations

The recurring controller runs five independent jobs: Shopify product, inventory and order reconciliation, supplier-page observations, and eligible organic social content. Shopify webhooks remain the primary event path. GitHub Actions asks for due jobs every 15 minutes; it is best effort and may be delayed. A persisted cursor resumes multi-page reconciliation; an expiring DB lease prevents normal overlapping executions. Every execution has a private database record, including interrupted lease recovery. Admin UI refreshes every 15 seconds and exposes failed, blocked and overdue jobs.

## Publication and recovery

Social content uses verified English catalog names and avoids hypothetical USD prices. Before publication the runner checks product readiness, image consistency, actual Shopify ACTIVE status, positive stock and online store URL. Atomic claims check the approved content revision. A delivery ledger prevents duplicate provider calls, including when publication succeeds but saving its receipt fails. Provider POSTs are never automatically retried. Delivery attempts prevent manual rescheduling in both the API and DB. An uncertain result requires provider-side reconciliation; no blind reset button is provided. Daily counts derive from actual content records, and outstanding uncertain delivery records keep the job blocked.

## Operational boundaries

- Public supplier pages provide availability observations, not exact authorized quantity feeds. Four observed purchase-available pages do not imply saleable SERICIA stock.
- Own-shop BASE OAuth needs its registered application. Third-party sourcing needs each supplier's commercial authorization and inventory/order interface.
- The warehouse provider/contract is not identified. Receiving, inspection, packing, consolidated international dispatch and returns cannot be connected to an invented API. Existing Shopify order/shipping views expose what is actually known.
- Fulfillment notification subscription needs additional read_fulfillments access; approval remains pending.
- SERICIA social account URLs and their connection credentials are not yet identified. Instagram/Pinterest adapters are implemented; TikTok/YouTube remain explicit unsupported connectors pending their approved apps and video workflow.
- Paid campaigns, automatic discounts, purchasing, shipping and customer messages are not executed by this release. No ad budget, shipping/returns terms or customer-response policy has been supplied.
- Six candidate products remain Shopify drafts with zero saleable inventory. This release is recurring operational infrastructure, not a completed commercial launch.

## Verification

127 Shopify-focused unit/API tests; full TypeScript; targeted lint; mobile/desktop isolated Playwright with empty/error/action states. SQL transaction (rolled back) verifies RLS/grants, durable run history, exclusive job/social claims, stale revision rejection, blocked rescheduling and provider-receipt completion. No provider publication or shipment is performed by verification.

Production deployment and workflow read-back are recorded in Task.md after verification.

## Release follow-up

PR760 security CI found existing advisories. Next.js16.3.8, sharp0.35.5, csv-parse7.0.3, axios1.20.0 and fast-uri3.1.8 plus compatible audit fixes give npm audit0. Coinbase SDK remains at its original1.54.0 to preserve existing x402 peer compatibility. Wider182 tests and TypeScript passed. Local production build failed with ENOSPC; CI must verify the final dependency tree. Production release is also blocked at the88% disk threshold; retained backup relocation permission and checksum verification are pending.

## Verified handoff — 2026-10-03

Runtime commit e34c795c passed all PR760 CI checks: Shopify validation, main production builds, production container and shared regression jobs. Final focused128 tests pass, wider182 pass, TypeScript/lint and final desktop/mobile fixture pass, npm audit0. PR remains open to avoid activating schedules against an undeployed endpoint.

Host remains88% with current004a0dca serving. Retained120e48df archive was copied to `/Users/apple/.codex/sericia-release-evidence/backups/120e48df-20261002.tar.xz`; complete SHA256 matches server: `60e15c3c887dec712f254b9a859aa534575f08669057078113081ceda2d9f22d`. Permission to delete only the server-side copy is pending because the previous instruction retained it. Both copies still exist. After explicit permission: recheck hash and current runtime, remove only that exact server archive, rerun read-only preflight, merge PR760, standard release, then verify live authenticated daily UI/API and manually dispatch the five-job workflow. No new production schema, automatic social posts or purchases were performed in this turn.
