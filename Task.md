## CURRENT STATUS - 2026-06-18 Hetzner / OSS Supabase Recovery

### Summary
- Coolify / RevenueOS / Supabase OSS / Twenty / surrounding OSS routes were audited and repaired on Hetzner (`178.105.138.55`).
- Do not paste real API keys or passwords into this file. Production secrets are stored in runtime env / approved non-git secret storage.

### Production Verification
| Service | Result |
| --- | --- |
| paradigmjp.com `/ja` | HTTP 200 |
| Coolify | HTTP 302 `/login` |
| Supabase Studio | HTTP 307 `/project/default`; container healthy |
| Supabase REST | `/rest/v1/sales_companies` returns JSON 401 for anon, not Studio HTML |
| RevenueOS health | HTTP 200, core lanes OK; degraded only by optional missing integrations |
| Twenty | HTTP 200; API token regenerated from current workspace and pull dry-run works |
| Twenty pull | scanned 5, updated 1, skipped 4 due missing/invalid domains |
| Trigger.dev | runs API reachable from RevenueOS health |
| Dify | API reachable from RevenueOS health |
| Crawl4AI | health HTTP 200 |
| FlareSolverr | connected from RevenueOS health |
| n8n | container up |
| NocoDB | HTTP 200 |
| Directus | route reachable, `/server/health` returns 403 |
| Metabase | HTTP 200 |
| Docuseal | HTTP 302 `/setup` |
| Chatwoot | HTTP 302 `/installation/onboarding` after pgvector DB fix |

### Fixes Applied
- Supabase OSS: restored RevenueOS RLS/grants, revoked anon/authenticated access on `sales_*` and `leads`, restored `service_role` DML, added missing enrichment runtime columns and missed migration fields.
- Supabase routing: added high-priority Traefik route for `supabase.paradigmjp.com/rest/v1` to PostgREST while keeping Studio on root.
- Supabase Studio: fixed container healthcheck / edge functions management env and recreated Studio.
- RevenueOS app: restored OSS Supabase env, Trigger.dev env, Twenty env, Dify env, browser-search env, and attached app to `supabase_supabase-net` and `services-net`.
- Twenty: regenerated a valid current workspace API token, fixed custom field physical columns on the workspace company table, verified REST and RevenueOS pull.
- Chatwoot: changed `chatwoot-db` from plain Postgres to `pgvector/pgvector:pg16`, ran `db:chatwoot_prepare`, and restored web boot.
- Traefik OSS routes: restored NocoDB / Directus / Metabase / Docuseal / Chatwoot public routing.
- Local migration added: `supabase/migrations/migration_058_sales_oss_security_and_enrichment_runtime.sql`.

### Remaining Notes
- RevenueOS `/api/sales/health` is `degraded` only because optional providers are not configured: Steel, Stagehand, Crawlee worker, Outreach worker, some Dify optional keys, Notion, GBiz, PSI, Hunter.
- Twenty pull skips records that have no valid domain in Twenty. That is data quality, not infra.
- Directus route is reachable; health endpoint responds 403 rather than public 200.
- Chatwoot is now reachable at onboarding. If actual use is needed, complete/admin-seed Chatwoot setup next.
- Existing unrelated local changes before this recovery remain untouched: `package.json`, `package-lock.json`, `scripts/unlock-payload-users.sh`.

### Cloud Supabase Cancellation Check - 2026-06-18
- Production RevenueOS container env points to OSS Supabase only: `SALES_SUPABASE_URL=http://supabase-api-proxy:80`, `NEXT_PUBLIC_SUPABASE_URL=https://supabase.paradigmjp.com`.
- Running container env scan found zero `*.supabase.co` / old project-ref references.
- n8n SQLite workflow and credentials scan found zero old Cloud Supabase references.
- Public smoke responses for paradigmjp.com, RevenueOS health, Supabase REST, Twenty, and n8n contain no old project-ref references.
- Disabled the old root cron entry that retried `/opt/backups/retry-cloud-dump.sh` every 2 minutes.
- Removed old Cloud Supabase fallback defaults from checked runnable helper scripts and updated the tooling bootstrap migration to `https://supabase.paradigmjp.com`.
- Stale old project-ref strings remain only in historical migration comments and two legacy seed scripts that currently fail `node --check` before any Supabase call; they are not part of the checked production runtime.
- Safe cancellation judgement: Cloud Supabase is no longer required for the checked production runtime. Keep a final export/archive before deleting because Supabase project deletion permanently removes project data and backups.

## CURRENT STATUS - 2026-06-17 Hetzner CX43 移行完了 / RevenueOS SSOT 修正

### 移行概要
DO (¥8,100/月) → Hetzner CX43 (¥3,000/月) 完全移行。26→35コンテナ稼働。年間 ¥61,200 削減。
Cloud Supabase → OSS Supabase 全データ移行済み (280MB pg_dump)。

### サーバー情報
- Hetzner IP: 178.105.138.55
- Coolify: coolify.paradigmjp.com (contact@paradigmjp.com / Paramore416)
- OSS Supabase: localhost:5433 (postgres/supabase2026pass)
- Coolify API Token: `3|coolify_ed9cc16a71a2d9f1c91bb8436c3d355a191994a6553493760397f95e1fb2c959`
- Coolify App UUID: `n8i2sjiqvr2d8hrzppop2m2i` (paradigm-hp)

### 全サービス状態 (2026-06-17 11:45)

| サービス | URL | データ |
|---------|-----|--------|
| paradigm-hp | paradigmjp.com | ✅ 全復旧 (SALES_SUPABASE_URL=http://supabase-studio-1:3000) |
| PayloadCMS Admin | /admin | ✅ contact@paradigmjp.com / Paramore416 |
| Coolify | coolify.paradigmjp.com | ✅ contact@paradigmjp.com / Paramore416 |
| n8n | n8n.paradigmjp.com | ✅ 53WF |
| Supabase Studio | supabase.paradigmjp.com | ✅ 全データ |
| Cal.com | cal.paradigmjp.com | ✅ |
| Twenty CRM | twenty.paradigmjp.com | ✅ 新規 (旧DOデータ消失) |
| SearXNG | searxng.paradigmjp.com | ✅ |
| Crawl4AI | crawl4.paradigmjp.com | ✅ |
| Metabase | metabase.paradigmjp.com | 🆕 |
| NocoDB | nocodb.paradigmjp.com | 🆕 |
| Docuseal | docuseal.paradigmjp.com | 🆕 |
| Directus | directus.paradigmjp.com | 🆕 |
| Chatwoot | chatwoot.paradigmjp.com | 🆕 |
| Hermes Agent | (内部) | ✅ |
| OpenCode Bot | (内部) | ✅ |

### OSS Supabase RevenueOS データ

| テーブル | 件数 |
|---------|------|
| sales_companies | 251 |
| leads | 198 |
| sales_pipeline_runs | 1,515 |
| sales_crm_select_options | 有り |
| sales_crm_view_fields | 有り |

### RevenueOS SSOT 設定

- `SALES_SUPABASE_URL`: http://supabase-studio-1:3000 (コンテナ内部からStudio経由でPostgREST接続)
- `SALES_SUPABASE_SERVICE_ROLE_KEY`: JWTトークン設定済み
- `SALES_SUPABASE_PRIMARY`: true
- `NEXT_PUBLIC_SUPABASE_URL`: http://supabase-rest-1:3000
- CRM API (`/api/sales/crm-field-config`): エンドポイント動作中 (401 = 認証が必要)

### DO解約で失われたデータ (復元不可)
- Twenty CRM 全データ (DO Docker Volume)
- Coolify 旧プロジェクト設定 (DO Docker Volume)

### 重要操作手順
- paradigm-hp 再起動後: `docker network connect supabase_supabase-net <container>` 必須
- Traefik動的設定: `/data/coolify/proxy/dynamic/paradigmjp.yml`
- Traefik更新: `sed -i 's|OLD_HASH:3000|NEW_HASH:3000|g'` + コンテナ名確認
- PayloadCMSパスワードハッシュ: PBKDF2 SHA256 25000反復 512バイト salt(hex)
- PostgREST 再起動でスキーマキャッシュリロード
- RevenueOS連携: `SALES_SUPABASE_URL` は Studio経由 (`/rest/v1` プロキシが必要なため)

### 残課題
- [ ] Coolifyに全サービス登録 (n8n/Cal.com/Twenty他はDocker直接管理)
- [ ] RevenueOS SSOTパネル認証確認 (ユーザーログイン後に表示確認)
- [ ] Cloud Supabase 解約
