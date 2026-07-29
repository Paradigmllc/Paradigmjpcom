#!/usr/bin/env sh
set -eu

VIDEO_FACTORY_ROOT="${VIDEO_FACTORY_ROOT:-/opt/video-factory}"
VIDEO_FACTORY_WORKSPACE="${VIDEO_FACTORY_WORKSPACE:-/data/video-factory}"
VIDEO_FACTORY_PORT="${VIDEO_FACTORY_PORT:-8080}"

mkdir -p "${VIDEO_FACTORY_WORKSPACE}"
chown -R nextjs:nodejs "${VIDEO_FACTORY_WORKSPACE}"

export VIDEO_FACTORY_ENVIRONMENT="${VIDEO_FACTORY_ENVIRONMENT:-production}"
export VIDEO_FACTORY_WORKSPACE
export VIDEO_FACTORY_QUEUE_BACKEND="${VIDEO_FACTORY_QUEUE_BACKEND:-local}"
export VIDEO_FACTORY_LOCAL_QUEUE_WORKERS="${VIDEO_FACTORY_LOCAL_QUEUE_WORKERS:-1}"
export VIDEO_FACTORY_MASTER_COMPOSITOR="${VIDEO_FACTORY_MASTER_COMPOSITOR:-hyperframes}"
export VIDEO_FACTORY_ALLOW_FFMPEG_COMPOSITOR_FALLBACK="${VIDEO_FACTORY_ALLOW_FFMPEG_COMPOSITOR_FALLBACK:-false}"
export VIDEO_FACTORY_MODEL_REGISTRY="${VIDEO_FACTORY_MODEL_REGISTRY:-${VIDEO_FACTORY_ROOT}/config/model-registry.yaml}"
export COMFYUI_WORKFLOW_ROOT="${COMFYUI_WORKFLOW_ROOT:-${VIDEO_FACTORY_ROOT}/workflows/comfyui}"
export COMFYUI_WORKFLOW_REGISTRY="${COMFYUI_WORKFLOW_REGISTRY:-${VIDEO_FACTORY_ROOT}/workflows/comfyui/registry.yaml}"
export PLAYWRIGHT_CAPTURE_SCRIPT="${PLAYWRIGHT_CAPTURE_SCRIPT:-${VIDEO_FACTORY_ROOT}/tools/playwright-capture/capture.mjs}"
export PLAYWRIGHT_CHROMIUM_EXECUTABLE="${PLAYWRIGHT_CHROMIUM_EXECUTABLE:-/usr/bin/chromium-browser}"
export HYPERFRAMES_VERSION="${HYPERFRAMES_VERSION:-0.7.77}"
export HYPERFRAMES_NPX="${HYPERFRAMES_NPX:-npx}"
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

stop_all() {
  trap - EXIT INT TERM
  [ -z "${NEXT_PID:-}" ] || kill -TERM "${NEXT_PID}" 2>/dev/null || true
  [ -z "${VIDEO_FACTORY_PID:-}" ] || kill -TERM "${VIDEO_FACTORY_PID}" 2>/dev/null || true
  [ -z "${NEXT_PID:-}" ] || wait "${NEXT_PID}" 2>/dev/null || true
  [ -z "${VIDEO_FACTORY_PID:-}" ] || wait "${VIDEO_FACTORY_PID}" 2>/dev/null || true
}
trap stop_all EXIT INT TERM

start_video_factory
cd /app
echo "[runtime] starting Paradigm Next.js on 0.0.0.0:${PORT:-3000}"
su-exec nextjs:nodejs node server.js &
NEXT_PID=$!

while kill -0 "${NEXT_PID}" 2>/dev/null; do
  if ! kill -0 "${VIDEO_FACTORY_PID}" 2>/dev/null; then
    echo "[runtime] Video Factory exited; restarting" >&2
    start_video_factory
  fi
  sleep 5
done

wait "${NEXT_PID}"
