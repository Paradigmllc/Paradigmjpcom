#!/usr/bin/env sh
set -eu

VIDEO_FACTORY_ROOT="${VIDEO_FACTORY_ROOT:-/opt/video-factory}"
VIDEO_FACTORY_WORKSPACE="${VIDEO_FACTORY_WORKSPACE:-/data/video-factory}"
VIDEO_FACTORY_PORT="${VIDEO_FACTORY_PORT:-8080}"
PERSISTENT_CONFIG_ROOT="${VIDEO_FACTORY_WORKSPACE}/config"
PERSISTENT_WORKFLOW_ROOT="${VIDEO_FACTORY_WORKSPACE}/workflows/comfyui"
LEGACY_TRAEFIK_ROUTE="${PARADIGM_TRAEFIK_ROUTE_PATH:-/mnt/coolify-proxy-dynamic/paradigmjp.yml}"

mkdir -p \
  "${VIDEO_FACTORY_WORKSPACE}" \
  "${PERSISTENT_CONFIG_ROOT}" \
  "${PERSISTENT_WORKFLOW_ROOT}/api" \
  "${PERSISTENT_WORKFLOW_ROOT}/ui"

if [ ! -f "${PERSISTENT_CONFIG_ROOT}/model-registry.yaml" ]; then
  cp "${VIDEO_FACTORY_ROOT}/config/model-registry.yaml" \
    "${PERSISTENT_CONFIG_ROOT}/model-registry.yaml"
fi
"${VIDEO_FACTORY_ROOT}/.venv/bin/python" -m video_factory.workspace_bootstrap \
  --workflow-defaults "${VIDEO_FACTORY_ROOT}/workflows/comfyui/registry.yaml" \
  --workflow-target "${PERSISTENT_WORKFLOW_ROOT}/registry.yaml"
for readme in api/README.md ui/README.md README.md workflow-template.example.json; do
  if [ -f "${VIDEO_FACTORY_ROOT}/workflows/comfyui/${readme}" ] \
    && [ ! -f "${PERSISTENT_WORKFLOW_ROOT}/${readme}" ]; then
    mkdir -p "$(dirname "${PERSISTENT_WORKFLOW_ROOT}/${readme}")"
    cp "${VIDEO_FACTORY_ROOT}/workflows/comfyui/${readme}" \
      "${PERSISTENT_WORKFLOW_ROOT}/${readme}"
  fi
done
chown -R nextjs:nodejs "${VIDEO_FACTORY_WORKSPACE}"

export VIDEO_FACTORY_ENVIRONMENT="${VIDEO_FACTORY_ENVIRONMENT:-production}"
export VIDEO_FACTORY_WORKSPACE
export VIDEO_FACTORY_QUEUE_BACKEND="${VIDEO_FACTORY_QUEUE_BACKEND:-local}"
export VIDEO_FACTORY_LOCAL_QUEUE_WORKERS="${VIDEO_FACTORY_LOCAL_QUEUE_WORKERS:-1}"
export VIDEO_FACTORY_MASTER_COMPOSITOR="${VIDEO_FACTORY_MASTER_COMPOSITOR:-hyperframes}"
export VIDEO_FACTORY_ALLOW_FFMPEG_COMPOSITOR_FALLBACK="${VIDEO_FACTORY_ALLOW_FFMPEG_COMPOSITOR_FALLBACK:-false}"
export VIDEO_FACTORY_MODEL_REGISTRY="${VIDEO_FACTORY_MODEL_REGISTRY:-${PERSISTENT_CONFIG_ROOT}/model-registry.yaml}"
export COMFYUI_WORKFLOW_ROOT="${COMFYUI_WORKFLOW_ROOT:-${PERSISTENT_WORKFLOW_ROOT}}"
export COMFYUI_WORKFLOW_REGISTRY="${COMFYUI_WORKFLOW_REGISTRY:-${PERSISTENT_WORKFLOW_ROOT}/registry.yaml}"
export PLAYWRIGHT_CAPTURE_SCRIPT="${PLAYWRIGHT_CAPTURE_SCRIPT:-${VIDEO_FACTORY_ROOT}/tools/playwright-capture/capture.mjs}"
export PLAYWRIGHT_CHROMIUM_EXECUTABLE="${PLAYWRIGHT_CHROMIUM_EXECUTABLE:-/usr/bin/chromium-browser}"
export HYPERFRAMES_VERSION="${HYPERFRAMES_VERSION:-0.7.87}"
export HYPERFRAMES_NPX="${HYPERFRAMES_NPX:-npx}"
export HYPERFRAMES_BROWSER_PATH="${HYPERFRAMES_BROWSER_PATH:-/usr/bin/chromium}"
export PRODUCER_BROWSER_GPU_MODE="${PRODUCER_BROWSER_GPU_MODE:-software}"
export PRODUCER_PUPPETEER_PROTOCOL_TIMEOUT_MS="${PRODUCER_PUPPETEER_PROTOCOL_TIMEOUT_MS:-900000}"
export VIDEO_FACTORY_API_KEY="${VIDEO_FACTORY_INTERNAL_API_KEY:-${ADMIN_SCRIPT_SECRET:-${ADMIN_PASSWORD:-}}}"
export HOME="/home/nextjs"

start_video_factory() {
  echo "[runtime] starting Video Factory on 127.0.0.1:${VIDEO_FACTORY_PORT}"
  cd "${VIDEO_FACTORY_ROOT}"
  su-exec nextjs:nodejs "${VIDEO_FACTORY_ROOT}/.venv/bin/uvicorn" \
    video_factory.web:app \
    --host 127.0.0.1 \
    --port "${VIDEO_FACTORY_PORT}" \
    --no-access-log &
  VIDEO_FACTORY_PID=$!
}

repair_legacy_traefik_route_once() {
  [ -f "${LEGACY_TRAEFIK_ROUTE}" ] || return 1
  ROUTE_STATUS_PATH="${PERSISTENT_CONFIG_ROOT}/traefik-route.json" \
  PARADIGM_TRAEFIK_ROUTE_PATH="${LEGACY_TRAEFIK_ROUTE}" \
  python3 - <<'PY'
import ipaddress
import json
import os
import re
import socket
import stat
import tempfile
from datetime import datetime, timezone
from pathlib import Path

route = Path(os.environ["PARADIGM_TRAEFIK_ROUTE_PATH"])
status_path = Path(os.environ["ROUTE_STATUS_PATH"])
proxy_host = os.environ.get("PARADIGM_PROXY_CONTAINER", "coolify-proxy")

proxy_addresses = []
for family, socktype, proto, _canonname, sockaddr in socket.getaddrinfo(
    proxy_host,
    80,
    family=socket.AF_INET,
    type=socket.SOCK_DGRAM,
):
    address = sockaddr[0]
    if address not in proxy_addresses:
        proxy_addresses.append(address)
if not proxy_addresses:
    raise SystemExit(f"Docker DNS did not resolve {proxy_host}")

local_ip = None
proxy_ip = None
for candidate in proxy_addresses:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect((candidate, 80))
        source = sock.getsockname()[0]
        parsed = ipaddress.ip_address(source)
        if not parsed.is_loopback and not parsed.is_unspecified:
            local_ip = source
            proxy_ip = candidate
            break
    finally:
        sock.close()
if local_ip is None:
    raise SystemExit("Could not determine the container IP used for the coolify proxy network")

text = route.read_text(encoding="utf-8")
marker = text.find("paradigmhp-svc:")
if marker < 0:
    raise SystemExit("paradigmhp-svc marker was not found in the Traefik file")
prefix, tail = text[:marker], text[marker:]
match = re.search(r"(?m)^(\s*-\s*url:\s*)https?://[^\s]+:3000\s*$", tail)
if not match:
    raise SystemExit("paradigmhp-svc upstream URL was not found")
old_url = match.group(0).split("url:", 1)[1].strip()
new_url = f"http://{local_ip}:3000"
changed = old_url != new_url

if changed:
    updated = prefix + tail[: match.start()] + f"{match.group(1)}{new_url}" + tail[match.end() :]
    current = route.stat()
    descriptor, temporary = tempfile.mkstemp(prefix=f".{route.name}.", dir=route.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(updated)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, stat.S_IMODE(current.st_mode))
        try:
            os.chown(temporary, current.st_uid, current.st_gid)
        except PermissionError:
            pass
        os.replace(temporary, route)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)

status_path.parent.mkdir(parents=True, exist_ok=True)
status = {
    "checked_at": datetime.now(timezone.utc).isoformat(),
    "route_file": str(route),
    "proxy_host": proxy_host,
    "proxy_ip": proxy_ip,
    "container_coolify_ip": local_ip,
    "old_url": old_url,
    "new_url": new_url,
    "changed": changed,
}
status_path.write_text(json.dumps(status, indent=2) + "\n", encoding="utf-8")
os.chmod(status_path, 0o600)
print(json.dumps({"container_coolify_ip": local_ip, "changed": changed}))
PY
}

repair_legacy_traefik_route_loop() {
  # Wait for the new container to serve locally before moving the legacy
  # file-provider route to it. This avoids pointing public traffic at a process
  # that has not completed startup yet.
  attempt=0
  while kill -0 "${NEXT_PID}" 2>/dev/null; do
    attempt=$((attempt + 1))
    if curl -fsS --max-time 5 "http://127.0.0.1:${PORT:-3000}/api/ready" >/dev/null 2>&1; then
      if repair_legacy_traefik_route_once; then
        echo "[runtime] legacy Traefik route is synchronized"
        # Keep checking because a proxy configuration restore or container
        # restart can reintroduce an old timestamped IP.
        sleep 30
        continue
      fi
    fi
    if [ $((attempt % 12)) -eq 0 ]; then
      echo "[runtime] waiting to synchronize legacy Traefik route: ${LEGACY_TRAEFIK_ROUTE}" >&2
    fi
    sleep 5
  done
}

stop_all() {
  trap - EXIT INT TERM
  [ -z "${ROUTE_REPAIR_PID:-}" ] || kill -TERM "${ROUTE_REPAIR_PID}" 2>/dev/null || true
  [ -z "${NEXT_PID:-}" ] || kill -TERM "${NEXT_PID}" 2>/dev/null || true
  [ -z "${VIDEO_FACTORY_PID:-}" ] || kill -TERM "${VIDEO_FACTORY_PID}" 2>/dev/null || true
  [ -z "${ROUTE_REPAIR_PID:-}" ] || wait "${ROUTE_REPAIR_PID}" 2>/dev/null || true
  [ -z "${NEXT_PID:-}" ] || wait "${NEXT_PID}" 2>/dev/null || true
  [ -z "${VIDEO_FACTORY_PID:-}" ] || wait "${VIDEO_FACTORY_PID}" 2>/dev/null || true
}
trap stop_all EXIT INT TERM

echo "[runtime] applying and verifying Greater Tokyo investor scenarios"
node /app/scripts/apply-investor-scenario-runtime-migration.mjs

start_video_factory
cd /app
echo "[runtime] starting Paradigm Next.js on 0.0.0.0:${PORT:-3000}"
su-exec nextjs:nodejs node server.js &
NEXT_PID=$!
repair_legacy_traefik_route_loop &
ROUTE_REPAIR_PID=$!

while kill -0 "${NEXT_PID}" 2>/dev/null; do
  if ! kill -0 "${VIDEO_FACTORY_PID}" 2>/dev/null; then
    echo "[runtime] Video Factory exited; restarting" >&2
    start_video_factory
  fi
  sleep 5
done

wait "${NEXT_PID}"
