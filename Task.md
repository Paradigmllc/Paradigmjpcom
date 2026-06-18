## CURRENT STATUS - 2026-06-18 Hetzner / OSS Recovery

### Summary
- Hetzner migration recovery is complete for the core production stack: Coolify deploys, RevenueOS, OSS Supabase, Twenty, and the surrounding OSS routes.
- Do not paste real API keys, tokens, passwords, or database credentials into this file. Use approved non-git secret storage and runtime env only.
- Existing unrelated local changes remain untouched: `package.json`, `package-lock.json`, `scripts/unlock-payload-users.sh`.

### Live Verification
| Area | Result |
| --- | --- |
| `https://paradigmjp.com/ja` | HTTP 200, production page renders |
| Coolify | Login route reachable; deploy path repaired for Hetzner app UUID |
| Supabase Studio | HTTP 200 on `supabase.paradigmjp.com/project/default` |
| Supabase REST | JSON 401 for anon on `sales_companies`, confirming REST routing + locked permissions |
| RevenueOS health | HTTP 200; core checks OK; status degraded only by optional providers |
| Twenty UI/API | UI HTTP 200; current workspace API token works |
| Twenty -> RevenueOS | Pull timer active; latest ticks scan/update records and reuse pipeline runs |
| RevenueOS -> Twenty | Writeback succeeds with `failed=0` after field-fallback repair |
| Trigger.dev | Reachable from RevenueOS health |
| Dify | Reachable from RevenueOS health |
| Crawl4AI | Public `/health` HTTP 200 and internal health OK |
| FlareSolverr browser search | OK from RevenueOS health |
| n8n | HTTP 200 |
| NocoDB | HTTP 200 |
| Directus | Route reachable; `/server/health` returns protected 403 |
| Metabase | HTTP 200 |
| Docuseal | Setup redirect reachable |
| Chatwoot | Onboarding redirect reachable |
| Cal.com | Followed redirect reaches setup page HTTP 200; `ALLOWED_HOSTNAMES` repaired |
| SearXNG | HTTP 200 |

### Data Snapshot
| Table | Count |
| --- | ---: |
| `sales_companies` | 255 |
| `leads` | 198 |
| `sales_pipeline_runs` | 1523 |
| `sales_sync_logs` | 1356 |
| `sales_crm_view_fields` | 12 |
| `sales_crm_select_options` | 95 |

### Fixes Applied
- Coolify scripts now default to Hetzner Coolify and the current app UUID, and deployment refreshes the runtime networks plus manual Traefik route.
- RevenueOS app env was restored for OSS Supabase, Trigger.dev, Twenty, Dify, Crawl4AI, and browser-search integrations.
- Supabase OSS security/runtime migration was added and applied: RevenueOS grants restored, anon/auth access to sensitive Sales OS tables revoked, enrichment runtime columns restored.
- Twenty sync now tolerates missing OSS custom/standard fields and falls back instead of failing writeback.
- Host-side `revenueos-twenty-sync.timer` is enabled and active; it runs pull + writeback once per minute.
- Cal.com compose configuration was repaired: `ALLOWED_HOSTNAMES` added and malformed compose sections fixed so the service can be recreated.
- Final cloud-to-OSS cutover archive and nightly OSS Supabase backup were implemented and verified earlier on 2026-06-18.

### Remaining Notes
- RevenueOS `/api/sales/health` is `degraded` only because optional providers are not configured: Stagehand, Steel.dev, Crawlee worker, and Outreach worker.
- Twenty pull skips records with missing or invalid domains; this is source data quality, not an infra failure.
- Directus health is protected by design and returns 403 from the public URL.
- Chatwoot and Docuseal are reachable at setup/onboarding states; seed/admin setup may still be needed before business use.
- `npx tsc --noEmit` currently fails on pre-existing missing type-definition packages in the local workspace. `npm run lint` also fails because the script still uses removed `next lint` behavior.
