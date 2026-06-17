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
