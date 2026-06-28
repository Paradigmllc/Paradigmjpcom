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
import pg from "pg"
import {
  DEFAULT_APP_UUID,
  DEFAULT_COOLIFY_URL,
  getCoolifyAuth as getSharedCoolifyAuth,
} from "./lib/coolify-env.mjs"

function envValue(name, fallback = null) {
  const value = process.env[name]
  if (typeof value === "string" && value.trim().length > 0) return value.trim()
  return fallback
}

const APP_UUID = envValue("PARADIGM_APP_UUID", DEFAULT_APP_UUID)
const DRY = process.argv.includes("--dry")
const SKIP_DEPLOY = process.argv.includes("--skip-deploy")
const SKIP_HOST_PREFLIGHT = process.argv.includes("--skip-host-preflight")
const SKIP_DEPLOY_GUARD = process.argv.includes("--skip-deploy-guard")
const SKIP_DB_VERIFY = process.argv.includes("--skip-db-verify")
const SKIP_DB_SSH_FALLBACK = process.argv.includes("--skip-db-ssh-fallback")
const CANCEL_ON_TIMEOUT = process.argv.includes("--cancel-on-timeout")
let preferDbSshChannel = false
const DEPLOY_HOST = process.env.PARADIGM_DEPLOY_HOST || "root@178.105.138.55"

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
    template_variant: "dx_ai_package",
    default_currency: "JPY",
    default_amount_yen: 650000,
    is_subscription: false,
    description: "営業自動化、業務改善、AI導入をまとめた日本向けDXパッケージ。",
    sort_order: 20,
    meta: { primary_market: "japan", delivery: "trigger_dify_supabase" },
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
  const explicitUrl = envValue("COOLIFY_API_URL") || envValue("COOLIFY_URL")
  if (token && explicitUrl) {
    return {
      token,
      baseUrl: explicitUrl,
    }
  }
  const shared = getSharedCoolifyAuth()
  if (shared) return shared
  if (token) {
    return {
      token,
      baseUrl: DEFAULT_COOLIFY_URL,
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
    signal: options.signal ?? AbortSignal.timeout(30_000),
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
  const envs = new Map()
  const sortedRows = [...rows].sort((a, b) => {
    if (a?.is_preview === b?.is_preview) return 0
    return a?.is_preview ? -1 : 1
  })
  for (const row of sortedRows) {
    if (!row?.key) continue
    const raw = typeof row.real_value === "string" && row.real_value.length > 0 ? row.real_value : row.value
    const value = typeof raw === "string" ? raw.trim().replace(/^['"]|['"]$/g, "") : raw
    if (value !== undefined && value !== null && String(value).trim().length > 0) {
      envs.set(row.key, value)
    }
  }
  return Object.fromEntries(envs)
}

function salesSupabase(envs) {
  const dedicatedPrimary = /^(1|true|yes)$/i.test(String(envs.SALES_SUPABASE_PRIMARY || ""))
  const cloudReady = envs.NEXT_PUBLIC_SUPABASE_URL && envs.SUPABASE_SERVICE_ROLE_KEY
  const dedicatedReady = envs.SALES_SUPABASE_URL && envs.SALES_SUPABASE_SERVICE_ROLE_KEY
  const url = dedicatedPrimary && dedicatedReady ? envs.SALES_SUPABASE_URL : envs.NEXT_PUBLIC_SUPABASE_URL || envs.SALES_SUPABASE_URL
  const key = dedicatedPrimary && dedicatedReady ? envs.SALES_SUPABASE_SERVICE_ROLE_KEY : envs.SUPABASE_SERVICE_ROLE_KEY || envs.SALES_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Sales Supabase URL/key are missing from Coolify app envs")
  return { url: String(url).replace(/\/+$/, ""), key }
}

function isInternalDataApiUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return (
      host === "supabase-rest-1" ||
      host === "kong" ||
      host === "rest" ||
      host.endsWith(".internal") ||
      (!host.includes(".") && !host.endsWith("localhost"))
    )
  } catch {
    return false
  }
}

function quoteSqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

function postgresUri(envs) {
  const candidates = [
    envs.SALES_SUPABASE_DATABASE_URL,
    envs.SUPABASE_DATABASE_URL,
    envs.DATABASE_URI,
    envs.DATABASE_URL,
  ]
  for (const value of candidates) {
    if (typeof value !== "string" || value.trim().length === 0) continue
    const uri = value.trim()
    if (isAllowedSalesPostgresUri(envs, uri)) return uri
    console.warn(`Sales DB migration skipped unsupported Postgres URI host: ${maskPostgresHost(uri)}`)
  }
  return null
}

function isAllowedSalesPostgresUri(envs, uri) {
  try {
    const parsed = new URL(uri)
    const host = parsed.hostname.toLowerCase()
    const dataApiUrl = envs.SALES_SUPABASE_URL || envs.NEXT_PUBLIC_SUPABASE_URL || ""
    if (isInternalDataApiUrl(dataApiUrl) && uri === envs.DATABASE_URI) return true
    const username = decodeURIComponent(parsed.username || "")
    const supabaseUrl = envs.NEXT_PUBLIC_SUPABASE_URL ? new URL(envs.NEXT_PUBLIC_SUPABASE_URL) : null
    const projectRef = supabaseUrl?.hostname?.split(".")[0] || ""
    if (host.endsWith(".pooler.supabase.com") && projectRef && username.includes(projectRef)) return true
    if (host === `db.${projectRef}.supabase.co`) return true
    if (envs.SALES_SUPABASE_DATABASE_URL && uri === envs.SALES_SUPABASE_DATABASE_URL) return true
    if (envs.SUPABASE_DATABASE_URL && uri === envs.SUPABASE_DATABASE_URL) return true
    return false
  } catch {
    return false
  }
}

function maskPostgresHost(uri) {
  try {
    const parsed = new URL(uri)
    return `${parsed.hostname}:${parsed.port || "5432"}`
  } catch {
    return "invalid-uri"
  }
}

async function applySalesProducts(envs) {
  const { url, key } = salesSupabase(envs)
  if (isInternalDataApiUrl(url)) return applySalesProductsThroughPostgres(envs)
  const endpoint = `${url}/rest/v1/sales_products?on_conflict=code`
  let res
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(PRODUCTS),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/fetch failed|ECONN|ENOTFOUND|timed out|aborted/i.test(message)) return applySalesProductsThroughPostgres(envs)
    throw error
  }
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

async function applySalesProductsThroughPostgres(envs) {
  const sql = `
with incoming as (
  select *
  from jsonb_to_recordset(${quoteSqlString(JSON.stringify(PRODUCTS))}::jsonb) as row(
    code text,
    display_name text,
    market_scope text,
    template_variant text,
    default_currency text,
    default_amount_yen integer,
    is_subscription boolean,
    description text,
    sort_order integer,
    meta jsonb
  )
)
insert into public.sales_products (
  code,
  display_name,
  market_scope,
  template_variant,
  default_currency,
  default_amount_yen,
  is_subscription,
  description,
  sort_order,
  meta
)
select
  code,
  display_name,
  market_scope,
  template_variant,
  default_currency,
  default_amount_yen,
  is_subscription,
  description,
  sort_order,
  coalesce(meta, '{}'::jsonb)
from incoming
on conflict (code) do update set
  display_name = excluded.display_name,
  market_scope = excluded.market_scope,
  template_variant = excluded.template_variant,
  default_currency = excluded.default_currency,
  default_amount_yen = excluded.default_amount_yen,
  is_subscription = excluded.is_subscription,
  description = excluded.description,
  sort_order = excluded.sort_order,
  meta = excluded.meta,
  updated_at = now();
notify pgrst, 'reload schema';
`
  await applySqlMigrationThroughPostgres(envs, sql, "Sales products upsert")
  return PRODUCTS.length
}

async function applySqlMigration(envs, fileName, label) {
  const { url, key } = salesSupabase(envs)
  const sqlPath = [
    path.join(process.cwd(), "supabase", fileName),
    path.join(process.cwd(), "supabase", "migrations", fileName),
  ].find((candidate) => fs.existsSync(candidate))
  if (!sqlPath) return `${label}: local SQL file missing`
  const sql = fs.readFileSync(sqlPath, "utf8")
  if (isInternalDataApiUrl(url)) return applySqlMigrationThroughPostgres(envs, sql, label)
  let res
  try {
    res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/fetch failed|ECONN|ENOTFOUND|timed out|aborted/i.test(message)) return applySqlMigrationThroughPostgres(envs, sql, label)
    throw error
  }
  if (res.ok) return `${label}: applied`
  const text = await res.text()
  if (res.status === 404 || /function.*exec_sql|schema cache/i.test(text)) {
    return applySqlMigrationThroughPostgres(envs, sql, label)
  }
  if (/already exists|duplicate/i.test(text)) return `${label}: already applied`
  throw new Error(`${label} failed: HTTP ${res.status} ${text.slice(0, 180)}`)
}

async function applySqlMigrationThroughPostgres(envs, sql, label) {
  const connectionString = postgresUri(envs)
  if (preferDbSshChannel && !SKIP_DB_SSH_FALLBACK) return applySqlMigrationThroughHost(sql, label)
  if (!connectionString) return applySqlMigrationThroughHost(sql, label)

  const client = new pg.Client({
    connectionString,
    ssl: isInternalDataApiUrl(envs.SALES_SUPABASE_URL || envs.NEXT_PUBLIC_SUPABASE_URL || "") ? undefined : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
    query_timeout: 90_000,
    statement_timeout: 90_000,
  })
  try {
    await client.connect()
    await client.query("SET search_path TO public, extensions")
    await client.query("SET lock_timeout TO '10s'")
    await client.query("SET statement_timeout TO '60s'")
    await client.query(sql)
    await client.query("NOTIFY pgrst, 'reload schema';")
    return `${label}: applied through direct Postgres channel`
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/already exists|duplicate/i.test(message)) return `${label}: already applied`
    if (/must be owner|permission denied|insufficient privilege/i.test(message)) {
      return `${label}: skipped by direct Postgres channel (${message.slice(0, 160)})`
    }
    if (!SKIP_DB_SSH_FALLBACK && /ECONN|timeout|does not support SSL|ENOTFOUND|connect/i.test(message)) {
      console.warn(`${label}: direct Postgres unavailable; retrying through DB SSH channel`)
      preferDbSshChannel = true
      return applySqlMigrationThroughHost(sql, label)
    }
    throw new Error(`${label} direct Postgres fallback failed: ${message.slice(0, 240)}`)
  } finally {
    await client.end().catch((error) => {
      console.warn(`Postgres close failed for ${label}: ${error instanceof Error ? error.message : String(error)}`)
    })
  }
}

function applySqlMigrationThroughHost(sql, label) {
  if (SKIP_DB_SSH_FALLBACK) return `${label}: exec_sql unavailable; DB SSH fallback skipped`

  const sshTarget = envValue("PARADIGM_SUPABASE_SSH_TARGET", "root@178.105.138.55")
  const dbContainer = resolveSupabaseDbContainer(sshTarget)
  const commonArgs = ["-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new", sshTarget]
  const apply = spawnSync(
    "ssh",
    [
      ...commonArgs,
      "docker",
      "exec",
      "-i",
      dbContainer,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
    ],
    { input: sql, encoding: "utf8", maxBuffer: 1024 * 1024 * 12 },
  )
  if (apply.status !== 0) {
    const detail = `${apply.stderr || apply.stdout || ""}`.trim()
    throw new Error(`${label} DB SSH fallback failed: ${detail.slice(0, 300)}`)
  }

  const reload = spawnSync(
    "ssh",
    [
      ...commonArgs,
      `docker exec ${dbContainer} psql -U postgres -d postgres -c "NOTIFY pgrst, 'reload schema';"`,
    ],
    { encoding: "utf8", maxBuffer: 1024 * 1024 },
  )
  if (reload.status !== 0) {
    const detail = `${reload.stderr || reload.stdout || ""}`.trim()
    throw new Error(`${label} schema reload failed: ${detail.slice(0, 300)}`)
  }
  return `${label}: applied through DB SSH channel`
}

function resolveSupabaseDbContainer(sshTarget) {
  const explicit = envValue("PARADIGM_SUPABASE_DB_CONTAINER")
  if (explicit) return explicit

  const result = spawnSync(
    "ssh",
    [
      "-o",
      "BatchMode=yes",
      "-o",
      "StrictHostKeyChecking=accept-new",
      sshTarget,
      "docker ps --format '{{.Names}}\t{{.Image}}'",
    ],
    {
      encoding: "utf8",
      timeout: 15_000,
      maxBuffer: 1024 * 1024,
    },
  )
  if (result.error) throw result.error
  if (result.status !== 0) {
    const detail = `${result.stderr || result.stdout || ""}`.trim()
    throw new Error(`Could not list host containers: ${detail.slice(0, 180)}`)
  }

  const rows = String(result.stdout || "")
    .split("\n")
    .map((line) => {
      const [name, image] = line.split("\t")
      return { name: name?.trim() || "", image: image?.trim() || "" }
    })
    .filter((row) => row.name.length > 0)

  const exact = rows.find((row) => row.name === "paradigm-supabase-db" || row.name === "supabase-db-1")
  if (exact) return exact.name

  const candidate = rows.find((row) => /supabase.*db|db.*supabase/i.test(row.name) && /postgres/i.test(row.image))
  if (candidate) return candidate.name

  throw new Error("Could not resolve Supabase Postgres container on host")
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

async function applySalesProductsSchemaMigration(envs) {
  return applySqlMigration(envs, "migration_052_sales_products_bootstrap.sql", "Sales products bootstrap migration")
}

async function applyReleaseTableParityMigration(envs) {
  return applySqlMigration(envs, "migration_061_release_table_parity.sql", "Release table parity migration")
}

async function applySalesDnsFreshnessLaneMigration(envs) {
  return applySqlMigration(envs, "migration_062_sales_dns_freshness_lane.sql", "Sales DNS freshness lane migration")
}

function runDeployGuard() {
  if (SKIP_DEPLOY_GUARD) {
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
  if (result.status !== 0) {
    throw new Error("Coolify deploy guard failed; refusing deployment")
  }
}

function runDbTableVerification(envs) {
  if (SKIP_DB_VERIFY) {
    console.log("DB table verification: skipped")
    return
  }
  console.log("DB table verification: running...")
  const timeoutMs = Number.parseInt(process.env.RELEASE_DB_VERIFY_TIMEOUT_MS || "120000", 10)
  const result = spawnSync(process.execPath, ["scripts/verify-db-tables.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, ...envs },
    encoding: "utf8",
    timeout: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 120000,
  })
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim()
  if (output) console.log(output)
  if (result.error) {
    throw new Error(`DB table verification failed before completion: ${result.error.message}`)
  }
  if (result.status !== 0) {
    throw new Error("DB table verification failed; refusing deployment")
  } else {
    console.log("DB table verification: all tables present")
  }
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

async function applySalesAiPromptsMigration(envs) {
  return applySqlMigration(envs, "migration_038_sales_ai_prompts.sql", "Sales AI prompts migration")
}

async function applySalesAiPromptsRepairMigration(envs) {
  return applySqlMigration(envs, "migration_039_sales_ai_prompts_auth_and_defaults.sql", "Sales AI prompts repair migration")
}

async function applySalesTriggerDevToolSlugMigration(envs) {
  return applySqlMigration(envs, "migration_040_sales_trigger_dev_tool_slug.sql", "Sales Trigger.dev tool slug migration")
}

async function applySalesVideoTriggerColumnsMigration(envs) {
  return applySqlMigration(envs, "migration_041_sales_video_trigger_columns.sql", "Sales video Trigger.dev columns migration")
}

async function applySalesDxAiTemplateVariantMigration(envs) {
  return applySqlMigration(envs, "migration_043_sales_dx_ai_template_variant.sql", "Sales DX/AI template variant migration")
}

async function applyAbolishPgCronMigration(envs) {
  return applySqlMigration(envs, "migration_044_abolish_pg_cron_event_driven.sql", "Abolish pg_cron event-driven migration")
}

async function applySalesCompaniesMetaMigration(envs) {
  return applySqlMigration(envs, "migration_046_sales_companies_meta_normalization.sql", "Sales companies meta normalization migration")
}

async function applyLeadCandidateAcquisitionMigration(envs) {
  return applySqlMigration(envs, "migration_047_sales_lead_candidate_acquisition.sql", "Lead candidate acquisition migration")
}

async function applyLeadCandidateRunsMigration(envs) {
  return applySqlMigration(envs, "migration_048_sales_lead_candidate_runs.sql", "Lead candidate run tracking migration")
}

async function applyPassiveInventoryMigration(envs) {
  return applySqlMigration(envs, "migration_049_sales_passive_inventory.sql", "Passive inventory migration")
}

async function applyPassiveInventorySegmentsMigration(envs) {
  return applySqlMigration(envs, "migration_050_sales_passive_inventory_segments.sql", "Passive inventory segments migration")
}

async function applySalesRaceConditionGuardsMigration(envs) {
  return applySqlMigration(envs, "migration_051_sales_race_condition_guards.sql", "Sales race-condition guard migration")
}

async function applySalesToolingBootstrapMigration(envs) {
  return applySqlMigration(envs, "migration_053_sales_tooling_bootstrap.sql", "Sales tooling bootstrap migration")
}

async function applySalesOptionalColumnRepairMigration(envs) {
  return applySqlMigration(envs, "migration_054_sales_cloud_optional_column_repair.sql", "Sales optional column repair migration")
}

async function applyContentTemplates(envs) {
  const { url, key } = salesSupabase(envs)
  if (isInternalDataApiUrl(url)) return applyContentTemplatesThroughPostgres(envs)
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

async function applyContentTemplatesThroughPostgres(envs) {
  const { templates } = await import("./seed-sales-content-templates.mjs")
  const rows = templates()
  const sql = `
with incoming as (
  select *
  from jsonb_to_recordset(${quoteSqlString(JSON.stringify(rows))}::jsonb) as row(
    region text,
    report_locale text,
    target_country text,
    industry text,
    offer_code text,
    asset_type text,
    appeal_angle text,
    template_variant text,
    title text,
    purpose text,
    quality_bar text,
    dify_selection_rule text,
    structure jsonb,
    prompt_template text,
    output_contract jsonb,
    toolchain jsonb,
    sample_copy text,
    is_active boolean,
    version integer
  )
)
insert into public.sales_content_templates (
  region,
  report_locale,
  target_country,
  industry,
  offer_code,
  asset_type,
  appeal_angle,
  template_variant,
  title,
  purpose,
  quality_bar,
  dify_selection_rule,
  structure,
  prompt_template,
  output_contract,
  toolchain,
  sample_copy,
  is_active,
  version
)
select
  region,
  report_locale,
  target_country,
  industry,
  offer_code,
  asset_type,
  appeal_angle,
  template_variant,
  title,
  purpose,
  quality_bar,
  dify_selection_rule,
  coalesce(structure, '{}'::jsonb),
  prompt_template,
  coalesce(output_contract, '{}'::jsonb),
  coalesce(toolchain, '{}'::jsonb),
  coalesce(sample_copy, ''),
  coalesce(is_active, true),
  coalesce(version, 1)
from incoming
on conflict (
  report_locale,
  target_country,
  industry,
  offer_code,
  asset_type,
  appeal_angle,
  template_variant,
  version
) do update set
  region = excluded.region,
  title = excluded.title,
  purpose = excluded.purpose,
  quality_bar = excluded.quality_bar,
  dify_selection_rule = excluded.dify_selection_rule,
  structure = excluded.structure,
  prompt_template = excluded.prompt_template,
  output_contract = excluded.output_contract,
  toolchain = excluded.toolchain,
  sample_copy = excluded.sample_copy,
  is_active = excluded.is_active,
  updated_at = now();
notify pgrst, 'reload schema';
`
  await applySqlMigrationThroughPostgres(envs, sql, "Content templates seed")
  return `Seeded sales_content_templates: ${rows.length}`
}

async function triggerDeploy() {
  const deploy = await coolify(`/api/v1/deploy?uuid=${APP_UUID}&force=true`, { method: "POST" })
  const uuid = deploy?.deployments?.[0]?.deployment_uuid
  if (!uuid) throw new Error("No Coolify deployment UUID returned")
  return uuid
}

async function cancelDeploy(uuid, reason) {
  try {
    await coolify(`/api/v1/deployments/${uuid}/cancel`, { method: "POST" })
    console.warn(`Deployment cancelled: ${uuid} (${reason})`)
  } catch (error) {
    console.warn(`Deployment cancel failed for ${uuid}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function printDeploymentHint(logText) {
  if (!logText) return
  if (/Healthcheck URL.*localhost:3000|connection refused|curl: not found|wget: can't connect/i.test(logText)) {
    console.warn(
      "Deployment hint: Coolify healthcheck failed inside the new container. Verify Dockerfile keeps curl, HOSTNAME=0.0.0.0, PORT=3000, and the localhost HEALTHCHECK.",
    )
  }
  if (/no space left on device|ENOSPC/i.test(logText)) {
    console.warn("Deployment hint: host disk pressure detected. Run the host disk preflight and prune only Docker cache/images, not volumes.")
  }
}

async function readDeploymentLogTail(uuid) {
  try {
    const status = await coolify(`/api/v1/deployments/${uuid}`)
    const logs = typeof status?.logs === "string" ? status.logs : ""
    return logs.slice(-4000)
  } catch (error) {
    console.warn(`Deployment log tail read failed: ${error instanceof Error ? error.message : String(error)}`)
    return ""
  }
}

async function waitDeploy(uuid) {
  let lastState = "unknown"
  let transientErrors = 0
  for (let i = 1; i <= 80; i++) {
    await new Promise((resolve) => setTimeout(resolve, 15_000))
    let status = null
    try {
      status = await coolify(`/api/v1/deployments/${uuid}`)
      transientErrors = 0
    } catch (error) {
      transientErrors += 1
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[deploy ${i}/80] transient Coolify status read failed (${transientErrors}): ${message}`)
      continue
    }
    const state = status?.status || "unknown"
    lastState = state
    console.log(`[deploy ${i}/80] ${state}`)
    if (state === "finished" || state === "running:healthy") return state
    if (state === "failed" || state === "error" || state === "cancelled") {
      printDeploymentHint(await readDeploymentLogTail(uuid))
      throw new Error(`Coolify deployment failed: ${state}`)
    }
  }
  if (CANCEL_ON_TIMEOUT) {
    await cancelDeploy(uuid, "poll timeout (--cancel-on-timeout)")
  }
  throw new Error(
    `Coolify deployment monitor timed out with last state ${lastState}; deployment was not cancelled. Resume with: node scripts/deploy-status.mjs ${uuid}`,
  )
}

async function smoke(url) {
  try {
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(30_000) })
    if (res.status < 200 || res.status >= 400) throw new Error(`${url} returned HTTP ${res.status}`)
    return res.status
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Smoke failed for ${url}: ${message}`)
  }
}

function refreshManualTraefikRoute() {
  if (SKIP_HOST_PREFLIGHT || DRY || SKIP_DEPLOY) {
    console.log("Manual Traefik route refresh: skipped")
    return
  }

  const script = `
set -euo pipefail
app_uuid='${APP_UUID.replace(/'/g, "'\\''")}'
route_file='/data/coolify/proxy/dynamic/paradigmjp.yml'
if [ ! -f "$route_file" ]; then
  echo "Manual Traefik route refresh: route file not found"
  exit 0
fi
new_container="$(docker ps --filter "name=${APP_UUID.replace(/"/g, '\\"')}" --format '{{.Names}}' | head -n1)"
if [ -z "$new_container" ]; then
  echo "Manual Traefik route refresh: app container not found"
  exit 1
fi
new_ip="$(docker inspect "$new_container" --format '{{with index .NetworkSettings.Networks "coolify"}}{{.IPAddress}}{{end}}')"
if [ -z "$new_ip" ]; then
  echo "Manual Traefik route refresh: app container has no coolify network IP"
  exit 1
fi
python3 - "$route_file" "$new_container" "$new_ip" <<'PY'
import re
import sys
from datetime import datetime, timezone

path, new_container, new_ip = sys.argv[1:4]
with open(path, encoding="utf-8") as handle:
    text = handle.read()

pattern = r"(paradigmhp-svc:\\n\\s+loadBalancer:\\n\\s+servers:\\n\\s+- url: )http://[^\\s]+:3000"
replacement = rf"\\1http://{new_ip}:3000"
updated, count = re.subn(pattern, replacement, text, count=1)
if count == 0:
    print("Manual Traefik route refresh: paradigmhp-svc upstream not found")
    sys.exit(1)
if updated == text:
    print(f"Manual Traefik route refresh: already points to {new_container} ({new_ip})")
else:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = f"{path}.bak-release-{stamp}"
    with open(backup, "w", encoding="utf-8") as handle:
        handle.write(text)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(updated)
    print(f"Manual Traefik route refresh: updated route to {new_container} ({new_ip})")
PY
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
    const detail = result.error ? result.error.message : "non-zero exit"
    throw new Error(`Manual Traefik route refresh failed: ${detail}`)
  }
}

async function refreshIntegrationStatus(envs) {
  const secret = envs.TRIGGER_WEBHOOK_SECRET
  if (!secret || String(secret).trim().length === 0) {
    return "Integration status refresh: skipped; TRIGGER_WEBHOOK_SECRET is not configured"
  }

  const baseUrl = envs.PARADIGMJP_BASE_URL || envs.NEXT_PUBLIC_SITE_URL || "https://paradigmjp.com"
  const endpoint = `${String(baseUrl).replace(/\/+$/, "")}/api/sales/integration-status?live=1`
  try {
    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(60_000),
      headers: {
        "X-Webhook-Secret": secret,
      },
    })
    const body = await res.json().catch(() => null)
    if (!res.ok || !body?.ok) {
      return `Integration status refresh: warning HTTP ${res.status}`
    }
    const count = Array.isArray(body.integrations) ? body.integrations.length : 0
    return `Integration status refresh: saved ${count} rows`
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return `Integration status refresh: warning ${message}`
  }
}

async function main() {
  console.log("Sales OS no-login deploy")
  const envs = await readProductionEnv()
  console.log("Coolify API: connected")

  // Auto-ensure non-secret defaults are set in Coolify.
  // Secret values must already exist in the approved runtime secret store.
  const { ensureCoolifyEnvs } = await import("./lib/coolify-env.mjs")
  const requiredNonSecretEnvs = {
    FLARESOLVERR_API_URL: "http://flaresolverr:8191",
  }
  const envResult = await ensureCoolifyEnvs(APP_UUID, requiredNonSecretEnvs)
  if (envResult.set > 0) console.log(`[deploy] auto-set ${envResult.set} missing env vars in Coolify`)
  if (!envs.TRIGGER_WEBHOOK_SECRET || String(envs.TRIGGER_WEBHOOK_SECRET).trim().length === 0) {
    throw new Error("TRIGGER_WEBHOOK_SECRET is missing in Coolify env; set it in the approved secret store before deploy")
  }

  if (!DRY && !SKIP_DEPLOY) {
    runHostDiskPreflight()
    runDeployGuard()
  }

  if (!DRY) {
    console.log(await applyReleaseTableParityMigration(envs))
    console.log(await applySalesDnsFreshnessLaneMigration(envs))
    console.log(await applySalesProductsSchemaMigration(envs))
    const products = await applySalesProducts(envs)
    console.log(`Sales products: verified ${products}`)
    console.log(await applyContentTemplateMigration(envs))
    console.log(await applySalesDxAiTemplateVariantMigration(envs))
    console.log(await applyAgentTeamMigration(envs))
    console.log(await applyIntegrationStatusMigration(envs))
    console.log(await applyRuntimeHardeningMigration(envs))
    console.log(await applySalesToolingBootstrapMigration(envs))
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
    console.log(await applySalesAiPromptsMigration(envs))
    console.log(await applySalesAiPromptsRepairMigration(envs))
    console.log(await applySalesTriggerDevToolSlugMigration(envs))
    console.log(await applySalesVideoTriggerColumnsMigration(envs))
    console.log(await applyAbolishPgCronMigration(envs))
    console.log(await applySalesCompaniesMetaMigration(envs))
    console.log(await applyLeadCandidateAcquisitionMigration(envs))
    console.log(await applyLeadCandidateRunsMigration(envs))
    console.log(await applyPassiveInventoryMigration(envs))
    console.log(await applyPassiveInventorySegmentsMigration(envs))
    console.log(await applySalesRaceConditionGuardsMigration(envs))
    console.log(await applySalesOptionalColumnRepairMigration(envs))
    console.log(await applyContentTemplates(envs))
    if (!SKIP_DB_VERIFY) runDbTableVerification(envs)
  } else {
    console.log("Dry run: skipped Supabase product upsert")
  }

  if (!DRY && !SKIP_DEPLOY) {
    const uuid = await triggerDeploy()
    console.log(`Deployment queued: ${uuid}`)
    await waitDeploy(uuid)
    refreshManualTraefikRoute()
  } else {
    console.log("Dry/skip mode: skipped Coolify deploy")
  }

  const smokeUrls = [
    "https://paradigmjp.com/api/ready",
    "https://paradigmjp.com/ja/admin/sales",
    "https://paradigmjp.com/ja",
    `https://paradigmjp.com${envValue("RELEASE_REPORT_SMOKE_PATH", "/en/report/ccbc-xynd21")}`,
    "https://twenty.paradigmjp.com",
  ]
  for (const url of smokeUrls) {
    const status = await smoke(url)
    console.log(`Smoke OK: ${url} HTTP ${status}`)
  }
  if (!DRY) console.log(await refreshIntegrationStatus(envs))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
