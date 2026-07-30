#!/usr/bin/env bash
set -Eeuo pipefail

log() { printf '[paradigm-provision] %s\n' "$*"; }
fail() { log "ERROR: $*" >&2; exit 1; }

: "${COMFY_PROXY_KEY:?COMFY_PROXY_KEY is required}"
COMFY_INTERNAL_PORT="${COMFY_INTERNAL_PORT:-18188}"
COMFY_PROXY_PORT="${COMFY_PROXY_PORT:-18189}"
BOOTSTRAP_ROOT="${VIDEO_FACTORY_BOOTSTRAP_ROOT:-/workspace/video-factory-bootstrap}"
PHASE_PATH="$BOOTSTRAP_ROOT/phase.json"
MANIFEST_PATH="$BOOTSTRAP_ROOT/manifest.json"
COMFY_ROOT=""
MODEL_ROOT=""

write_phase() {
  local phase="$1" detail="${2:-}"
  mkdir -p "$BOOTSTRAP_ROOT"
  python3 - "$PHASE_PATH" "$phase" "$detail" <<'PY'
import json, os, sys, tempfile
from datetime import datetime, timezone
from pathlib import Path
path = Path(sys.argv[1])
path.parent.mkdir(parents=True, exist_ok=True)
payload = {
    "phase": sys.argv[2],
    "detail": sys.argv[3],
    "updated_at": datetime.now(timezone.utc).isoformat(),
}
fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
try:
    with os.fdopen(fd, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, separators=(",", ":"))
        handle.write("\n")
        handle.flush()
        os.fsync(handle.fileno())
    os.chmod(temporary, 0o600)
    os.replace(temporary, path)
finally:
    if os.path.exists(temporary):
        os.unlink(temporary)
PY
}

for candidate in /workspace/ComfyUI /opt/ComfyUI /root/ComfyUI /ComfyUI; do
  if [ -f "$candidate/main.py" ]; then
    COMFY_ROOT="$candidate"
    break
  fi
done
if [ -z "$COMFY_ROOT" ]; then
  write_phase "waiting-for-comfyui-install" "Searching for the template ComfyUI installation"
  for _attempt in $(seq 1 180); do
    candidate="$(find /workspace /opt /root -maxdepth 4 -type f -name main.py -path '*/ComfyUI/main.py' 2>/dev/null | head -n1 || true)"
    if [ -n "$candidate" ]; then
      COMFY_ROOT="$(dirname "$candidate")"
      break
    fi
    sleep 2
  done
fi
[ -n "$COMFY_ROOT" ] || fail "ComfyUI installation was not found"
MODEL_ROOT="$COMFY_ROOT/models"
mkdir -p \
  "$MODEL_ROOT/diffusion_models" \
  "$MODEL_ROOT/text_encoders" \
  "$MODEL_ROOT/vae" \
  "$BOOTSTRAP_ROOT"
chmod 700 "$BOOTSTRAP_ROOT"

cat > "$BOOTSTRAP_ROOT/proxy.py" <<'PY'
#!/usr/bin/env python3
from __future__ import annotations

import http.client
import json
import os
import secrets
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

KEY = os.environ["COMFY_PROXY_KEY"]
UPSTREAM_HOST = "127.0.0.1"
UPSTREAM_PORT = int(os.environ.get("COMFY_INTERNAL_PORT", "18188"))
LISTEN_PORT = int(os.environ.get("COMFY_PROXY_PORT", "18189"))
ROOT = Path(os.environ.get("VIDEO_FACTORY_BOOTSTRAP_ROOT", "/workspace/video-factory-bootstrap"))
PHASE_PATH = ROOT / "phase.json"
MANIFEST_PATH = ROOT / "manifest.json"
REQUIRED_NODES = {
    "UNETLoader",
    "CLIPLoader",
    "VAELoader",
    "ModelSamplingSD3",
    "CLIPTextEncode",
    "Wan22ImageToVideoLatent",
    "KSampler",
    "VAEDecode",
    "CreateVideo",
    "SaveVideo",
}


def read_json(path: Path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def auth_ok(headers) -> bool:
    bearer = headers.get("Authorization", "")
    api_key = headers.get("X-API-Key", "")
    candidate = bearer.removeprefix("Bearer ").strip() if bearer.startswith("Bearer ") else api_key.strip()
    return bool(candidate) and secrets.compare_digest(candidate, KEY)


def upstream_json(path: str):
    request = urllib.request.Request(f"http://{UPSTREAM_HOST}:{UPSTREAM_PORT}{path}")
    with urllib.request.urlopen(request, timeout=15) as response:
        return json.loads(response.read())


def status_payload() -> tuple[int, dict]:
    phase = read_json(PHASE_PATH, {"phase": "initializing", "detail": "Provisioning has started"})
    manifest = read_json(MANIFEST_PATH, {"models": [], "workflows": {}})
    try:
        stats = upstream_json("/system_stats")
        object_info = upstream_json("/object_info")
        available = set(object_info) if isinstance(object_info, dict) else set()
        missing = sorted(REQUIRED_NODES - available)
        models_ready = bool(manifest.get("models"))
        workflow_ready = bool(manifest.get("workflows", {}).get("abstract-broll-t2v"))
        ready = not missing and models_ready and workflow_ready
        return 200, {
            "ready": ready,
            "phase": "ready" if ready else phase.get("phase", "waiting-for-nodes"),
            "detail": phase.get("detail"),
            "missing_nodes": missing,
            "system_stats": stats,
            **manifest,
        }
    except Exception as exc:
        return 200, {
            "ready": False,
            "phase": phase.get("phase", "waiting-for-comfyui"),
            "detail": phase.get("detail") or str(exc),
            "upstream_error": str(exc),
            **manifest,
        }


class Handler(BaseHTTPRequestHandler):
    server_version = "ParadigmComfyProxy/1.1"

    def log_message(self, fmt, *args):
        print(f"[comfy-proxy] {self.address_string()} {fmt % args}", flush=True)

    def _unauthorized(self):
        body = b'{"error":"unauthorized"}'
        self.send_response(401)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _special(self) -> bool:
        if urlsplit(self.path).path != "/__video_factory/status":
            return False
        code, payload = status_payload()
        body = json.dumps(payload, separators=(",", ":")).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)
        return True

    def _proxy(self):
        if not auth_ok(self.headers):
            self._unauthorized()
            return
        if self._special():
            return
        length = int(self.headers.get("Content-Length", "0") or 0)
        body = self.rfile.read(length) if length else None
        connection = http.client.HTTPConnection(UPSTREAM_HOST, UPSTREAM_PORT, timeout=3600)
        headers = {
            key: value
            for key, value in self.headers.items()
            if key.lower() not in {"host", "connection", "content-length", "authorization", "x-api-key"}
        }
        if body is not None:
            headers["Content-Length"] = str(len(body))
        try:
            connection.request(self.command, self.path, body=body, headers=headers)
            response = connection.getresponse()
            payload = response.read()
            self.send_response(response.status)
            for key, value in response.getheaders():
                if key.lower() in {"connection", "transfer-encoding", "content-length"}:
                    continue
                self.send_header(key, value)
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(payload)
        except Exception as exc:
            payload = json.dumps({"error": "upstream unavailable", "detail": str(exc)}).encode()
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(payload)
        finally:
            connection.close()

    do_GET = _proxy
    do_HEAD = _proxy
    do_POST = _proxy
    do_PUT = _proxy
    do_DELETE = _proxy


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", LISTEN_PORT), Handler)
    print(f"[comfy-proxy] listening on 0.0.0.0:{LISTEN_PORT}, upstream={UPSTREAM_HOST}:{UPSTREAM_PORT}", flush=True)
    server.serve_forever()
PY
chmod 700 "$BOOTSTRAP_ROOT/proxy.py"

if [ -f "$BOOTSTRAP_ROOT/proxy.pid" ]; then
  old_pid="$(cat "$BOOTSTRAP_ROOT/proxy.pid" 2>/dev/null || true)"
  if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
    kill "$old_pid" 2>/dev/null || true
    sleep 1
  fi
fi
write_phase "starting-proxy" "Starting the authenticated production proxy"
nohup env \
  COMFY_PROXY_KEY="$COMFY_PROXY_KEY" \
  COMFY_INTERNAL_PORT="$COMFY_INTERNAL_PORT" \
  COMFY_PROXY_PORT="$COMFY_PROXY_PORT" \
  VIDEO_FACTORY_BOOTSTRAP_ROOT="$BOOTSTRAP_ROOT" \
  python3 "$BOOTSTRAP_ROOT/proxy.py" \
  > "$BOOTSTRAP_ROOT/proxy.log" 2>&1 &
echo $! > "$BOOTSTRAP_ROOT/proxy.pid"
chmod 600 "$BOOTSTRAP_ROOT/proxy.pid"

for _attempt in $(seq 1 60); do
  if curl -fsS --max-time 3 \
    -H "Authorization: Bearer $COMFY_PROXY_KEY" \
    "http://127.0.0.1:${COMFY_PROXY_PORT}/__video_factory/status" >/dev/null; then
    break
  fi
  sleep 1
done

fetch_file() {
  local url="$1" target="$2"
  if [ -s "$target" ]; then
    log "Using cached $(basename "$target")"
    return 0
  fi
  local partial="${target}.part"
  log "Downloading $(basename "$target")"
  write_phase "downloading-models" "Downloading $(basename "$target") from the official distribution"
  if command -v aria2c >/dev/null 2>&1; then
    aria2c --allow-overwrite=true --auto-file-renaming=false --continue=true \
      --max-connection-per-server=8 --split=8 --min-split-size=64M \
      --retry-wait=5 --max-tries=20 --file-allocation=none \
      --dir="$(dirname "$target")" --out="$(basename "$partial")" "$url"
  else
    curl --fail --location --retry 20 --retry-all-errors --retry-delay 5 \
      --continue-at - --output "$partial" "$url"
  fi
  mv -f "$partial" "$target"
}

DIFFUSION_NAME="wan2.2_ti2v_5B_fp16.safetensors"
TEXT_ENCODER_NAME="umt5_xxl_fp8_e4m3fn_scaled.safetensors"
VAE_NAME="wan2.2_vae.safetensors"
DIFFUSION_PATH="$MODEL_ROOT/diffusion_models/$DIFFUSION_NAME"
TEXT_ENCODER_PATH="$MODEL_ROOT/text_encoders/$TEXT_ENCODER_NAME"
VAE_PATH="$MODEL_ROOT/vae/$VAE_NAME"
DIFFUSION_URL="https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/diffusion_models/$DIFFUSION_NAME"
TEXT_ENCODER_URL="https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/$TEXT_ENCODER_NAME"
VAE_URL="https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/vae/$VAE_NAME"

fetch_file "$DIFFUSION_URL" "$DIFFUSION_PATH"
fetch_file "$TEXT_ENCODER_URL" "$TEXT_ENCODER_PATH"
fetch_file "$VAE_URL" "$VAE_PATH"

write_phase "hashing-models" "Calculating model checksums"
DIFFUSION_SHA="$(sha256sum "$DIFFUSION_PATH" | awk '{print $1}')"
TEXT_ENCODER_SHA="$(sha256sum "$TEXT_ENCODER_PATH" | awk '{print $1}')"
VAE_SHA="$(sha256sum "$VAE_PATH" | awk '{print $1}')"

cat > "$MANIFEST_PATH" <<JSON
{
  "models": [
    {
      "id": "wan22-ti2v-5b",
      "model_family": "Wan 2.2 TI2V-5B",
      "exact_artifact": "$DIFFUSION_NAME",
      "sha256": "$DIFFUSION_SHA",
      "code_license": "Apache-2.0",
      "model_license": "Apache-2.0",
      "source_url": "$DIFFUSION_URL",
      "approved_workflows": ["abstract-broll-t2v"],
      "notes": "Official ComfyUI-repackaged Wan 2.2 TI2V-5B weights."
    },
    {
      "id": "umt5-xxl-wan-fp8",
      "model_family": "UMT5-XXL Wan text encoder FP8",
      "exact_artifact": "$TEXT_ENCODER_NAME",
      "sha256": "$TEXT_ENCODER_SHA",
      "code_license": "Apache-2.0",
      "model_license": "Apache-2.0",
      "source_url": "$TEXT_ENCODER_URL",
      "approved_workflows": ["abstract-broll-t2v"],
      "notes": "Official ComfyUI-repackaged UMT5-XXL text encoder."
    },
    {
      "id": "wan22-vae",
      "model_family": "Wan 2.2 VAE",
      "exact_artifact": "$VAE_NAME",
      "sha256": "$VAE_SHA",
      "code_license": "Apache-2.0",
      "model_license": "Apache-2.0",
      "source_url": "$VAE_URL",
      "approved_workflows": ["abstract-broll-t2v"],
      "notes": "Official ComfyUI-repackaged Wan 2.2 VAE."
    }
  ],
  "workflows": {
    "abstract-broll-t2v": {
      "workflow_json": {
        "1": {"class_type":"UNETLoader","inputs":{"unet_name":"$DIFFUSION_NAME","weight_dtype":"default"}},
        "2": {"class_type":"ModelSamplingSD3","inputs":{"model":["1",0],"shift":8.0}},
        "3": {"class_type":"CLIPLoader","inputs":{"clip_name":"$TEXT_ENCODER_NAME","type":"wan","device":"default"}},
        "4": {"class_type":"CLIPTextEncode","inputs":{"text":"{{prompt}}","clip":["3",0]}},
        "5": {"class_type":"CLIPTextEncode","inputs":{"text":"{{negative_prompt}}","clip":["3",0]}},
        "6": {"class_type":"VAELoader","inputs":{"vae_name":"$VAE_NAME"}},
        "7": {"class_type":"Wan22ImageToVideoLatent","inputs":{"vae":["6",0],"width":"{{width}}","height":"{{height}}","length":49,"batch_size":1}},
        "8": {"class_type":"KSampler","inputs":{"seed":"{{seed}}","steps":20,"cfg":5.0,"sampler_name":"uni_pc","scheduler":"simple","denoise":1.0,"model":["2",0],"positive":["4",0],"negative":["5",0],"latent_image":["7",0]}},
        "9": {"class_type":"VAEDecode","inputs":{"samples":["8",0],"vae":["6",0]}},
        "10": {"class_type":"CreateVideo","inputs":{"images":["9",0],"fps":24.0,"bit_depth":8}},
        "11": {"class_type":"SaveVideo","inputs":{"video":["10",0],"filename_prefix":"video/ParadigmWan22","format":"auto","codec":"auto"}}
      },
      "model_bindings": {
        "approved-video-checkpoint": "$DIFFUSION_NAME",
        "approved-text-encoder": "$TEXT_ENCODER_NAME",
        "approved-video-vae": "$VAE_NAME"
      }
    }
  }
}
JSON
chmod 600 "$MANIFEST_PATH"

choose_python() {
  local candidate pid executable
  while read -r pid; do
    [ -n "$pid" ] || continue
    executable="$(readlink -f "/proc/$pid/exe" 2>/dev/null || true)"
    if [ -n "$executable" ] && [ -x "$executable" ]; then
      printf '%s\n' "$executable"
      return 0
    fi
  done < <(pgrep -f '[p]ython.*ComfyUI.*/main.py' || true)
  for candidate in \
    "$COMFY_ROOT/.venv/bin/python" \
    /venv/main/bin/python \
    /workspace/venv/bin/python \
    /opt/venv/bin/python \
    "$(command -v python3 || true)"; do
    if [ -n "$candidate" ] && [ -x "$candidate" ] \
      && "$candidate" -c 'import torch, aiohttp' >/dev/null 2>&1; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

if ! curl -fsS --max-time 5 "http://127.0.0.1:${COMFY_INTERNAL_PORT}/system_stats" >/dev/null 2>&1; then
  COMFY_PYTHON="$(choose_python || true)"
  [ -n "$COMFY_PYTHON" ] || fail "A Python environment capable of running ComfyUI was not found"
  if [ -f "$BOOTSTRAP_ROOT/comfyui.pid" ]; then
    old_pid="$(cat "$BOOTSTRAP_ROOT/comfyui.pid" 2>/dev/null || true)"
    if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
      kill "$old_pid" 2>/dev/null || true
      sleep 2
    fi
  fi
  write_phase "starting-comfyui" "Starting the dedicated ComfyUI API process"
  (
    cd "$COMFY_ROOT"
    nohup "$COMFY_PYTHON" main.py \
      --disable-auto-launch \
      --listen 127.0.0.1 \
      --port "$COMFY_INTERNAL_PORT" \
      > "$BOOTSTRAP_ROOT/comfyui.log" 2>&1 &
    echo $! > "$BOOTSTRAP_ROOT/comfyui.pid"
  )
  chmod 600 "$BOOTSTRAP_ROOT/comfyui.pid"
fi

write_phase "waiting-for-comfyui" "Waiting for ComfyUI model discovery and API readiness"
for attempt in $(seq 1 180); do
  if curl -fsS --max-time 10 "http://127.0.0.1:${COMFY_INTERNAL_PORT}/system_stats" >/dev/null 2>&1 \
    && curl -fsS --max-time 20 "http://127.0.0.1:${COMFY_INTERNAL_PORT}/object_info" \
      | python3 -c 'import json,sys; required={"UNETLoader","CLIPLoader","VAELoader","ModelSamplingSD3","CLIPTextEncode","Wan22ImageToVideoLatent","KSampler","VAEDecode","CreateVideo","SaveVideo"}; data=json.load(sys.stdin); missing=required-set(data); raise SystemExit(0 if not missing else 1)' ; then
    write_phase "ready" "Wan 2.2 models, ComfyUI API, and authenticated proxy are ready"
    log "Provisioning complete; ComfyUI production API is ready"
    exit 0
  fi
  if [ $((attempt % 12)) -eq 0 ]; then
    log "Waiting for ComfyUI API readiness (${attempt}/180)"
    tail -n 20 "$BOOTSTRAP_ROOT/comfyui.log" 2>/dev/null || true
  fi
  sleep 5
done

write_phase "failed" "ComfyUI did not become ready within the startup window"
fail "ComfyUI API did not become ready; inspect $BOOTSTRAP_ROOT/comfyui.log"
