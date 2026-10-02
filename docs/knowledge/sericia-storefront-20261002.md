# SERICIA storefront — 2026-10-02

## Authorized direction

Shopify is the chosen storefront. Main business: Japanese tea and Japanese-made goods for international customers, with exchange-rate advantage reflected in value/pricing. The earlier interiors/luxury-object direction is superseded. Payment configuration and transactions are excluded. Do not publish personal names, private telephone numbers or residential addresses.

## Implementation

- Theme lives in `shopify/theme` in Paradigmjpcom, not the legacy Sericiacom Next.js application. Work branch: `codex/sericia-storefront-completion`.
- New tea hero, warm ivory/forest-green visual system, introductory Sencha/Hojicha/Matcha guide and tea-led brand story. Editorial AI image is explicitly captioned; no fabricated products, prices, stock, origin certifications or supplier claims.
- Client services on the existing `/pages/contact` resource: FAQ, delivery/returns guidance, legal-disclosure request path, native Shopify contact form, required email/body validation, topic deep links, progress and retry state.
- Navigation/footer links, recoverable empty collections, 404 help. Search keyboard guard, stale response guard, visible network fallback; add-to-cart network errors become visible and retryable.
- New service strings: English and Japanese. Other bundled, unpublished languages have an explicit English fallback; this is not a claim of fully translated international content.
- No new external application dependencies, payment changes, catalog writes or outbound test messages.

## Privacy operation

Existing Shopify-generated privacy policy exposed a phone number and postal address in its contact paragraph. Through Shopify Admin, automatic policy generation was disabled and only that contact paragraph was replaced by the existing business email and `/pages/contact`. Public HTTP read-back confirmed the new paragraph and absence of the old phone/address paragraph. Do not copy removed values into git, logs or this document. Recheck the policy on release.

## Validation / release status

- Native Node regression tests: 11 passing on the final tea theme. TypeScript pre-check passed with no errors.
- Theme Check: final tea theme zero errors, one existing vendor `facets.liquid` complexity warning.
- Browser preview: 390px mobile service layout, disclosure preselection, required field validation, collection empty state, cart open/Escape, mobile navigation and search-to-results verified. Tea desktop hero/photo and 390px mobile hero/tea guide verified; no horizontal overflow.
- Published theme ID: `166334890032`. Original live theme ID: `144336257072` (retain as rollback).
- PR #751 merged as `6f59c42e3b32b5eafe800593031cbaa25d440d44`. Shopify publish succeeded and cookie-free public HTTP plus browser after Exit preview confirmed `data-sericia-release="1.3.0-tea"`, tea hero, absence of old hero and retained noindex. Privacy redaction rechecked.

## External information still required

Real Shopify catalog is empty. Need actual products/source, rights-cleared product imagery, inventory, price, shipping destinations/rates/times and returns conditions. A bundled question is pending with the user. Do not invent these facts. Product-detail/cart-with-items and fulfillment E2E remain unverified until real data exists. Native contact delivery and subscription email delivery have not been sent as tests.

The legal-disclosure area is explicitly marked as sales preparation, not a completed statutory disclosure. Before selling, establish the merchant's legally required disclosures and an operational prompt-disclosure process. CAA references:
- https://www.no-trouble.caa.go.jp/qa/advertising.html
- https://www.no-trouble.caa.go.jp/what/mailorder/

Keep the existing preview and noindex controls until commercial release requirements are met. Publishing a design update does not mean authorizing sales, charges, or declaring legal readiness.
