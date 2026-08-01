#!/usr/bin/env node

/**
 * Remove the out-of-band resident runtime guard and its always-on containers.
 * This is intentionally an explicit operator action, not a cron/systemd job.
 */
import { spawnSync } from "node:child_process"

const host = process.env.PARADIGM_DEPLOY_HOST || "paradigm-droplet"
const result = spawnSync(
  "ssh",
  ["-o", "BatchMode=yes", "-o", `ConnectTimeout=${process.env.PARADIGM_SSH_CONNECT_TIMEOUT || "20"}`, host, String.raw`
set -euo pipefail
systemctl disable --now paradigm-runtime-guard.timer paradigm-runtime-guard.service 2>/dev/null || true
rm -f /etc/systemd/system/paradigm-runtime-guard.timer /etc/systemd/system/paradigm-runtime-guard.service /usr/local/bin/paradigm-runtime-guard.sh
systemctl daemon-reload
for container in paradigm-outreach-worker services-steel-browser-1; do
  if docker ps -a --format '{{.Names}}' | grep -qx "$container"; then
    docker update --restart=no "$container" >/dev/null
    docker stop "$container" >/dev/null || true
  fi
done
echo "resident runtime disabled"
systemctl list-timers --all --no-legend 2>/dev/null | grep -E 'paradigm-runtime-guard|paradigm-outreach' || true
docker ps --format '{{.Names}}' | grep -E '^(paradigm-outreach-worker|services-steel-browser-1)$' || true
`],
  { encoding: "utf8" },
)

if (result.stdout) process.stdout.write(result.stdout)
if (result.stderr) process.stderr.write(result.stderr)
if (result.status !== 0) process.exit(result.status ?? 1)

