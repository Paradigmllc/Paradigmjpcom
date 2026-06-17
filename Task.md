## CURRENT STATUS - 2026-06-17 Hetzner CX43 完全移行 / Cloud Supabase データ復旧待ち

### 移行概要

DO Droplet (4vCPU/8GB, ¥8,100/月) → Hetzner CX43 (8vCPU/16GB, ¥3,000/月) に完全移行。
26コンテナ稼働中。年間 ¥61,200 削減。

### サーバー情報

| 項目 | 値 |
|------|-----|
| **Hetzner IP** | 178.105.138.55 |
| **Coolify** | coolify.paradigmjp.com (Coolify 4.1.2) |
| **Coolify API Token** | `3|coolify_ed9cc16a71a2d9f1c91bb8436c3d355a191994a6553493760397f95e1fb2c959` |
| **Coolify App UUID** | `n8i2sjiqvr2d8hrzppop2m2i` (paradigm-hp) |
| **OSS Supabase** | localhost:5433 (postgres/supabase2026pass) |
| **Disk** | 45G / 150G (31%) |
| **RAM** | 5.6G / 15G |

### 稼働中サービス (26コンテナ)

| サービ | URL | 状態 |
|--------|-----|------|
| paradigm-hp | paradigmjp.com | 🟢 HTTP 200 (admin HTTPS 証明書発行待ち) |
| Coolify | coolify.paradigmjp.com | 🟢 HTTP 200 |
| n8n (53 workflows) | n8n.paradigmjp.com | 🟢 HTTP 200 |
| OSS Supabase Studio | supabase.paradigmjp.com | 🟢 HTTP 200 |
| Twenty CRM | twenty.paradigmjp.com | 🟢 HTTP 200 (空DB) |
| Cal.com | cal.paradigmjp.com | 🟡 DB マイグレーション未適用 |
| Crawl4AI | crawl4.paradigmjp.com | 🟢 |
| SearXNG | searxng.paradigmjp.com | 🟢 |
| FlareSolverr | (内部) | 🟢 |
| Hermes Agent | (内部) | 🟢 |
| OpenCode Bot | (内部) | 🟢 |

### データ状態

| データ | 場所 | 状態 |
|--------|------|------|
| **n8n ワークフロー (53件)** | OSS Supabase | ✅ 完全移行 |
| **Paradigm スキーマ** | OSS Supabase | ✅ ローカルマ決行ンで作成済 |
| **PayloadCMS コンテンツ/ユーザー** | Cloud Supabase | 🔴 Disk IO Budget 枯渇でアクセス不能 |
| **Twenty CRM データ** | DO Droplet | 🔴 解約済・消滅 |
| **Cloud Supabase** | yihdmgtxiqfdgdueolub | 🔴 Disk IO 枯渇 - 2分毎自動再試行中 |

### Cloud Supabase 復旧手順

1. Supabase Dashboard → プロジェクト設定 → Restart project
2. 再起動後、Hetzner 上の自動復旧スクリプト (/opt/backups/retry-cloud-dump.sh) が pg_dump → OSS Supabase リストア
3. データ確認後、Cloud Supabase 解約

### 残課題

| # | 課題 | 優先度 |
|---|------|--------|
| 1 | Admin HTTPS (Let's Encrypt 証明書) | 高 |
| 2 | Cloud Supabase データ復旧 | 高 |
| 3 | Cal.com DB マイグレーション | 中 |
| 4 | Cloud Supabase 解約 | 中 |

### Active Handoff

- Cloudflare SSL を一時的に Flexible → Full に切替後 502。証明書発行には Cloudflare プロキシ一時停止 (DNS-only) が必要。
- Cloud Supabase PAT (sbp_8ba46066d9a4c0cb9fb336b6fafbd43dd4dcc259cc) は 401 で使えない。
- ローカル `npx payload migrate` で paradigm スキーマを Hetzner OSS Supabase に作成可能 (DATABASE_URI=postgresql://postgres:supabase2026pass@178.105.138.55:5433/postgres)
- paradigm-hp コンテナ再起動時は必ず `docker network connect supabase_supabase-net <container>` が必要

### 重要ファイル

- Traefik 動的設定: `/data/coolify/proxy/dynamic/paradigmjp.yml` (Hetzer上)
- Cloud Supabase 復旧スクリプト: `/opt/backups/retry-cloud-dump.sh`
- Cloud Supabase 自動再試行ログ: `/opt/backups/cloud-supabase.log`
- バックアップ: `/opt/backups/`
