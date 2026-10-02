# SERICIA external sourcing and Everyday Japan storefront

## Recovered operating model

The user's previous discussion was third-party BASE/Creema/minne/STORES sourcing after sale, delivery to a domestic transit warehouse, inspection/consolidation/repacking, then international shipment. Locations was the initial transit candidate; OPENLOGI was the later stocked-inventory candidate. The contracted provider remains unconfirmed. The existing own-shop BASE OAuth sync does not grant inventory access to unrelated suppliers.

## Delivered implementation

- Six discovery categories and a broad Japanese-goods editorial hero. Editorial imagery is labelled and is not a product photograph.
- Supplier observation DB/API/admin panel: register a supported product URL, fetch a bounded HTML response, distinguish structured availability from inventory, and expose errors, restrictions and stale information. No automated checkout, purchasing, inventory increases or dispatch.
- HTTPS platform allowlist, redirects rejected, 12-second timeout, 2 MB cap, single-product/single-offer/URL identity checks. Variant ambiguity, preorder and malformed data remain unknown. No bot-protection bypass.
- Every observation records source URL, timestamp and authenticated actor. RLS is enabled and browser roles cannot access the table. The service endpoint requires an identified Payload admin or the existing webhook credential.
- Existing scheduled inventory workflow also refreshes at most ten oldest supplier sources. The nominal interval is 30 minutes, GitHub can delay execution, and observations expire after 30 minutes independently. This is not realtime inventory synchronization.
- Migration repairs only the 12 corrupted, unsourced candidate names. No hypothetical product is activated or imported to the storefront.
- Authorized BASE import now distinguishes tea from teaware and recognizes textiles, stationery and accessories. Imported items remain drafts under existing launch gates. BASE location no longer fabricates Japanese country-of-origin metadata.

## Candidate research, not adopted supply

- Tea: https://ochaogino.thebase.in/items/84428547
- Furoshiki: https://fukuichi.thebase.in/items/87670174
- Washi notebook: https://nishinowa4.thebase.in/items/152481799
- Mizuhiki accessory: https://kamidrops.base.shop/items/119613181

These are research URLs only. Variant selection, current availability, image rights, resale/export suitability, domestic lead times and contribution margins require confirmation. Direct automated requests to some BASE product pages return 403; this is a blocked observation, not evidence of stock.

## Verification and remaining work

- Focused tests: 22 passing; existing theme regressions: 11 passing. Theme Check: zero errors, one existing facets warning. TypeScript and lint checked separately.
- Migration applied transactionally to the existing operations DB; RLS enabled, anonymous/authenticated grants absent, 12 corrupted candidate names repaired.
- Draft Shopify theme: 166336102448 / release 1.4.0-everyday. Prior live theme 166334890032 remains available for rollback. Release status is recorded in Task.md.
- Warehouse contract/API credentials, order-to-SKU mapping, inbound references, inspection requirements, carrier/destination rules, delivery/returns terms and actual supplier arrangements remain required for commercial launch. No payment, purchase or shipment was executed.
- Production runtime environment values stay in the existing approved secret store. They are not in these notes.

## Verified production release — 2026-10-02

PR752 (`120e48df`) and authentication follow-up PR753 (`81811ad1`) are merged; runtime81811ad1 is deployed. Theme166336102448 (`1.4.0-everyday`) is live; the preceding theme166334890032 is retained. Nine public routes pass release-marker checks without preview cookies, and desktop/mobile layouts were inspected.

Four research sources are saved. Initial production observations: furoshiki, washi and mizuhiki show availability; tea cannot be uniquely identified and remains unknown. Authenticated browser save and refresh succeeded for the furoshiki candidate at14:55 JST; anonymous API returns401. Numeric Payload user IDs are preserved, viewer writes are denied, and legacy session cookies no longer shadow identified Payload authentication.

29 focused tests, typecheck, lint, SERICIA CI build and standalone post-deploy doctor passed. The standard release command still fails after successful deployment at unrelated Manual Work V4 reconciliationHTTP207; the pre-existing Pet Life Movie dependency audit also fails. These are not reported as green.

Host disk is90% after pruning only unused build cache following release. Current/preceding app images and all volumes remain. Verified older image archive: `/var/backups/paradigm-release/ac3d1f62-20261002.tar.gz` and adjacent SHA256. Capacity maintenance is needed before the next deployment; do not bypass the88% preflight threshold. A reconstructible apt package index was cleared, so future package installation needs apt-get update.

The store remains a preview. Real sellable catalog, supplier inventory rights, automatic purchases, warehouse credentials/dispatch and commercial shipping/return terms remain unresolved. Locations and OPENLOGI are prior candidates, not confirmed integrations.
