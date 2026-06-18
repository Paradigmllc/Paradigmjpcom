#!/usr/bin/env node
import { spawnSync } from "node:child_process"

const host = process.env.PARADIGM_DEPLOY_HOST || "root@178.105.138.55"
const image = process.env.ASTRO_DEMO_IMAGE || "astro-demo:latest"
const apiBase = process.env.ASTRO_DEMO_API_BASE || "https://paradigmjp.com"
const domain = process.env.ASTRO_DEMO_DOMAIN || "demo.paradigmjp.com"
const routeRule = `Host(\`${domain}\`)`
const shellQuote = (value) => `'${String(value).replace(/'/g, "'\\''")}'`

const script = `
set -euo pipefail
docker rm -f astro-demo >/dev/null 2>&1 || true
docker run -d \\
  --name astro-demo \\
  --restart unless-stopped \\
  --network coolify \\
  -p 4321:4321 \\
  -e API_BASE=${shellQuote(apiBase)} \\
  -e PUBLIC_API_BASE=${shellQuote(apiBase)} \\
  -e HOST=0.0.0.0 \\
  -e PORT=4321 \\
  --label ${shellQuote("traefik.enable=true")} \\
  --label ${shellQuote("traefik.http.routers.astro-demo-http.entrypoints=http")} \\
  --label ${shellQuote(`traefik.http.routers.astro-demo-http.rule=${routeRule}`)} \\
  --label ${shellQuote("traefik.http.routers.astro-demo-http.middlewares=redirect-to-https")} \\
  --label ${shellQuote("traefik.http.routers.astro-demo-https.entrypoints=https")} \\
  --label ${shellQuote(`traefik.http.routers.astro-demo-https.rule=${routeRule}`)} \\
  --label ${shellQuote("traefik.http.routers.astro-demo-https.tls=true")} \\
  --label ${shellQuote("traefik.http.routers.astro-demo-https.tls.certresolver=letsencrypt")} \\
  --label ${shellQuote("traefik.http.services.astro-demo.loadbalancer.server.port=4321")} \\
  ${shellQuote(image)}
sleep 3
docker ps --filter name=astro-demo --format '{{.Names}} {{.Status}} {{.Ports}}'
`

const result = spawnSync("ssh", ["-o", "BatchMode=yes", "-o", "ConnectTimeout=20", host, "bash -s"], {
  input: script,
  encoding: "utf8",
})

if (result.stdout) process.stdout.write(result.stdout)
if (result.stderr) process.stderr.write(result.stderr)
process.exit(result.status ?? 1)
