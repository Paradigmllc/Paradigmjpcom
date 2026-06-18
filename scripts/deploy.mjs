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

const DRY = process.argv.includes("--dry")
const NO_WAIT = process.argv.includes("--no-wait")
const SKIP_HOST_PREFLIGHT = process.argv.includes("--skip-host-preflight")
const SKIP_DEPLOY_GUARD = process.argv.includes("--skip-deploy-guard")

const AUTH = getCoolifyAuth()
if (!AUTH) {
  console.error("COOLIFY_API_TOKEN is not set")
  process.exit(1)
}

const TOKEN = AUTH.token
const BASE = AUTH.baseUrl
const APP_UUID = process.env.PARADIGM_APP_UUID || DEFAULT_APP_UUID
const GH_REPO = "git@github.com:Paradigmllc/Paradigmjpcom.git"

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })
  const text = await res.text()
  let data = null
  if (text.length > 0) {
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`Coolify API ${res.status}: ${text.slice(0, 200)}`)
    }
  }
  if (!res.ok) throw new Error(`Coolify API ${res.status}: ${text.slice(0, 200)}`)
  return data
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

  const deployResp = await api(`/api/v1/deploy?uuid=${APP_UUID}&force=true`, { method: "POST" })
  const deployments = deployResp?.deployments || []
  if (deployments.length === 0) throw new Error("No deployment UUID returned")

  const deployUuid = deployments[0].deployment_uuid
  console.log(`Deployment queued: ${deployUuid}`)

  if (NO_WAIT) {
    console.log("--no-wait: skipping poll")
    return
  }

  for (let i = 1; i <= 80; i++) {
    await new Promise((resolve) => setTimeout(resolve, 15_000))
    const status = await api(`/api/v1/deployments/${deployUuid}`)
    const state = status?.status || "unknown"
    console.log(`[${i}/80] status: ${state}`)
    if (state === "finished" || state === "running:healthy") return
    if (state === "failed" || state === "error" || state === "cancelled") {
      throw new Error(`Deployment failed: ${state}`)
    }
  }
  await cancelDeploy(deployUuid, "poll timeout")
  throw new Error("Deployment timed out")
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
