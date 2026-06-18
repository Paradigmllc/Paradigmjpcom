#!/usr/bin/env node
/**
 * Install the host-side Twenty <-> RevenueOS near-real-time sync timer.
 *
 * The timer reads TRIGGER_WEBHOOK_SECRET from the running RevenueOS container,
 * then calls the production pull and writeback endpoints once per minute.
 */

import { spawnSync } from "node:child_process"

const host = process.env.PARADIGM_DEPLOY_HOST || "paradigm-droplet"
const appUuid = process.env.PARADIGM_APP_UUID || "n8i2sjiqvr2d8hrzppop2m2i"
const baseUrl = process.env.REVENUEOS_PUBLIC_URL || "https://paradigmjp.com"

const remote = String.raw`
set -euo pipefail

cat >/usr/local/sbin/revenueos-twenty-sync.sh <<'SH'
#!/usr/bin/env bash
set -euo pipefail

APP_UUID="\${REVENUEOS_APP_UUID:-__APP_UUID__}"
BASE_URL="\${REVENUEOS_PUBLIC_URL:-__BASE_URL__}"
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

curl -fsS -X POST "\${BASE_URL}/api/sales/twenty/pull" \
  -H "content-type: application/json" \
  -H "x-webhook-secret: \${SECRET}" \
  --data '{"limit":100,"auto_run_pipeline":true,"dispatch_pipeline":true}' >/tmp/revenueos-twenty-pull.json

curl -fsS -X POST "\${BASE_URL}/api/sales/twenty-sync" \
  -H "content-type: application/json" \
  -H "x-webhook-secret: \${SECRET}" \
  --data '{"limit":10}' >/tmp/revenueos-twenty-writeback.json

echo "[revenueos-twenty-sync] pull=$(cat /tmp/revenueos-twenty-pull.json) writeback=$(cat /tmp/revenueos-twenty-writeback.json)"
SH

sed -i "s#__APP_UUID__#${appUuid}#g; s#__BASE_URL__#${baseUrl}#g" /usr/local/sbin/revenueos-twenty-sync.sh
chmod 0755 /usr/local/sbin/revenueos-twenty-sync.sh

cat >/etc/systemd/system/revenueos-twenty-sync.service <<'SERVICE'
[Unit]
Description=RevenueOS Twenty bidirectional sync tick
Wants=network-online.target
After=network-online.target docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/revenueos-twenty-sync.sh
TimeoutStartSec=120
SERVICE

cat >/etc/systemd/system/revenueos-twenty-sync.timer <<'TIMER'
[Unit]
Description=Run RevenueOS Twenty bidirectional sync every minute

[Timer]
OnBootSec=45s
OnUnitActiveSec=60s
AccuracySec=10s
Persistent=true

[Install]
WantedBy=timers.target
TIMER

systemctl daemon-reload
systemctl enable --now revenueos-twenty-sync.timer
systemctl start revenueos-twenty-sync.service
systemctl --no-pager --full status revenueos-twenty-sync.timer
`

const result = spawnSync("ssh", [host, "bash -s"], {
  input: remote.replace(/\r/g, ""),
  encoding: "utf8",
  stdio: "inherit",
})

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
