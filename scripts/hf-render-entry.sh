#!/bin/bash
# hf-render-entry.sh — HyperFrames renderer entrypoint
# Usage: hf-render [--profile <profile>] [--all] [--composition <name>]
# Writes MP4 to /app/renders/

set -euo pipefail

PROFILE="standard"
COMPOSITION=""
RENDER_ALL=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile) PROFILE="$2"; shift 2 ;;
    --composition) COMPOSITION="$2"; shift 2 ;;
    --all) RENDER_ALL=true; shift ;;
    --output) OUTPUT_DIR="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

OUTPUT_DIR="${OUTPUT_DIR:-/app/renders}"
mkdir -p "$OUTPUT_DIR"

cd /app

if [ "$RENDER_ALL" = true ]; then
  echo "[hf-render] Rendering all compositions (profile: $PROFILE)..."
  npx hyperframes render --profile "$PROFILE" --output "$OUTPUT_DIR"
elif [ -n "$COMPOSITION" ]; then
  echo "[hf-render] Rendering composition '$COMPOSITION' (profile: $PROFILE)..."
  npx hyperframes render "$COMPOSITION" --profile "$PROFILE" --output "$OUTPUT_DIR"
else
  echo "[hf-render] Rendering default composition (profile: $PROFILE)..."
  npx hyperframes render --profile "$PROFILE" --output "$OUTPUT_DIR"
fi

echo "[hf-render] Done. Output: $OUTPUT_DIR"
ls -la "$OUTPUT_DIR"/*.mp4 2>/dev/null || echo "No MP4 files produced."
