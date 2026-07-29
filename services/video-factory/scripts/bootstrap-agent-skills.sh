#!/usr/bin/env bash
set -euo pipefail

version="${HYPERFRAMES_VERSION:-0.7.77}"

command -v node >/dev/null || { echo "Node.js 22+ is required" >&2; exit 1; }
command -v npx >/dev/null || { echo "npx is required" >&2; exit 1; }
node_major="$(node -p 'process.versions.node.split(".")[0]')"
[ "$node_major" -ge 22 ] || { echo "Node.js 22+ is required" >&2; exit 1; }

# Official non-interactive HyperFrames installer. The router and core domain
# skills are refreshed first; VaaS-relevant creation workflows are installed
# explicitly so a new Codex session can route natural-language video requests.
npx --yes "hyperframes@${version}" skills update
for skill in \
  product-launch-video \
  faceless-explainer \
  embedded-captions \
  talking-head-recut \
  motion-graphics \
  music-to-video \
  pr-to-video \
  general-video
do
  npx --yes "hyperframes@${version}" skills update "$skill"
done
npx --yes "hyperframes@${version}" skills check

printf '%s\n' \
  "HyperFrames ${version} Codex skills are installed." \
  "Restart the agent skill loader before invoking /hyperframes."
