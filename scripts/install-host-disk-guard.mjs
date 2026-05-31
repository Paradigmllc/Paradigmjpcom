#!/usr/bin/env node
/**
 * Installs a lightweight systemd disk guard on the Coolify host.
 *
 * The guard runs every 15 minutes and prunes Docker build cache / unused images
 * only when root disk usage is high. It intentionally never prunes volumes.
 */

import { spawnSync } from "node:child_process"

const host = process.env.PARADIGM_DEPLOY_HOST || "paradigm-droplet"
const timeoutSec = Number.parseInt(process.env.PARADIGM_SSH_CONNECT_TIMEOUT || "20", 10)

const guardScript = String.raw`#!/usr/bin/env bash
set -euo pipefail
LOG=/var/log/appexx/host-disk-guard.log
LOCK=/run/appexx-host-disk-guard.lock
mkdir -p "$(dirname "$LOG")"
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "$(date -Is) already running" >> "$LOG"
  exit 0
fi
{
  used_percent="$(df -P / | awk 'NR==2 {gsub(/%/,"",$5); print $5}')"
  echo "===== $(date -Is) disk guard start used=${"${"}used_percent:-unknown}% ====="
  if [ "${"${"}used_percent:-0}" -ge 92 ]; then
    echo "critical disk pressure; aggressive cache/image prune"
    docker builder prune -af || true
    docker image prune -af || true
  elif [ "${"${"}used_percent:-0}" -ge 80 ]; then
    echo "high disk pressure; old cache/image prune"
    docker builder prune -af --filter 'until=24h' || true
    docker image prune -af --filter 'until=168h' || true
  else
    echo "disk pressure ok; no prune"
  fi
  df -h / || true
  docker system df || true
  echo "===== $(date -Is) disk guard end ====="
} >> "$LOG" 2>&1
`

const service = `[Unit]
Description=Appexx host disk pressure guard
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/appexx-host-disk-guard.sh
Nice=10
IOSchedulingClass=best-effort
IOSchedulingPriority=7
`

const timer = `[Unit]
Description=Run Appexx host disk pressure guard every 15 minutes

[Timer]
OnBootSec=5min
OnUnitActiveSec=15min
AccuracySec=1min
Persistent=true

[Install]
WantedBy=timers.target
`

function ssh(command) {
  const result = spawnSync(
    "ssh",
    ["-o", "BatchMode=yes", "-o", `ConnectTimeout=${timeoutSec}`, host, command],
    { encoding: "utf8" },
  )
  if (result.status !== 0) {
    const message = [result.stderr, result.stdout].filter(Boolean).join("\n").trim()
    throw new Error(message || `ssh ${host} failed`)
  }
  return result.stdout.trim()
}

try {
  ssh(`cat > /usr/local/sbin/appexx-host-disk-guard.sh <<'EOF'
${guardScript}
EOF
chmod 0755 /usr/local/sbin/appexx-host-disk-guard.sh
cat > /etc/systemd/system/appexx-host-disk-guard.service <<'EOF'
${service}
EOF
cat > /etc/systemd/system/appexx-host-disk-guard.timer <<'EOF'
${timer}
EOF
systemctl daemon-reload
systemctl enable --now appexx-host-disk-guard.timer
systemctl restart appexx-host-disk-guard.service
systemctl is-active appexx-host-disk-guard.timer
`)
  const status = ssh("systemctl list-timers --all | grep appexx-host-disk-guard || true; tail -40 /var/log/appexx/host-disk-guard.log || true")
  console.log(`Installed host disk guard on ${host}`)
  console.log(status)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
