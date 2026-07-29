#!/usr/bin/env bash
set -euo pipefail

version="${COMFYUI_MCP_VERSION:-0.2.2}"
service_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
url="${COMFYUI_API_URL:-${COMFYUI_BASE_URL:-http://127.0.0.1:8188}}"
environment="${VIDEO_FACTORY_ENVIRONMENT:-local}"

command -v uvx >/dev/null || {
  echo "uvx is required. Install uv from the official Astral distribution." >&2
  exit 1
}

case "$url" in
  http://127.0.0.1:*|http://localhost:*|http://comfyui:*|http://*.internal:*|http://*.local:*)
    trusted_local=true
    ;;
  *)
    trusted_local=false
    ;;
esac

# comfyui-easy-mcp 0.2.2 does not expose an API-key header setting. Keep it on
# a trusted loopback/private admin path. Authenticated production execution
# remains in video_factory.adapters.comfyui.
if [ "$environment" = "production" ] && [ "$trusted_local" != true ] \
  && [ "${COMFYUI_MCP_TRUST_REMOTE:-false}" != "true" ]; then
  echo "Refusing unauthenticated ComfyUI MCP access to a remote production URL." >&2
  echo "Use a loopback/private proxy or explicitly set COMFYUI_MCP_TRUST_REMOTE=true after review." >&2
  exit 1
fi

export COMFY_URL="$url"
export COMFY_URL_EXTERNAL="${COMFYUI_MCP_EXTERNAL_URL:-$url}"
export COMFY_WORKFLOWS_DIR="${COMFY_WORKFLOWS_DIR:-$service_root/workflows/comfyui/api}"
export COMFY_WORKFLOWS_UI_DIR="${COMFY_WORKFLOWS_UI_DIR:-$service_root/workflows/comfyui/ui}"
export OUTPUT_MODE="${COMFYUI_MCP_OUTPUT_MODE:-file}"
export POLL_TIMEOUT="${COMFYUI_MCP_POLL_TIMEOUT:-300}"
export POLL_INTERVAL="${COMFYUI_MCP_POLL_INTERVAL:-1.0}"

exec uvx --from "comfyui-easy-mcp==${version}" comfy-mcp-server
