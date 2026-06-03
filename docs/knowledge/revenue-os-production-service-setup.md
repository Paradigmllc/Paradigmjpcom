# Revenue OS production service setup

This file intentionally contains no secret values. Put real values only in Coolify runtime envs.

## Coolify target

- App: `paradigm-hp`
- App UUID: `i12am4vvcbggefnqdizhnv9a`
- Env screen: `https://coolify.appexx.me` -> `My first project` -> `production` -> `paradigm-hp` -> `Configuration` -> `Environment Variables`
- After changing any value, redeploy `paradigm-hp` and run the Revenue OS integration live audit.

## Required services

| Service | Production URL env | Secret/key env | How to create the value |
|---|---|---|---|
| Chatwoot | `CHATWOOT_BASE_URL=https://chatwoot.paradigmjp.com` | `CHATWOOT_API_KEY`, `CHATWOOT_ACCOUNT_ID` | Deploy Chatwoot, log in, create a user access token from Profile Settings, and copy the account id from the Chatwoot account URL/API path. |
| Directus | `DIRECTUS_BASE_URL=https://directus.paradigmjp.com` | `DIRECTUS_TOKEN` | Deploy Directus, create a restricted automation user, generate that user's static token, and allow only the needed asset/proposal collections. |
| Keystatic | `KEYSTATIC_BASE_URL=https://keystatic.paradigmjp.com` | GitHub auth for the Keystatic app, not stored in Revenue OS | Deploy the Astro/Keystatic app in GitHub mode and point the public admin URL to the env. |
| LiveKit | `LIVEKIT_URL=wss://livekit.paradigmjp.com` | `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Deploy LiveKit or create a LiveKit Cloud project, then copy the server URL, API key, and API secret. |
| Browserless | `BROWSERLESS_URL=https://browserless.paradigmjp.com` | `BROWSERLESS_TOKEN` | Deploy Browserless with the same `TOKEN` value, then paste that value into Revenue OS. |
| Stagehand | `STAGEHAND_URL=https://stagehand.paradigmjp.com` | `STAGEHAND_API_KEY` | Deploy the Stagehand API wrapper or Browserbase-backed worker; set its bearer token to the same value used by Revenue OS. |
| HyperFrames | `HYPERFRAMES_RENDERER_URL=https://hyperframes.paradigmjp.com` | `HYPERFRAMES_API_KEY` | Deploy a HyperFrames renderer API wrapper; set `/health` or `/api/health` to require the same bearer token. |
| OpenMontage | `OPENMONTAGE_API_URL=https://openmontage.paradigmjp.com`, `NEXT_PUBLIC_OPENMONTAGE_STUDIO_URL=https://studio.paradigmjp.com` | `OPENMONTAGE_API_KEY` | Use the internal OpenMontage-compatible API wrapper. Public official OSS could not be verified, so do not present this as an external official GUI. |
| Cloudflare R2 | `CLOUDFLARE_R2_PUBLIC_BASE_URL=https://assets.paradigmjp.com`, `CLOUDFLARE_R2_BUCKET` | `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Create an R2 bucket, connect a production custom domain, then create an S3-compatible R2 API token with object read/write for that bucket. |
| ComfyUI API | `COMFYUI_API_URL=https://comfyui.paradigmjp.com` | `COMFYUI_API_KEY` | Deploy ComfyUI behind an authenticated API gateway or reverse proxy. The native `/prompt` route must not be exposed without the shared bearer key. |

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
