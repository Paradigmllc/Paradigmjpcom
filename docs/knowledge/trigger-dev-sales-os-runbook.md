# Trigger.dev Sales OS Runbook (OSS セルフホスト版)

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

## Architecture (OSS Docker Compose)

Trigger.dev OSS runs as a Coolify `docker-compose` service on a dedicated Hetzner server.

**Containers (docker-compose.trigger-oss.yml):**

| Container | Image | Purpose |
| --- | --- | --- |
| `webapp` | `ghcr.io/triggerdotdev/trigger.dev:v4-beta` | API (port 3000) + Dashboard — served on `trigger.paradigmjp.com` |
| `supervisor` | `ghcr.io/triggerdotdev/supervisor:v4-beta` | Task runner — executes deployed task code in Docker containers |
| `postgres` | `postgres:14` | Trigger.dev platform database |
| `redis` | `redis:7` | Queue / cache |
| `electric` | `electricsql/electric:1.2.4` | Realtime sync |
| `clickhouse` | `bitnamilegacy/clickhouse` | Event / log storage |
| `registry` | `registry:2` | Docker image registry for task deployment builds |
| `minio` | `bitnamilegacy/minio` | S3-compatible object store (large payloads) |
| `docker-proxy` | `tecnativa/docker-socket-proxy` | Secure Docker API access for supervisor |

**Resource requirements:** 4vCPU / 8GB RAM minimum (combined webapp+worker).

## Required Environment

Non-secret defaults for paradigm-hp app:

```env
TRIGGER_PROJECT_REF=paradigm-sales-os
TRIGGER_API_URL=https://trigger.paradigmjp.com
TRIGGER_DASHBOARD_URL=https://trigger.paradigmjp.com
TRIGGER_SALES_OS_PIPELINE_TASK_ID=sales-os-pipeline
TRIGGER_SALES_ENRICHMENT_TASK_ID=sales-enrichment-runner
TRIGGER_POST_OUTREACH_TASK_ID=post-outreach-router
TRIGGER_CHATWOOT_REPLY_TASK_ID=chatwoot-reply-router
TRIGGER_LIVEKIT_DISCOVERY_TASK_ID=livekit-discovery-router
TRIGGER_VIDEO_PIPELINE_TASK_ID=sales-video-pipeline
```

One secret is required in the approved non-git secret store:

```env
TRIGGER_SECRET_KEY=<PAT from Trigger.dev dashboard → Settings → Personal Access Tokens>
# or TRIGGER_ACCESS_TOKEN=
# or TRIGGER_DEV_API_KEY=
```

## Initial Setup (one-time)

```bash
# 1. Set server UUID then deploy the OSS stack
#    (requires TRIGGER_SERVER_UUID from Coolify)
node scripts/setup-trigger-oss.mjs

# 2. Check webapp container logs for magic link + worker token
#    (on the Hetzner server or via Coolify UI)

# 3. Login to self-hosted CLI
npx trigger.dev@latest login -a https://trigger.paradigmjp.com

# 4. Create project
npx trigger.dev@latest init -p paradigm-sales-os -a https://trigger.paradigmjp.com

# 5. Login to internal Docker registry (on task deploy machine)
docker login -u <registry-user> localhost:5000

# 6. Deploy tasks
npx trigger.dev@latest deploy
```

## Deploy / Verify (ongoing)

```bash
# Deploy updated tasks
npx trigger.dev@latest deploy

# Verify without printing secrets
node scripts/verify-trigger-sales-os.mjs

# Verify app health
curl -H "X-Webhook-Secret: $TRIGGER_WEBHOOK_SECRET" https://paradigmjp.com/api/sales/health
```

## Operational Notes

- Stagehand, Browserless, Crawlee, Playwright Stealth, and Crawl4AI are worker/extraction/submission lanes. Trigger.dev is the orchestrator and must not replace the browser workers.
- Post-outreach webhooks persist local activity and update pipeline reply/follow-up steps even when Trigger.dev forwarding succeeds, so the pipeline is not left waiting on a disconnected external run.
- `sales_operator_queue_items.queue_type` is constrained by Supabase. Pipeline review/error items use `analysis` with the original reason in `meta.review_reason`.
- The video Trigger task does not pretend to render. It only completes a video job when a renderer callback supplies `output_url`; otherwise the job remains waiting for renderer output.
- Self-hosted lacks: warm starts (slower task startup), auto-scaling (manual worker node scaling), checkpoints (no non-blocking waits). These are Trigger.dev Cloud features only.
- Task events stored in ClickHouse (not PostgreSQL). Set `EVENT_REPOSITORY_DEFAULT_STORE=clickhouse_v2` on webapp for production scale.

## Migration from Cloud

| Item | Cloud (old) | OSS (new) |
| --- | --- | --- |
| API URL | `https://api.trigger.dev` | `https://trigger.paradigmjp.com` |
| Dashboard | `https://cloud.trigger.dev` | `https://trigger.paradigmjp.com` |
| Project ref | `proj_ptaxneqibbeboxxboajw` | `paradigm-sales-os` |
| Task deploy | `npx trigger.dev deploy` (cloud) | `npx trigger.dev deploy -a https://trigger.paradigmjp.com` |
| Local dev fallback port | — | `http://localhost:8030` |
