#!/usr/bin/env node
/**
 * Install a small host-side Coolify hygiene guard.
 *
 * The installed cron script:
 * - prunes Docker build cache/images only when root disk is above a threshold
 * - records host load, memory pressure, and Coolify/Traefik reachability
 * - removes Coolify helper containers only after their deployment is no longer active
 * - removes very stale helper containers even if Coolify DB is unavailable
 * - never prunes Docker volumes
 * - writes a compact log to /var/log/paradigm-coolify-host-guard.log
 */

import { spawnSync } from "node:child_process"

const host = process.env.PARADIGM_DEPLOY_HOST || "paradigm-droplet"
const timeoutSec = Number.parseInt(process.env.PARADIGM_SSH_CONNECT_TIMEOUT || "20", 10)
const scriptPath = "/usr/local/sbin/paradigm-coolify-host-guard.sh"
const cronPath = "/etc/cron.d/paradigm-coolify-host-guard"

const guardScript = String.raw`#!/usr/bin/env bash
set -uo pipefail

LOG_FILE="/var/log/paradigm-coolify-host-guard.log"
PRUNE_AT="__DOLLAR__{PARADIGM_DISK_PRUNE_AT:-70}"
CRITICAL_DISK="__DOLLAR__{PARADIGM_CRITICAL_DISK:-85}"
STALE_HELPER_MINUTES="__DOLLAR__{PARADIGM_STALE_HELPER_MINUTES:-45}"
HIGH_LOAD_PER_CORE="__DOLLAR__{PARADIGM_HIGH_LOAD_PER_CORE:-3}"
MAX_LOG_BYTES="__DOLLAR__{PARADIGM_GUARD_MAX_LOG_BYTES:-5242880}"

mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"
exec >>"$LOG_FILE" 2>&1

if [ "$(wc -c < "$LOG_FILE" 2>/dev/null || echo 0)" -gt "$MAX_LOG_BYTES" ]; then
  tail -n 500 "$LOG_FILE" > "__DOLLAR__{LOG_FILE}.tmp" && mv "__DOLLAR__{LOG_FILE}.tmp" "$LOG_FILE"
fi

echo "[$(date -Is)] guard start"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker unavailable; skip"
  exit 0
fi

disk_used="$(df -P / | awk 'NR==2 {gsub(/%/,"",$5); print $5}')"
cpu_count="$(getconf _NPROCESSORS_ONLN 2>/dev/null || nproc 2>/dev/null || echo 1)"
load_1="$(awk '{print $1}' /proc/loadavg 2>/dev/null || echo 0)"
mem_available="$(awk '/MemAvailable:/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 0)"
high_load_threshold="$(awk "BEGIN { printf \"%.2f\", __DOLLAR__{cpu_count:-1} * __DOLLAR__{HIGH_LOAD_PER_CORE:-3} }")"
echo "root disk used=__DOLLAR__{disk_used}%"
echo "load1=__DOLLAR__{load_1} cpu_count=__DOLLAR__{cpu_count} high_load_threshold=__DOLLAR__{high_load_threshold} mem_available_mb=__DOLLAR__{mem_available}"

if command -v curl >/dev/null 2>&1; then
  coolify_http="$(curl -sS -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:8000/api/v1/version || true)"
  traefik_http="$(curl -k -sS -m 5 -H 'Host: paradigmjp.com' -o /dev/null -w '%{http_code}' https://127.0.0.1/api/ready || true)"
  echo "local coolify_http=__DOLLAR__{coolify_http:-000} traefik_ready_http=__DOLLAR__{traefik_http:-000}"
fi

if [ -n "$disk_used" ] && [ "$disk_used" -ge "$PRUNE_AT" ]; then
  echo "disk >= __DOLLAR__{PRUNE_AT}%; cleaning Docker containers and old images"
  docker container prune -f || true
  docker image prune -af --filter "until=48h" || true
fi

if [ -n "$disk_used" ] && [ "$disk_used" -ge "$CRITICAL_DISK" ]; then
  echo "disk >= __DOLLAR__{CRITICAL_DISK}% CRITICAL; pruning build cache too (7d retention)"
  docker builder prune -af --filter "until=168h" || true
else
  echo "disk < __DOLLAR__{CRITICAL_DISK}%; build cache preserved for fast deploys"
fi

if docker ps --format '{{.Names}}' | grep -qx 'coolify-db'; then
  inactive_deployments="$(
    docker exec -i coolify-db psql -U coolify -d coolify -t -A 2>/dev/null <<'SQL' || true
select deployment_uuid
from application_deployment_queues
where status not in ('queued', 'in_progress')
  and updated_at < ((now() at time zone 'utc') - interval '20 minutes');
SQL
  )"

  docker ps --filter ancestor=ghcr.io/coollabsio/coolify-helper:1.0.13 --format '{{.Names}}' | while read -r helper; do
    [ -n "$helper" ] || continue
    if printf '%s\n' "$inactive_deployments" | grep -qx "$helper"; then
      echo "removing inactive Coolify helper $helper"
      docker rm -f "$helper" || true
    else
      echo "keeping active/unknown Coolify helper $helper"
    fi
  done
else
  echo "coolify-db unavailable; helper cleanup skipped"
fi

docker ps --filter ancestor=ghcr.io/coollabsio/coolify-helper:1.0.13 --format '{{.Names}}\t{{.RunningFor}}' | while IFS="$(printf '\t')" read -r helper running_for; do
  [ -n "$helper" ] || continue
  case "$running_for" in
    *"hour"*|*"hours"*|*"day"*|*"days"*)
      echo "removing stale Coolify helper $helper running_for=$running_for"
      docker rm -f "$helper" || true
      ;;
    *)
      echo "helper age ok $helper running_for=$running_for"
      ;;
  esac
done

if awk "BEGIN { exit !(__DOLLAR__{load_1:-0} > __DOLLAR__{high_load_threshold:-999}) }"; then
  echo "high load detected; top containers by CPU:"
  docker stats --no-stream --format '{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}' 2>/dev/null | head -20 || true
fi

echo "[$(date -Is)] guard done"
`.replaceAll("__DOLLAR__", "$")

const cronFile = `SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
PARADIGM_DISK_PRUNE_AT=70
*/5 * * * * root ${scriptPath}
`

function ssh(command, input = null) {
  const result = spawnSync(
    "ssh",
    ["-o", "BatchMode=yes", "-o", `ConnectTimeout=${timeoutSec}`, host, command],
    { encoding: "utf8", input },
  )
  if (result.status !== 0) {
    const message = [result.stderr, result.stdout].filter(Boolean).join("\n").trim()
    throw new Error(message || `ssh ${host} failed`)
  }
  return result.stdout.trim()
}

function installRemoteFile(path, mode, content) {
  const command = `tmp="$(mktemp)" && cat > "$tmp" && install -m ${mode} "$tmp" ${path} && rm -f "$tmp"`
  ssh(command, content)
}

function main() {
  installRemoteFile(scriptPath, "0755", guardScript)
  installRemoteFile(cronPath, "0644", cronFile)
  const output = ssh(`${scriptPath}; echo '--- cron'; cat ${cronPath}; echo '--- tail'; tail -n 20 /var/log/paradigm-coolify-host-guard.log`)
  console.log(output)
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
