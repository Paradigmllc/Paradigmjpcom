# Trigger.dev Sales OS Runbook

## Active Task IDs

These IDs are the production defaults used by the app when task env vars are not set:

| Lane | Trigger.dev task ID | Purpose |
| --- | --- | --- |
| Sales pipeline | `sales-os-pipeline` | Runs the Supabase-backed Sales OS pipeline end to end. |
| Enrichment | `sales-enrichment-runner` | Drains queued company karte / diagnosis enrichment jobs. |
| Post-outreach generic | `post-outreach-router` | Accepts post-outreach events when a source-specific task is not used. |
| Chatwoot replies | `chatwoot-reply-router` | Accepts inbound replies after outbound outreach. |
| LiveKit discovery | `livekit-discovery-router` | Accepts discovery-call events and transcript metadata. |
| Video pipeline | `sales-video-pipeline` | Accepts video jobs and completes them only when a renderer output URL is supplied. |

## Required Environment

Non-secret defaults:

```env
TRIGGER_PROJECT_REF=proj_ptaxneqibbeboxxboajw
TRIGGER_API_URL=https://api.trigger.dev
TRIGGER_DASHBOARD_URL=https://cloud.trigger.dev
TRIGGER_SALES_OS_PIPELINE_TASK_ID=sales-os-pipeline
TRIGGER_SALES_ENRICHMENT_TASK_ID=sales-enrichment-runner
TRIGGER_POST_OUTREACH_TASK_ID=post-outreach-router
TRIGGER_CHATWOOT_REPLY_TASK_ID=chatwoot-reply-router
TRIGGER_LIVEKIT_DISCOVERY_TASK_ID=livekit-discovery-router
TRIGGER_VIDEO_PIPELINE_TASK_ID=sales-video-pipeline
```

One secret is required in the approved non-git secret store:

```env
TRIGGER_SECRET_KEY=
# or TRIGGER_ACCESS_TOKEN=
# or TRIGGER_DEV_API_KEY=
```

## Deploy / Verify

1. Deploy tasks after the secret and project ref are available:

```bash
npx trigger.dev@latest deploy
```

2. Verify without printing secrets:

```bash
node scripts/verify-trigger-sales-os.mjs
```

3. Verify app health:

```bash
curl -H "X-Webhook-Secret: $TRIGGER_WEBHOOK_SECRET" https://paradigmjp.com/api/sales/health
```

## Operational Notes

- Stagehand, Browserless, Crawlee, Playwright Stealth, and Crawl4AI are worker/extraction/submission lanes. Trigger.dev is the orchestrator and must not replace the browser workers.
- Post-outreach webhooks persist local activity and update pipeline reply/follow-up steps even when Trigger.dev forwarding succeeds, so the pipeline is not left waiting on a disconnected external run.
- `sales_operator_queue_items.queue_type` is constrained by Supabase. Pipeline review/error items use `analysis` with the original reason in `meta.review_reason`.
- The video Trigger task does not pretend to render. It only completes a video job when a renderer callback supplies `output_url`; otherwise the job remains waiting for renderer output.
