# RevenueOS Lead Acquisition: OSS BuiltWith Direction

Date: 2026-06-15

## Decision

RevenueOS lead acquisition will move toward a two-lane system:

1. **Tech-footprint lane**
   - Goal: Build a free, OSS-first BuiltWith-like observable web index.
   - Primary sources: Common Crawl, certificate transparency logs, HTTP Archive, Tranco, sitemap, DNS, schema.org, local technology signatures.
   - Search engines, SearXNG, FlareSolverr, and Steel are fallback/verification tools, not the primary acquisition engine.

2. **No-website local SMB lane**
   - Goal: Find local SMBs where an official website is not detected and route them to HP/website production offers.
   - Primary sources: local directories, reservation platforms, SNS profiles, chamber/municipal lists, licensing/public registries, industry directories.
   - These candidates should be scored by `website_absence_confidence`, not treated as confirmed "no website" facts.

## Why

Paid list/search/contact APIs are out of scope for this direction:

- Google Places API
- Tavily / SerpAPI
- Apollo / Hunter / Snov
- StoreLeads / CartLeads
- DataForSEO

Browser search is also not suitable as the primary list source because it is unstable at scale, is prone to blocking, and only sees indexed businesses.

The free-first scalable path is corpus processing plus evidence extraction:

```text
public corpus -> candidate domains -> evidence extraction -> scoring -> RevenueOS promotion -> deep enrichment
```

## Target Data Model

Candidate-stage tables should stay separate from `sales_companies` until a record passes scoring thresholds.

```text
sales_lead_candidate_domains
- id
- domain
- root_url
- source
- first_seen_at
- last_seen_at
- observation_count

sales_lead_candidate_observations
- candidate_id
- source
- observed_url
- observed_at
- raw_evidence
- signature_hits

sales_lead_candidate_country_signals
- candidate_id
- country_code
- signal_type
- confidence
- evidence

sales_lead_candidate_tech_detections
- candidate_id
- technology_name
- category
- confidence
- evidence_url
- evidence_type

sales_lead_candidate_scores
- candidate_id
- stack_fit_score
- smb_score
- freshness_score
- geo_confidence
- contactability_score
- website_absence_score
- opportunity_score
- false_positive_risk
```

Only promoted candidates should enter the current operational path:

```text
sales_lead_candidate_* -> sales_companies -> sales_enrichment_jobs -> report/form generation -> Twenty sync
```

## Implemented Surface

Migration:

```text
supabase/migrations/migration_047_sales_lead_candidate_acquisition.sql
```

Library:

```text
src/lib/sales/lead-candidates.ts
```

APIs:

```text
GET  /api/sales/lead-candidates?country_code=ZA&technology=WooCommerce&min_score=60
POST /api/sales/lead-candidates/common-crawl
POST /api/sales/lead-candidates/local-smb
```

Common Crawl request example:

```json
{
  "countryCode": "ZA",
  "technology": "WooCommerce",
  "limit": 200,
  "verifyLimit": 40,
  "promote": false,
  "minOpportunityScore": 68
}
```

No-website SMB request example:

```json
{
  "promote": true,
  "rows": [
    {
      "businessName": "Sample Clinic",
      "countryCode": "CH",
      "listingUrl": "https://example-directory.test/sample-clinic",
      "category": "clinic",
      "address": "Zurich, Switzerland",
      "phone": "+41 44 000 0000",
      "socialLinks": []
    }
  ]
}
```

## Query Examples

South Africa plus WooCommerce:

```sql
select d.domain, t.technology_name, c.country_code, c.confidence
from sales_lead_candidate_domains d
join sales_lead_candidate_tech_detections t on t.candidate_id = d.id
join sales_lead_candidate_country_signals c on c.candidate_id = d.id
where c.country_code = 'ZA'
  and c.confidence >= 70
  and t.technology_name = 'WooCommerce'
  and t.confidence >= 80;
```

Switzerland plus a CRM/SMS technology:

```sql
select d.domain, t.technology_name, c.country_code, s.opportunity_score
from sales_lead_candidate_domains d
join sales_lead_candidate_tech_detections t on t.candidate_id = d.id
join sales_lead_candidate_country_signals c on c.candidate_id = d.id
join sales_lead_candidate_scores s on s.candidate_id = d.id
where c.country_code = 'CH'
  and c.confidence >= 70
  and t.technology_name in ('HubSpot', 'Klaviyo', 'Twilio', 'Zendesk', 'Intercom')
order by s.opportunity_score desc;
```

## Country Confidence

Do not rely on TLD only. Use weighted signals:

```text
.ch / .swiss TLD                   +40
schema.org addressCountry=CH       +35
phone prefix +41                   +25
CHF currency                       +20
Swiss city/address mention         +15
German/French/Italian language     +10
IP/hosting geolocation             +5
```

For South Africa:

```text
.za TLD                            +40
schema.org addressCountry=ZA       +35
phone prefix +27                   +25
ZAR/R currency                     +20
Johannesburg/Cape Town/Durban      +15
local delivery/tax text            +10
```

## Source Registry

The code registry lives at:

```text
src/lib/sales/source-registry.ts
```

It classifies each source by:

- `implementationStatus`: `live`, `live_if_configured`, `partial`, `implemented_not_wired`, `catalog_only`, `disabled_by_policy`
- `scaleTier`: `bulk`, `per_domain_light`, `per_domain_deep`, `browser_expensive`, `manual`, `post_lead`
- `lane`: `tech_footprint`, `no_website_local_smb`, `enrichment`, `outreach`, `orchestration`, `asset`, `disabled`

The audit API is:

```text
GET /api/sales/source-registry
```

## Implementation Order

1. Keep source-registry accurate and visible.
2. Add candidate tables and RLS-safe migration. Done in migration 047.
3. Implement Common Crawl CDX bulk domain ingestion. Done in `POST /common-crawl`.
4. Add local signature extraction for WooCommerce, Shopify, WordPress, Webflow, Wix, HubSpot, Klaviyo, Zendesk, Intercom, Twilio-like public widgets. Done through the local signature detector.
5. Add country confidence scoring. Done first for `ZA` and `CH`, with generic TLD fallback.
6. Add promotion from candidate tables into `sales_companies`. Done through `promote: true`.
7. Add no-website SMB adapters separately. First operational adapter is `POST /local-smb` for directory/listing rows.
8. Use RevenueOS 30+ enrichment only after candidate promotion or for a scored sample.

## Non-Goals

- Do not run all 30+ enrichment sources against every raw candidate.
- Do not make browser search the acquisition backbone.
- Do not represent results as "all businesses in the world."
- Use "observable web candidates" and confidence scores instead.
