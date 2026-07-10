#!/usr/bin/env node
/**
 * Safe host disk preflight for Coolify deployments.
 *
 * It checks the production Docker host over SSH before a deploy. If root disk
 * usage is above the prune threshold, it removes Docker build cache and unused
 * images only. It never prunes volumes because production databases live there.
 */

import { spawnSync } from "node:child_process"
import { sshArgs } from "./lib/ssh-options.mjs"

const host = process.env.PARADIGM_DEPLOY_HOST || "paradigm-droplet"
const pruneAt = Number.parseInt(process.env.PARADIGM_DISK_PRUNE_AT || "70", 10)
const failAt = Number.parseInt(process.env.PARADIGM_DISK_FAIL_AT || "88", 10)
const timeoutSec = Number.parseInt(process.env.PARADIGM_SSH_CONNECT_TIMEOUT || "20", 10)
const skip = process.argv.includes("--skip") || process.env.PARADIGM_SKIP_HOST_PREFLIGHT === "1"

function ssh(command) {
  const result = spawnSync(
    "ssh",
    [...sshArgs(host, { connectTimeout: timeoutSec }), command],
    { encoding: "utf8" },
  )
  if (result.status !== 0) {
    const message = [result.stderr, result.stdout].filter(Boolean).join("\n").trim()
    throw new Error(message || `ssh ${host} failed`)
  }
  return result.stdout.trim()
}

function readUsedPercent() {
  const output = ssh("df -P / | awk 'NR==2 {gsub(/%/,\"\",$5); print $5}'")
  const used = Number.parseInt(output, 10)
  if (!Number.isFinite(used)) throw new Error(`Could not parse disk usage from: ${output}`)
  return used
}

function main() {
  if (skip) {
    console.log("Host disk preflight: skipped")
    return
  }

  const before = readUsedPercent()
  console.log(`Host disk preflight: ${host} root disk ${before}% used`)

  if (before >= failAt) {
    console.log(`Host disk preflight: usage >= ${failAt}%; aggressive Docker prune (builder cache 7d retention)`)
    ssh("docker builder prune -af --filter 'until=168h' >/dev/null 2>&1 || true; docker image prune -af >/dev/null 2>&1 || true; docker container prune -f >/dev/null 2>&1 || true; docker system prune -f >/dev/null 2>&1 || true")
  } else if (before >= pruneAt) {
    console.log(`Host disk preflight: usage >= ${pruneAt}%; pruning old images only (preserving build cache)`)
    ssh("docker image prune -af --filter 'until=72h' >/dev/null 2>&1 || true; docker container prune -f >/dev/null 2>&1 || true")
  }

  const after = readUsedPercent()
  console.log(`Host disk preflight: ${host} root disk ${after}% used after check`)

  if (after >= failAt) {
    throw new Error(`Host disk remains ${after}% used after prune; refusing deploy to avoid Traefik/Coolify 503`)
  }
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
