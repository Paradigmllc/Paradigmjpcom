import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { config as loadDotenv } from "dotenv"
import { readCoolifyApplicationEnvs } from "./lib/coolify-env.mjs"

loadDotenv({ quiet: true })

const REPORT_PATH = path.join(process.cwd(), "docs", "knowledge", "video-ops-audit-latest.json")

function envValue(envs, name) {
  const local = process.env[name]
  if (typeof local === "string" && local.trim().length > 0) return local.trim()
  const remote = envs[name]
  return typeof remote === "string" && remote.trim().length > 0 ? remote.trim() : null
}

function mask(value) {
  if (!value) return null
  if (value.length <= 8) return "***"
  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

function validPublicBaseUrl(value) {
  if (!value || value.startsWith("#")) return null
  try {
    const parsed = new URL(value)
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? value.replace(/\/+$/, "") : null
  } catch (error) {
    console.warn("[audit-video-ops] invalid R2 public base URL:", error)
    return null
  }
}

async function fetchJson(url, options = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
    })
    let body = null
    try {
      body = await res.json()
    } catch (error) {
      console.warn(`[audit-video-ops] non-json response from ${url}:`, error)
      body = null
    }
    return { ok: res.ok, status: res.status, body }
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : String(error) }
  }
}

async function auditComfyui(envs) {
  const baseUrl = envValue(envs, "COMFYUI_API_URL") ?? envValue(envs, "COMFYUI_BASE_URL")
  const apiKey = envValue(envs, "COMFYUI_API_KEY")
  const missing = [baseUrl ? null : "COMFYUI_API_URL or COMFYUI_BASE_URL", apiKey ? null : "COMFYUI_API_KEY"].filter(Boolean)
  if (missing.length > 0) return { ok: false, missing, checks: [] }

  const base = baseUrl.replace(/\/+$/, "")
  const headers = { Authorization: `Bearer ${apiKey}`, "X-API-Key": apiKey }
  const stats = await fetchJson(`${base}/system_stats`, { headers, timeoutMs: 20_000 })
  const queue = await fetchJson(`${base}/queue`, { headers, timeoutMs: 20_000 })
  return {
    ok: stats.ok && queue.ok,
    endpoint: base,
    apiKey: mask(apiKey),
    checks: [
      { name: "system_stats", ok: stats.ok, status: stats.status, error: stats.error },
      { name: "queue", ok: queue.ok, status: queue.status, error: queue.error },
    ],
  }
}

async function auditVast(envs) {
  const apiKey = envValue(envs, "VAST_API_KEY")
  if (!apiKey) return { ok: false, missing: ["VAST_API_KEY"], checks: [] }
  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }
  const bundles = await fetchJson("https://console.vast.ai/api/v0/bundles/", {
    method: "POST",
    headers,
    body: JSON.stringify({
      limit: 3,
      type: "on-demand",
      verified: { eq: true },
      rentable: { eq: true },
      rented: { eq: false },
    }),
    timeoutMs: 20_000,
  })
  const instances = await fetchJson("https://console.vast.ai/api/v1/instances", { headers, timeoutMs: 20_000 })
  const offerCount = Array.isArray(bundles.body?.offers) ? bundles.body.offers.length : 0
  const instanceCount = Array.isArray(instances.body?.instances) ? instances.body.instances.length : 0
  return {
    ok: bundles.ok && instances.ok,
    apiKey: mask(apiKey),
    checks: [
      { name: "search_available_gpu_offers", ok: bundles.ok, status: bundles.status, offerCount, error: bundles.error },
      { name: "list_instances", ok: instances.ok, status: instances.status, instanceCount, error: instances.error },
    ],
  }
}

function makeAuditMp4() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "paradigm-video-audit-"))
  const file = path.join(dir, "r2-audit.mp4")
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=black:s=320x180:d=1",
      "-pix_fmt",
      "yuv420p",
      file,
    ],
    { encoding: "utf8" },
  )
  if (result.status !== 0) {
    throw new Error(`ffmpeg audit mp4 generation failed: ${(result.stderr || result.stdout || "").slice(0, 300)}`)
  }
  return file
}

async function auditR2(envs) {
  const bucket = envValue(envs, "CLOUDFLARE_R2_BUCKET") ?? envValue(envs, "R2_BUCKET")
  const accountId = envValue(envs, "CLOUDFLARE_R2_ACCOUNT_ID")
  const accessKeyId = envValue(envs, "CLOUDFLARE_R2_ACCESS_KEY_ID")
  const secretAccessKey = envValue(envs, "CLOUDFLARE_R2_SECRET_ACCESS_KEY")
  const publicBaseUrl = validPublicBaseUrl(envValue(envs, "CLOUDFLARE_R2_PUBLIC_BASE_URL") ?? envValue(envs, "R2_PUBLIC_BASE_URL"))
  const missing = [
    bucket ? null : "CLOUDFLARE_R2_BUCKET or R2_BUCKET",
    accountId ? null : "CLOUDFLARE_R2_ACCOUNT_ID",
    accessKeyId ? null : "CLOUDFLARE_R2_ACCESS_KEY_ID",
    secretAccessKey ? null : "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
  ].filter(Boolean)
  if (missing.length > 0) return { ok: false, missing, checks: [] }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
  const objectKey = `sales-videos/audit/${new Date().toISOString().replace(/[:.]/g, "-")}/r2-audit.mp4`
  const mp4 = makeAuditMp4()
  const body = fs.readFileSync(mp4)
  await client.send(new HeadBucketCommand({ Bucket: bucket }))
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: objectKey, Body: body, ContentType: "video/mp4" }))

  let publicCheck = { ok: false, status: 0, skipped: true }
  let publicUrl = null
  if (publicBaseUrl) {
    publicUrl = `${publicBaseUrl.replace(/\/+$/, "")}/${objectKey}`
    const res = await fetch(publicUrl, { method: "GET", signal: AbortSignal.timeout(20_000) })
    publicCheck = { ok: res.ok, status: res.status, skipped: false }
  }

  return {
    ok: true,
    bucket,
    objectKey,
    publicUrl,
    checks: [
      { name: "head_bucket", ok: true, status: 200 },
      { name: "put_mp4", ok: true, bytes: body.length, contentType: "video/mp4" },
      { name: "public_get", ...publicCheck },
    ],
  }
}

async function main() {
  const envs = await readCoolifyApplicationEnvs()
  for (const [key, value] of Object.entries(envs)) {
    if (typeof value === "string" && value.trim().length > 0 && !process.env[key]) process.env[key] = value.trim()
  }

  const results = {
    auditedAt: new Date().toISOString(),
    source: "Coolify production env + local env override",
    comfyui: await auditComfyui(envs),
    vast: await auditVast(envs),
    r2: await auditR2(envs),
  }
  results.ok = results.comfyui.ok && results.vast.ok && results.r2.ok

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true })
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(results, null, 2)}\n`)

  const summary = {
    ok: results.ok,
    comfyui: results.comfyui.checks,
    vast: results.vast.checks,
    r2: results.r2.checks,
    r2ObjectKey: results.r2.objectKey,
    r2PublicUrl: results.r2.publicUrl,
    report: REPORT_PATH,
  }
  console.log(JSON.stringify(summary, null, 2))
  if (!results.ok) process.exitCode = 1
}

main().catch((error) => {
  console.error("[audit-video-ops] failed:", error)
  process.exitCode = 1
})
