## CURRENT STATUS - 2026-06-17 Hetzner CX43 完全移行完了

### 移行概要
DO Droplet (4vCPU/8GB, ¥8,100/月) → Hetzner CX43 (8vCPU/16GB, ¥3,000/月) 26→32コンテナ
Cloud Supabase → OSS Supabase 全データ移行 (70MB custom dump → pg_restore)
年間 ¥61,200 削減

### サーバー情報
- Hetzner IP: 178.105.138.55
- Coolify: coolify.paradigmjp.com (admin@paradigmjp.com / Paradigm760131!)
- OSS Supabase: localhost:5433 (postgres/supabase2026pass)
- Cloudflare SSL: Full (Let's Encrypt certs)
- Disk: 70G / 150G (49%)

### 全サービス状態

| サービス | URL | データ |
|---------|-----|--------|
| paradigm-hp | paradigmjp.com | ✅ 全復旧 |
| PayloadCMS Admin | /admin | ✅ contact@paradigmjp.com / Paradigm2026! |
| Coolify | coolify.paradigmjp.com | ⚠️ 新規(旧DOデータ消滅) |
| n8n | n8n.paradigmjp.com | ✅ 53WF |
| Supabase Studio | supabase.paradigmjp.com | ✅ 全データ |
| Cal.com | cal.paradigmjp.com | ✅ 新規 |
| Twenty CRM | twenty.paradigmjp.com | ⚠️ 新規(旧DOデータ消滅) |
| SearXNG | searxng.paradigmjp.com | ✅ |
| Crawl4AI | crawl4.paradigmjp.com | ✅ |
| Keystatic | keystatic.paradigmjp.com | ✅ |
| Metabase | metabase.paradigmjp.com | 🆕 新規デプロイ |
| NocoDB | nocodb.paradigmjp.com | 🆕 新規デプロイ |
| Docuseal | docuseal.paradigmjp.com | 🆕 新規デプロイ |
| Directus | directus.paradigmjp.com | 🆕 新規デプロイ |
| Chatwoot | chatwoot.paradigmjp.com | 🆕 新規デプロイ |

### DO解約で失われたデータ(復元不可)
- Twenty CRM データ (DO Docker volume)
- 旧 Coolify プロジェクト設定 (DO Docker volume)
- Appsmith / LiveKit / HyperFrames (DO上のみ)

### 残課題
- 新規OSSのSSL証明書発行待ち (数分)
- Cal.com DB初期設定
- Cloud Supabase 解約
