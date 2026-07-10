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
import { lookup } from "node:dns/promises"
import { isIP } from "node:net"
import { readCoolifyApplicationEnvs } from "./lib/coolify-env.mjs"
import { sshArgs } from "./lib/ssh-options.mjs"

const args = new Set(process.argv.slice(2))
const PRE_DEPLOY = args.has("--pre-deploy") || (!args.has("--post-deploy") && !args.has("--local-only"))
const POST_DEPLOY = args.has("--post-deploy")
const LOCAL_ONLY = args.has("--local-only")
const ALLOW_DIRTY = args.has("--allow-dirty")
const SKIP_REMOTE = args.has("--skip-remote") || process.env.RELEASE_DOCTOR_SKIP_REMOTE === "1"

const BASE_URL = (process.env.RELEASE_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://paradigmjp.com").replace(/\/+$/, "")
const TWENTY_URL = (process.env.RELEASE_TWENTY_URL || "https://twenty.paradigmjp.com").replace(/\/+$/, "")
const REPORT_PATH = process.env.RELEASE_REPORT_SMOKE_PATH || "/en/report/ccbc-xynd21"
const DEPLOY_HOST = process.env.PARADIGM_DEPLOY_HOST || "paradigm-droplet"
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

  const githubDeployWorkflow = fs.readFileSync(
    ".github/workflows/coolify-deploy.yml",
    "utf8",
  )
  if (
    githubDeployWorkflow.includes("Block deploys that bypass the production release gate") &&
    !githubDeployWorkflow.includes("/api/v1/deploy") &&
    !githubDeployWorkflow.includes("sales-os-no-login-deploy")
  ) {
    pass("GitHub Actions cannot bypass release:prod")
  } else {
    fail("GitHub Actions must not expose a direct Coolify deployment path")
  }

  const legacyDeployEntrypoint = fs.readFileSync("scripts/deploy.mjs", "utf8")
  if (
    legacyDeployEntrypoint.includes("Direct deployment is disabled") &&
    !legacyDeployEntrypoint.includes("/api/v1/deploy") &&
    !legacyDeployEntrypoint.includes("createCoolifyClient")
  ) {
    pass("legacy deploy entrypoint cannot bypass release:prod")
  } else {
    fail("scripts/deploy.mjs must not expose a direct Coolify deployment path")
  }

  const noLoginDeploy = fs.readFileSync("scripts/sales-os-no-login-deploy.mjs", "utf8")
  if (/cancelDeploy\(uuid,\s*"poll timeout"\)/.test(noLoginDeploy)) {
    fail("sales-os-no-login-deploy still cancels deployments on monitor timeout")
  } else if (noLoginDeploy.includes("CANCEL_ON_TIMEOUT")) {
    pass("timeout cancellation is opt-in only")
  } else {
    fail("sales-os-no-login-deploy timeout behavior is not explicit")
  }
  const originLockHelperPath = "scripts/lib/refresh-traefik-origin-lock.py"
  const originLockHelper = fs.existsSync(originLockHelperPath)
    ? fs.readFileSync(originLockHelperPath, "utf8")
    : ""
  const prepareCall = noLoginDeploy.lastIndexOf("prepareManualTraefikOriginLock()")
  const deployCall = noLoginDeploy.indexOf("const uuid = await triggerDeploy()")
  const applyCall = noLoginDeploy.lastIndexOf("refreshManualTraefikRoute()")
  if (
    prepareCall >= 0 &&
    deployCall > prepareCall &&
    applyCall > deployCall &&
    noLoginDeploy.includes("python3 - --prepare") &&
    noLoginDeploy.includes("python3 - --apply")
  ) {
    pass("deploy validates and caches Cloudflare CIDRs before replacing the app container")
  } else {
    fail("deploy must prepare Cloudflare CIDRs before deploy and atomically apply them afterward")
  }
  const applyHelperBody = originLockHelper.match(
    /def apply_cached_origin_lock\([\s\S]*?(?:\r?\n){2,}def main\(/,
  )?.[0] ?? ""
  if (
    noLoginDeploy.includes("refresh-traefik-origin-lock.py") &&
    originLockHelper.includes("https://api.cloudflare.com/client/v4/ips") &&
    originLockHelper.includes("CACHE_MAX_AGE_SECONDS") &&
    originLockHelper.includes("prepare_cloudflare_cache") &&
    originLockHelper.includes("load_cached_ranges") &&
    originLockHelper.includes("--prepare") &&
    originLockHelper.includes("--apply") &&
    originLockHelper.includes("paradigm-cloudflare-only") &&
    originLockHelper.includes("ipAllowList") &&
    originLockHelper.includes("paradigmhp-origin-alias-https") &&
    applyHelperBody.includes("load_cached_ranges") &&
    applyHelperBody.includes("atomic_write(") &&
    !applyHelperBody.includes("fetch_cloudflare_ranges(")
  ) {
    pass("post-deploy route refresh uses only a validated cache and one atomic route write")
  } else {
    fail("post-deploy route refresh must not depend on a live Cloudflare API request")
  }
  if (noLoginDeploy.includes("isInternalDataApiUrl") && noLoginDeploy.includes("applySqlMigrationThroughPostgres")) {
    pass("deploy avoids local calls to Docker-internal Supabase REST URLs")
  } else {
    fail("deploy must avoid local calls to Docker-internal Supabase REST URLs")
  }
  const japanEntryProductBlock = noLoginDeploy.match(
    /code:\s*"global_jaas"[\s\S]*?(?=\r?\n  },\r?\n  \{)/,
  )?.[0] ?? ""
  const japanEntryCurrency = japanEntryProductBlock.match(/default_currency:\s*"([A-Z]{3})"/)?.[1]
  const japanEntryAmount = japanEntryProductBlock.match(/default_amount_yen:\s*(\d+)/)?.[1]
  if (japanEntryCurrency === "USD" && japanEntryAmount === "12000") {
    pass("Japan Entry sales product matches the public $12,000 USD offer")
  } else {
    fail("global_jaas must use USD 12000 in the production sales product seed")
  }
  if (
    noLoginDeploy.includes("https://paradigmjp.com/en") &&
    noLoginDeploy.includes("https://paradigmjp.com/en/contact") &&
    noLoginDeploy.includes("Confirm your fit and launch timing") &&
    noLoginDeploy.includes("seedEnglishHomepage") &&
    noLoginDeploy.includes('scope: "homepage-en"')
  ) {
    pass("deploy publishes and smokes the English Japan Entry funnel")
  } else {
    fail("deploy must publish the English CMS homepage and smoke the dedicated application")
  }

  const contactMigrationPath = "supabase/migrations/migration_068_contact_submission_atomicity.sql"
  const contactMigration = fs.existsSync(contactMigrationPath)
    ? fs.readFileSync(contactMigrationPath, "utf8")
    : ""
  const contactIntegrityMarkers = [
    "sales_contact_submissions",
    "sales_create_contact_submission",
    "sales_complete_contact_notification",
    "notification_claim_token",
    "notification_claim_token = p_claim_token",
    "REVOKE ALL ON FUNCTION public.sales_create_contact_submission",
    "sales_atomic_meta_merge(uuid,jsonb) FROM PUBLIC, anon, authenticated",
    "sales_atomic_meta_history_prepend(uuid,text,text,text) FROM PUBLIC, anon, authenticated",
    "sales_atomic_screenshot_append(uuid,text,jsonb) FROM PUBLIC, anon, authenticated",
  ]
  if (
    contactMigration &&
    contactIntegrityMarkers.every((marker) => contactMigration.includes(marker)) &&
    noLoginDeploy.includes("migration_068_contact_submission_atomicity.sql") &&
    noLoginDeploy.includes("applyContactSubmissionAtomicityMigration")
  ) {
    pass("contact ingress has atomic lead/outbox persistence, lease CAS, and RPC ACL hardening")
  } else {
    fail("contact migration/release wiring must enforce atomicity, lease CAS, and service-role-only RPCs")
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
route_file='/data/coolify/proxy/dynamic/paradigmjp.yml'
if [ ! -f "$route_file" ]; then
  echo "FAIL route-file-missing"
  exit 2
fi
container="$(docker ps --filter "name=${APP_UUID.replace(/"/g, '\\"')}" --format '{{.Names}}' | head -n1)"
if [ -z "$container" ]; then
  echo "FAIL app-container-missing"
  exit 3
fi
ip="$(docker inspect "$container" --format '{{with index .NetworkSettings.Networks "coolify"}}{{.IPAddress}}{{end}}')"
python3 - "$route_file" "$container" "$ip" <<'PY'
import ipaddress
import json
import re
import subprocess
import sys
import urllib.request

import yaml

path, container, expected_ip = sys.argv[1:4]
config = yaml.safe_load(open(path, encoding="utf-8"))
http = config.get("http", {})
routers = http.get("routers", {})
middleware = http.get("middlewares", {}).get("paradigm-cloudflare-only", {})
ranges = middleware.get("ipAllowList", {}).get("sourceRange", [])
with urllib.request.urlopen("https://api.cloudflare.com/client/v4/ips", timeout=15) as response:
    cloudflare = json.load(response)
if cloudflare.get("success") is not True:
    raise RuntimeError("Cloudflare IP source failed")
official = set(cloudflare["result"]["ipv4_cidrs"] + cloudflare["result"]["ipv6_cidrs"])
if set(ranges) != official or len(ranges) != len(official):
    raise RuntimeError("Cloudflare middleware ranges are stale or incomplete")
for value in ranges:
    ipaddress.ip_network(value, strict=True)

servers = http.get("services", {}).get("paradigmhp-svc", {}).get("loadBalancer", {}).get("servers", [])
if len(servers) != 1:
    raise RuntimeError("Paradigm upstream is missing")
route_match = re.fullmatch(r"http://([^/:]+):3000", str(servers[0].get("url", "")))
if not route_match or route_match.group(1) not in {expected_ip, container}:
    raise RuntimeError("Paradigm upstream drift detected")

protected = ["paradigmhp-http", "paradigmhp-https", "keystatic-http", "keystatic-https"]
for name, router in routers.items():
    if router.get("service") == "paradigmhp-svc":
        protected.append(name)
for name in set(protected):
    router = routers.get(name)
    if not isinstance(router, dict) or (router.get("middlewares") or [None])[0] != "paradigm-cloudflare-only":
        raise RuntimeError("An app router is missing the Cloudflare middleware")

def rule_hosts(rule):
    hosts = set()
    for call in re.findall(r"Host\\(([^)]*)\\)", str(rule)):
        hosts.update(value.lower() for value in re.findall(r'\\x60([A-Za-z0-9._-]+)\\x60', call))
    return hosts

if rule_hosts(routers["paradigmhp-https"].get("rule")) != {"paradigmjp.com", "www.paradigmjp.com"}:
    raise RuntimeError("Main app host rule is not exact")
if rule_hosts(routers["keystatic-https"].get("rule")) != {"keystatic.paradigmjp.com"}:
    raise RuntimeError("Keystatic host rule is not isolated")

labels = json.loads(subprocess.check_output(
    ["docker", "inspect", container, "--format", "{{json .Config.Labels}}"],
    text=True,
)) or {}
docker_hosts = set()
for key, value in labels.items():
    if re.fullmatch(r"traefik\\.http\\.routers\\.[^.]+\\.rule", str(key)):
        docker_hosts.update(rule_hosts(value))
aliases = docker_hosts - {"paradigmjp.com", "www.paradigmjp.com", "keystatic.paradigmjp.com"}
configured_aliases = set()
for name in ("paradigmhp-origin-alias-http", "paradigmhp-origin-alias-https"):
    if name in routers:
        configured_aliases.update(rule_hosts(routers[name].get("rule")))
if not aliases.issubset(configured_aliases):
    raise RuntimeError("A Docker app alias bypasses the Cloudflare middleware")

print(f"OK origin-lock-current aliases={len(aliases)} ranges={len(ranges)}")
PY
`
  const result = spawnSync("ssh", [...sshArgs(DEPLOY_HOST, { acceptNew: true }), "bash -s"], {
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

async function resolveOriginAddress() {
  const config = run("ssh", ["-G", DEPLOY_HOST])
  if (config.status !== 0) throw new Error("SSH origin configuration is unavailable")
  const hostname = config.output
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/, 2))
    .find(([name]) => name === "hostname")?.[1]
  if (!hostname) throw new Error("SSH origin hostname is unavailable")
  if (isIP(hostname)) return hostname
  const resolved = await lookup(hostname)
  if (!resolved?.address || !isIP(resolved.address)) throw new Error("SSH origin hostname did not resolve")
  return resolved.address
}

function discoverProtectedAppHosts() {
  const script = `
set -euo pipefail
container="$(docker ps --filter "name=${APP_UUID.replace(/"/g, '\\"')}" --format '{{.Names}}' | head -n1)"
if [ -z "$container" ]; then
  exit 2
fi
python3 - "$container" <<'PY'
import json
import re
import subprocess
import sys

container = sys.argv[1]
labels = json.loads(subprocess.check_output(
    ["docker", "inspect", container, "--format", "{{json .Config.Labels}}"],
    text=True,
)) or {}
hosts = {"paradigmjp.com", "www.paradigmjp.com", "keystatic.paradigmjp.com"}
for key, value in labels.items():
    if not re.fullmatch(r"traefik\\.http\\.routers\\.[^.]+\\.rule", str(key)):
        continue
    for call in re.findall(r"Host\\(([^)]*)\\)", str(value)):
        hosts.update(item.lower() for item in re.findall(r'\\x60([A-Za-z0-9._-]+)\\x60', call))
print(json.dumps(sorted(hosts)))
PY
`
  const result = spawnSync("ssh", [...sshArgs(DEPLOY_HOST, { acceptNew: true }), "bash -s"], {
    input: script,
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  })
  if (result.status !== 0 || result.error) throw new Error("Unable to enumerate protected app aliases")
  const parsed = JSON.parse(String(result.stdout || "").trim())
  if (!Array.isArray(parsed) || parsed.length < 3 || parsed.some((value) => typeof value !== "string")) {
    throw new Error("Protected app alias inventory is invalid")
  }
  return [...new Set(parsed)]
}

function probeDirectOrigin(originAddress, hostname, scheme, { forgedCloudflareHeader = false } = {}) {
  const port = scheme === "https" ? 443 : 80
  const curlAddress = originAddress.includes(":") ? `[${originAddress}]` : originAddress
  const commandArgs = [
    "--noproxy",
    "*",
    "--silent",
    "--show-error",
    "--insecure",
    "--output",
    "/dev/null",
    "--write-out",
    "%{http_code}",
    "--connect-timeout",
    "5",
    "--max-time",
    "12",
    "--resolve",
    `${hostname}:${port}:${curlAddress}`,
  ]
  if (forgedCloudflareHeader) commandArgs.push("--header", "CF-Connecting-IP: 203.0.113.10")
  commandArgs.push(`${scheme}://${hostname}/api/ready`)
  const result = spawnSync("curl", commandArgs, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    timeout: 15_000,
  })
  if (result.error?.code === "ENOENT") throw new Error("curl is unavailable")
  const statusCode = String(result.stdout || "").trim()
  return {
    blocked: result.status !== 0 || statusCode === "403",
    unavailable: result.status !== 0 || /^[45]\d\d$/.test(statusCode),
  }
}

async function checkOriginAccessGate() {
  if (LOCAL_ONLY || SKIP_REMOTE) return
  section("Cloudflare origin access")
  try {
    const publicResponse = await fetch("https://paradigmjp.com/api/ready", {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      headers: { "Cache-Control": "no-cache" },
    })
    if (publicResponse.status !== 200 || !publicResponse.headers.get("cf-ray")) {
      fail("Cloudflare public readiness path must return HTTP 200 through a Cloudflare edge")
      return
    }
    pass("Cloudflare public readiness path returns HTTP 200")

    const originAddress = await resolveOriginAddress()
    const protectedHosts = discoverProtectedAppHosts()
    const directHttp = probeDirectOrigin(originAddress, "paradigmjp.com", "http")
    if (!directHttp.blocked) {
      fail("direct origin HTTP remains reachable")
      return
    }
    pass("direct origin HTTP is blocked")

    for (let index = 0; index < protectedHosts.length; index += 1) {
      const hostname = protectedHosts[index]
      const directHttps = probeDirectOrigin(originAddress, hostname, "https")
      const forgedHttps = probeDirectOrigin(originAddress, hostname, "https", {
        forgedCloudflareHeader: true,
      })
      if (!directHttps.blocked || !forgedHttps.blocked) {
        fail(`protected app alias ${index + 1} remains reachable at the origin`)
        return
      }
    }
    pass(`direct origin HTTPS and forged Cloudflare headers are blocked for ${protectedHosts.length} app host rules`)

    const unknownHost = probeDirectOrigin(originAddress, "origin-lock.invalid", "https", {
      forgedCloudflareHeader: true,
    })
    if (!unknownHost.unavailable) {
      fail("an unknown Host header reaches a live origin route")
      return
    }
    pass("unknown Host headers do not reach the application")
  } catch (error) {
    fail(`Cloudflare origin gate failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function checkRemoteInfraDrift() {
  if (LOCAL_ONLY || SKIP_REMOTE) return
  section("Revenue OS infra drift")
  const script = `
set -euo pipefail
fail=0

wal_level="$(docker exec supabase-db-1 psql -U postgres -d postgres -Atc "select setting from pg_settings where name='wal_level'" 2>/dev/null || true)"
if [ "$wal_level" = "logical" ]; then
  echo "OK supabase wal_level=logical"
else
  echo "FAIL supabase wal_level=\${wal_level:-unknown}"
  fail=1
fi

if docker ps --format '{{.Names}}' | grep -qx 'supabase-realtime'; then
  realtime_status="$(docker inspect supabase-realtime --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}no-health{{end}}' 2>/dev/null || true)"
  case "$realtime_status" in
    running\\ healthy|running\\ no-health) echo "OK supabase-realtime $realtime_status" ;;
    *) echo "FAIL supabase-realtime $realtime_status"; fail=1 ;;
  esac
else
  echo "FAIL supabase-realtime container missing"
  fail=1
fi

if docker ps --format '{{.Names}}' | grep -qx 'services-n8n-1'; then
  echo "FAIL n8n legacy container is running"
  fail=1
else
  echo "OK n8n legacy container stopped"
fi

twenty_worker_status="$(docker inspect opt-twenty-worker-1 --format '{{.State.Status}}' 2>/dev/null || true)"
twenty_worker_restarts="$(docker inspect opt-twenty-worker-1 --format '{{.RestartCount}}' 2>/dev/null || echo 9999)"
if [ "$twenty_worker_status" = "running" ] && [ "$twenty_worker_restarts" -le 3 ]; then
  echo "OK twenty-worker running restarts=$twenty_worker_restarts"
else
  echo "FAIL twenty-worker status=\${twenty_worker_status:-missing} restarts=$twenty_worker_restarts"
  fail=1
fi

if docker exec supabase-db-1 psql -U postgres -d postgres -Atc "select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sales_pipeline_runs' limit 1" | grep -qx 1; then
  echo "OK sales_pipeline_runs published to supabase_realtime"
else
  echo "FAIL sales_pipeline_runs not published to supabase_realtime"
  fail=1
fi

if [ "${POST_DEPLOY ? "1" : "0"}" = "1" ]; then
  contact_db_guard="$(docker exec supabase-db-1 psql -U postgres -d postgres -Atc "
select case when
  to_regclass('public.sales_contact_submissions') is not null
  and to_regprocedure('public.sales_create_contact_submission(text,text,jsonb,jsonb)') is not null
  and to_regprocedure('public.sales_complete_contact_notification(text,uuid,text,text)') is not null
  and has_function_privilege('service_role', to_regprocedure('public.sales_create_contact_submission(text,text,jsonb,jsonb)'), 'EXECUTE')
  and not has_function_privilege('anon', to_regprocedure('public.sales_create_contact_submission(text,text,jsonb,jsonb)'), 'EXECUTE')
  and not has_function_privilege('authenticated', to_regprocedure('public.sales_create_contact_submission(text,text,jsonb,jsonb)'), 'EXECUTE')
  and not has_function_privilege('anon', to_regprocedure('public.sales_atomic_meta_merge(uuid,jsonb)'), 'EXECUTE')
  and not has_function_privilege('anon', to_regprocedure('public.sales_atomic_meta_history_prepend(uuid,text,text,text)'), 'EXECUTE')
  and not has_function_privilege('anon', to_regprocedure('public.sales_atomic_screenshot_append(uuid,text,jsonb)'), 'EXECUTE')
then 1 else 0 end;
" 2>/dev/null || true)"
  if [ "$contact_db_guard" = "1" ]; then
    echo "OK contact ingress table/RPC ACL/CAS guard"
  else
    echo "FAIL contact ingress table/RPC ACL/CAS guard"
    fail=1
  fi
else
  echo "OK contact ingress guard deferred to post-deploy after migration apply"
fi

exit "$fail"
`
  const result = spawnSync("ssh", [...sshArgs(DEPLOY_HOST, { acceptNew: true }), "bash -s"], {
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
    fail("Revenue OS infra drift detected")
    return
  }
  pass("Revenue OS infra drift checks passed")
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
  checkRemoteInfraDrift()
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
  const expectedMarkers = options.mustContain
    ? Array.isArray(options.mustContain)
      ? options.mustContain
      : [options.mustContain]
    : []
  const missingMarkers = expectedMarkers.filter((marker) => !text.includes(marker))
  if (missingMarkers.length > 0) {
    fail(`${label} did not contain expected marker(s): ${missingMarkers.join(", ")}`)
    return
  }
  pass(`${label} HTTP ${res.status}`)
}

async function resolveSalesHealthSecret() {
  const local =
    process.env.TRIGGER_WEBHOOK_SECRET ||
    process.env.SALES_API_SECRET ||
    process.env.INTERNAL_API_SECRET
  if (local) return local

  try {
    const envs = await readCoolifyApplicationEnvs(APP_UUID)
    return envs.TRIGGER_WEBHOOK_SECRET || envs.SALES_API_SECRET || envs.INTERNAL_API_SECRET || null
  } catch (error) {
    warn(`Sales health secret lookup from Coolify env failed: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

async function checkSalesHealth() {
  const secret = await resolveSalesHealthSecret()
  if (!secret) {
    fail("Sales health secret is unavailable; release cannot prove Revenue OS health")
    return
  }

  let res
  try {
    res = await fetch(`${BASE_URL}/api/sales/health`, {
      signal: AbortSignal.timeout(30_000),
      headers: { "X-Webhook-Secret": secret },
    })
  } catch (error) {
    fail(`Sales health fetch failed: ${error instanceof Error ? error.message : String(error)}`)
    return
  }

  const text = await res.text().catch(() => "")
  if (res.status < 200 || res.status >= 400) {
    fail(`Sales health returned HTTP ${res.status}`)
    return
  }

  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    fail("Sales health did not return JSON")
    return
  }

  if (!body || body.ok !== true) {
    const checks = Array.isArray(body?.checks)
      ? body.checks
          .filter((check) => check?.status === "error")
          .map((check) => `${check.name}: ${check.detail}`)
          .slice(0, 5)
      : []
    fail(`Sales health JSON is not ok${checks.length > 0 ? ` (${checks.join("; ")})` : ""}`)
    return
  }

  pass(`Sales health HTTP ${res.status} JSON ok`)
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
  await fetchCheck("English Japan Entry homepage", `${BASE_URL}/en`, {
    timeoutMs: 20_000,
    mustContain: [
      "Launch in Japan without hiring a local team",
      "$12,000",
      "Apply for Japan Entry",
    ],
  })
  await fetchCheck(
    "Japan Entry application",
    `${BASE_URL}/en/contact`,
    {
      timeoutMs: 20_000,
      mustContain: [
        "Japan Entry package.",
        "Confirm your fit and launch timing",
        "$12,000 fixed setup",
      ],
    },
  )
  const maintainedPages = [
    ["About", "/en/about"],
    ["Pricing", "/en/pricing"],
    ["FAQ", "/en/faq"],
    ["Works", "/en/works"],
    ["Blog", "/en/blog"],
    ["Privacy", "/en/privacy"],
    ["Legal", "/en/legal"],
  ]
  for (const [label, path] of maintainedPages) {
    await fetchCheck(`English ${label}`, `${BASE_URL}${path}`, {
      timeoutMs: 20_000,
    })
  }
  await fetchCheck("Revenue OS dashboard", `${BASE_URL}/ja/admin/sales`, { timeoutMs: 20_000 })
  await fetchCheck("diagnostic report value URL", `${BASE_URL}${REPORT_PATH}`, {
    timeoutMs: 25_000,
    rejectReportError: true,
  })
  await fetchCheck("Twenty", TWENTY_URL, { timeoutMs: 20_000 })

  await checkSalesHealth()
}

async function checkPublicFunnelEnvironment() {
  if (LOCAL_ONLY || SKIP_REMOTE) return
  section("Public funnel environment")
  try {
    const envs = await readCoolifyApplicationEnvs(APP_UUID)
    const hasMinimumSecret = (name) =>
      typeof envs[name] === "string" && envs[name].trim().length >= 16
    if (hasMinimumSecret("ADMIN_SCRIPT_SECRET")) {
      pass("English CMS publish secret is configured")
    } else {
      fail("ADMIN_SCRIPT_SECRET must be configured for the English CMS publish gate")
    }
    if (
      typeof envs.CONTACT_FORM_CHALLENGE_SECRET === "string" &&
      envs.CONTACT_FORM_CHALLENGE_SECRET.trim().length >= 32
    ) {
      pass("dedicated contact form challenge secret is configured")
    } else {
      fail("CONTACT_FORM_CHALLENGE_SECRET must contain at least 32 characters")
    }
    if (String(envs.TRUSTED_PROXY_MODE || "").trim().toLowerCase() === "cloudflare") {
      pass("public API client IPs trust Cloudflare only")
    } else {
      fail("TRUSTED_PROXY_MODE=cloudflare is required for public API rate limits")
    }
    if (/^(1|true|yes)$/i.test(String(envs.CLOUDFLARE_ORIGIN_LOCKED || "").trim())) {
      pass("Cloudflare-only origin access is attested")
    } else {
      fail("CLOUDFLARE_ORIGIN_LOCKED=1 must attest that direct origin access is blocked")
    }
    const hasTurnstile =
      hasMinimumSecret("TURNSTILE_SECRET_KEY") &&
      typeof envs.NEXT_PUBLIC_TURNSTILE_SITE_KEY === "string" &&
      envs.NEXT_PUBLIC_TURNSTILE_SITE_KEY.trim().length > 0
    if (!hasTurnstile) {
      fail("TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY are required in production")
    } else {
      pass("Turnstile production keys are configured")
    }
  } catch (error) {
    fail(`public funnel env lookup failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function main() {
  checkStaticReleaseRules()
  checkSyntax()
  if (PRE_DEPLOY) {
    checkGitHygiene()
    checkPreDeployRemote()
    await checkOriginAccessGate()
    await checkPublicFunnelEnvironment()
  }
  if (POST_DEPLOY) {
    checkTraefikRouteDrift()
    await checkOriginAccessGate()
    checkRemoteInfraDrift()
    await checkPublicFunnelEnvironment()
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
