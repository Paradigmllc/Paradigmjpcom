# Revenue OS production service setup

This file intentionally contains no secret values. Put real values only in Coolify runtime envs.

## Coolify target

- App: `paradigm-hp`
- App UUID: `n8i2sjiqvr2d8hrzppop2m2i`
- Env screen: `https://coolify.paradigmjp.com` -> `My first project` -> `production` -> `paradigm-hp` -> `Configuration` -> `Environment Variables`
- After changing any value, redeploy `paradigm-hp` and run the Revenue OS integration live audit.

## Required services

| Service | Production URL env | Secret/key env | How to create the value |
|---|---|---|---|
| Chatwoot | `CHATWOOT_BASE_URL=https://chatwoot.paradigmjp.com` | `CHATWOOT_API_KEY`, `CHATWOOT_ACCOUNT_ID` | Deploy Chatwoot, log in, create a user access token from Profile Settings, and copy the account id from the Chatwoot account URL/API path. |
| Directus | `DIRECTUS_BASE_URL=https://directus.paradigmjp.com`, `DIRECTUS_SALES_ASSETS_COLLECTION=sales_assets` | `DIRECTUS_TOKEN` | Deploy Directus, create a restricted automation user, generate that user's static token, and allow only the needed asset/proposal collections. Revenue OS writes and pulls the selected company asset record through `/api/sales/companies/:id/external-sync`. |
| Keystatic | `KEYSTATIC_BASE_URL=https://keystatic.paradigmjp.com`, `KEYSTATIC_SYNC_WEBHOOK_URL` or `ASTRO_DEMO_WORKER_URL` | `KEYSTATIC_SYNC_WEBHOOK_SECRET` or `ASTRO_DEMO_WORKER_TOKEN` when the sync endpoint requires auth. GitHub app auth remains on the Keystatic side. | Deploy the Astro/Keystatic app in GitHub mode and expose a sync webhook/worker that accepts the Revenue OS company payload and returns the demo URL or commit metadata. |
| LiveKit | `LIVEKIT_URL=wss://livekit.paradigmjp.com` | `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Deploy LiveKit or create a LiveKit Cloud project, then copy the server URL, API key, and API secret. |
| Browserless | `BROWSERLESS_URL=https://browserless.paradigmjp.com` | `BROWSERLESS_TOKEN` | Deploy Browserless with the same `TOKEN` value, then paste that value into Revenue OS. |
| Stagehand | `STAGEHAND_URL=https://stagehand.paradigmjp.com` | `STAGEHAND_API_KEY` | Deploy the Stagehand API wrapper or Browserbase-backed worker; set its bearer token to the same value used by Revenue OS. |
| HyperFrames | `HYPERFRAMES_RENDERER_URL=https://hyperframes.paradigmjp.com` | `HYPERFRAMES_API_KEY` | Deploy a HyperFrames renderer API wrapper; set `/health` or `/api/health` to require the same bearer token. |
| OpenMontage | `OPENMONTAGE_API_URL=https://openmontage.paradigmjp.com`, `NEXT_PUBLIC_OPENMONTAGE_STUDIO_URL=https://studio.paradigmjp.com` | `OPENMONTAGE_API_KEY` | Use the internal OpenMontage-compatible API wrapper. Public official OSS could not be verified, so do not present this as an external official GUI. |
| Cloudflare R2 | `CLOUDFLARE_R2_PUBLIC_BASE_URL=https://assets.paradigmjp.com`, `CLOUDFLARE_R2_BUCKET` | `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Create an R2 bucket, connect a production custom domain, then create an S3-compatible R2 API token with object read/write for that bucket. |
| ComfyUI API | `COMFYUI_API_URL=https://comfyui.paradigmjp.com` | `COMFYUI_API_KEY` | Deploy ComfyUI behind an authenticated API gateway or reverse proxy. The native `/prompt` route must not be exposed without the shared bearer key. |
| Trigger.dev Sales OS | `TRIGGER_API_URL=https://api.trigger.dev`, `TRIGGER_DASHBOARD_URL=https://cloud.trigger.dev`, `TRIGGER_SALES_OS_PIPELINE_TASK_ID` | `TRIGGER_SECRET_KEY` or `TRIGGER_ACCESS_TOKEN` | Create a Trigger.dev task that accepts `run_id` and executes the Sales OS steps against Supabase. Revenue OS falls back to local/manual execution when this task is missing. |

## Revenue OS live checks

- Chatwoot: `GET /api/v1/accounts/{account_id}/inboxes` with `api_access_token`.
- Directus: `GET /server/health`, then `GET /users/me` with bearer token.
- Keystatic: root/admin URL returns below HTTP 500.
- LiveKit: `RoomService/ListRooms` with a short-lived JWT generated from key/secret.
- Browserless: `/pressure?token=...`.
- Stagehand: `/health` with bearer token.
- HyperFrames: `/health` or `/api/health` with bearer token.
- OpenMontage: `/health` or `/api/health` with bearer token.
- Cloudflare R2: S3 `HeadBucket`.
- ComfyUI: `/system_stats` with bearer/API-key headers.
- Trigger.dev Sales OS: `/api/sales/pipeline-runs` can create a run; dispatch mode queues `TRIGGER_SALES_OS_PIPELINE_TASK_ID` when configured.
