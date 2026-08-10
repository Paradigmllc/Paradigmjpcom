#!/usr/bin/env bash

# Nightly self-hosted Supabase backup. This is the tracked replacement for
# /usr/local/sbin/backup-oss-supabase.sh on the production host.
#
# Password precedence:
#   1. OSS_SUPABASE_POSTGRES_PASSWORD supplied by the service environment
#   2. POSTGRES_PASSWORD read from OSS_SUPABASE_ENV_FILE
#
# There is deliberately no built-in password. A missing secret must stop the
# backup rather than silently falling back to a credential stored in code.

set -euo pipefail
umask 077

die() {
  printf 'Backup configuration error: %s\n' "$1" >&2
  exit 1
}

read_postgres_password() {
  if [[ -n "${OSS_SUPABASE_POSTGRES_PASSWORD:-}" ]]; then
    printf '%s' "$OSS_SUPABASE_POSTGRES_PASSWORD"
    return
  fi

  local env_file="${OSS_SUPABASE_ENV_FILE:-/opt/supabase/.env}"
  [[ -r "$env_file" ]] || die "POSTGRES_PASSWORD is unavailable"

  local line value
  line="$(grep -m1 -E '^POSTGRES_PASSWORD=' "$env_file" || true)"
  value="${line#POSTGRES_PASSWORD=}"
  if [[ "$value" == \"*\" && "$value" == *\" ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
    value="${value:1:${#value}-2}"
  fi
  [[ -n "$value" ]] || die "POSTGRES_PASSWORD is unavailable"
  printf '%s' "$value"
}

POSTGRES_PASSWORD_VALUE="$(read_postgres_password)"
export PGPASSWORD="$POSTGRES_PASSWORD_VALUE"
unset POSTGRES_PASSWORD_VALUE

BACKUP_ROOT="${OSS_SUPABASE_BACKUP_ROOT:-/opt/backups/oss-supabase-nightly}"
# ローカルは R2 へ送るまでの中継。全世代は R2 に残るので、ここは復旧の初動に
# 足りる日数だけ持つ。既定の14日は 1.2GB/日 x 14 = 約17GB になり、150GB の
# ディスクでは deploy を止める側に効いていた(2026-08-10 に 97% まで到達)。
RETENTION_DAYS="${OSS_SUPABASE_BACKUP_RETENTION_DAYS:-3}"
ENCRYPTION_REQUIRED="${OSS_SUPABASE_BACKUP_ENCRYPTION_REQUIRED:-true}"
GPG_PASSPHRASE="${OSS_SUPABASE_BACKUP_GPG_PASSPHRASE:-}"
OFFSITE_TARGET="${OSS_SUPABASE_BACKUP_SSH_TARGET:-}"
OFFSITE_ROOT="${OSS_SUPABASE_BACKUP_SSH_ROOT:-/backups/paradigmjpcom}"
R2_BUCKET="${CLOUDFLARE_R2_BUCKET:-${R2_BUCKET:-}}"
R2_ACCOUNT_ID="${CLOUDFLARE_R2_ACCOUNT_ID:-}"
R2_ACCESS_KEY_ID="${CLOUDFLARE_R2_ACCESS_KEY_ID:-}"
R2_SECRET_ACCESS_KEY="${CLOUDFLARE_R2_SECRET_ACCESS_KEY:-}"
R2_ROOT="${OSS_SUPABASE_BACKUP_R2_ROOT:-paradigmjpcom/oss-supabase}"
R2_UPLOAD_HELPER="${OSS_SUPABASE_BACKUP_R2_UPLOAD_HELPER:-/usr/local/lib/paradigmjpcom/r2-put.py}"
PGHOST_VALUE="${OSS_SUPABASE_PGHOST:-127.0.0.1}"
PGPORT_VALUE="${OSS_SUPABASE_PGPORT:-5433}"
PGUSER_VALUE="${OSS_SUPABASE_PGUSER:-postgres}"
PGDATABASE_VALUE="${OSS_SUPABASE_PGDATABASE:-postgres}"

[[ "$RETENTION_DAYS" =~ ^[1-9][0-9]*$ ]] ||
  die "OSS_SUPABASE_BACKUP_RETENTION_DAYS must be a positive integer"

if [[ "$ENCRYPTION_REQUIRED" =~ ^(1|true|yes)$ ]] && [[ -z "$GPG_PASSPHRASE" ]]; then
  die "OSS_SUPABASE_BACKUP_GPG_PASSPHRASE is required when encryption is enabled"
fi
if [[ -n "$GPG_PASSPHRASE" ]] && ! command -v gpg >/dev/null 2>&1; then
  die "gpg is required for encrypted backups"
fi
R2_CONFIGURED=false
if [[ -n "$R2_BUCKET$R2_ACCOUNT_ID$R2_ACCESS_KEY_ID$R2_SECRET_ACCESS_KEY" ]]; then
  [[ -n "$R2_BUCKET" && -n "$R2_ACCOUNT_ID" && -n "$R2_ACCESS_KEY_ID" && -n "$R2_SECRET_ACCESS_KEY" ]] ||
    die "all Cloudflare R2 backup credentials are required when any R2 value is set"
  [[ -x "$R2_UPLOAD_HELPER" ]] || die "R2 upload helper is missing or not executable: $R2_UPLOAD_HELPER"
  R2_CONFIGURED=true
fi
if [[ -z "$OFFSITE_TARGET" && "$R2_CONFIGURED" != true ]]; then
  die "an encrypted backup requires either OSS_SUPABASE_BACKUP_SSH_TARGET or complete Cloudflare R2 credentials"
fi
if [[ "${1:-}" == "--validate-config" ]]; then
  printf 'Backup configuration: OK\n'
  exit 0
fi

DATE="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_ROOT"
chmod 700 "$BACKUP_ROOT"
WORK_DIR="$(mktemp -d "$BACKUP_ROOT/.${DATE}.tmp.XXXXXX")"
ARCHIVE_TMP="$BACKUP_ROOT/.${DATE}.tar.gz.tmp"
CHECKSUM_TMP="$BACKUP_ROOT/.${DATE}.tar.gz.sha256.tmp"
ARCHIVE_PATH="$BACKUP_ROOT/${DATE}.tar.gz"

cleanup() {
  rm -rf "$WORK_DIR" "$ARCHIVE_TMP" "$CHECKSUM_TMP" "${ARCHIVE_TMP}.gpg" \
    "$BACKUP_ROOT/.${DATE}.tar.gz.gpg.sha256.tmp"
}
trap cleanup EXIT

pg_dump \
  -h "$PGHOST_VALUE" \
  -p "$PGPORT_VALUE" \
  -U "$PGUSER_VALUE" \
  -d "$PGDATABASE_VALUE" \
  --no-owner \
  --no-acl \
  -Fc \
  -f "$WORK_DIR/oss-postgres.dump"

pg_dump \
  -h "$PGHOST_VALUE" \
  -p "$PGPORT_VALUE" \
  -U "$PGUSER_VALUE" \
  -d "$PGDATABASE_VALUE" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists | gzip -9 > "$WORK_DIR/oss-postgres.sql.gz"

pg_dumpall \
  -h "$PGHOST_VALUE" \
  -p "$PGPORT_VALUE" \
  -U "$PGUSER_VALUE" \
  --globals-only \
  --no-role-passwords | gzip -9 > "$WORK_DIR/oss-globals.sql.gz"

psql \
  -h "$PGHOST_VALUE" \
  -p "$PGPORT_VALUE" \
  -U "$PGUSER_VALUE" \
  -d "$PGDATABASE_VALUE" \
  -Atc "select 'sales_companies', count(*) from public.sales_companies union all select 'leads', count(*) from public.leads union all select 'sales_pipeline_runs', count(*) from public.sales_pipeline_runs;" \
  > "$WORK_DIR/key-table-counts.txt"

find "$WORK_DIR" -type f -print0 | sort -z | xargs -0 sha256sum \
  > "$WORK_DIR/SHA256SUMS"
tar -C "$BACKUP_ROOT" -czf "$ARCHIVE_TMP" "$(basename "$WORK_DIR")"

if [[ -n "$GPG_PASSPHRASE" ]]; then
  gpg --batch --yes --pinentry-mode loopback --passphrase "$GPG_PASSPHRASE" \
    --symmetric --cipher-algo AES256 --output "${ARCHIVE_TMP}.gpg" "$ARCHIVE_TMP"
  rm -f "$ARCHIVE_TMP"
  ARCHIVE_PATH="${ARCHIVE_PATH}.gpg"
  CHECKSUM_TMP="$BACKUP_ROOT/.${DATE}.tar.gz.gpg.sha256.tmp"
  sha256sum "${ARCHIVE_TMP}.gpg" > "$CHECKSUM_TMP"
else
  sha256sum "$ARCHIVE_TMP" > "$CHECKSUM_TMP"
fi

if [[ -n "$GPG_PASSPHRASE" ]]; then
  mv "${ARCHIVE_TMP}.gpg" "$ARCHIVE_PATH"
  sed "s#$(basename "${ARCHIVE_TMP}.gpg")#$(basename "$ARCHIVE_PATH")#" "$CHECKSUM_TMP" \
    > "${ARCHIVE_PATH}.sha256"
else
  mv "$ARCHIVE_TMP" "$ARCHIVE_PATH"
  sed "s#$(basename "$ARCHIVE_TMP")#$(basename "$ARCHIVE_PATH")#" "$CHECKSUM_TMP" \
    > "${ARCHIVE_PATH}.sha256"
fi
rm -f "$CHECKSUM_TMP"

if [[ -n "$OFFSITE_TARGET" ]]; then
  scp -q "$ARCHIVE_PATH" "${ARCHIVE_PATH}.sha256" "${OFFSITE_TARGET}:${OFFSITE_ROOT}/" \
    || die "offsite backup upload failed"
elif [[ "$R2_CONFIGURED" == true ]]; then
  R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
  R2_KEY_PREFIX="${R2_ROOT%/}/${DATE}"
  python3 "$R2_UPLOAD_HELPER" \
    --endpoint "$R2_ENDPOINT" \
    --access-key "$R2_ACCESS_KEY_ID" \
    --secret-key "$R2_SECRET_ACCESS_KEY" \
    --bucket "$R2_BUCKET" \
    --key "${R2_KEY_PREFIX}/$(basename "$ARCHIVE_PATH")" \
    --file "$ARCHIVE_PATH" \
    --content-type "application/octet-stream"
  python3 "$R2_UPLOAD_HELPER" \
    --endpoint "$R2_ENDPOINT" \
    --access-key "$R2_ACCESS_KEY_ID" \
    --secret-key "$R2_SECRET_ACCESS_KEY" \
    --bucket "$R2_BUCKET" \
    --key "${R2_KEY_PREFIX}/$(basename "$ARCHIVE_PATH").sha256" \
    --file "${ARCHIVE_PATH}.sha256" \
    --content-type "text/plain"
fi

find "$BACKUP_ROOT" -maxdepth 1 -name '*.tar.gz' -type f \
  -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_ROOT" -maxdepth 1 -name '*.tar.gz.sha256' -type f \
  -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_ROOT" -maxdepth 1 -name '*.tar.gz.gpg' -type f \
  -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_ROOT" -maxdepth 1 -name '*.tar.gz.gpg.sha256' -type f \
  -mtime "+$RETENTION_DAYS" -delete

printf 'OSS Supabase backup completed: %s\n' "$DATE"
