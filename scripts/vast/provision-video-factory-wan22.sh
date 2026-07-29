#!/bin/bash
set -Eeuo pipefail

log() { printf '[paradigm-provision] %s\n' "$*"; }
fail() { log "ERROR: $*"; exit 1; }

: "${COMFY_PROXY_KEY:?COMFY_PROXY_KEY is required}"
COMFY_INTERNAL_PORT="${COMFY_INTERNAL_PORT:-18188}"
COMFY_PROXY_PORT="${COMFY_PROXY_PORT:-18189}"
BOOTSTRAP_ROOT="${VIDEO_FACTORY_BOOTSTRAP_ROOT:-/workspace/video-factory-bootstrap}"
MODEL_ROOT=""
COMFY_ROOT=""

for candidate in /workspace/ComfyUI /opt/ComfyUI /root/ComfyUI /ComfyUI; do
  if [ -f "$candidate/main.py" ]; then
    COMFY_ROOT="$candidate"
    break
  fi
done

if [ -z "$COMFY_ROOT" ]; then
  for attempt in $(seq 1 120); do
    candidate="$(find /workspace /opt /root -maxdepth 3 -type f -name main.py -path '*/ComfyUI/main.py' 2>/dev/null | head -n1 || true)"
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

if [ -d "$COMFY_ROOT/.git" ]; then
  log "Updating ComfyUI core"
  git -C "$COMFY_ROOT" fetch --depth 1 origin master || true
  git -C "$COMFY_ROOT" reset --hard origin/master || true
fi

fetch_file() {
  local url="$1" target="$2"
  if [ -s "$target" ]; then
    log "Using cached $(basename "$target")"
    return 0
  fi
  local partial="${target}.part"
  log "Downloading $(basename "$target")"
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

log "Calculating model checksums"
DIFFUSION_SHA="$(sha256sum "$DIFFUSION_PATH" | awk '{print $1}')"
TEXT_ENCODER_SHA="$(sha256sum "$TEXT_ENCODER_PATH" | awk '{print $1}')"
VAE_SHA="$(sha256sum "$VAE_PATH" | awk '{print $1}')"

cat > "$BOOTSTRAP_ROOT/manifest-base.json" <<JSON
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
      "notes": "Official ComfyUI-repackaged Wan 2.2 TI2V-5B weights from the model publisher's approved distribution."
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
      "notes": "Official ComfyUI-repackaged UMT5-XXL text encoder used by Wan workflows."
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
  ]
}
JSON
chmod 600 "$BOOTSTRAP_ROOT/manifest-base.json"

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
MANIFEST_BASE = ROOT / "manifest-base.json"

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


def auth_ok(headers) -> bool:
    bearer = headers.get("Authorization", "")
    api_key = headers.get("X-API-Key", "")
    candidate = bearer.removeprefix("Bearer ").strip() if bearer.startswith("Bearer ") else api_key.strip()
    return bool(candidate) and secrets.compare_digest(candidate, KEY)


def upstream_json(path: str):
    request = urllib.request.Request(f"http://{UPSTREAM_HOST}:{UPSTREAM_PORT}{path}")
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read())


def workflow_payload() -> dict:
    return {
        "1": {
            "class_type": "UNETLoader",
            "inputs": {
                "unet_name": "wan2.2_ti2v_5B_fp16.safetensors",
                "weight_dtype": "default",
            },
        },
        "2": {
            "class_type": "ModelSamplingSD3",
            "inputs": {"model": ["1", 0], "shift": 8.0},
        },
        "3": {
            "class_type": "CLIPLoader",
            "inputs": {
                "clip_name": "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
                "type": "wan",
                "device": "default",
            },
        },
        "4": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": "{{prompt}}", "clip": ["3", 0]},
        },
        "5": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": "{{negative_prompt}}", "clip": ["3", 0]},
        },
        "6": {
            "class_type": "VAELoader",
            "inputs": {"vae_name": "wan2.2_vae.safetensors"},
        },
        "7": {
            "class_type": "Wan22ImageToVideoLatent",
            "inputs": {
                "vae": ["6", 0],
                "width": "{{width}}",
                "height": "{{height}}",
                "length": 49,
                "batch_size": 1,
            },
        },
        "8": {
            "class_type": "KSampler",
            "inputs": {
                "seed": "{{seed}}",
                "steps": 20,
                "cfg": 5.0,
                "sampler_name": "uni_pc",
                "scheduler": "simple",
                "denoise": 1.0,
                "model": ["2", 0],
                "positive": ["4", 0],
                "negative": ["5", 0],
                "latent_image": ["7", 0],
            },
        },
        "9": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["8", 0], "vae": ["6", 0]},
        },
        "10": {
            "class_type": "CreateVideo",
            "inputs": {"images": ["9", 0], "fps": 24.0, "bit_depth": 8},
        },
        "11": {
            "class_type": "SaveVideo",
            "inputs": {
                "video": ["10", 0],
                "filename_prefix": "video/ParadigmWan22",
                "format": "auto",
                "codec": "auto",
            },
        },
    }


def status_payload() -> tuple[int, dict]:
    base = json.loads(MANIFEST_BASE.read_text(encoding="utf-8")) if MANIFEST_BASE.is_file() else {"models": []}
    try:
        stats = upstream_json("/system_stats")
        object_info = upstream_json("/object_info")
        available = set(object_info) if isinstance(object_info, dict) else set()
        missing = sorted(REQUIRED_NODES - available)
        ready = not missing
        payload = {
            "ready": ready,
            "phase": "ready" if ready else "waiting-for-nodes",
            "missing_nodes": missing,
            "system_stats": stats,
            **base,
            "workflows": {
                "abstract-broll-t2v": {
                    "workflow_json": workflow_payload(),
                    "model_bindings": {
                        "approved-video-checkpoint": "wan2.2_ti2v_5B_fp16.safetensors",
                        "approved-text-encoder": "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
                        "approved-video-vae": "wan2.2_vae.safetensors",
                    },
                }
            },
        }
        return 200, payload
    except Exception as exc:
        return 200, {"ready": False, "phase": "waiting-for-comfyui", "detail": str(exc), **base}


class Handler(BaseHTTPRequestHandler):
    server_version = "ParadigmComfyProxy/1.0"

    def log_message(self, fmt, *args):
        print(f"[comfy-proxy] {self.address_string()} {fmt % args}", flush=True)

    def _unauthorized(self):
        body = b'{"error":"unauthorized"}'
        self.send_response(401)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
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

log "Starting authenticated ComfyUI proxy on $COMFY_PROXY_PORT"
nohup env \
  COMFY_PROXY_KEY="$COMFY_PROXY_KEY" \
  COMFY_INTERNAL_PORT="$COMFY_INTERNAL_PORT" \
  COMFY_PROXY_PORT="$COMFY_PROXY_PORT" \
  VIDEO_FACTORY_BOOTSTRAP_ROOT="$BOOTSTRAP_ROOT" \
  python3 "$BOOTSTRAP_ROOT/proxy.py" \
  > "$BOOTSTRAP_ROOT/proxy.log" 2>&1 &
echo $! > "$BOOTSTRAP_ROOT/proxy.pid"
chmod 600 "$BOOTSTRAP_ROOT/proxy.pid"

log "Provisioning complete; ComfyUI can finish starting in the background"
