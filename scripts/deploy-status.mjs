#!/usr/bin/env node
/**
 * Resume / check a Coolify deployment's status without re-triggering a build.
 *
 * WHY: deploy monitoring sessions can drop (terminal timeout, Cloudflare/nginx
 * gateway hiccup) while a build is still running on the saturated origin. This
 * lets you re-attach to an existing deployment instead of firing a new one.
 *
 * Usage:
 *   node scripts/deploy-status.mjs <deployment_uuid>
 *   node scripts/deploy-status.mjs            # auto-detect latest deployment
 *   node scripts/deploy-status.mjs --once <deployment_uuid>   # single check, no loop
 */

import { DEFAULT_APP_UUID, getCoolifyAuth } from "./lib/coolify-env.mjs"
import { createCoolifyClient } from "./lib/coolify-api.mjs"

const ONCE = process.argv.includes("--once")
const uuidArg = process.argv.slice(2).find((a) => !a.startsWith("--"))

const auth = getCoolifyAuth()
if (!auth) {
  console.error("COOLIFY_API_TOKEN is not configured (set env or add it to a ~/.claude/projects/*/memory/reference_*.md file)")
  process.exit(1)
}

const client = createCoolifyClient({ token: auth.token, baseUrl: auth.baseUrl })
const APP_UUID = process.env.PARADIGM_APP_UUID || DEFAULT_APP_UUID

async function main() {
  let uuid = uuidArg
  if (!uuid) {
    console.log("No deployment UUID given — detecting the latest deployment…")
    uuid = await client.getLatestDeploymentUuid(APP_UUID)
    if (!uuid) {
      console.error("Could not find any deployment to monitor.")
      process.exit(1)
    }
  }
  console.log(`Monitoring deployment: ${uuid} (base: ${auth.baseUrl})`)

  if (ONCE) {
    const r = await client.tryRequest(`/api/v1/deployments/${uuid}`)
    if (!r.ok) {
      console.error(`Status check failed (gateway ${r.status || r.error}). The origin may be busy — retry shortly.`)
      process.exit(2)
    }
    console.log(`status: ${r.data?.status || "unknown"}`)
    return
  }

  const result = await client.pollDeployment(uuid, {
    maxMinutes: Number(process.env.COOLIFY_POLL_MAX_MINUTES) || 30,
    onUpdate: ({ tick, state, transient, note }) => {
      console.log(transient ? `[${tick}] ${note}` : `[${tick}] status: ${state}`)
    },
  })

  if (result.ok) {
    console.log(`Deployment ${result.status} ✅`)
    return
  }
  if (result.timedOut) {
    console.warn(`Monitoring window elapsed (last seen: ${result.status}). Re-run to keep watching:\n  node scripts/deploy-status.mjs ${uuid}`)
    process.exit(2)
  }
  console.error(`Deployment ${result.status} ❌`)
  process.exit(1)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
