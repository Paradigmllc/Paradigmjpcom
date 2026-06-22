#!/usr/bin/env node
/**
 * Release Doctor: the single release gate for Paradigmjpcom.
 *
 * It keeps build/deploy failures from becoming repeated agent loops by:
 * - failing before deploy when the worktree or host is not release-ready
 * - statically blocking destructive deploy timeout behavior
 * - validating production URLs that represent actual Revenue OS value, not just
 *   a queued deployment webhook
 */

import fs from "node:fs"
import { spawnSync } from "node:child_process"

const args = new Set(process.argv.slice(2))
const PRE_DEPLOY = args.has("--pre-deploy") || (!args.has("--post-deploy") && !args.has("--local-only"))
const POST_DEPLOY = args.has("--post-deploy")
const LOCAL_ONLY = args.has("--local-only")
const ALLOW_DIRTY = args.has("--allow-dirty")
const SKIP_REMOTE = args.has("--skip-remote") || process.env.RELEASE_DOCTOR_SKIP_REMOTE === "1"

const BASE_URL = (process.env.RELEASE_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://paradigmjp.com").replace(/\/+$/, "")
const TWENTY_URL = (process.env.RELEASE_TWENTY_URL || "https://twenty.paradigmjp.com").replace(/\/+$/, "")
const REPORT_PATH = process.env.RELEASE_REPORT_SMOKE_PATH || "/en/report/ccbc-xynd21"
const DEPLOY_HOST = process.env.PARADIGM_DEPLOY_HOST || "root@178.105.138.55"
const APP_UUID = process.env.PARADIGM_APP_UUID || "n8i2sjiqvr2d8hrzppop2m2i"

const failures = []

function section(title) {
  console.log(`\n[release-doctor] ${title}`)
}

function fail(message) {
  failures.push(message)
  console.error(`FAIL: ${message}`)
}

function pass(message) {
  console.log(`OK: ${message}`)
}

function warn(message) {
  console.warn(`WARN: ${message}`)
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    ...options,
  })
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim()
  return { status: result.status ?? 1, output }
}

function runOrFail(label, command, commandArgs, options = {}) {
  const result = run(command, commandArgs, options)
  if (result.output) console.log(result.output)
  if (result.status !== 0) {
    fail(`${label} failed`)
    return false
  }
  pass(label)
  return true
}

function checkGitHygiene() {
  section("Git hygiene")
  const result = run("git", ["status", "--short"])
  if (result.status !== 0) {
    fail("git status failed")
    return
  }
  const lines = result.output.split(/\r?\n/).filter(Boolean)
  const untracked = lines.filter((line) => line.startsWith("?? "))
  if (untracked.length > 0) {
    fail(`untracked files present (${untracked.length}); deploy would risk module-not-found`)
    console.log(untracked.slice(0, 20).join("\n"))
  }
  if (lines.length > 0 && !ALLOW_DIRTY) {
    fail(`worktree has ${lines.length} change(s); commit or pass --allow-dirty for local diagnosis only`)
    console.log(lines.slice(0, 30).join("\n"))
  }
  if (lines.length === 0) pass("worktree clean")
  if (lines.length > 0 && ALLOW_DIRTY && untracked.length === 0) pass("dirty tracked worktree allowed for local diagnosis")
}

function checkStaticReleaseRules() {
  section("Static release rules")
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"))
  const scripts = packageJson.scripts || {}
  if (scripts["release:prod"]?.includes("release-doctor")) {
    pass("release:prod is guarded by release-doctor")
  } else {
    fail("package.json must expose release:prod through release-doctor")
  }

  const noLoginDeploy = fs.readFileSync("scripts/sales-os-no-login-deploy.mjs", "utf8")
  if (/cancelDeploy\(uuid,\s*"poll timeout"\)/.test(noLoginDeploy)) {
    fail("sales-os-no-login-deploy still cancels deployments on monitor timeout")
  } else if (noLoginDeploy.includes("CANCEL_ON_TIMEOUT")) {
    pass("timeout cancellation is opt-in only")
  } else {
    fail("sales-os-no-login-deploy timeout behavior is not explicit")
  }
  if (noLoginDeploy.includes("refreshManualTraefikRoute") && /paradigmhp-svc/.test(noLoginDeploy)) {
    pass("deploy refreshes manual Traefik route after Coolify finishes")
  } else {
    fail("deploy must refresh the manual Traefik route after Coolify finishes")
  }
  if (noLoginDeploy.includes("isInternalDataApiUrl") && noLoginDeploy.includes("applySqlMigrationThroughPostgres")) {
    pass("deploy avoids local calls to Docker-internal Supabase REST URLs")
  } else {
    fail("deploy must avoid local calls to Docker-internal Supabase REST URLs")
  }

  const buildWrapper = fs.readFileSync("scripts/build-next.mjs", "utf8")
  if (buildWrapper.includes("PAYLOAD_DISABLE_DATABASE_DURING_BUILD") && buildWrapper.includes("runWithHeartbeat")) {
    pass("Next build wrapper disables build-time DB dependency and emits heartbeat")
  } else {
    fail("Next build wrapper must keep builds DB-independent with heartbeat output")
  }
}

function checkTraefikRouteDrift() {
  if (LOCAL_ONLY || SKIP_REMOTE) return
  section("Traefik route drift")
  const script = `
set -euo pipefail
app_uuid='${APP_UUID.replace(/'/g, "'\\''")}'
route_file='/data/coolify/proxy/dynamic/paradigmjp.yml'
if [ ! -f "$route_file" ]; then
  echo "SKIP route-file-missing"
  exit 0
fi
container="$(docker ps --filter "name=${APP_UUID.replace(/"/g, '\\"')}" --format '{{.Names}}' | head -n1)"
if [ -z "$container" ]; then
  echo "FAIL app-container-missing"
  exit 2
fi
ip="$(docker inspect "$container" --format '{{with index .NetworkSettings.Networks "coolify"}}{{.IPAddress}}{{end}}')"
route="$(python3 - "$route_file" <<'PY'
import re
import sys
text = open(sys.argv[1], encoding='utf-8').read()
match = re.search(r'paradigmhp-svc:\\n\\s+loadBalancer:\\n\\s+servers:\\n\\s+- url: http://([^\\s]+):3000', text)
print(match.group(1) if match else '')
PY
)"
if [ -z "$route" ]; then
  echo "FAIL route-upstream-missing container=$container ip=$ip"
  exit 3
fi
if [ "$route" != "$ip" ] && [ "$route" != "$container" ]; then
  echo "FAIL route-drift container=$container ip=$ip route=$route"
  exit 4
fi
echo "OK container=$container ip=$ip route=$route"
`
  const result = spawnSync("ssh", ["-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new", DEPLOY_HOST, "bash -s"], {
    input: script,
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  })
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim()
  if (output) console.log(output)
  if (result.status !== 0 || result.error) {
    fail(`Traefik paradigmhp-svc route drift detected; run npm run release:prod, which refreshes it automatically`)
    return
  }
  pass("manual Traefik route points at the latest app container")
}

function checkSyntax() {
  section("Script syntax")
  const targets = [
    "scripts/release-doctor.mjs",
    "scripts/deploy.mjs",
    "scripts/sales-os-no-login-deploy.mjs",
    "scripts/coolify-deploy-guard.mjs",
    "scripts/build-next.mjs",
  ]
  for (const target of targets) {
    runOrFail(`node --check ${target}`, process.execPath, ["--check", target])
  }
}

function checkPreDeployRemote() {
  if (LOCAL_ONLY || SKIP_REMOTE) {
    section("Remote preflight")
    warn("remote preflight skipped")
    return
  }
  section("Remote preflight")
  runOrFail("host disk preflight", process.execPath, ["scripts/host-disk-preflight.mjs"])
  runOrFail("Coolify deploy guard", process.execPath, ["scripts/coolify-deploy-guard.mjs", "--pre-deploy"])
  checkTraefikRouteDrift()
}

function isBadReportBody(text) {
  return /Server Components render|digest property|レポートの読み込みに失敗しました|Application error|"\$RX"\(|"digest":"\d+"|\$RX\("B:/i.test(text)
}

async function fetchCheck(label, url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 20_000
  let res
  try {
    res = await fetch(url, {
      redirect: options.redirect ?? "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: options.headers,
    })
  } catch (error) {
    fail(`${label} fetch failed: ${error instanceof Error ? error.message : String(error)}`)
    return
  }
  const text = await res.text().catch(() => "")
  if (res.status < 200 || res.status >= 400) {
    fail(`${label} returned HTTP ${res.status}`)
    return
  }
  if (options.rejectReportError && isBadReportBody(text)) {
    fail(`${label} rendered an application/report error`)
    return
  }
  if (options.mustContain && !text.includes(options.mustContain)) {
    fail(`${label} did not contain expected marker: ${options.mustContain}`)
    return
  }
  pass(`${label} HTTP ${res.status}`)
}

async function checkPostDeployUrls() {
  if (SKIP_REMOTE) {
    section("Post-deploy smoke")
    warn("remote smoke skipped")
    return
  }

  section("Post-deploy smoke")
  await fetchCheck("readiness", `${BASE_URL}/api/ready`, { timeoutMs: 12_000 })
  await fetchCheck("Japanese public site", `${BASE_URL}/ja`, { timeoutMs: 20_000 })
  await fetchCheck("Revenue OS dashboard", `${BASE_URL}/ja/admin/sales`, { timeoutMs: 20_000 })
  await fetchCheck("diagnostic report value URL", `${BASE_URL}${REPORT_PATH}`, {
    timeoutMs: 25_000,
    rejectReportError: true,
  })
  await fetchCheck("Twenty", TWENTY_URL, { timeoutMs: 20_000 })

  const secret = process.env.TRIGGER_WEBHOOK_SECRET || process.env.SALES_API_SECRET || process.env.INTERNAL_API_SECRET
  if (secret) {
    await fetchCheck("Sales health", `${BASE_URL}/api/sales/health`, {
      timeoutMs: 30_000,
      headers: { "X-Webhook-Secret": secret },
    })
  } else {
    warn("Sales health skipped; no local shared secret available")
  }
}

async function main() {
  checkStaticReleaseRules()
  checkSyntax()
  if (PRE_DEPLOY) {
    checkGitHygiene()
    checkPreDeployRemote()
  }
  if (POST_DEPLOY) {
    checkTraefikRouteDrift()
    await checkPostDeployUrls()
  }

  if (failures.length > 0) {
    console.error(`\n[release-doctor] blocked release with ${failures.length} failure(s)`)
    process.exit(1)
  }
  console.log("\n[release-doctor] release gate passed")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
