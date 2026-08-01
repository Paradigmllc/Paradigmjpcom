---
title: ARCHITECTURE
type: note
permalink: paradigm-agent/lead-discovery/architecture
---

# Lead Discovery Pipeline v2 — Architecture

## Overview
```
                   ┌─────────────────────────────────────────┐
                   │          DATA SOURCE LAYER                │
                   │                                           │
  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  │
  │ CZDS │  │WHOXY │  │ NIC  │  │MANTA │  │ BBB  │  │H.WORK│  │
  │ ICANN│  │ WHOIS│  │.jp.uk│  │US SMB│  │US/CA │  │ JP   │  │
  │Zones │  │ API  │  │.au   │  │      │  │Biz   │  │Jobs  │  │
  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘  │
     │         │         │         │         │         │       │
     └─────────┴─────────┴─────────┴─────────┴─────────┴───────│
                               │                                │
                    ┌──────────▼──────────┐                      │
                    │   DEDUP & MERGE     │                      │
                    │  (domain dedup,     │                      │
                    │   score fusion)     │                      │
                    └──────────┬──────────┘                      │
                               │                                │
                    ┌──────────▼──────────┐                      │
                    │  ENTERPRISE FILTER  │   ← BigCorp blocklist│
                    │  (remove .org/.gov  │                     │
                    │   .edu, known big   │                     │
                    │   companies)        │                     │
                    └──────────┬──────────┘                      │
                               │                                │
                    ┌──────────▼──────────┐                      │
                    │ INDUSTRY CLASSIFIER │   ← Domain keywords  │
                    │  (domain → industry │   + content analysis│
                    │   score + filter)   │                     │
                    └──────────┬──────────┘                      │
                               │                                │
                    ┌──────────▼──────────┐                      │
                    │   SITE SCANNER      │   ← crawl4ai, httpx  │
                    │  (tech detection,   │   Wappalyzer CLI     │
                    │   digital neglect   │                     │
                    │   scoring)          │                     │
                    └──────────┬──────────┘                      │
                               │                                │
                    ┌──────────▼──────────┐                      │
                    │ PROPOSAL GENERATOR  │   ← DeepSeek API     │
                    │  (personalized      │                     │
                    │   outreach message  │                     │
                    │   + estimate)       │                     │
                    └──────────┬──────────┘                      │
                               │                                │
                    ┌──────────▼──────────┐                      │
                    │   CRM SYNC (Twenty) │                     │
                    └─────────────────────┘                      │
                                                                 │
                   ┌─────────────────────────────────────────────┘
                   │
          ┌────────▼────────┐
          │  OUTPUT FILES   │
          │  data/leads.json│
          │  data/scan.json │
          │  data/report.md │
          └─────────────────┘
```

## Data Sources

### 1. CZDS (ICANN Zone Files)
- **Access**: account-api.icann.org (OAuth2)
- **Download**: czds-download-api.icann.org
- **TLDs**: 856 approved (org, info, xyz, shop, store, company, build, tech, etc.)
- **Strategy**:
  - Download zone files for HIGH VALUE TLDs only (targeted)
  - Parse domain names, filter SLDs that aren't parked
  - BATCH download, never all at once

### 2. Whoxy WHOIS API
- **Free tier**: 1,000 queries/month
- **Use**: Verify domain ownership, get company name + country from newly registered domains
- **Fallback**: WHOIS CLI if API exhausted

### 3. NIC Direct Access
- **Japan (.jp)**: JPRS — ~170万件
- **UK (.uk)**: Nominet — ~1,000万件
- **Australia (.au)**: afilias — ~400万件
- **Strategy**: Zone file access agreements → bulk download → domain-only extraction

### 4. Manta.com (US SMB)
- **Focus**: <10 employee businesses
- **Strategy**: Scrape category pages, extract business name + location + description

### 5. BBB.org (US/Canada)
- **Focus**: Local service businesses (plumbers, electricians, contractors)
- **Strategy**: Category-based search, extract accreditation data

### 6. HelloWork (Japan)
- **Focus**: Companies actively hiring = have budget, may lack modern web presence
- **Strategy**: Search by industry, extract company name + URL

## Processing Pipeline

### Stage 1: Ingest
- Pull from all configured sources
- Deduplicate by domain
- Score confidence (CZDS = high, directory = medium, scraped = low)

### Stage 2: Enterprise Filter
- Known domain patterns: *-inc.com, *-corp.com, *-llc.com (large enterprises)
- Known SaaS/corporate domains (stripe.com, shopify.com, microsoft.com, etc.)
- Educational (.edu), governmental (.gov) — exclude
- DNS-based filter: check if domain resolves before scanning

### Stage 3: Industry Classification
- Domain name keyword matching (current industry-filter.js approach)
- Enhanced with TLD-based heuristic (e.g., .photography → creative industry)
- Content-based: fetch homepage HTML → extract meta/keywords → match to industry

### Stage 4: Digital Neglect Scan
- **Crawl4AI**: Fetch homepage, extract:
  - Wordpress version (check /wp-content, /feed, generator meta)
  - Meta viewport tag presence
  - Footer copyright year
  - Page speed indicators
  - Mobile-friendliness
- **Wappalyzer CLI**: Detect CMS, frameworks, analytics
- **httpx**: HTTP status, headers, tech hints
- **Scoring**:
  - Old WP or no CMS = +2 points
  - No viewport meta = +2 points
  - Footer year < current year = +1 point
  - No SSL redirect = +1 point
  - Slow load (>3s) = +1 point
  - Total >= 5 = "Priority Renovation"

### Stage 5: Lead Scoring
```
priorityScore = neglectScore * 2 + industryMatch * 3 + hasBudget * 2 - hasGoodSite * 5
```
- neglectScore: 0-10 (digital neglect severity)
- industryMatch: 0-1 (how well they match target industry)
- hasBudget: 0-1 (hiring, new domain, new investment)
- hasGoodSite: 0-1 (modern site, good UX = not a lead)

## Output

### Per Lead:
```json
{
  "domain": "example.com",
  "companyName": "Example Corp",
  "industry": "construction",
  "country": "JP",
  "source": "czds",
  "scans": {
    "neglectScore": 7,
    "oldWordPress": true,
    "noViewport": true,
    "footerOutdated": true,
    "techStack": ["WordPress 4.9", "PHP", "Apache"]
  },
  "priority": "HIGH",
  "proposalUrl": "...",
  "contactEmail": "...",
  "diagnosisUrl": "..."
}
```

## Commands
```bash
# Full pipeline (all sources)
node scripts/pipeline-v2.js --country JP --industry construction --limit 50

# CZDS only
node scripts/pipeline-v2.js --source czds --tld org,info,xyz --limit 1000

# Check health
node scripts/health-check.js
```