# Sales Japan Readiness Dify / n8n Template

This note defines the practical handoff between n8n, Sales OS, and Dify for overseas SMB Japan-entry scoring.

## Sales OS API

Generate or refresh one company's Japan-readiness insight:

```http
POST /api/sales/companies/{{company_id}}/japan-readiness
Content-Type: application/json
```

```json
{
  "refresh_audit": true,
  "probe_shopify": true,
  "use_dify": true
}
```

The API stores the result in `sales_japan_readiness_insights` and mirrors a compact summary into `sales_companies.meta.japan_readiness_insight`.

## n8n Node Shape

Recommended n8n sequence:

```text
SearxNG run/import
  -> monthly batch qualification
  -> Split In Batches over qualified company ids
  -> HTTP Request: POST /api/sales/companies/{{company_id}}/japan-readiness
  -> IF insight.status = manual_review
       -> Slack/DB bell review queue
     ELSE
       -> Dify/form-message queue
```

HTTP Request body:

```json
{
  "refresh_audit": true,
  "probe_shopify": true,
  "use_dify": true
}
```

Rate limits:

```json
{
  "max_parallel_companies": 2,
  "max_companies_per_run": 100,
  "timeout_seconds": 120,
  "retry": {
    "count": 2,
    "wait_seconds": 30
  }
}
```

## Dify Inputs

Sales OS sends these fields to the Dify workflow:

```json
{
  "company": {
    "id": "uuid",
    "name": "Example Store",
    "domain": "example.com"
  },
  "scores": {
    "japanEntry": 82,
    "traffic": 90,
    "commerce": 78,
    "localizationGap": 70,
    "paymentGap": 82,
    "legalGap": 84,
    "creativeGap": 62,
    "abilityToPay": 76
  },
  "estimates": {
    "monthlyVisits": 300000,
    "japanVisits": 1500,
    "japanSharePercent": 0.5,
    "monthlyRevenueUsd": 200000,
    "lossMinUsd": 600,
    "lossMaxUsd": 2400
  },
  "evidence": [],
  "gaps": [],
  "system_prompt": "{{system_prompt}}",
  "user_payload": "{{json_stringified_payload}}",
  "output_schema": {
    "subject": "Short outbound subject line. No unverifiable numbers.",
    "body": "Plain-text outbound email body. 120-180 words. No markdown.",
    "primary_angle": "traffic_gap | payment_gap | localization_gap | proof_video_gap | manual_review",
    "claims_used": ["Only claims directly supported by supplied evidence and estimates."],
    "claims_blocked": ["Legal violation, penalties, guaranteed revenue, guaranteed traffic, or unsupported market share claims."],
    "review_required": true,
    "reviewer_notes": "One sentence explaining what a human must verify before sending."
  }
}
```

## System Prompt

```text
You are Paradigm's Japan-entry sales insight writer for overseas SMB outreach.
Your job is to turn structured evidence into a concise outbound draft that creates urgency without making unsafe claims.

Hard rules:
1. Output strict JSON only. No markdown fences, no commentary.
2. The JSON must contain: subject, body, primary_angle, claims_used, claims_blocked, review_required, reviewer_notes.
3. Do not say the prospect is violating law, non-compliant, exposed to penalties, or guaranteed to lose revenue.
4. Do not invent traffic, conversion rate, revenue, legal obligations, ad spend, competitor names, or payment availability.
5. If estimates are null or evidence confidence is weak, use cautious language such as needs validation, appears, or public-page signals suggest.
6. Use loss framing only as a directional opportunity hypothesis, never as a proven fact.
7. Keep the offer async-first: localized buyer path, payment/trust cues, and Loom-style/video explanation for teams that cannot run live Japanese sales calls.
8. If legal/payment gaps are present, set review_required to true and tell the reviewer what to verify.

Voice:
Clear, calm, senior operator. Direct but not scammy. No insults. No fearmongering.
```

## Required Dify Output

```json
{
  "subject": "Example subject",
  "body": "Example body",
  "primary_angle": "payment_gap",
  "claims_used": [
    "Japan traffic estimate was supplied by Sales OS.",
    "Public-page audit did not confirm local payment wording."
  ],
  "claims_blocked": [
    "Do not call this a legal violation.",
    "Do not claim a guaranteed revenue loss."
  ],
  "review_required": true,
  "reviewer_notes": "Verify traffic source, payment methods, and legal disclosure wording before sending."
}
```

## Operating Rule

Send only after a human has checked `manual_review_flags`. The automation may draft and queue, but it must not make legal, penalty, guaranteed-revenue, or unsupported competitor claims.
