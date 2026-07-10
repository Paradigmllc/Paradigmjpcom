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

if [[ "${1:-}" == "--validate-config" ]]; then
  printf 'Backup configuration: OK\n'
  exit 0
fi

BACKUP_ROOT="${OSS_SUPABASE_BACKUP_ROOT:-/opt/backups/oss-supabase-nightly}"
RETENTION_DAYS="${OSS_SUPABASE_BACKUP_RETENTION_DAYS:-14}"
PGHOST_VALUE="${OSS_SUPABASE_PGHOST:-127.0.0.1}"
PGPORT_VALUE="${OSS_SUPABASE_PGPORT:-5433}"
PGUSER_VALUE="${OSS_SUPABASE_PGUSER:-postgres}"
PGDATABASE_VALUE="${OSS_SUPABASE_PGDATABASE:-postgres}"

[[ "$RETENTION_DAYS" =~ ^[1-9][0-9]*$ ]] ||
  die "OSS_SUPABASE_BACKUP_RETENTION_DAYS must be a positive integer"

DATE="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_ROOT"
chmod 700 "$BACKUP_ROOT"
WORK_DIR="$(mktemp -d "$BACKUP_ROOT/.${DATE}.tmp.XXXXXX")"
ARCHIVE_TMP="$BACKUP_ROOT/.${DATE}.tar.gz.tmp"
CHECKSUM_TMP="$BACKUP_ROOT/.${DATE}.tar.gz.sha256.tmp"

cleanup() {
  rm -rf "$WORK_DIR" "$ARCHIVE_TMP" "$CHECKSUM_TMP"
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
sha256sum "$ARCHIVE_TMP" > "$CHECKSUM_TMP"

mv "$ARCHIVE_TMP" "$BACKUP_ROOT/${DATE}.tar.gz"
sed "s#$(basename "$ARCHIVE_TMP")#${DATE}.tar.gz#" "$CHECKSUM_TMP" \
  > "$BACKUP_ROOT/${DATE}.tar.gz.sha256"
rm -f "$CHECKSUM_TMP"

find "$BACKUP_ROOT" -maxdepth 1 -name '*.tar.gz' -type f \
  -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_ROOT" -maxdepth 1 -name '*.tar.gz.sha256' -type f \
  -mtime "+$RETENTION_DAYS" -delete

printf 'OSS Supabase backup completed: %s\n' "$DATE"
