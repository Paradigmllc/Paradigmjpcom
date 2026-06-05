#!/usr/bin/env node
/**
 * Run the Sales OS release path without logging in to Coolify UI.
 *
 * Secrets are read from environment variables or local MCP backups and are
 * never printed. A deployment webhook HTTP 200 only means queued; this script
 * also polls deployment state and smoke-checks public URLs.
 */

import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"

function envValue(name, fallback = null) {
  const value = process.env[name]
  if (typeof value === "string" && value.trim().length > 0) return value.trim()
  return fallback
}

const APP_UUID = envValue("PARADIGM_APP_UUID", "i12am4vvcbggefnqdizhnv9a")
const DEFAULT_COOLIFY_URL = "https://coolify.appexx.me"
const DRY = process.argv.includes("--dry")
const SKIP_DEPLOY = process.argv.includes("--skip-deploy")
const SKIP_HOST_PREFLIGHT = process.argv.includes("--skip-host-preflight")

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
  } catch (error) {
    console.warn(`Skipped unreadable JSON backup ${path.basename(file)}: ${error instanceof Error ? error.message : String(error)}`)
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
  const token = envValue("COOLIFY_API_TOKEN")
  if (token) {
    return {
      token,
      baseUrl: envValue("COOLIFY_API_URL", DEFAULT_COOLIFY_URL),
    }
  }
  const backup = findCoolifyFromMcpBackup()
  if (backup) return backup
  throw new Error("COOLIFY_API_TOKEN is not set and no local MCP backup token was found")
}

function runHostDiskPreflight() {
  if (SKIP_HOST_PREFLIGHT) {
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
  if (result.status !== 0) {
    throw new Error("Host disk preflight failed; refusing deployment")
  }
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
    if (!names.has(product.display_name)) throw new Error(`Sales product verify missed ${product.display_name}`)
  }
  return json.length
}

async function applySqlMigration(envs, fileName, label) {
  const { url, key } = salesSupabase(envs)
  const sqlPath = path.join(process.cwd(), "supabase", fileName)
  if (!fs.existsSync(sqlPath)) return `${label}: local SQL file missing`
  const sql = fs.readFileSync(sqlPath, "utf8")
  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  })
  if (res.ok) return `${label}: applied`
  const text = await res.text()
  if (res.status === 404 || /function.*exec_sql|schema cache/i.test(text)) {
    return `${label}: exec_sql unavailable; apply SQL through the DB channel`
  }
  if (/already exists|duplicate/i.test(text)) return `${label}: already applied`
  throw new Error(`${label} failed: HTTP ${res.status} ${text.slice(0, 180)}`)
}

async function applyContentTemplateMigration(envs) {
  return applySqlMigration(envs, "migration_022_sales_content_templates.sql", "Content template migration")
}

async function applyAgentTeamMigration(envs) {
  return applySqlMigration(envs, "migration_023_sales_agent_team.sql", "Agent team migration")
}

async function applyIntegrationStatusMigration(envs) {
  return applySqlMigration(envs, "migration_024_sales_integration_status.sql", "Integration status migration")
}

async function applyRuntimeHardeningMigration(envs) {
  return applySqlMigration(envs, "migration_025_sales_runtime_hardening.sql", "Runtime hardening migration")
}

async function applyVideoPipelineMigration(envs) {
  return applySqlMigration(envs, "migration_026_sales_video_pipeline.sql", "Video pipeline migration")
}

async function applyVideoStrategyMigration(envs) {
  return applySqlMigration(envs, "migration_027_sales_video_segments_loss_guard.sql", "Video strategy migration")
}

async function applyVideoProductionMigration(envs) {
  return applySqlMigration(envs, "migration_028_sales_video_production_profiles_r2.sql", "Video production profile migration")
}

async function applyCrmFieldMasterMigration(envs) {
  return applySqlMigration(envs, "migration_029_sales_crm_field_master.sql", "CRM field master migration")
}

async function applySourceTechMetricsMigration(envs) {
  return applySqlMigration(envs, "migration_030_sales_source_tech_metrics.sql", "Source tech metrics migration")
}

async function applyMonthlyLeadBatchMigration(envs) {
  return applySqlMigration(envs, "migration_031_sales_monthly_lead_batches.sql", "Monthly lead batch migration")
}

async function applySearxngSearchRunsMigration(envs) {
  return applySqlMigration(envs, "migration_032_sales_searxng_search_runs.sql", "SearxNG search runs migration")
}

async function applyJapanReadinessInsightsMigration(envs) {
  return applySqlMigration(envs, "migration_033_sales_japan_readiness_insights.sql", "Japan readiness insights migration")
}

async function applyPostOutreachToolsMigration(envs) {
  return applySqlMigration(envs, "migration_034_sales_post_outreach_tools.sql", "Post-outreach OSS tools migration")
}

async function applyExternalStudioSyncMigration(envs) {
  return applySqlMigration(envs, "migration_035_sales_external_studio_sync.sql", "External studio sync migration")
}

async function applySalesOsPipelineMigration(envs) {
  return applySqlMigration(envs, "migration_036_sales_os_pipeline.sql", "Sales OS pipeline migration")
}

async function applySalesPipelineOutreachLinksMigration(envs) {
  return applySqlMigration(envs, "migration_037_sales_pipeline_outreach_links.sql", "Sales pipeline outreach links migration")
}

function applyContentTemplates(envs) {
  const { url, key } = salesSupabase(envs)
  const result = spawnSync(process.execPath, ["scripts/seed-sales-content-templates.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SALES_SUPABASE_URL: url,
      SALES_SUPABASE_SERVICE_ROLE_KEY: key,
    },
    encoding: "utf8",
  })
  if (result.status === 0) return result.stdout.trim() || "Seeded sales_content_templates"

  const message = `${result.stderr || result.stdout || ""}`.trim()
  if (/sales_content_templates|schema cache|relation|does not exist|404/i.test(message)) {
    return "Content templates: skipped until migration_022 is applied"
  }
  throw new Error(`Content template seed failed: ${message.slice(0, 180)}`)
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

async function refreshIntegrationStatus(envs) {
  const secret = envs.N8N_WEBHOOK_SECRET
  if (!secret || String(secret).trim().length === 0) {
    return "Integration status refresh: skipped; N8N_WEBHOOK_SECRET is not configured"
  }

  const baseUrl = envs.PARADIGMJP_BASE_URL || envs.NEXT_PUBLIC_SITE_URL || "https://paradigmjp.com"
  const endpoint = `${String(baseUrl).replace(/\/+$/, "")}/api/sales/integration-status?live=1`
  const res = await fetch(endpoint, {
    headers: {
      "X-Webhook-Secret": secret,
    },
  })
  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.ok) {
    throw new Error(`Integration status refresh failed: HTTP ${res.status}`)
  }
  const count = Array.isArray(body.integrations) ? body.integrations.length : 0
  return `Integration status refresh: saved ${count} rows`
}

async function main() {
  console.log("Sales OS no-login deploy")
  if (!DRY && !SKIP_DEPLOY) runHostDiskPreflight()
  const envs = await readProductionEnv()
  console.log("Coolify API: connected")

  if (!DRY) {
    const count = await applySalesProducts(envs)
    console.log(`Sales products: verified ${count}`)
    console.log(await applyContentTemplateMigration(envs))
    console.log(await applyAgentTeamMigration(envs))
    console.log(await applyIntegrationStatusMigration(envs))
    console.log(await applyRuntimeHardeningMigration(envs))
    console.log(await applyVideoPipelineMigration(envs))
    console.log(await applyVideoStrategyMigration(envs))
    console.log(await applyVideoProductionMigration(envs))
    console.log(await applyCrmFieldMasterMigration(envs))
    console.log(await applySourceTechMetricsMigration(envs))
    console.log(await applyMonthlyLeadBatchMigration(envs))
    console.log(await applySearxngSearchRunsMigration(envs))
    console.log(await applyJapanReadinessInsightsMigration(envs))
    console.log(await applyPostOutreachToolsMigration(envs))
    console.log(await applyExternalStudioSyncMigration(envs))
    console.log(await applySalesOsPipelineMigration(envs))
    console.log(await applySalesPipelineOutreachLinksMigration(envs))
    console.log(applyContentTemplates(envs))
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

  for (const url of ["https://paradigmjp.com/ja/admin/sales", "https://paradigmjp.com/ja", "https://twenty.paradigmjp.com"]) {
    const status = await smoke(url)
    console.log(`Smoke OK: ${url} HTTP ${status}`)
  }
  if (!DRY) console.log(await refreshIntegrationStatus(envs))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
