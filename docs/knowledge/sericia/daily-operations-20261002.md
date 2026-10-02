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
