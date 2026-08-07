# Coolify / Supabase OSS Repair Log

Updated: 2026-05-30

## Current Production State

- Coolify and Traefik are running on `178.105.138.55`.
- Docker log rotation is configured in `/etc/docker/daemon.json`.
- Legacy `appexx-host-janitor.timer` / host guard timers are superseded by event-triggered one-shot recovery guards. Do not add cron/systemd timers for site operations.
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

## 2026-08-07 — supabase.paradigmjp.com 502 の復旧

### 症状
`https://supabase.paradigmjp.com/` および `/rest/v1/` が 502。`supabase-db-1` と `supabase-rest-1` は Up かつ healthy だった。

### 原因（2つ）
1. **Traefik のルートが存在しないコンテナを指していた。** `supabase-svc` は `supabase-studio-1:3000`、`supabase-api-svc` は `supabase-api-proxy:80` を参照していたが、どちらのコンテナも存在しなかった。`/opt/supabase/docker-compose.yml` には db / rest / realtime / meta / studio の5サービスが定義されているのに、稼働していたのは db と rest の2つだけだった。
2. **PostgREST はテーブルを `/{table}` で公開する**が、Traefik はパスを剥がさずに `/rest/v1/{table}` のまま転送していた。この prefix 除去を担っていたのが、消えていた `supabase-api-proxy` だったと考えられる。

### 対処
1. `cd /opt/supabase && docker compose up -d meta studio realtime` — db と rest には触れず、欠けているサービスだけを明示的に起動した。
2. `paradigmjp.yml` の `supabase-api-svc` のバックエンドを `http://supabase-api-proxy:80` から `http://supabase-rest-1:3000` へ変更（`supabase-rest-1` は compose で coolify ネットワークに定義済みのエイリアス）。
3. 同ファイルに `supabase-rest-strip`（`stripPrefix: /rest/v1`）middleware を追加し、`supabase-rest-https` ルータに適用。

### 結果
- Studio: 307（Studio の通常のリダイレクト）
- `/rest/v1/`: 200
- Sales OS の SSOT テーブル（`sales_content_templates` / `sales_agent_events` / `sales_integration_status`）へ service_role で 200 応答を確認

変更前に `paradigmjp.yml.bak-supabase-fix-<timestamp>` を作成済み。

### 未対応の課題
- `/opt/supabase/docker-compose.yml` に **PostgreSQL パスワードと JWT シークレットが平文で書かれている**（`POSTGRES_PASSWORD`、`PGRST_JWT_SECRET`）。JWT シークレットは既定値のままの文字列を含む。環境変数への外出しとローテーションが必要。
- studio / meta / realtime が停止していた原因は特定できていない。再発した場合はコンテナの終了理由を確認すること。
- ディスク使用率 87%。
