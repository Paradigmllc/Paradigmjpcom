#!/usr/bin/env node
/**
 * Coolify deployment guard for paradigm-hp.
 *
 * This script keeps repeat deploy failures from becoming a queue incident:
 * - verifies the Dockerfile keeps Next.js reachable from Coolify healthchecks
 * - cancels stale queued/in_progress deployments for the same Coolify app
 * - prints compact host/deployment state for incident checks
 *
 * It never prints secrets and never prunes Docker volumes.
 */

import fs from "node:fs"
import { spawnSync } from "node:child_process"
import { DEFAULT_APP_UUID, coolifyRequest } from "./lib/coolify-env.mjs"

const appUuid = process.env.PARADIGM_APP_UUID || DEFAULT_APP_UUID
const host = process.env.PARADIGM_DEPLOY_HOST || "paradigm-droplet"
const timeoutSec = Number.parseInt(process.env.PARADIGM_SSH_CONNECT_TIMEOUT || "20", 10)
const staleMinutes = Number.parseInt(process.env.PARADIGM_STUCK_DEPLOY_MINUTES || "25", 10)
const preDeploy = process.argv.includes("--pre-deploy")
const inspectOnly = process.argv.includes("--inspect")
const skipSsh = process.argv.includes("--skip-ssh") || process.env.PARADIGM_SKIP_SSH_DEPLOY_GUARD === "1"

function ssh(command, input = null) {
  const result = spawnSync(
    "ssh",
    ["-o", "BatchMode=yes", "-o", `ConnectTimeout=${timeoutSec}`, host, command],
    { encoding: "utf8", input },
  )
  if (result.status !== 0) {
    const message = [result.stderr, result.stdout].filter(Boolean).join("\n").trim()
    throw new Error(message || `ssh ${host} failed`)
  }
  return result.stdout.trim()
}

function assertDockerfileRuntimeGuards() {
  const dockerfile = fs.readFileSync("Dockerfile", "utf8")
  const required = [
    [/ENV\s+HOSTNAME=0\.0\.0\.0/, "Dockerfile runner must set ENV HOSTNAME=0.0.0.0"],
    [/ENV\s+PORT=3000/, "Dockerfile runner must set ENV PORT=3000"],
    [/apk\s+add\s+--no-cache\s+curl/, "Dockerfile runner must install curl for Coolify healthchecks"],
    [/HEALTHCHECK\b[\s\S]*127\.0\.0\.1:\$\{PORT:-3000\}/, "Dockerfile must include a localhost healthcheck"],
  ]

  const missing = required.filter(([pattern]) => !pattern.test(dockerfile)).map(([, message]) => message)
  if (missing.length > 0) {
    throw new Error(`Docker runtime guard failed:\n- ${missing.join("\n- ")}`)
  }
  console.log("Docker runtime guard: OK")
}

function parseRows(output) {
  if (!output.trim()) return []
  return output
    .split(/\r?\n/)
    .map((line) => line.split("\t"))
    .filter((cols) => cols[0])
    .map(([deploymentUuid, status, minutesOld, updatedAt, commitMessage]) => ({
      deploymentUuid,
      status,
      minutesOld: Number.parseFloat(minutesOld || "0"),
      updatedAt,
      commitMessage,
    }))
}

function readActiveDeployments() {
  if (skipSsh) return []
  const sql = `
select
  q.deployment_uuid,
  q.status,
  round(extract(epoch from ((now() at time zone 'utc') - q.updated_at)) / 60, 1) as minutes_old,
  q.updated_at,
  left(coalesce(q.commit_message, ''), 90) as commit_message
from application_deployment_queues q
join applications a on a.id::text = q.application_id::text
where a.uuid = '${appUuid.replace(/'/g, "''")}'
  and q.status in ('queued', 'in_progress')
order by q.created_at asc;
`
  const output = ssh(`docker exec -i coolify-db psql -U coolify -d coolify -t -A -F $'\\t'`, sql)
  return parseRows(output)
}

async function cancelDeployment(deploymentUuid, reason) {
  const response = await coolifyRequest(`/api/v1/deployments/${deploymentUuid}/cancel`, { method: "POST" })
  const status = response?.status || "cancelled"
  console.log(`Cancelled stale deployment ${deploymentUuid}: ${status} (${reason})`)
}

async function cancelStaleDeployments() {
  const active = readActiveDeployments()
  if (active.length === 0) {
    console.log("Coolify queue guard: no queued/in_progress paradigm-hp deployments")
    return
  }

  let cancelled = 0
  for (const row of active) {
    const label = `${row.deploymentUuid} ${row.status} age=${row.minutesOld}m updated=${row.updatedAt}`
    if (row.minutesOld >= staleMinutes) {
      await cancelDeployment(row.deploymentUuid, `${row.status} for ${row.minutesOld}m before new deploy`)
      cancelled += 1
    } else {
      console.log(`Coolify queue guard: active ${label}`)
    }
  }

  if (cancelled === 0 && active.length > 0 && preDeploy) {
    console.log(`Coolify queue guard: leaving fresh active deployments alone (< ${staleMinutes}m)`)
  }
}

function inspectHost() {
  if (skipSsh) {
    console.log("Host inspect: skipped")
    return
  }
  const command = [
    "echo 'disk='$(df -P / | awk 'NR==2 {print $5}')",
    "echo 'load='$(awk '{print $1\",\"$2\",\"$3}' /proc/loadavg)",
    "echo 'helpers='$(docker ps --filter ancestor=ghcr.io/coollabsio/coolify-helper:1.0.13 --format '{{.Names}}' | wc -l)",
    `docker ps --filter name=${appUuid} --format 'app_container={{.Names}} {{.Status}} {{.Image}}'`,
  ].join("; ")
  console.log(ssh(command))
}

async function main() {
  assertDockerfileRuntimeGuards()

  if (inspectOnly) {
    const active = readActiveDeployments()
    if (active.length === 0) {
      console.log("Coolify queue guard: no queued/in_progress paradigm-hp deployments")
    } else {
      for (const row of active) {
        console.log(`Coolify queue guard: active ${row.deploymentUuid} ${row.status} age=${row.minutesOld}m updated=${row.updatedAt}`)
      }
    }
    inspectHost()
    return
  }

  if (preDeploy) {
    // Run quality guard before deploy (non-blocking for pre-existing issues)
    const qualityResult = spawnSync("node", ["scripts/paradigm-quality-guard.mjs", "--ci", "--warn-only"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "inherit",
      timeout: 30000,
    })
    if (qualityResult.status !== 0) {
      console.warn("[deploy-guard] quality guard warnings detected — review before next deploy")
    }
    await cancelStaleDeployments()
    inspectHost()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
