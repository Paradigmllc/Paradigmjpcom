# Medusa operations and Shopify cancellation — 2026-11-03

## Delivered

- PR770 merged as `5099d2016ba23157cf005a2da15c47d69c36a7d0`.
- Production deployment `enrbd0r71veotnljle2c6ass` finished. Container `n8i2sjiqvr2d8hrzppop2m2i-010934901849` uses the exact commit image and is healthy.
- Authenticated `/ja/admin/shopify?tab=medusa` now renders SERICIA MEDUSA with product, inventory and order reads. Legacy URL remains for existing links, not Shopify runtime ownership. Account role must be admin/editor.
- Medusa standard DB/API reused; order projection excludes customer email/address. Existing daily DB leases/history/RLS reused. New Medusa-specific continuation cursor prevents interpreting Shopify cursors as Medusa offsets.
- Daily task dispatch never falls back to Shopify. Shopify client and legacy social publication reject execution when Medusa runtime is configured. Suppliers and social explicitly return blocked until actual connection prerequisites exist.

## Evidence

- CI41556921654: 169 tests, TypeScript, desktop/390px component browser checks including order statuses, URL tab restore, loading/empty/error/notification states, production build passed.
- Commercial audit CI41556921628 passed.
- Formal deployment preflight and standalone post-deploy doctor passed. Full wrapper still terminates at unrelated Manual Work V4 HTTP207 after successful deployment; not reported as fully green.
- Live browser: six draft products, automatic-update connected, order empty state count0. Daily UI recorded product6 at10:18:09 JST, inventory13 at10:18:36, orders0 at10:19:12; supplier and social explicitly blocked. Workflow dispatch41558945499 exercises the actual scheduler route; already-completed product/inventory jobs correctly skip until due.
- Public `https://sericia.com` after cancellation returns200 with `x-sericia-platform: medusa`, `x-sericia-release: medusa-ingress-20261103`.
- Evidence directory (outside Git): `/Users/apple/.codex/sericia-release-evidence/migration/20261103/`; screenshots `shopify-cancel-confirmed.png`, `shopify-apps-uninstalled.png`, `medusa-operations-live.png`, `medusa-daily-live.png`.

## Shopify cancellation

User explicitly approved plan cancellation and uninstallation of Messaging, SERICIA BASE Sync and Shopify Claude Connector App. The optional payment-detail retention checkbox was unchecked before submission.

Shopify confirmed the store will be deactivated on2026-11-03 and displayed a reactivate button. Installed apps list is empty; all three approved apps appear in uninstall history. No reactivation, new subscription or account data purge was performed. This proves accepted cancellation, not a separately audited final invoice or cancellation of independently billed external subscriptions.

Catalog export retained outside Git at `migration/shopify-catalog.json`, SHA256 `d37c3074891c4c3493342cd0661c18939d57bd7bf7be49893c5e289200260607`. It is a product/variant export, not a full Shopify store backup. Old Shopify orders UI showed no orders.

Legacy inventory and launch workflow execution/schedules are removed in the follow-up; PR validation remains. The duplicate social workflow is removed; the Medusa recurring five-kind workflow remains.

## Capacity and rollback

- Verified unused historical image fa736a08 was archived to approved volume `/mnt/sericia-medusa-data/rollback/fa736a088672.tar.gz` (1064006723 bytes), SHA256 `ad0b16b1c012003f6416100ec24f40ddfdb1d9c9987574052774eb346f27e37a`.
- All29 OCI blobs and docker-load roundtrip matched before removing the exact unused tag. Current/previous running images and databases retained.
- After release, `docker builder prune -f` reclaimed9.247GB regenerable cache only. Root89% /17GiBfree; approved20GB volume75% /4.8GiBfree. No image/volume/backup bulk prune.
- Previous operations image61380cda remains available. Storefront ae237e0f and backend7a5cc041 unchanged by operations deployment.

## Not commercially complete

Supplier API permission/credentials explicitly unacquired; warehouse explicitly uncontracted. Six products remain draft, no verified inventory levels or orders. Stripe credentials/payment enablement absent. No real purchase, stock sync, procurement, receipt, shipment, social post or customer notification was performed. Shipping/return/business conditions, external connections and end-to-end purchase/dispatch proof remain independent gates. Notification replay and terminal sender-failure recovery remain outstanding.
