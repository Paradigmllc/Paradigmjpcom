#!/usr/bin/env node
/**
 * Install the host-side Twenty <-> RevenueOS one-shot sync service.
 *
 * Permanent infra rule: do not install cron/systemd timer loops. Webhooks,
 * queue events, or explicit admin/deploy actions should invoke this service.
 * It reads TRIGGER_WEBHOOK_SECRET from the running RevenueOS container, then
 * calls the production pull and writeback endpoints once.
 */

import { spawnSync } from "node:child_process"

const host = process.env.PARADIGM_DEPLOY_HOST || "paradigm-droplet"
const appUuid = process.env.PARADIGM_APP_UUID || "n8i2sjiqvr2d8hrzppop2m2i"
const baseUrl = process.env.REVENUEOS_PUBLIC_URL || "https://paradigmjp.com"

const syncScript = `#!/usr/bin/env bash
set -euo pipefail

APP_UUID="\${REVENUEOS_APP_UUID:-${appUuid}}"
BASE_URL="\${REVENUEOS_PUBLIC_URL:-${baseUrl}}"
APP_CONTAINER="\${REVENUEOS_APP_CONTAINER:-$(docker ps --filter "name=\${APP_UUID}" --format '{{.Names}}' | head -n1)}"

if [[ -z "\${APP_CONTAINER}" ]]; then
  echo "[revenueos-twenty-sync] RevenueOS app container not found for \${APP_UUID}" >&2
  exit 1
fi

exec 9>/run/revenueos-twenty-sync.lock
if ! flock -n 9; then
  echo "[revenueos-twenty-sync] previous run still active; skipping"
  exit 0
fi

SECRET="$(docker exec "\${APP_CONTAINER}" sh -lc 'printf "%s" "$TRIGGER_WEBHOOK_SECRET"')"
if [[ -z "\${SECRET}" ]]; then
  echo "[revenueos-twenty-sync] TRIGGER_WEBHOOK_SECRET is missing in \${APP_CONTAINER}" >&2
  exit 1
fi

curl -fsS --max-time 90 -X POST "\${BASE_URL}/api/sales/twenty/pull" \\
  -H "content-type: application/json" \\
  -H "x-webhook-secret: \${SECRET}" \\
  --data '{"limit":100,"auto_run_pipeline":true,"dispatch_pipeline":true}' >/tmp/revenueos-twenty-pull.json

curl -fsS --max-time 90 -X POST "\${BASE_URL}/api/sales/twenty-sync" \\
  -H "content-type: application/json" \\
  -H "x-webhook-secret: \${SECRET}" \\
  --data '{"limit":3}' >/tmp/revenueos-twenty-writeback.json

echo "[revenueos-twenty-sync] pull=$(cat /tmp/revenueos-twenty-pull.json) writeback=$(cat /tmp/revenueos-twenty-writeback.json)"
`

const serviceUnit = `[Unit]
Description=RevenueOS Twenty bidirectional sync event
Wants=network-online.target
After=network-online.target docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/revenueos-twenty-sync.sh
TimeoutStartSec=210
`

function b64(value) {
  return Buffer.from(value.replace(/\r/g, ""), "utf8").toString("base64")
}

const remote = `
set -euo pipefail
printf '%s' '${b64(syncScript)}' | base64 -d >/usr/local/sbin/revenueos-twenty-sync.sh
chmod 0755 /usr/local/sbin/revenueos-twenty-sync.sh
printf '%s' '${b64(serviceUnit)}' | base64 -d >/etc/systemd/system/revenueos-twenty-sync.service
timeout 30s systemctl daemon-reload
timeout 30s systemctl disable --now revenueos-twenty-sync.timer 2>/dev/null || true
rm -f /etc/systemd/system/revenueos-twenty-sync.timer
timeout 30s systemctl daemon-reload
timeout 210s systemctl restart revenueos-twenty-sync.service || true
echo 'revenueos-twenty-sync.service installed as one-shot; timer removed'
`

const result = spawnSync("ssh", [host, "bash -s"], {
  input: remote.replace(/\r/g, ""),
  encoding: "utf8",
  stdio: ["pipe", "inherit", "inherit"],
})

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
