# Standalone Sales Pipeline Container

Revenue OS 本体を触らずに、既存 Supabase OSS の営業テーブルを読む薄い管制塔です。

## 方針

- Next.js / Payload / Revenue OS dashboard とは別コンテナで起動する。
- `SALES_SUPABASE_URL` + `SALES_SUPABASE_SERVICE_ROLE_KEY` で PostgREST に直接接続する。
- API は `Authorization: Bearer $SALES_PIPELINE_CONTAINER_SECRET` 必須。
- cron / polling / 常駐 worker は作らない。画面更新は手動ボタンだけ。
- 既存 DB schema を再利用し、新規テーブルは作らない。

## Local

```bash
SALES_PIPELINE_CONTAINER_SECRET=dev-secret \
SALES_SUPABASE_URL=http://127.0.0.1:3000 \
SALES_SUPABASE_SERVICE_ROLE_KEY=service-role \
npm --prefix services/sales-pipeline start
```

Open `http://127.0.0.1:8090` and enter the secret in the UI.

## Docker Compose

```bash
docker compose -f docker-compose.sales-pipeline.yml up --build
```
