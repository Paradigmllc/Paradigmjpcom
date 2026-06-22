#!/usr/bin/env node
/**
 * Deploy paradigmjp.com through Coolify API.
 *
 * Usage:
 *   node scripts/deploy.mjs
 *   node scripts/deploy.mjs --dry
 *   node scripts/deploy.mjs --no-wait
 *   node scripts/deploy.mjs --skip-host-preflight
 *   node scripts/deploy.mjs --skip-deploy-guard
 */

import { spawnSync } from "node:child_process"
import { DEFAULT_APP_UUID, getCoolifyAuth } from "./lib/coolify-env.mjs"
import { createCoolifyClient } from "./lib/coolify-api.mjs"

const DRY = process.argv.includes("--dry")
const NO_WAIT = process.argv.includes("--no-wait")
const SKIP_HOST_PREFLIGHT = process.argv.includes("--skip-host-preflight")
const SKIP_DEPLOY_GUARD = process.argv.includes("--skip-deploy-guard")
const CANCEL_ON_TIMEOUT = process.argv.includes("--cancel-on-timeout")
const DEPLOY_HOST = process.env.PARADIGM_DEPLOY_HOST || "paradigm-droplet"

const AUTH = getCoolifyAuth()
if (!AUTH) {
  console.error("COOLIFY_API_TOKEN is not set")
  process.exit(1)
}

const TOKEN = AUTH.token
const BASE = AUTH.baseUrl
const APP_UUID = process.env.PARADIGM_APP_UUID || DEFAULT_APP_UUID
const GH_REPO = "git@github.com:Paradigmllc/Paradigmjpcom.git"

const client = createCoolifyClient({ token: TOKEN, baseUrl: BASE })

// Retrying wrapper kept for back-compat with existing callers (e.g. cancelDeploy).
async function api(path, options = {}) {
  return client.request(path, options)
}

function runHostDiskPreflight() {
  if (SKIP_HOST_PREFLIGHT || DRY) {
    console.log("Host disk preflight: skipped")
    return
  }
  const result = spawnSync(process.execPath, ["scripts/host-disk-preflight.mjs"], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  })
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim()
  if (output) console.log(output)
  if (result.status !== 0) throw new Error("Host disk preflight failed; refusing deployment")
}

function runDeployGuard() {
  if (SKIP_DEPLOY_GUARD || DRY) {
    console.log("Coolify deploy guard: skipped")
    return
  }
  const result = spawnSync(process.execPath, ["scripts/coolify-deploy-guard.mjs", "--pre-deploy"], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  })
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim()
  if (output) console.log(output)
  if (result.status !== 0) throw new Error("Coolify deploy guard failed; refusing deployment")
}

function refreshManualTraefikRoute() {
  if (SKIP_HOST_PREFLIGHT || DRY) {
    console.log("Manual Traefik route refresh: skipped")
    return
  }

  const script = `
set -euo pipefail
app_uuid='${APP_UUID.replace(/'/g, "'\\''")}'
route_file='/data/coolify/proxy/dynamic/paradigmjp.yml'
if [ ! -f "$route_file" ]; then
  echo "Manual Traefik route refresh: route file not found"
  exit 0
fi
new_container="$(docker ps --filter "name=${APP_UUID.replace(/"/g, '\\"')}" --format '{{.Names}}' | head -n1)"
if [ -z "$new_container" ]; then
  echo "Manual Traefik route refresh: app container not found"
  exit 1
fi
new_ip="$(docker inspect "$new_container" --format '{{with index .NetworkSettings.Networks "coolify"}}{{.IPAddress}}{{end}}')"
if [ -z "$new_ip" ]; then
  echo "Manual Traefik route refresh: app container has no coolify network IP"
  exit 1
fi
python3 - "$route_file" "$app_uuid" "$new_container" "$new_ip" <<'PY'
import re
import sys

path, app_uuid, new_container, new_ip = sys.argv[1:5]
with open(path, encoding="utf-8") as handle:
    text = handle.read()

pattern = rf"{re.escape(app_uuid)}-[0-9]{{12}}"
updated = re.sub(pattern, new_container, text)
updated = re.sub(
    r"(paradigmhp-svc:\n\s+loadBalancer:\n\s+servers:\n\s+- url: )http://[^\s]+:3000",
    rf"\\1http://{new_ip}:3000",
    updated,
    count=1,
)
if updated == text:
    print(f"Manual Traefik route refresh: already points to {new_container} ({new_ip})")
else:
    backup = f"{path}.bak-deploy"
    with open(backup, "w", encoding="utf-8") as handle:
        handle.write(text)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(updated)
    print(f"Manual Traefik route refresh: updated route to {new_container} ({new_ip})")
PY
`
  const result = spawnSync("ssh", [DEPLOY_HOST, "bash -s"], {
    input: script,
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  })
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim()
  if (output) console.log(output)
  if (result.status !== 0) throw new Error("Manual Traefik route refresh failed")
}

function connectRuntimeNetworks() {
  if (SKIP_HOST_PREFLIGHT || DRY) {
    console.log("Runtime network connect: skipped")
    return
  }

  const script = `
set -euo pipefail
app_uuid='${APP_UUID.replace(/'/g, "'\\''")}'
app_container="$(docker ps --filter "name=${APP_UUID.replace(/"/g, '\\"')}" --format '{{.Names}}' | head -n1)"
if [ -z "$app_container" ]; then
  echo "Runtime network connect: app container not found"
  exit 1
fi
for net in supabase_supabase-net services-net; do
  if docker network inspect "$net" >/dev/null 2>&1; then
    docker network connect "$net" "$app_container" 2>/dev/null || true
    echo "Runtime network connect: ensured $app_container on $net"
  else
    echo "Runtime network connect: missing optional network $net"
  fi
done
`
  const result = spawnSync("ssh", [DEPLOY_HOST, "bash -s"], {
    input: script,
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  })
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim()
  if (output) console.log(output)
  if (result.status !== 0) throw new Error("Runtime network connect failed")
}

async function cancelDeploy(uuid, reason) {
  try {
    await api(`/api/v1/deployments/${uuid}/cancel`, { method: "POST" })
    console.warn(`Deployment cancelled: ${uuid} (${reason})`)
  } catch (error) {
    console.warn(`Deployment cancel failed for ${uuid}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function run() {
  console.log("paradigmjp.com deploy via Coolify API")
  runHostDiskPreflight()
  runDeployGuard()

  if (DRY) {
    console.log("--dry: skipping Coolify mutations")
    return
  }

  console.log("Syncing git_repository to Coolify")
  try {
    await api(`/api/v1/applications/${APP_UUID}`, {
      method: "PATCH",
      body: JSON.stringify({ git_repository: GH_REPO }),
    })
    console.log("git_repository synced")
  } catch (error) {
    console.warn("git_repository sync skipped:", error instanceof Error ? error.message : String(error))
  }

  if (DRY) {
    console.log("--dry: skipping deploy")
    return
  }

  const resumeHint = (uuid) => `\nResume monitoring later with:\n  node scripts/deploy-status.mjs ${uuid}`

  // Trigger is resilient: a Cloudflare/nginx gateway timeout on the POST does NOT
  // mean the deploy failed — Coolify queues it anyway. Fall back to locating the
  // freshly-queued deployment instead of aborting.
  let deployUuid
  const trigger = await client.rawRequest(`/api/v1/deploy?uuid=${APP_UUID}&force=true`, { method: "POST" })
  if (trigger.ok) {
    deployUuid = (trigger.data?.deployments || [])[0]?.deployment_uuid
  } else {
    console.warn(
      `Deploy trigger returned ${trigger.status || trigger.error} (gateway/timeout) — the deploy is usually queued regardless; locating it…`,
    )
    deployUuid = await client.getLatestDeploymentUuid(APP_UUID)
  }
  if (!deployUuid) {
    throw new Error("No deployment UUID (trigger failed and no in-flight deployment found) — check the Coolify UI")
  }
  console.log(`Deployment queued: ${deployUuid}`)

  if (NO_WAIT) {
    console.log(`--no-wait: skipping poll.${resumeHint(deployUuid)}`)
    return
  }

  // Resilient polling: transient origin overload (the build saturating the host)
  // is treated as "still building", never as a failure, and never auto-cancelled.
  const result = await client.pollDeployment(deployUuid, {
    maxMinutes: Number(process.env.COOLIFY_POLL_MAX_MINUTES) || 30,
    onUpdate: ({ tick, state, transient, note }) => {
      console.log(transient ? `[${tick}] ${note}` : `[${tick}] status: ${state}`)
    },
  })

  if (result.ok) {
    console.log(`Deployment ${result.status} ✅`)
    connectRuntimeNetworks()
    refreshManualTraefikRoute()
    return
  }
  if (result.timedOut) {
    if (CANCEL_ON_TIMEOUT) await cancelDeploy(deployUuid, "poll timeout (--cancel-on-timeout)")
    console.warn(
      `Monitoring window elapsed without a terminal status (last seen: ${result.status}). ` +
        `The build may still be running on the saturated origin and was NOT cancelled.${resumeHint(deployUuid)}`,
    )
    process.exit(2)
  }
  throw new Error(`Deployment failed: ${result.status}`)
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
