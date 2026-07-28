#!/usr/bin/env bash
set -euo pipefail

python_bin="${PYTHON_BIN:-python3}"
"$python_bin" -m venv .venv
. .venv/bin/activate
pip install --upgrade pip
pip install -e '.[dev,api,orchestrator]'

if command -v npm >/dev/null; then
  npm --prefix tools/playwright-capture install
fi

video-factory export-schemas
video-factory doctor
