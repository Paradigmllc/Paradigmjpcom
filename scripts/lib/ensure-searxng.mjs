import crypto from "node:crypto"
import fs from "node:fs"
import { spawnSync } from "node:child_process"
import { sshArgs } from "./ssh-options.mjs"

const IMAGE = "docker.io/searxng/searxng@sha256:976233a51ed74ea7cf7ade5664f894502d303aaf21f8eecef5e129c9ea12224b"
const CONTAINER = "paradigm-searxng"

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`
}

export function ensureSearxng(input = {}) {
  const deployHost = input.deployHost || process.env.PARADIGM_DEPLOY_HOST || "paradigm-droplet"
  const appUuid = input.appUuid
  if (!appUuid) throw new Error("appUuid is required to verify SearXNG from the application network")
  const settings = fs.readFileSync(new URL("../../infra/searxng/settings.yml", import.meta.url), "utf8")
  const settingsBase64 = Buffer.from(settings).toString("base64")
  const configHash = crypto.createHash("sha256").update(settings).digest("hex")
  const script = `
set -euo pipefail
install -d -m 0755 /opt/paradigm-searxng
printf '%s' ${shellQuote(settingsBase64)} | base64 -d > /opt/paradigm-searxng/settings.yml.tmp
chmod 0644 /opt/paradigm-searxng/settings.yml.tmp
mv /opt/paradigm-searxng/settings.yml.tmp /opt/paradigm-searxng/settings.yml
if [ ! -s /opt/paradigm-searxng/secret ]; then
  umask 077
  openssl rand -hex 32 > /opt/paradigm-searxng/secret
fi
secret="$(cat /opt/paradigm-searxng/secret)"
current_hash="$(docker inspect ${CONTAINER} --format '{{index .Config.Labels "paradigm.config-sha"}}' 2>/dev/null || true)"
current_image="$(docker inspect ${CONTAINER} --format '{{index .Config.Labels "paradigm.image"}}' 2>/dev/null || true)"
running="$(docker inspect ${CONTAINER} --format '{{.State.Running}}' 2>/dev/null || true)"
if [ "$running" != "true" ] || [ "$current_hash" != ${shellQuote(configHash)} ] || [ "$current_image" != ${shellQuote(IMAGE)} ]; then
  docker pull ${shellQuote(IMAGE)} >/dev/null
  docker rm -f ${CONTAINER} >/dev/null 2>&1 || true
  docker run -d \
    --name ${CONTAINER} \
    --restart unless-stopped \
    --network coolify \
    --network-alias searxng \
    --memory 512m \
    --cpus 1.0 \
    --label paradigm.managed=release \
    --label paradigm.config-sha=${shellQuote(configHash)} \
    --label paradigm.image=${shellQuote(IMAGE)} \
    -e SEARXNG_SECRET="$secret" \
    -e SEARXNG_BASE_URL=http://searxng:8080/ \
    -e SEARXNG_BIND_ADDRESS=0.0.0.0 \
    -e SEARXNG_PORT=8080 \
    -e SEARXNG_LIMITER=false \
    -v /opt/paradigm-searxng/settings.yml:/etc/searxng/settings.yml:ro \
    -v paradigm-searxng-cache:/var/cache/searxng \
    ${shellQuote(IMAGE)} >/dev/null
fi
app_container="$(docker ps --filter name=${shellQuote(appUuid)} --format '{{.Names}}' | head -n1)"
if [ -z "$app_container" ]; then
  echo "SearXNG verification failed: app container missing" >&2
  exit 1
fi
for attempt in $(seq 1 30); do
  if docker exec "$app_container" node -e 'fetch("http://searxng:8080/search?q=shopify&format=json",{signal:AbortSignal.timeout(5000)}).then(async r=>{if(!r.ok)process.exit(1);const x=await r.json();if(!Array.isArray(x.results))process.exit(1)}).catch(()=>process.exit(1))'; then
    echo "SearXNG internal JSON search: OK"
    exit 0
  fi
  sleep 2
done
echo "SearXNG verification failed: JSON search unavailable" >&2
docker logs --tail 40 ${CONTAINER} >&2 || true
exit 1
`
  const result = spawnSync("ssh", [...sshArgs(deployHost, { acceptNew: true }), "bash -s"], {
    input: script,
    encoding: "utf8",
    timeout: 180_000,
    maxBuffer: 1024 * 1024,
  })
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim()
  if (output) console.log(output)
  if (result.status !== 0 || result.error) {
    throw new Error(`SearXNG provisioning failed: ${result.error?.message || "non-zero exit"}`)
  }
}

