#!/usr/bin/env node
/**
 * Run the Sales OS release path without logging in to Coolify UI.
 *
 * Steps:
 * 1. Load Coolify API token from env or local MCP backup.
 * 2. Read production app envs from Coolify.
 * 3. Apply the readable Sales OS product master to Supabase/PostgREST.
 * 4. Trigger and poll the Coolify deployment.
 * 5. Smoke-check the public URLs.
 *
 * Secrets are never printed.
 */

import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const APP_UUID = process.env.PARADIGM_APP_UUID || "i12am4vvcbggefnqdizhnv9a"
const DEFAULT_COOLIFY_URL = "https://coolify.appexx.me"
const DRY = process.argv.includes("--dry")
const SKIP_DEPLOY = process.argv.includes("--skip-deploy")

const PRODUCTS = [
  {
    code: "jp_web_production",
    display_name: "Web制作",
    market_scope: "jp",
    template_variant: "website_diagnostic",
    default_currency: "JPY",
    default_amount_yen: 450000,
    is_subscription: false,
    description: "診断レポートとAstro差し替えデモを起点にした日本向けWeb制作パッケージ。",
    sort_order: 10,
    meta: { primary_market: "japan", delivery: "nextjs_or_astro" },
  },
  {
    code: "jp_dx_package",
    display_name: "DXパッケージ",
    market_scope: "jp",
    template_variant: "outreach",
    default_currency: "JPY",
    default_amount_yen: 650000,
    is_subscription: false,
    description: "営業自動化、業務改善、AI導入をまとめた日本向けDXパッケージ。",
    sort_order: 20,
    meta: { primary_market: "japan", delivery: "n8n_dify_supabase" },
  },
  {
    code: "global_jaas",
    display_name: "Japan Entry Package (JaaS)",
    market_scope: "global",
    template_variant: "japan_entry",
    default_currency: "JPY",
    default_amount_yen: 300000,
    is_subscription: false,
    description: "海外SMB向けの日本市場参入パッケージ。調査、ローカライズ、LP、営業導線をまとめて提供する。",
    sort_order: 30,
    meta: { primary_market: "global", delivery: "lp_localization_ops" },
  },
  {
    code: "global_video_subscription",
    display_name: "動画納品サブスク",
    market_scope: "global",
    template_variant: "video_subscription",
    default_currency: "JPY",
    default_amount_yen: 250000,
    is_subscription: true,
    description: "海外SMB向けの継続動画制作パッケージ。Remotion/OpenMontage/R2配信を前提に短尺動画を継続納品する。",
    sort_order: 40,
    meta: { primary_market: "global", delivery: "remotion_openmontage_r2" },
  },
]

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"))
  } catch {
    return null
  }
}

function findCoolifyFromMcpBackup() {
  const backupDir = path.join(os.homedir(), ".codex", "tmp", "mcp-backups")
  if (!fs.existsSync(backupDir)) return null
  const files = fs
    .readdirSync(backupDir)
    .filter((name) => name.startsWith("mcp.json.bak-"))
    .sort()
    .reverse()

  for (const file of files) {
    const cfg = readJson(path.join(backupDir, file))
    const servers = cfg?.mcpServers || cfg?.servers || {}
    for (const server of Object.values(servers)) {
      const token = server?.env?.COOLIFY_API_TOKEN
      if (typeof token === "string" && token.length > 10) {
        return {
          token,
          baseUrl: server.env.COOLIFY_API_URL || DEFAULT_COOLIFY_URL,
        }
      }
    }
  }
  return null
}

function getCoolifyAuth() {
  const token = process.env.COOLIFY_API_TOKEN
  if (token) {
    return {
      token,
      baseUrl: process.env.COOLIFY_API_URL || DEFAULT_COOLIFY_URL,
    }
  }
  const backup = findCoolifyFromMcpBackup()
  if (backup) return backup
  throw new Error("COOLIFY_API_TOKEN is not set and no local MCP backup token was found")
}

async function coolify(pathname, options = {}) {
  const { token, baseUrl } = getCoolifyAuth()
  const res = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(`Coolify API HTTP ${res.status}`)
  return data
}

async function readProductionEnv() {
  const rows = await coolify(`/api/v1/applications/${APP_UUID}/envs`)
  return Object.fromEntries(rows.map((row) => [row.key, row.real_value || row.value]))
}

function salesSupabase(envs) {
  const url = envs.SALES_SUPABASE_URL || envs.NEXT_PUBLIC_SUPABASE_URL
  const key = envs.SALES_SUPABASE_SERVICE_ROLE_KEY || envs.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Sales Supabase URL/key are missing from Coolify app envs")
  return { url: url.replace(/\/+$/, ""), key }
}

async function applySalesProducts(envs) {
  const { url, key } = salesSupabase(envs)
  const endpoint = `${url}/rest/v1/sales_products?on_conflict=code`
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(PRODUCTS),
  })
  const body = await res.text()
  if (!res.ok) throw new Error(`Sales product upsert failed: HTTP ${res.status} ${body.slice(0, 160)}`)

  const verify = await fetch(
    `${url}/rest/v1/sales_products?select=code,display_name&code=in.(${PRODUCTS.map((p) => p.code).join(",")})`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    },
  )
  const json = await verify.json()
  if (!verify.ok) throw new Error(`Sales product verify failed: HTTP ${verify.status}`)
  const names = new Set(json.map((row) => row.display_name))
  for (const product of PRODUCTS) {
    if (!names.has(product.display_name)) {
      throw new Error(`Sales product verify missed ${product.display_name}`)
    }
  }
  return json.length
}

async function triggerDeploy() {
  const deploy = await coolify(`/api/v1/deploy?uuid=${APP_UUID}&force=true`, { method: "POST" })
  const uuid = deploy?.deployments?.[0]?.deployment_uuid
  if (!uuid) throw new Error("No Coolify deployment UUID returned")
  return uuid
}

async function waitDeploy(uuid) {
  for (let i = 1; i <= 80; i++) {
    await new Promise((resolve) => setTimeout(resolve, 15_000))
    const status = await coolify(`/api/v1/deployments/${uuid}`)
    const state = status?.status || "unknown"
    console.log(`[deploy ${i}/80] ${state}`)
    if (state === "finished" || state === "running:healthy") return state
    if (state === "failed" || state === "error" || state === "cancelled") {
      throw new Error(`Coolify deployment failed: ${state}`)
    }
  }
  throw new Error("Coolify deployment timed out")
}

async function smoke(url) {
  const res = await fetch(url, { redirect: "manual" })
  if (res.status < 200 || res.status >= 400) throw new Error(`${url} returned HTTP ${res.status}`)
  return res.status
}

async function main() {
  console.log("Sales OS no-login deploy")
  const envs = await readProductionEnv()
  console.log("Coolify API: connected")

  if (!DRY) {
    const count = await applySalesProducts(envs)
    console.log(`Sales products: verified ${count}`)
  } else {
    console.log("Dry run: skipped Supabase product upsert")
  }

  if (!DRY && !SKIP_DEPLOY) {
    const uuid = await triggerDeploy()
    console.log(`Deployment queued: ${uuid}`)
    await waitDeploy(uuid)
  } else {
    console.log("Dry/skip mode: skipped Coolify deploy")
  }

  const checks = [
    "https://paradigmjp.com/ja/admin/sales",
    "https://paradigmjp.com/ja",
    "https://twenty.paradigmjp.com",
  ]
  for (const url of checks) {
    const status = await smoke(url)
    console.log(`Smoke OK: ${url} HTTP ${status}`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
