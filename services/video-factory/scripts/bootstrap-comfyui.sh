#!/usr/bin/env bash
set -euo pipefail

version="${COMFYUI_VERSION:-v0.28.0}"
target="${COMFYUI_HOME:-$HOME/ComfyUI}"
python_bin="${PYTHON_BIN:-python3}"

command -v git >/dev/null || { echo "git is required" >&2; exit 1; }
command -v "$python_bin" >/dev/null || { echo "$python_bin is required" >&2; exit 1; }

if [ -e "$target" ] && [ ! -d "$target/.git" ]; then
  echo "Target exists and is not a Git checkout: $target" >&2
  exit 1
fi

if [ ! -d "$target/.git" ]; then
  git clone --branch "$version" --depth 1 https://github.com/Comfy-Org/ComfyUI.git "$target"
else
  git -C "$target" fetch --tags --force
  git -C "$target" checkout "$version"
fi

"$python_bin" -m venv "$target/.venv"
"$target/.venv/bin/pip" install --upgrade pip
"$target/.venv/bin/pip" install -r "$target/requirements.txt"

cat <<EOF
ComfyUI core is installed at: $target
Pinned release: $version

Model weights and custom nodes were intentionally NOT installed.
Review licenses and hashes, then start with:
  $target/.venv/bin/python $target/main.py --listen 127.0.0.1 --port 8188 --disable-api-nodes

Set COMFYUI_BASE_URL=http://127.0.0.1:8188 in the factory environment.
EOF
