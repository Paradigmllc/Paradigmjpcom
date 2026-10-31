# Medusa operations reader — 2026-10-30

Existing public operations and daily jobs still use Shopify. This change adds an independent, read-only Medusa tab at `/ja/admin/shopify?tab=medusa`. It does not switch commerce platforms or send supplier, warehouse, social, order or stock mutations.

## Implementation

- Reuses Medusa's product/inventory DB and standard Admin APIs; no duplicate database, migration or library. A new authenticated GET `/api/medusa-ops` reads one bounded page of 50 products or inventory items. Only identified Payload admins/editors can read it; viewers and unidentified sessions are denied.
- Server-only `SERICIA_MEDUSA_ADMIN_URL` and `SERICIA_MEDUSA_SECRET_API_KEY`; never put either key in public env/client code. Uses [Medusa secret-key Basic authentication](https://docs.medusajs.com/resources/commerce-modules/api-key/concepts). Fixed upstream paths, no redirect following, 15-second timeout, strict query validation, response allowlists and no-store. Private errors and upstream bodies are not returned or logged.
- Separate loading, empty, disconnected and error states; retry, previous/next page, retrieval timestamp, and mobile/desktop layouts. No polling or freshness SLA. This is explicit on the screen.
- Quantity is per registered Medusa location, with stocked/reserved/incoming separately shown. Missing locations mean unconfirmed, never invented zero. Reserved balance may be negative and is not advertised as sellable channel stock. Shopify jobs/snapshots, product catalog, supplier/social readiness and existing permissions are unchanged.
- Read-only queries do not create bell/Slack notifications. Existing Medusa DB is the source; no synthetic success/history records are persisted.

Draft [PR763](https://github.com/Paradigmllc/Paradigmjpcom/pull/763), implementation `7fbea69b`.

## Verification

- Fresh root npm audit reports0 advisories; this does not cover all auxiliary lockfiles or independently audit the existing private security forks. GitHub default-branch aggregate advisories remain separate.
- 35 focused unit/API tests passed (including 10 new validation/auth/response-safety tests); TypeScript and targeted ESLint passed.
- Actual component bundled with existing esbuild/Tailwind, exercised in Playwright at390px and1440px: product/inventory selection, pagination, absent locations, negative reserved balance, empty, unconfigured, failure and retry. No horizontal overflow, browser errors or mutation requests. Evidence outside git: `/tmp/sericia-medusa-ops-ui/`.
- Bundled actual reader executed inside the private Medusa container against standard APIs. Verified6 products/all6 drafts,13 inventory items/no registered locations. A temporary secret API key authenticated using Basic; finally revoked and independently rejected with401. No product, order or inventory mutation. Revoked key audit record remains.
- Updated existing recurring-operations PR validation to include new API/library paths and browser verification. Scheduled production jobs are unchanged.

## Deployment boundary

Not deployed. Read-only host preflight failed at94% root usage versus88% gate. Root free9.3GiB; approved dedicated volume has17GiB free. Docker reports5.904GB build cache all active (0 reclaimable), and4.777GB reclaimable images, which include retained rollback assets. No image, backup, volume or active build cache deletion; no gate bypass.

Before release: safely resolve root capacity, pass CI/build and standard `npm run release:prod`, configure dedicated secret key and a reachable private Medusa origin, and verify authenticated public API/UI fingerprint. Do not expose the private Medusa Admin port publicly. Current public SERICIA remains Shopify; this read-only tab is not completion of automated inventory/fulfillment migration or commercial readiness.

Read-only capacity diagnosis: retained release archive≈1GiB and logs≈890MiB cannot alone close the gap. Docker build cache is shared with active images, private/reclaimable0B; no broad cleanup is justified by this task.
