# SERICIA operational event synchronization — 2026-10-02

## Implemented boundary

Shopify product metadata, location-specific available inventory, order states and fulfillment states can be projected into a private operational database through `/api/shopify-ops/events`. HMAC uses the exact request bytes and existing Shopify app client secret. Shop, topic and delivery UUID are checked. Bodies are bounded to 2MB. Customer addresses, email, telephone and unneeded raw payload fields are discarded before persistence.

Two RLS-enabled tables store reduced snapshots and delivery outcomes. A service-role-only SECURITY INVOKER RPC atomically deduplicates deliveries and serializes entity updates. Older versions cannot replace newer ones. Equal-version differences are recorded as conflicts. Product deletion creates a permanent tombstone. An authenticated authoritative re-fetch can resolve an equal-version conflict. DB failure returns503 so Shopify can retry; invalid payloads are recorded without their original content and return422.

The operations UI has 15-second refresh, empty/loading/error states, searchable product/inventory/order/fulfillment views, recent error/event history, subscription checks, registration of permitted topics, and cursor-based product/order recovery. Shipment success does not mean delivered; only provider delivery status marks delivered. No stock/purchase/dispatch writes are performed by this module. Registration does not auto-grant Shopify scopes.

Product reconciliation reads 50 products per request. Order reconciliation reads two orders per request with up to250 lines and100 fulfillments; exceeding these limits fails visibly rather than silently dropping data. Standard Shopify order access covers60 days. The dashboard shows the200 most recently changed projections and50 recent deliveries; it is an operational view, not an accounting or complete order archive. Native Shopify remains the source of truth. Inventory recovery fetches five items per page with up to50 locations per item; it uses Shopify available quantity, never incoming stock. Larger location lists fail visibly. Deleted products missed before subscription registration need native Shopify verification.

## Verified current external state

- Live Shopify API: product/inventory scopes available. Order and fulfillment topics lack `read_orders`. All nine new subscriptions remain unregistered because the receiver has not been deployed yet.
- Warehouse API credential absent. Contracted provider not identified. Locations and OPENLOGI remain prior candidates. Do not implement invented warehouse endpoints or claim physical inspection, packing or shipment.
- Six real Shopify products were read through the new product reconciliation code and persisted/read back from production DB through a temporary SSH tunnel. All13 inventory items were also fetched across three cursor pages and13 location quantities persisted. Shopify source products and stock were not modified.
- SQL migration applied transactionally. RLS, anonymous/authenticated denial, duplicate handling, stale update rejection, conflict handling, authoritative reconciliation and tombstones tested in a transaction that was rolled back. No fixture orders retained in production.
-28 new focused tests pass. Isolated Playwright fixture flow verifies mobile390px/desktop1440px, search, subscription scope state, cursor continuation, order recovery controls, error display and recovery. No live external requests or orders in that test. TypeScript/lint checks logged in local evidence directory.
- Existing app `SERICIA BASE Sync` read_orders-only expansion prepared in the Dev Dashboard as an unsaved new version; browser permission confirmation is pending. No scope changes released.
- Application runtime still81811ad1. Host disk remains88%, so standard deployment guard still blocks release. Oldest rollback archive deletion approval remains pending. No guard override, rollback loss, warehouse purchase or dispatch occurred.

## Required connection sequence

1. Free host capacity with authorized maintenance and deploy through the standard release path. Verify runtime fingerprint and unauthenticated endpoint boundaries.
2. Register permitted Shopify webhook topics from the authenticated operations panel; verify subscriptions and a real subsequent product update without activating inventory or publication.
3. Grant the existing application `read_orders` with the operator's approval, then register order/fulfillment topics and reconcile existing orders. This broadens app access to order data; no read_customers/write_orders permission is requested.
4. Confirm warehouse/provider and use its supported Shopify integration. OPENLOGI's official connector/API is preferable to duplicating dispatch orchestration. Receiving, inspection, rejected items, consolidation, packing, export documentation and return processing require the provider's actual supported contract and status mappings.
5. Obtain an authorized supplier inventory feed and stable variant/SKU mapping. BASE retail-page observations are not exact stock or automatic purchase authorization. Do not increase Shopify available inventory from a page's buy button.
6. Run a controlled contracted-provider test from inbound receipt through tracking/delivery and cancellation/partial-failure recovery before commercial launch. Credential presence and successful mocks do not establish this result.

## Primary references

- https://shopify.dev/docs/apps/build/webhooks/verify-deliveries
- https://shopify.dev/docs/api/admin-graphql/latest/mutations/webhookSubscriptionCreate
- https://shopify.dev/docs/api/admin-graphql/latest/objects/Fulfillment
- https://api.openlogi.com/doc/api.html (v1.6, cursor pagination, POST timeout must be reconciled before resubmission)
- https://supabase.com/docs/guides/database/postgres/row-level-security

No Slack/email message was sent. Operator-visible reception errors are stored in the private event history. No claim of complete warehouse automation or commercial readiness.
