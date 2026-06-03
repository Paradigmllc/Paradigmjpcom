#!/usr/bin/env bash
set -euo pipefail

case "${1:-}" in
  deploy-ai-rules)
    node scripts/deploy-ai-rules.mjs
    ;;
  *)
    echo "Usage: bash sync.sh deploy-ai-rules" >&2
    exit 1
    ;;
esac
