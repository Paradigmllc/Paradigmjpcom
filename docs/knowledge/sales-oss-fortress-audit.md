# Sales OSS Fortress Audit - 2026-06-03

## Scope

Audited the OSS fortress requested for lead generation, technical analysis, autonomous orchestration, content/video generation, and post-outreach closing. This is an operations audit, not only a code-presence check: environment variables, DB registration, webhook ingress, error handling, and dashboard visibility were checked.

## Result

| Layer | Tool | Status | Current control point |
|---|---|---|---|
| Lead generation | SearxNG | Implemented | `sales_searxng_search_runs`, `/api/sales/searxng/runs`, monthly batch import |
| Lead generation | mubeng | Implemented | `MUBENG_PROXY_URL`, `proxy-agent.ts`, crawler/browser outbound routing |
| Lead generation | Crawlee | Configured lane | `CRAWLEE_WORKER_URL`, source coverage and registry tracking |
| Technical analysis | Wappalyzer CLI | Implemented/fallback | `wappalyzer.ts`, `WAPPALYZER_CLI_BIN`, `WEBANALYZE_BIN` |
| Browser factory | Browserless | Implemented | `BROWSERLESS_URL`, screenshot API, pressure check in integration registry |
| Browser factory | Stagehand | Implemented | `STAGEHAND_URL`, `/api/sales/outreach/stagehand`, health check |
| Infra/SSOT | Supabase | Implemented | service-role guarded SSOT, dashboard degraded state when unavailable |
| Autonomous thinking | Dify | Implemented | Dify Cloud runtime resolver and workflow key groups |
| CRM | Twenty CRM | Implemented | `TWENTY_BASE_URL`, CRM projection and metadata sync |
| Video/content | HyperFrames | Configured lane | video pipeline config and renderer URL env |
| Video/content | ComfyUI | Configured lane | video pipeline config and renderer URL env |
| Content | Directus | Added as monitored OSS surface | `DIRECTUS_BASE_URL`, internal fallback template workbench |
| Content | Slidev | Configured lane | `SLIDEV_RENDER_URL` with Gotenberg PDF conversion |
| Content | Gotenberg | Implemented lane | `GOTENBERG_URL`, sales material PDF generation |
| Content | Keystatic | Added as monitored OSS surface | `KEYSTATIC_BASE_URL`, internal fallback demo-site workbench |
| Content | Astro | Implemented lane | demo-site factory and `web_demos` output |
| Reports | Next.js | Implemented | dynamic report renderer and `/ja/studio` routing |
| Post-outreach | Chatwoot | Added webhook ingress | `/api/sales/chatwoot/webhook`, activity log, follow-up queue, n8n forward |
| Post-outreach | Cal.com | Implemented | `/api/sales/calcom/webhook`, `sales_calendar_events` |
| Post-outreach | LiveKit | Added webhook ingress | `/api/sales/livekit/webhook`, activity log, meeting-prep queue, n8n forward |

## Fixes Applied

- Added Chatwoot and LiveKit authenticated webhook routes. Both fail closed when `N8N_WEBHOOK_SECRET` or Supabase service role is missing, log errors, write to `sales_activity_log`, and create queue items when automation forwarding is not ready.
- Added `post-outreach-webhooks.ts` shared parser/persistence utilities to avoid ad hoc payload handling and invalid company IDs.
- Added `migration_034_sales_post_outreach_tools.sql` to register Chatwoot, LiveKit, Directus, and Keystatic in `sales_tool_connections` without expanding public DB exposure.
- Added Directus, Keystatic, Chatwoot, and LiveKit to dashboard connection tracking and source coverage.
- Normalized `.env.example` so OSS service URL variables are not duplicated and the intended subdomains are explicit.

## Remaining Operational Gates

- DNS/proxy/service containers must exist before marking `chatwoot`, `livekit`, `directus`, or `keystatic` as `active` in `sales_tool_connections`.
- Chatwoot and LiveKit must send `X-Webhook-Secret: $N8N_WEBHOOK_SECRET`.
- n8n forwarding remains disabled until `N8N_POST_OUTREACH_WEBHOOK_URL` and `N8N_LIVEKIT_DISCOVERY_WEBHOOK_URL` are set. Until then, the routes deliberately create follow-up or meeting-prep queue items instead of pretending automation succeeded.
- Directus and Keystatic remain optional external studios because Revenue OS now has internal fallback workbenches for assets, demos, and reports.
