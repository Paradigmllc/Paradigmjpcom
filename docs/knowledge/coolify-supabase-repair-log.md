# Coolify / Supabase OSS Repair Log

Updated: 2026-05-30

## Current Production State

- Coolify and Traefik are running on `178.105.138.55`.
- Docker log rotation is configured in `/etc/docker/daemon.json`.
- `appexx-host-janitor.timer` runs daily and now switches to aggressive unused-image pruning when root disk usage reaches 70%.
- `supabase.paradigmjp.com` currently serves the Sales OS SSOT through PostgreSQL + PostgREST + Studio + Postgres Meta.
- The current Supabase OSS stack is not yet a full Supabase Cloud replacement because Kong, Auth, Storage, and Realtime are not deployed.

## Repairs Applied

- Applied Sales OS runtime migrations 022-025 directly to the production Supabase OSS database.
- Verified the following SSOT tables exist, have RLS enabled, and are granted to `service_role`:
  - `sales_content_templates`
  - `sales_agent_commands`
  - `sales_agent_events`
  - `sales_integration_status`
  - `sales_platform_health_snapshots`
- Seeded `sales_content_templates` with 256 Japanese/English asset templates.
- Persisted integration-status snapshots for 36 API/OSS integrations.
- Inserted operational health snapshots for Coolify, Supabase DB, PostgREST, full-stack gap state, and the Sales OS app.
- Removed hardcoded Supabase secrets from the repository compose template and converted it to required environment variables.

## Guardrails

- Do not run `docker system prune --volumes` on this host. Volumes hold production databases.
- Do not blindly replace the current Supabase containers with a full-stack Supabase compose. First take database backups, generate fresh JWT/API keys, and plan Kong/Auth/Storage/Realtime cutover.
- Treat `https://supabase.paradigmjp.com/rest/v1/` as the current stable SSOT API path.
- Treat `https://supabase.paradigmjp.com/auth/v1/health` returning 404 as expected until Auth/Kong is deployed.

## Next Hardening Step

For full Supabase parity, deploy a separate staged stack first:

1. Back up `paradigm-supabase-db`.
2. Generate fresh `SUPABASE_JWT_SECRET`, anon key, and service-role key.
3. Add Kong, GoTrue Auth, Storage API, Realtime, and Imgproxy in staging.
4. Point only staging DNS to Kong.
5. Run app smoke tests against staging.
6. Cut over production only after `/rest/v1`, `/auth/v1`, `/storage/v1`, and `/realtime/v1` all pass.
