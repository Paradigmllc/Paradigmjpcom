#!/usr/bin/env bash
# revenueos-twenty-bridge べき等デプロイ。/opt/revenueos-twenty-bridge/ で実行する想定。
# secret は git に置かず、実行時にコンテナ env / media-os volume から読んで .env(0600) を生成する。
set -euo pipefail
cd "$(dirname "$0")"

APP=$(docker ps --filter "name=n8i2sjiqvr2d8hrzppop2m2i" --format "{{.Names}}" | head -n1)
[ -n "$APP" ] || { echo "RevenueOS app container 不明"; exit 1; }

# --- secret 収集 (stdout に出さない) ---
PGPW=$(docker exec supabase-db-1 sh -lc 'printf "%s" "$POSTGRES_PASSWORD"')
TPGPW=$(docker exec opt-twenty-db-1 sh -lc 'printf "%s" "$POSTGRES_PASSWORD"')
WHSEC=$(docker exec "$APP" sh -lc 'printf "%s" "$TRIGGER_WEBHOOK_SECRET"')
# 既存 .env があれば PULL_TOKEN を維持 (Twenty 側 URL と一致させるため)、無ければ新規発行
PTOKEN=$(grep -s '^PULL_TOKEN=' .env | cut -d= -f2)
[ -n "$PTOKEN" ] || PTOKEN=$(openssl rand -hex 24)

umask 177
cat > .env <<EOF
# Supabase (writeback: LISTEN twenty_writeback)
PGHOST=supabase-db-1
PGPORT=5432
PGUSER=postgres
PGPASSWORD=${PGPW}
PGDATABASE=postgres
# Twenty (pull: LISTEN twenty_pull)
TWENTY_PGHOST=opt-twenty-db-1
TWENTY_PGPORT=5432
TWENTY_PGUSER=twenty
TWENTY_PGPASSWORD=${TPGPW}
TWENTY_PGDATABASE=twenty
# RevenueOS 呼び出し (公開URL固定=Coolifyのコンテナ名suffix変動に強い)
REVENUEOS_URL=https://paradigmjp.com
WEBHOOK_SECRET=${WHSEC}
PULL_TOKEN=${PTOKEN}
PORT=8791
PULL_DEBOUNCE_MS=8000
PULL_LIMIT=200
EOF
umask 022
echo "[deploy] .env 生成 (0600)"

echo "[deploy] トリガー適用 (べき等)"
docker exec -i supabase-db-1 psql -U postgres -d postgres -v ON_ERROR_STOP=1 < writeback-trigger.sql
docker exec -i opt-twenty-db-1 psql -U twenty -d twenty -v ON_ERROR_STOP=1 < pull-trigger.sql

echo "[deploy] build & up"
docker compose up -d --build

sleep 5
docker logs revenueos-twenty-bridge --since 10s 2>&1 | grep -iE "listening|http up|reconcile done" || true
echo "[deploy] done. health:"
docker run --rm --network coolify curlimages/curl:latest -fsS --max-time 8 "http://revenueos-twenty-bridge:8791/health" && echo
