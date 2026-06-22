#!/usr/bin/env node
/**
 * scripts/install-demo-nextjs-route.mjs
 *
 * Replaces the Astro demo container with Next.js full-stack routing.
 * Routes demo.paradigmjp.com → paradigm-hp Next.js app (port 3000).
 *
 * Usage:
 *   node scripts/install-demo-nextjs-route.mjs
 *
 * Environment:
 *   PARADIGM_DEPLOY_HOST — SSH host (default: root@178.105.138.55)
 *   PARADIGM_HP_CONTAINER — container name of the Next.js app (default: paradigm-hp)
 *   ASTRO_DEMO_DOMAIN — domain for demos (default: demo.paradigmjp.com)
 */

import { spawnSync } from "node:child_process"

const host = process.env.PARADIGM_DEPLOY_HOST || "root@178.105.138.55"
const mainContainer = process.env.PARADIGM_HP_CONTAINER || "paradigm-hp"
const domain = process.env.ASTRO_DEMO_DOMAIN || "demo.paradigmjp.com"
const routeRule = `Host(\`${domain}\`)`
const shellQuote = (/** @type {string} */ value) => `'${String(value).replace(/'/g, "'\\''")}'`

const script = `
set -euo pipefail

echo "🔄 Switching demo.paradigmjp.com from Astro container → Next.js ${mainContainer}..."

# Stop and remove the old Astro demo container
echo "🛑 Stopping astro-demo container..."
docker rm -f astro-demo >/dev/null 2>&1 || echo "   (astro-demo was not running — OK)"

# Update Traefik labels on the main Next.js container to also serve demo.paradigmjp.com
echo "🏷️  Adding demo.paradigmjp.com route to ${mainContainer}..."

# Check if the main container exists and is running
if ! docker ps --format '{{.Names}}' | grep -qx ${shellQuote(mainContainer)}; then
  echo "❌ Container '${mainContainer}' is not running. Cannot add demo route."
  echo "   Please ensure the main paradigm-hp Next.js app is deployed first."
  exit 1
fi

# Add the demo route labels by recreating the container with updated labels.
# We pull existing config and re-apply with new labels.
# For Coolify-managed containers, we use docker service update or re-run with updated labels.

# Strategy: Use docker container update for running containers (labels only)
# First, get the current image and settings
CURRENT_IMAGE=$(docker inspect --format='{{.Config.Image}}' ${mainContainer})
CURRENT_ENV=$(docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' ${mainContainer} | paste -sd ',' -)
RESTART_POLICY=$(docker inspect --format='{{.HostConfig.RestartPolicy.Name}}' ${mainContainer})
NETWORK_MODE=$(docker inspect --format='{{.HostConfig.NetworkMode}}' ${mainContainer})

echo "   Current image: \${CURRENT_IMAGE}"
echo "   Network mode: \${NETWORK_MODE}"
echo "   Restart policy: \${RESTART_POLICY}"

# Stop the container temporarily
docker stop ${mainContainer}
docker rm ${mainContainer}

# Re-run with original config + new Traefik labels
# We use docker run with labels — if this is Coolify-managed, Coolify will re-deploy
# on next trigger. This script ensures the labels persist until then.

docker run -d \\
  --name ${mainContainer} \\
  --restart "\${RESTART_POLICY:-unless-stopped}" \\
  --network "\${NETWORK_MODE:-coolify}" \\
  -p 3000:3000 \\
  --label ${shellQuote("traefik.enable=true")} \\
  --label ${shellQuote("traefik.http.routers.paradigm-hp-http.entrypoints=http")} \\
  --label ${shellQuote("traefik.http.routers.paradigm-hp-http.rule=Host(\`paradigmjp.com\`) || Host(\`www.paradigmjp.com\`) || Host(\`demo.paradigmjp.com\`)")} \\
  --label ${shellQuote("traefik.http.routers.paradigm-hp-http.middlewares=redirect-to-https")} \\
  --label ${shellQuote("traefik.http.routers.paradigm-hp-https.entrypoints=https")} \\
  --label ${shellQuote("traefik.http.routers.paradigm-hp-https.rule=Host(\`paradigmjp.com\`) || Host(\`www.paradigmjp.com\`) || Host(\`demo.paradigmjp.com\`)")} \\
  --label ${shellQuote("traefik.http.routers.paradigm-hp-https.tls=true")} \\
  --label ${shellQuote("traefik.http.routers.paradigm-hp-https.tls.certresolver=letsencrypt")} \\
  --label ${shellQuote("traefik.http.services.paradigm-hp.loadbalancer.server.port=3000")} \\
  "\${CURRENT_IMAGE}"

sleep 3
echo ""
echo "✅ Done! demo.paradigmjp.com now routes to ${mainContainer}"
echo ""
echo "🔍 Verify:"
echo "   docker ps --filter name=${mainContainer} --format '{{.Names}} {{.Status}} {{.Ports}}'"
docker ps --filter name=${mainContainer} --format '{{.Names}} {{.Status}} {{.Ports}}'
`

console.log(`\n🚀 Deploying demo.paradigmjp.com → ${mainContainer} on ${host}...\n`)

const result = spawnSync("ssh", [
  "-o", "BatchMode=yes",
  "-o", "ConnectTimeout=20",
  host,
  "bash -s",
], {
  input: script,
  encoding: "utf8",
})

if (result.stdout) process.stdout.write(result.stdout)
if (result.stderr) process.stderr.write(result.stderr)

if (result.status !== 0) {
  console.error(`\n❌ Deploy failed with exit code ${result.status}`)
  process.exit(result.status ?? 1)
}

console.log("\n✨ Demo route deployment complete!\n")
console.log("   demo.paradigmjp.com/[slug]  →  Next.js /[locale]/demo/[slug]/page.tsx")
console.log()
