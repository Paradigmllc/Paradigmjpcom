# SERICIA non-payment operations — 2026-10-02

## Operating sequence

1. **商品カタログ**: create or edit a real candidate. Save an original English description, materials, size/content, care, and food information when applicable. Keep source evidence in the private evidence field. JPY is the verified Shopify base currency; the USD field is a separate economics hypothesis.
2. **仕入先・倉庫**: register a supported product URL and refresh the observation. This observes publicly displayed availability and price, never exact supplier stock, purchased goods or owned inventory. Observations older than30 minutes expire; scheduled runs can be delayed.
3. **Shopify下書き**: create an unpublished product in the matching collection. The deterministic product handle recovers an interrupted creation without duplicating or overwriting subsequent Shopify edits. New items use inventory tracking and deny overselling. Resolve variations, photographs and product taxonomy in Shopify.
4. **掲載前確認**: complete actual source, image-rights, origin/HS, export, stock and fulfillment evidence. A checkbox or a supplier's buy button does not verify an order or warehouse receipt. Saving the catalog does not publish or purchase anything.
5. **注文・配送**: use Shopify as the order/inventory/return record. Connect the contracted warehouse's supported Shopify integration or API only after the provider, inbound destination, SKU labels, inspection, packing, destination coverage and return arrangements are known.

## Prepared catalog

Six real research candidates are in Shopify as unpublished drafts, with JPY proposal prices and zero inventory: Shizuoka sencha, cotton furoshiki, Echizen washi notebook, mizuhiki/quartz earrings, fairy-pitta carving and art-paper bookmarks. Each belongs to its matching collection and has a standard Shopify product taxonomy. Furoshiki has five source-listed patterns; the notebook has four source-listed colours. The six drafts contain 13 variants, all verified at zero inventory with overselling denied. Research source and unverified conditions are in `researched-catalog-20261002.json`. These prices are proposals, not confirmed margins; quantities, product images and supplier agreements are not approved.

## Current release boundary

- Shopify theme166338265136 / `1.5.0-catalog` is live. Nine public routes verify the release marker; contact-form context and390px mobile layout were checked. Prior1.4 theme retained.
- Application PR755/756/757/758 are live in runtime004a0dca. Catalog and operational event UI verified in the authenticated browser. Seven product/inventory/order notifications are registered and a real product event was received. Fulfillment notifications require additional read_fulfillments approval.
- Six Shopify drafts and their DB links are already persisted. All six read back as DRAFT, tracked inventory0, oversellingDENY, native currencyJPY. Native Shopify Admin read-back also confirmed the tea draft.
- 25 focused tests,12 theme regression tests, typecheck and lint passed; Theme Check0 errors/1 existing warning. Core Japan operator OS build, SERICIA audit and Video Factory CI passed for the implementation commit. Pre-existing Pet Life Movie npm audit fails.
- User approved removal of the oldest ac3d1f62 archive; removed exactly that archive. Verified preceding120e48df archive remains at `/var/backups/paradigm-release/120e48df-20261002.tar.xz`. No volumes or unrelated application images removed.

## Required operator actions / dependencies

- Warehouse contract/account and provider authorization. Prior candidates are Locations for transit consolidation and OPENLOGI for stocked fulfillment; neither is confirmed connected.
- Supplier inventory/API authorization or a commercial stock feed. Third-party BASE retail pages do not grant a stock API or automatic purchase rights.
- Rights-cleared product images, exact variation mapping, packaged dimensions/weight, destination-specific product/export requirements and confirmed fulfillment terms.
- Merchant-approved delivery, return and legal seller terms without disclosing a private address/telephone. Payment/provider applications remain outside this implementation.

Customer preview remains noindex and has no sellable products. No payment, external purchase, supplier message or shipment was executed.
