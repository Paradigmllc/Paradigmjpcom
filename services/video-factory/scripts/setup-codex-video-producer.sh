#!/usr/bin/env bash
set -euo pipefail

service_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo_root="$(cd "$service_root/../.." 2>/dev/null && pwd || printf '%s' "$service_root")"

"$service_root/scripts/bootstrap-agent-skills.sh"

mkdir -p "$repo_root/.codex"
config="$repo_root/.codex/config.toml"
managed_start="# BEGIN PARADIGM VIDEO FACTORY MCP"
managed_end="# END PARADIGM VIDEO FACTORY MCP"
block="$(cat <<CFG
$managed_start
[mcp_servers.comfyui]
command = "bash"
args = ["services/video-factory/scripts/run-comfyui-mcp.sh"]
startup_timeout_sec = 30
tool_timeout_sec = 600
$managed_end
CFG
)"

if [ -f "$config" ]; then
  python - "$config" "$managed_start" "$managed_end" "$block" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
start, end, block = sys.argv[2:]
text = path.read_text(encoding="utf-8")
if start in text and end in text:
    before, rest = text.split(start, 1)
    _, after = rest.split(end, 1)
    text = before.rstrip() + "\n\n" + block + after
else:
    text = text.rstrip() + "\n\n" + block + "\n"
path.write_text(text, encoding="utf-8")
PY
else
  printf '%s\n' "$block" > "$config"
fi

printf '%s\n' \
  "Codex project MCP configuration written to $config" \
  "Run 'video-factory doctor' before enabling production workflows."
