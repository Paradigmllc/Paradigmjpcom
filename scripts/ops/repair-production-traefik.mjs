#!/usr/bin/env node

import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"

const COOLIFY_URL = (process.env.COOLIFY_API_URL || "https://coolify.paradigmjp.com").replace(/\/+$/, "")
const TOKEN = process.env.COOLIFY_API_TOKEN
const APP_UUID = process.env.PARADIGM_APP_UUID || "n8i2sjiqvr2d8hrzppop2m2i"
const SERVER = { name: "paradigm-prod-01", ip: "178.105.138.55", user: "root", port: 22 }
const VERIFY_PUBLIC = process.env.PARADIGM_REPAIR_VERIFY !== "0"
const EVIDENCE_PATH = process.env.TRAEFIK_REPAIR_EVIDENCE_PATH || "/tmp/traefik-route-repair.json"

if (!TOKEN) throw new Error("COOLIFY_API_TOKEN is missing")

async function api(pathname) {
  const response = await fetch(`${COOLIFY_URL}/api/v1${pathname}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`${pathname} -> HTTP ${response.status}: ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : null
}

function arrayData(value) {
  return Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : []
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    timeout: options.timeout ?? 30_000,
    maxBuffer: 1024 * 1024 * 8,
    ...options,
  })
}

async function materializeKeys() {
  const rows = arrayData(await api("/security/keys"))
  if (rows.length === 0) throw new Error("Coolify returned no SSH keys")
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "paradigm-coolify-keys-"))
  const candidates = []
  for (const row of rows) {
    if (!row?.uuid) continue
    let detail = row
    if (typeof detail.private_key !== "string" || !detail.private_key.includes("PRIVATE KEY")) {
      try {
        detail = await api(`/security/keys/${encodeURIComponent(row.uuid)}`)
      } catch (error) {
        console.warn(`Key detail unavailable for ${row.uuid}: ${error instanceof Error ? error.message : String(error)}`)
        continue
      }
    }
    const key = typeof detail.private_key === "string" ? detail.private_key.trim() : ""
    if (!key.includes("PRIVATE KEY")) {
      console.warn(`Key ${detail.name || row.uuid} has no readable private material`)
      continue
    }
    const file = path.join(directory, `key-${String(candidates.length).padStart(2, "0")}`)
    fs.writeFileSync(file, `${key}\n`, { mode: 0o600 })
    candidates.push({ file, name: detail.name || row.name || row.uuid })
  }
  if (candidates.length === 0) throw new Error("No readable Coolify SSH key returned; token needs read:sensitive permission")
  console.log(`Known production host: ${SERVER.name}; readable SSH candidates=${candidates.length}`)
  return { directory, candidates }
}

function selectWorkingKey(candidates) {
  for (const candidate of candidates) {
    const result = run("ssh", [
      "-i", candidate.file,
      "-p", String(SERVER.port),
      "-o", "IdentitiesOnly=yes",
      "-o", "StrictHostKeyChecking=no",
      "-o", "UserKnownHostsFile=/dev/null",
      "-o", "ConnectTimeout=15",
      `${SERVER.user}@${SERVER.ip}`,
      "printf production-ssh-ok",
    ], { timeout: 20_000 })
    if (result.status === 0 && result.stdout.includes("production-ssh-ok")) {
      console.log(`Production SSH authenticated with registered key: ${candidate.name}`)
      return candidate
    }
  }
  throw new Error("None of the Coolify-registered SSH keys authenticated to production")
}

function repairRoute(key) {
  const remoteScript = String.raw`set -euo pipefail
app_uuid='${APP_UUID}'
route_file='/data/coolify/proxy/dynamic/paradigmjp.yml'
test -f "$route_file" || { echo 'Traefik route file missing'; exit 1; }
container="$(docker ps --filter "name=$app_uuid" --filter status=running --format '{{.Names}}' | head -n1)"
test -n "$container" || { echo 'Live application container missing'; exit 1; }
new_ip="$(docker inspect "$container" --format '{{with index .NetworkSettings.Networks "coolify"}}{{.IPAddress}}{{end}}')"
test -n "$new_ip" || { echo 'Live application coolify-network IP missing'; exit 1; }
docker exec "$container" sh -lc 'wget -qO- http://127.0.0.1:3000/api/ready >/dev/null 2>&1 || curl -fsS http://127.0.0.1:3000/api/ready >/dev/null'
python3 - "$route_file" "$new_ip" <<'PY'
import json, os, re, stat, sys, tempfile
from pathlib import Path
route = Path(sys.argv[1])
new_ip = sys.argv[2]
text = route.read_text(encoding='utf-8')
marker = text.find('paradigmhp-svc:')
if marker < 0:
    raise SystemExit('paradigmhp-svc marker not found')
prefix, tail = text[:marker], text[marker:]
match = re.search(r'(?m)^(\s*-\s*url:\s*)https?://[^\s]+:3000\s*$', tail)
if not match:
    raise SystemExit('paradigmhp-svc upstream not found')
old_url = match.group(0).split('url:', 1)[1].strip()
new_url = f'http://{new_ip}:3000'
updated = prefix + tail[:match.start()] + f"{match.group(1)}{new_url}" + tail[match.end():]
changed = updated != text
if changed:
    st = route.stat()
    fd, temporary = tempfile.mkstemp(prefix=f'.{route.name}.', dir=route.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as handle:
            handle.write(updated)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, stat.S_IMODE(st.st_mode))
        try:
            os.chown(temporary, st.st_uid, st.st_gid)
        except PermissionError:
            pass
        os.replace(temporary, route)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
print(json.dumps({'container': sys.argv[2], 'old_url': old_url, 'new_url': new_url, 'changed': changed}))
PY
sleep 5
echo "ROUTE_REPAIR_CONTAINER=$container"
echo "ROUTE_REPAIR_IP=$new_ip"
echo 'Host route repair complete'`

  const result = run("ssh", [
    "-i", key.file,
    "-p", String(SERVER.port),
    "-o", "IdentitiesOnly=yes",
    "-o", "StrictHostKeyChecking=no",
    "-o", "UserKnownHostsFile=/dev/null",
    "-o", "ConnectTimeout=20",
    `${SERVER.user}@${SERVER.ip}`,
    "bash -s",
  ], { input: remoteScript, timeout: 120_000 })
  if (result.stdout) console.log(result.stdout.trim())
  if (result.status !== 0) throw new Error(`Host route repair failed: ${(result.stderr || result.stdout || "unknown").slice(-1000)}`)

  const container = result.stdout.match(/^ROUTE_REPAIR_CONTAINER=(.+)$/m)?.[1]?.trim() || null
  const ip = result.stdout.match(/^ROUTE_REPAIR_IP=(.+)$/m)?.[1]?.trim() || null
  return { container, ip, key_name: key.name }
}

function compactVisibleText(input) {
  return String(input)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, "")
}

async function verifyPublicRoutes() {
  const site = "https://paradigmjp.com"
  const pages = [
    ["/ja/video-as-a-service", ["動画制作チームを、採用せずに。", "$1,500", "$3,500", "$5,500", "契約前によくある質問"]],
    ["/en/video-as-a-service", ["Your on-demand video production team.", "$1,500", "$3,500", "$5,500", "Questions before you subscribe"]],
    ["/ja/video-as-a-service/terms", ["Video as a Service 利用規約", "2026年7月28日", "契約文書の優先順位"]],
    ["/en/video-as-a-service/terms", ["Video as a Service Terms", "July 28, 2026", "Order of precedence"]],
    ["/ja/contact?intent=video-as-a-service&plan=unlimited", ["Video as a Service 申込み", "希望プラン", "Unlimited", "素材の準備状況"]],
    ["/en/contact?intent=video-as-a-service&plan=unlimited", ["Apply for Video as a Service", "Preferred plan", "Unlimited", "Asset readiness"]],
    ["/api/ready", []],
  ]
  for (const [pathname, markers] of pages) {
    let passed = false
    for (let attempt = 1; attempt <= 30; attempt += 1) {
      try {
        const url = new URL(pathname, site)
        url.searchParams.set("host_repair", String(Date.now()))
        const response = await fetch(url, {
          headers: { "Cache-Control": "no-cache" },
          signal: AbortSignal.timeout(30_000),
        })
        const body = compactVisibleText(await response.text())
        const missing = markers.filter((marker) => !body.includes(compactVisibleText(marker)))
        console.log(`${pathname} ${attempt}/30 -> HTTP ${response.status}; missing=${missing.length}`)
        if (response.ok && missing.length === 0) {
          passed = true
          break
        }
      } catch (error) {
        console.warn(`${pathname} ${attempt}/30 -> ${error instanceof Error ? error.message : String(error)}`)
      }
      await new Promise((resolve) => setTimeout(resolve, 5_000))
    }
    if (!passed) throw new Error(`${pathname} production verification failed`)
  }
}

const { directory, candidates } = await materializeKeys()
try {
  const key = selectWorkingKey(candidates)
  const evidence = {
    checked_at: new Date().toISOString(),
    app_uuid: APP_UUID,
    server: SERVER,
    ...(repairRoute(key)),
  }
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`)
  if (VERIFY_PUBLIC) await verifyPublicRoutes()
  console.log("PRODUCTION TRAEFIK REPAIR PASSED")
} finally {
  fs.rmSync(directory, { recursive: true, force: true })
}
