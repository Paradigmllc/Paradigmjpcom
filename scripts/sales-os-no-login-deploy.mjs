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
import { sshArgs } from "./lib/ssh-options.mjs"

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
const cachedSupabaseDbContainers = new Map()
const DEPLOY_HOST = process.env.PARADIGM_DEPLOY_HOST || "paradigm-droplet"
const APPLY_SHOPIFY_ONLY = process.argv.includes("--apply-shopify-only")

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
    default_currency: "USD",
    default_amount_yen: 15000,
    is_subscription: false,
    description: "Fast-decision global SMBs向けの日本市場参入パッケージ。$15,000の固定セットアップ、Wise・銀行振込・USDC・クレジットカード、開始日から14営業日の納品保証（未納品時はセットアップ費用全額返金）、最初の3か月の運用を提供する。",
    sort_order: 30,
    meta: {
      primary_market: "global",
      delivery: "lp_localization_ops",
      setup_price_usd: 15000,
      included_months: 3,
      continuation_pricing: "agreed_separately_after_included_period",
    },
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
  const sqlPath = [
    path.join(process.cwd(), "supabase", fileName),
    path.join(process.cwd(), "supabase", "migrations", fileName),
  ].find((candidate) => fs.existsSync(candidate))
  if (!sqlPath) return `${label}: local SQL file missing`
  const sql = fs.readFileSync(sqlPath, "utf8")
  const hasSupabaseApiCredentials = Boolean(
    (envs.NEXT_PUBLIC_SUPABASE_URL || envs.SALES_SUPABASE_URL)
      && (envs.SUPABASE_SERVICE_ROLE_KEY || envs.SALES_SUPABASE_SERVICE_ROLE_KEY),
  )
  if (!hasSupabaseApiCredentials) return applySqlMigrationThroughHost(sql, label)
  const { url, key } = salesSupabase(envs)
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

  const sshTarget = envValue("PARADIGM_SUPABASE_SSH_TARGET", "paradigm-droplet")
  const dbContainer = resolveSupabaseDbContainer(sshTarget)
  const commonArgs = sshArgs(sshTarget, { acceptNew: true })
  const sqlWithSchemaReload = `${sql.trimEnd()}\nNOTIFY pgrst, 'reload schema';\n`
  const apply = spawnSync(
    "ssh",
    [
      ...commonArgs,
      "docker",
      "exec",
      "-i",
      dbContainer,
      "psql",
      "-X",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "postgres",
      "-d",
      "postgres",
    ],
    { input: sqlWithSchemaReload, encoding: "utf8", maxBuffer: 1024 * 1024 * 12 },
  )
  if (apply.status !== 0) {
    const detail = `${apply.stderr || apply.stdout || ""}`.trim()
    throw new Error(`${label} DB SSH fallback failed: ${detail.slice(0, 300)}`)
  }

  return `${label}: applied through DB SSH channel`
}

function applyTwentySqlThroughHost(sql, label) {
  const sshTarget = envValue("PARADIGM_TWENTY_SSH_TARGET", DEPLOY_HOST)
  const dbContainer = resolveTwentyDbContainer(sshTarget)
  const result = spawnSync(
    "ssh",
    [
      ...sshArgs(sshTarget, { acceptNew: true }),
      "docker",
      "exec",
      "-i",
      dbContainer,
      "psql",
      "-X",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "twenty",
      "-d",
      "twenty",
    ],
    { input: sql, encoding: "utf8", maxBuffer: 1024 * 1024 * 12 },
  )
  if (result.status !== 0) {
    const detail = `${result.stderr || result.stdout || ""}`.trim()
    throw new Error(`${label} Twenty DB SSH fallback failed: ${detail.slice(0, 300)}`)
  }
  return `${label}: applied through Twenty DB SSH channel`
}

function resolveTwentyDbContainer(sshTarget) {
  const explicit = envValue("PARADIGM_TWENTY_DB_CONTAINER")
  if (explicit) return explicit
  const result = spawnSync(
    "ssh",
    [...sshArgs(sshTarget, { acceptNew: true }), "docker ps --format '{{.Names}}\t{{.Image}}'"],
    { encoding: "utf8", timeout: 15_000, maxBuffer: 1024 * 1024 },
  )
  if (result.error) throw result.error
  if (result.status !== 0) {
    const detail = `${result.stderr || result.stdout || ""}`.trim()
    throw new Error(`Could not list Twenty containers: ${detail.slice(0, 180)}`)
  }
  const rows = String(result.stdout || "")
    .split("\n")
    .map((line) => {
      const [name, image] = line.split("\t")
      return { name: name?.trim() || "", image: image?.trim() || "" }
    })
    .filter((row) => row.name.length > 0)
  const exact = rows.find((row) => row.name === "opt-twenty-db-1")
  if (exact) return exact.name
  const candidate = rows.find((row) => /twenty.*db|db.*twenty/i.test(row.name) && /postgres/i.test(row.image))
  if (candidate) return candidate.name
  throw new Error("Could not resolve Twenty Postgres container on host")
}

function resolveSupabaseDbContainer(sshTarget) {
  const explicit = envValue("PARADIGM_SUPABASE_DB_CONTAINER")
  if (explicit) return explicit
  const cached = cachedSupabaseDbContainers.get(sshTarget)
  if (cached) return cached

  const result = spawnSync(
    "ssh",
    [
      ...sshArgs(sshTarget, { acceptNew: true }),
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
  if (exact) {
    cachedSupabaseDbContainers.set(sshTarget, exact.name)
    return exact.name
  }

  const candidate = rows.find((row) => /supabase.*db|db.*supabase/i.test(row.name) && /postgres/i.test(row.image))
  if (candidate) {
    cachedSupabaseDbContainers.set(sshTarget, candidate.name)
    return candidate.name
  }

  throw new Error("Could not resolve Supabase Postgres container on host")
}

async function applyContentTemplateMigration(envs) {
  return applySqlMigration(envs, "migration_022_sales_content_templates.sql", "Content template migration")
}

async function applyPetLifeMovieMigration(envs) {
  return applySqlMigration(envs, "20260801213954_pet_life_movie_mvp.sql", "Pet Life Movie MVP migration")
}

async function applyPetLifeMovieMarketReadyMigration(envs) {
  return applySqlMigration(
    envs,
    "20260802020742_pet_life_movie_market_ready.sql",
    "Pet Life Movie market-ready migration",
  )
}

async function applyPetLifeMovieCommercialQualityMigration(envs) {
  return applySqlMigration(
    envs,
    "20260802210000_pet_life_movie_commercial_quality.sql",
    "Pet Life Movie commercial-quality migration",
  )
}

async function verifyPetLifeMovieSchema(envs) {
  const { url, key } = salesSupabase(envs)
  if (isInternalDataApiUrl(url)) {
    await applySqlMigrationThroughPostgres(
      envs,
      `
do $$
begin
  if to_regclass('public.pet_movie_projects') is null then
    raise exception 'pet_movie_projects is missing';
  end if;
  if to_regclass('public.pet_movie_deliverables') is null then
    raise exception 'pet_movie_deliverables is missing';
  end if;
  if not has_table_privilege('service_role', 'public.pet_movie_projects', 'SELECT') then
    raise exception 'service_role cannot read pet_movie_projects';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pet_movie_projects' and column_name = 'terms_accepted_at'
  ) then
    raise exception 'pet_movie_projects.terms_accepted_at is missing';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pet_movie_contributors' and column_name = 'memories'
  ) then
    raise exception 'pet_movie_contributors.memories is missing';
  end if;
end
$$;
`,
      "Pet Life Movie schema verification",
    )
    return "Pet Life Movie schema: verified through Postgres service_role privileges"
  }
  for (const path of [
    "pet_movie_deliverables?select=id&limit=1",
    "pet_movie_projects?select=id,terms_version,terms_accepted_at&limit=1",
    "pet_movie_contributors?select=id,memories,consent_confirmed&limit=1",
  ]) {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`Pet Life Movie schema verification failed: HTTP ${response.status} ${detail.slice(0, 180)}`)
    }
  }
  return "Pet Life Movie schema: verified through service role"
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

async function applyVideoFactoryEngineProfilesMigration(envs) {
  return applySqlMigration(
    envs,
    "20260801091559_video_factory_engine_profiles.sql",
    "Video Factory engine profiles migration",
  )
}

async function applyVideoFactoryOssExecutionTargetsMigration(envs) {
  return applySqlMigration(
    envs,
    "20260801114845_video_factory_oss_execution_targets.sql",
    "Video Factory OSS execution targets migration",
  )
}

async function applyVideoFactoryCommercialStudioMigration(envs) {
  return applySqlMigration(
    envs,
    "20260802093000_video_factory_commercial_studio.sql",
    "Video Factory commercial Studio migration",
  )
}

async function applyVideoFactoryStudioLeastPrivilegeMigration(envs) {
  return applySqlMigration(
    envs,
    "20260802113000_video_factory_studio_least_privilege.sql",
    "Video Factory Studio least-privilege migration",
  )
}

async function applyVideoGrowthDirectAcquisitionMigration(envs) {
  return applySqlMigration(
    envs,
    "20260802132000_video_growth_direct_acquisition.sql",
    "Video subscription direct acquisition migration",
  )
}

async function applyVideoGrowthCommercialSchemaMigration(envs) {
  return applySqlMigration(envs, "20260802190000_video_growth_commercial_schema.sql", "Video growth commercial schema migration")
}

async function applyVideoGrowthCommercialIntakeMigration(envs) {
  return applySqlMigration(envs, "20260802190100_video_growth_commercial_intake.sql", "Video growth commercial intake migration")
}

async function applyVideoGrowthCommercialQualityMigration(envs) {
  return applySqlMigration(envs, "20260802190200_video_growth_commercial_quality.sql", "Video growth commercial quality migration")
}

async function applyVideoGrowthCommercialGuardsMigration(envs) {
  return applySqlMigration(envs, "20260802190300_video_growth_commercial_guards.sql", "Video growth commercial guards migration")
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

async function applyJapanReadinessInsightsMigration(envs) {
  return applySqlMigration(envs, "migration_033_sales_japan_readiness_insights.sql", "Japan readiness insights migration")
}

async function applySalesProductsSchemaMigration(envs) {
  return applySqlMigration(envs, "migration_052_sales_products_bootstrap.sql", "Sales products bootstrap migration")
}

async function applyShopifyOpsMigration(envs) {
  return applySqlMigration(envs, "20260801212630_shopify_ops.sql", "Tiny Shops Shopify operations migration")
}

async function applyShopifyBaseSyncMigration(envs) {
  return applySqlMigration(envs, "20260802153000_shopify_base_sync.sql", "SERICIA BASE to Shopify sync migration")
}

async function applyShopifyBaseSyncHardeningMigration(envs) {
  return applySqlMigration(envs, "20260802160000_shopify_base_sync_hardening.sql", "SERICIA BASE sync hardening migration")
}

async function applyReleaseTableParityMigration(envs) {
  return applySqlMigration(envs, "migration_061_release_table_parity.sql", "Release table parity migration")
}

async function applySalesDnsFreshnessLaneMigration(envs) {
  return applySqlMigration(envs, "migration_062_sales_dns_freshness_lane.sql", "Sales DNS freshness lane migration")
}

async function applyPayloadPagesPricingMigration(envs) {
  return applySqlMigration(envs, "migration_066_payload_pages_pricing_blocks.sql", "Payload Pages pricing migration")
}

async function applyPayloadPagesPricingVersionsMigration(envs) {
  return applySqlMigration(envs, "migration_067_payload_pages_pricing_versions.sql", "Payload Pages pricing versions migration")
}

async function applyContactSubmissionAtomicityMigration(envs) {
  return applySqlMigration(envs, "migration_068_contact_submission_atomicity.sql", "Contact submission atomicity migration")
}

async function applyPayloadPostsConstraintsMigration(envs) {
  return applySqlMigration(envs, "migration_069_payload_posts_constraints.sql", "Payload posts constraints migration")
}

async function applyDemoContactHardeningMigration(envs) {
  return applySqlMigration(envs, "migration_070_demo_contact_hardening.sql", "Demo contact hardening migration")
}

async function applyPublicSurfaceRlsMigration(envs) {
  return applySqlMigration(envs, "migration_071_public_surface_rls_and_constraints.sql", "Public surface RLS and constraint migration")
}

async function applyPublicJapanEntryChecksMigration(envs) {
  return applySqlMigration(envs, "migration_072_public_japan_entry_checks.sql", "Public Japan Entry checks migration")
}

async function applyJapanOperatorCasesMigration(envs) {
  return applySqlMigration(
    envs,
    "20260801224308_sales_japan_operator_cases.sql",
    "Japan market operator case control migration",
  )
}

async function applyJapanOperatorCaseHardeningMigration(envs) {
  return applySqlMigration(
    envs,
    "20260801235327_sales_japan_operator_case_hardening.sql",
    "Japan market operator append-only audit and Wave 1 alias hardening",
  )
}

async function applyJapanOperatorOperationsOsMigrations(envs) {
  const migrations = [
    ["20260802015455_japan_operator_operations_os.sql", "Japan operator identity, evidence and outbound controls"],
    ["20260802015712_japan_operator_commercial_os.sql", "Japan operator sourcing, contracts, payments and SKU controls"],
    ["20260802015715_japan_operator_delivery_os.sql", "Japan operator finance, delivery, KPI and outbox controls"],
  ]
  const results = []
  for (const [file, label] of migrations) {
    results.push(await applySqlMigration(envs, file, label))
  }
  return results.join("\n")
}

async function applyContentCommerceMigration(envs) {
  return applySqlMigration(envs, "20260801231006_content_commerce.sql", "Content API and x402 commerce migration")
}

async function applyForeignInvestorPseoMigration(envs) {
  return applySqlMigration(envs, "20260802043347_foreign_investor_pseo.sql", "Foreign investor pSEO migration")
}

async function verifyForeignInvestorPseoCatalog(envs) {
  await applySqlMigrationThroughPostgres(
    envs,
    `
do $$
declare
  published_count integer;
begin
  select count(*) into published_count
  from public.content_products
  where locale = 'en'
    and content_type = 'investor_brief'
    and access_model = 'free'
    and is_active = true;

  if published_count <> 12 then
    raise exception 'expected 12 published investor briefs, found %', published_count;
  end if;

  if exists (
    select 1
    from public.content_products
    where locale = 'en'
      and content_type = 'investor_brief'
      and (
        jsonb_array_length(payload -> 'keyFacts') < 3
        or jsonb_array_length(payload -> 'risks') < 3
        or jsonb_array_length(payload -> 'decisionGates') < 3
        or jsonb_array_length(payload -> 'sources') < 2
      )
  ) then
    raise exception 'investor brief evidence contract is incomplete';
  end if;

  if has_table_privilege('anon', 'public.content_products', 'SELECT')
    or has_table_privilege('authenticated', 'public.content_products', 'SELECT') then
    raise exception 'content_products must remain service-role-only';
  end if;
end
$$;
`,
    "Foreign investor pSEO catalog verification",
  )
  return "Foreign investor pSEO catalog: verified 12 sourced briefs and service-role isolation"
}

async function applyFormQualifiedLeadFactoryMigration(envs) {
  return applySqlMigration(
    envs,
    "20260714143000_form_qualified_lead_factory.sql",
    "Form-qualified lead factory migration",
  )
}

async function applyLeadFactorySchemaReconcileMigration(envs) {
  return applySqlMigration(
    envs,
    "20260714231500_lead_factory_schema_reconcile.sql",
    "Lead factory schema reconcile migration",
  )
}

async function applyInitialFormDraftFactoryMigration(envs) {
  return applySqlMigration(
    envs,
    "20260714234500_initial_form_draft_factory.sql",
    "Initial form draft factory migration",
  )
}

async function applyHighQualityLeadSourcesMigration(envs) {
  return applySqlMigration(
    envs,
    "20260715082148_high_quality_lead_sources.sql",
    "High-quality evidence-first lead sources migration",
  )
}

async function applyLeadFactoryOperatorApprovalMigration(envs) {
  return applySqlMigration(
    envs,
    "20260715093000_lead_factory_operator_approval.sql",
    "Lead factory operator approval migration",
  )
}

async function applyLeadSourceWebsitePreflightMigration(envs) {
  return applySqlMigration(
    envs,
    "20260715113000_lead_source_website_preflight.sql",
    "Lead source website preflight migration",
  )
}

async function applyLeadSourceCountryPacksMigration(envs) {
  return applySqlMigration(
    envs,
    "20260715140000_lead_source_country_packs.sql",
    "Versioned country lead-source packs migration",
  )
}

async function applyLeadSourcePartialPilotClaimMigration(envs) {
  return applySqlMigration(
    envs,
    "20260715151000_lead_source_partial_pilot_claim.sql",
    "Lead source partial pilot claim migration",
  )
}

async function applyLeadSourceProductFitRetryMigration(envs) {
  return applySqlMigration(
    envs,
    "20260715173000_lead_source_product_fit_retry.sql",
    "Official SMB product-fit retry migration",
  )
}

async function applyLeadSourceProductEvidenceRetryMigration(envs) {
  return applySqlMigration(
    envs,
    "20260716000000_lead_source_balance_retry.sql",
    "Official SMB fail-closed product-evidence retry migration",
  )
}

async function applySalesListLeadBatchSyncMigration(envs) {
  return applySqlMigration(
    envs,
    "20260715234500_sales_list_lead_batch_sync.sql",
    "Sales list-lead Twenty batch sync migration",
  )
}

async function applyPortalTwentySourceOptionsMigration(envs) {
  return applySqlMigration(
    envs,
    "20260715150000_portal_twenty_source_options.sql",
    "Portal Twenty source options migration",
  )
}

async function applySalesSyncLogsListLeadMigration(envs) {
  return applySqlMigration(
    envs,
    "20260715193000_sales_sync_logs_list_lead.sql",
    "List-only Twenty sync audit migration",
  )
}

async function applyManualJapanEntryWorkMigration(envs) {
  return applySqlMigration(
    envs,
    "20260715031327_manual_japan_entry_work.sql",
    "Manual Japan Entry workbench migration",
  )
}

async function applyManualFormCopyExperimentMigration(envs) {
  return applySqlMigration(
    envs,
    "20260716090000_manual_form_copy_experiment.sql",
    "Manual form-copy experiment migration",
  )
}

async function applyManualFormCopyAnglesMigration(envs) {
  return applySqlMigration(
    envs,
    "20260716180000_manual_form_copy_angles.sql",
    "Manual form-copy angle and playbook migration",
  )
}

async function applyManualJapanEntrySourceLedgerMigration(envs) {
  return applySqlMigration(
    envs,
    "20260716181500_manual_japan_entry_source_ledger.sql",
    "Manual Japan Entry source master and qualification ledger migration",
  )
}

async function applyManualJapanEntryReportV2Migration(envs) {
  return applySqlMigration(
    envs,
    "20260719032800_manual_japan_entry_report_v2.sql",
    "Manual Japan Entry dedicated report V2 migration",
  )
}

async function applyManualWorkVerifiedFormAndCopyDiagnosticsMigration(envs) {
  return applySqlMigration(
    envs,
    "20260719211533_manual_work_verified_form_and_copy_diagnostics.sql",
    "Manual work verified-form and copy diagnostics migration",
  )
}

async function applyManualWorkDurableBatchesMigration(envs) {
  return applySqlMigration(
    envs,
    "20260720233215_manual_work_durable_batches.sql",
    "Manual work durable 500-URL batch migration",
  )
}

async function applyManualWorkBatchRealtimeMigration(envs) {
  return applySqlMigration(
    envs,
    "20260721123500_manual_work_batch_realtime.sql",
    "Manual work batch realtime progress migration",
  )
}

async function applyManualWorkMultiBatchQueueMigration(envs) {
  return applySqlMigration(
    envs,
    "20260721164000_manual_work_multi_batch_queue.sql",
    "Manual work multi-batch queue and drain lease migration",
  )
}

async function applyManualWorkReportOwnershipAndScaleMigration(envs) {
  return applySqlMigration(
    envs,
    "20260721193000_manual_work_report_ownership_and_scale.sql",
    "Manual work report ownership and 500-row scale migration",
  )
}

async function applyManualWorkTerminalSourceFailuresMigration(envs) {
  return applySqlMigration(
    envs,
    "20260722044000_manual_work_terminal_source_failures.sql",
    "Manual work terminal source failures migration",
  )
}

async function applyManualWorkDurableRetryQueueMigration(envs) {
  return applySqlMigration(
    envs,
    "20260722123000_manual_work_durable_retry_queue.sql",
    "Manual work durable retry queue migration",
  )
}

async function applyTwentySelectOptionsScript(envs) {
  const sqlPath = path.join(process.cwd(), "scripts", "twenty-sales-select-options.sql")
  if (!fs.existsSync(sqlPath)) return "Twenty select options script missing"
  const sql = fs.readFileSync(sqlPath, "utf8")
  return applyTwentySqlThroughHost(sql, "Twenty select options script")
}

async function applyTwentyCompaniesViewScript(envs) {
  const sqlPath = path.join(process.cwd(), "scripts", "twenty-sales-companies-view.sql")
  if (!fs.existsSync(sqlPath)) return "Twenty companies view script missing"
  const sql = fs.readFileSync(sqlPath, "utf8")
  return applyTwentySqlThroughHost(sql, "Twenty companies view script")
}

async function applyJapanEntryProjectionsMigration(envs) {
  return applySqlMigration(
    envs,
    "20260712221723_sales_japan_entry_projections.sql",
    "Japan Entry projections migration",
  )
}

async function applyDemoQualityGateMigration(envs) {
  return applySqlMigration(
    envs,
    "20260712233619_demo_quality_gate.sql",
    "SMB demo quality gate migration",
  )
}

async function applyDemoPrivateAssetReviewMigration(envs) {
  return applySqlMigration(
    envs,
    "20260713143000_demo_private_asset_review.sql",
    "SMB demo private asset review migration",
  )
}

async function applyDemoTemporaryUnlistedAccessMigration(envs) {
  return applySqlMigration(
    envs,
    "20260714164000_demo_temporary_unlisted_access.sql",
    "SMB demo temporary unlisted access migration",
  )
}

async function applyDemoSustainableBatchMigration(envs) {
  return applySqlMigration(
    envs,
    "20260713160000_demo_sustainable_batch.sql",
    "SMB demo sustainable batch queue migration",
  )
}

async function applyJapanEntryReportFactoryMigration(envs) {
  return applySqlMigration(
    envs,
    "20260713203000_japan_entry_report_factory.sql",
    "Japan Entry report factory migration",
  )
}

async function applyDemoCleanUrlFactoryMigration(envs) {
  return applySqlMigration(
    envs,
    "20260713220000_demo_clean_urls_and_factory.sql",
    "SMB demo clean URL factory migration",
  )
}

async function applySalesPipelineDbTriggerProviderMigration(envs) {
  return applySqlMigration(
    envs,
    "20260713120000_sales_pipeline_db_trigger_provider.sql",
    "Sales pipeline DB trigger provider migration",
  )
}

async function applyDemoCompanyTriggerGuardMigration(envs) {
  return applySqlMigration(
    envs,
    "20260713190000_demo_company_trigger_guard.sql",
    "SMB demo company trigger guard migration",
  )
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

async function applyQuoteRecoveryValidationMigration(envs) {
  return applySqlMigration(envs, "migration_059_quote_recovery_validation.sql", "Quote Recovery validation migration")
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

async function smoke(url, markers = []) {
  try {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
      headers: { "Cache-Control": "no-cache" },
    })
    if (res.status < 200 || res.status >= 400) throw new Error(`${url} returned HTTP ${res.status}`)
    if (markers.length > 0) {
      const body = await res.text()
      const missing = markers.filter((marker) => !body.includes(marker))
      if (missing.length > 0) {
        throw new Error(`${url} is missing release marker(s): ${missing.join(", ")}`)
      }
    }
    return res.status
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Smoke failed for ${url}: ${message}`)
  }
}

async function postAdminSeed(url, secret, body, label) {
  const maxAttempts = 4
  let lastFailure = "unknown failure"

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      })
      const bodyText = await response.text()
      let result = null
      try {
        result = bodyText ? JSON.parse(bodyText) : null
      } catch (error) {
        console.error(`${label} returned invalid JSON:`, error)
      }

      const transient = [502, 503, 504].includes(response.status)
      if (response.ok && result?.success === true) return { response, bodyText, result }
      lastFailure = `HTTP ${response.status}${bodyText ? ` ${bodyText.slice(0, 500)}` : ""}`
      if (!transient || attempt === maxAttempts) break
      console.warn(`${label} temporarily unavailable (${lastFailure}); retrying ${attempt}/${maxAttempts - 1}`)
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error)
      if (attempt === maxAttempts) break
      console.warn(`${label} request failed (${lastFailure}); retrying ${attempt}/${maxAttempts - 1}`)
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 5_000))
  }

  throw new Error(`${label} failed: ${lastFailure}`)
}

async function seedMarketingHomepages(envs) {
  const secret = envs.ADMIN_SCRIPT_SECRET
  if (typeof secret !== "string" || secret.trim().length < 16) {
    throw new Error("ADMIN_SCRIPT_SECRET must be configured before publishing the marketing homepages")
  }

  await postAdminSeed(
    "https://paradigmjp.com/api/admin/seed-all-content",
    secret,
    { confirm: true, scope: "homepage" },
    "Marketing homepages seed",
  )
  console.log("Japanese and English homepage CMS publish OK")
}

async function seedEnglishJapanEntryBlog(envs) {
  const secret = envs.ADMIN_SCRIPT_SECRET
  if (typeof secret !== "string" || secret.trim().length < 16) {
    throw new Error("ADMIN_SCRIPT_SECRET must be configured before publishing the English Japan Entry editorial blog")
  }

  const { result } = await postAdminSeed(
    "https://paradigmjp.com/api/admin/seed-japan-entry-blog",
    secret,
    { confirm: true },
    "English Japan Entry blog seed",
  )
  if (result?.errors?.length > 0) {
    throw new Error(`English Japan Entry blog publish failed: ${result.errors.join("; ")}`)
  }
  console.log(`English Japan Entry blog publish OK (${result.total} articles; ${result.created} created, ${result.updated} updated)`)
}

function readOriginLockHelper() {
  return fs.readFileSync(
    new URL("./lib/refresh-traefik-origin-lock.py", import.meta.url),
    "utf8",
  )
}

function runOriginLockHostScript(label, script) {
  const result = spawnSync("ssh", [...sshArgs(DEPLOY_HOST, { acceptNew: true }), "bash -s"], {
    input: script,
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 1024 * 1024,
  })
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim()
  if (output) console.log(output)
  if (result.status !== 0 || result.error) {
    const detail = result.error ? result.error.message : "non-zero exit"
    throw new Error(`${label} failed: ${detail}`)
  }
}

function prepareManualTraefikOriginLock() {
  if (DRY || SKIP_DEPLOY) {
    console.log("Manual Traefik origin lock prepare: skipped")
    return
  }
  const originLockHelper = readOriginLockHelper()
  const script = `
set -euo pipefail
route_file='/data/coolify/proxy/dynamic/paradigmjp.yml'
cache_file='/data/coolify/proxy/.paradigmjp-origin-lock-cidrs.json'
if [ ! -f "$route_file" ]; then
  echo "Manual Traefik origin lock prepare: route file not found"
  exit 1
fi
python3 - --prepare "$route_file" "$cache_file" <<'PY'
${originLockHelper}
PY
`
  runOriginLockHostScript("Manual Traefik origin lock prepare before deploy", script)
}

function refreshManualTraefikRoute() {
  if (DRY || SKIP_DEPLOY) {
    console.log("Manual Traefik route refresh: skipped")
    return
  }
  const originLockHelper = readOriginLockHelper()
  const script = `
set -euo pipefail
app_uuid='${APP_UUID.replace(/'/g, "'\\''")}'
route_file='/data/coolify/proxy/dynamic/paradigmjp.yml'
cache_file='/data/coolify/proxy/.paradigmjp-origin-lock-cidrs.json'
if [ ! -f "$route_file" ]; then
  echo "Manual Traefik route refresh: route file not found"
  exit 1
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
python3 - --apply "$route_file" "$cache_file" "$app_uuid" "$new_container" "$new_ip" <<'PY'
${originLockHelper}
PY
for legacy_demo_container in astro-demo paradigm-demos; do
  docker rm -f "$legacy_demo_container" >/dev/null 2>&1 || true
done
echo "Legacy demo containers: stopped"
`
  runOriginLockHostScript("Manual Traefik atomic route refresh", script)
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

async function reconcileManualWorkV4Artifacts(envs) {
  const secret = envs.TRIGGER_WEBHOOK_SECRET
  if (!secret || String(secret).trim().length === 0) {
    throw new Error("Manual work V4 reconciliation requires TRIGGER_WEBHOOK_SECRET")
  }
  const baseUrl = envs.PARADIGMJP_BASE_URL || envs.NEXT_PUBLIC_SITE_URL || "https://paradigmjp.com"
  const endpoint = `${String(baseUrl).replace(/\/+$/, "")}/api/work/artifacts/reconcile`
  const res = await fetch(endpoint, {
    method: "POST",
    signal: AbortSignal.timeout(330_000),
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": secret,
    },
    body: JSON.stringify({ limit: 500 }),
  })
  const body = await res.json().catch(() => null)
  const result = body?.result
  const exact = res.ok
    && body?.ok === true
    && result?.failed === 0
    && result?.skipped === 0
    && result?.legacyReports === 0
    && result?.currentReports === result?.checked
    && result?.sent === 0
  if (!exact) {
    throw new Error(`Manual work V4 reconciliation failed exact read-back (HTTP ${res.status})`)
  }
  return `Manual work V4 reconciliation: ${result.currentReports}/${result.checked} current, legacy ${result.legacyReports}, sent ${result.sent}`
}

async function main() {
  console.log("Sales OS no-login deploy")
  if (APPLY_SHOPIFY_ONLY) {
    console.log(await applyShopifyOpsMigration({}))
    console.log(await applyShopifyBaseSyncMigration({}))
    console.log(await applyShopifyBaseSyncHardeningMigration({}))
    return
  }

  const envs = await readProductionEnv()
  console.log("Coolify API: connected")

  // Auto-ensure non-secret defaults are set in Coolify.
  // Secret values must already exist in the approved runtime secret store.
  const { ensureCoolifyEnvs, updateCoolifyEnvs } = await import("./lib/coolify-env.mjs")
  const requiredNonSecretEnvs = {
    SHOPIFY_STORE_DOMAIN: "g2d5th-zr.myshopify.com",
    SHOPIFY_API_VERSION: "2026-07",
    BASE_OAUTH_REDIRECT_URI: "https://paradigmjp.com/api/shopify-ops/base/callback",
    ...(/^(1|true|yes)$/i.test(String(envs.CLOUDFLARE_ORIGIN_LOCKED || "").trim())
      ? { TRUSTED_PROXY_MODE: "cloudflare" }
      : {}),
  }
  const envResult = await ensureCoolifyEnvs(APP_UUID, requiredNonSecretEnvs)
  if (envResult.set > 0) console.log(`[deploy] auto-set ${envResult.set} missing env vars in Coolify`)
  const staleNonSecretEnvs = Object.fromEntries(Object.entries(requiredNonSecretEnvs).filter(([key, value]) => (
    typeof envs[key] === "string" && envs[key].trim().length > 0 && envs[key].trim() !== value
  )))
  if (Object.keys(staleNonSecretEnvs).length > 0) {
    const corrected = await updateCoolifyEnvs(APP_UUID, staleNonSecretEnvs)
    const failed = corrected.filter((item) => item.status === "failed")
    if (failed.length > 0) throw new Error(`Failed to correct non-secret Coolify envs: ${failed.map((item) => item.key).join(", ")}`)
    console.log(`[deploy] corrected ${corrected.length} stale non-secret env vars in Coolify`)
  }
  if (!envs.TRIGGER_WEBHOOK_SECRET || String(envs.TRIGGER_WEBHOOK_SECRET).trim().length === 0) {
    throw new Error("TRIGGER_WEBHOOK_SECRET is missing in Coolify env; set it in the approved secret store before deploy")
  }

  if (!DRY && !SKIP_DEPLOY) {
    runHostDiskPreflight()
    runDeployGuard()
  }

  if (!DRY) {
    console.log(await applyShopifyOpsMigration(envs))
    console.log(await applyShopifyBaseSyncMigration(envs))
    console.log(await applyShopifyBaseSyncHardeningMigration(envs))
    console.log(await applyReleaseTableParityMigration(envs))
    console.log(await applySalesDnsFreshnessLaneMigration(envs))
    console.log(await applyPayloadPagesPricingMigration(envs))
    console.log(await applyPayloadPagesPricingVersionsMigration(envs))
    console.log(await applyPetLifeMovieMigration(envs))
    console.log(await applyPetLifeMovieMarketReadyMigration(envs))
    console.log(await applyPetLifeMovieCommercialQualityMigration(envs))
    console.log(await verifyPetLifeMovieSchema(envs))
    console.log(await applySalesProductsSchemaMigration(envs))
    const products = await applySalesProducts(envs)
    console.log(`Sales products: verified ${products}`)
    console.log(await applyContentTemplateMigration(envs))
    console.log(await applySalesDxAiTemplateVariantMigration(envs))
    console.log(await applyAgentTeamMigration(envs))
    console.log(await applyIntegrationStatusMigration(envs))
    console.log(await applyRuntimeHardeningMigration(envs))
    console.log(await applySalesToolingBootstrapMigration(envs))
    console.log(await applyContactSubmissionAtomicityMigration(envs))
    console.log(await applyPayloadPostsConstraintsMigration(envs))
    console.log(await applyDemoContactHardeningMigration(envs))
    console.log(await applyPublicSurfaceRlsMigration(envs))
    console.log(await applyPublicJapanEntryChecksMigration(envs))
    console.log(await applyJapanOperatorCasesMigration(envs))
    console.log(await applyJapanOperatorCaseHardeningMigration(envs))
    console.log(await applyJapanOperatorOperationsOsMigrations(envs))
    console.log(await applyContentCommerceMigration(envs))
    console.log(await applyForeignInvestorPseoMigration(envs))
    console.log(await verifyForeignInvestorPseoCatalog(envs))
    console.log(await applyFormQualifiedLeadFactoryMigration(envs))
    console.log(await applyLeadFactorySchemaReconcileMigration(envs))
    console.log(await applyInitialFormDraftFactoryMigration(envs))
    console.log(await applyHighQualityLeadSourcesMigration(envs))
    console.log(await applyLeadFactoryOperatorApprovalMigration(envs))
    console.log(await applyLeadSourceWebsitePreflightMigration(envs))
    console.log(await applyLeadSourceCountryPacksMigration(envs))
    console.log(await applyLeadSourcePartialPilotClaimMigration(envs))
    console.log(await applyLeadSourceProductFitRetryMigration(envs))
    console.log(await applyPortalTwentySourceOptionsMigration(envs))
    console.log(await applySalesSyncLogsListLeadMigration(envs))
    console.log(await applyManualJapanEntryWorkMigration(envs))
    console.log(await applyManualFormCopyExperimentMigration(envs))
    console.log(await applyManualFormCopyAnglesMigration(envs))
    console.log(await applyManualJapanEntrySourceLedgerMigration(envs))
    console.log(await applyManualJapanEntryReportV2Migration(envs))
    console.log(await applyManualWorkVerifiedFormAndCopyDiagnosticsMigration(envs))
    console.log(await applyManualWorkDurableBatchesMigration(envs))
    console.log(await applyManualWorkBatchRealtimeMigration(envs))
    console.log(await applyManualWorkMultiBatchQueueMigration(envs))
    console.log(await applyManualWorkReportOwnershipAndScaleMigration(envs))
    console.log(await applyManualWorkTerminalSourceFailuresMigration(envs))
    console.log(await applyManualWorkDurableRetryQueueMigration(envs))
    console.log(await applyTwentySelectOptionsScript(envs))
    console.log(await applyTwentyCompaniesViewScript(envs))
    console.log(await applyJapanEntryProjectionsMigration(envs))
    console.log(await applyDemoQualityGateMigration(envs))
    console.log(await applyDemoPrivateAssetReviewMigration(envs))
    console.log(await applyDemoTemporaryUnlistedAccessMigration(envs))
    console.log(await applyDemoSustainableBatchMigration(envs))
    console.log(await applyJapanEntryReportFactoryMigration(envs))
    console.log(await applyDemoCleanUrlFactoryMigration(envs))
    console.log(await applySalesPipelineDbTriggerProviderMigration(envs))
    console.log(await applyDemoCompanyTriggerGuardMigration(envs))
    console.log(await applyVideoPipelineMigration(envs))
    console.log(await applyVideoStrategyMigration(envs))
    console.log(await applyVideoProductionMigration(envs))
    console.log(await applyVideoFactoryEngineProfilesMigration(envs))
    console.log(await applyVideoFactoryOssExecutionTargetsMigration(envs))
    console.log(await applyVideoFactoryCommercialStudioMigration(envs))
    console.log(await applyVideoFactoryStudioLeastPrivilegeMigration(envs))
    console.log(await applyVideoGrowthDirectAcquisitionMigration(envs))
    console.log(await applyVideoGrowthCommercialSchemaMigration(envs))
    console.log(await applyVideoGrowthCommercialIntakeMigration(envs))
    console.log(await applyVideoGrowthCommercialQualityMigration(envs))
    console.log(await applyVideoGrowthCommercialGuardsMigration(envs))
    console.log(await applyCrmFieldMasterMigration(envs))
    console.log(await applySourceTechMetricsMigration(envs))
    console.log(await applyMonthlyLeadBatchMigration(envs))
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
    console.log(await applyQuoteRecoveryValidationMigration(envs))
    // Keep the latest claim contract last: older compatibility migrations also
    // define this RPC and can otherwise restore a stale no-retry function.
    console.log(await applyLeadSourceProductEvidenceRetryMigration(envs))
    console.log(await applySalesListLeadBatchSyncMigration(envs))
    console.log(await applyContentTemplates(envs))
    if (!SKIP_DB_VERIFY) runDbTableVerification(envs)
  } else {
    console.log("Dry run: skipped Supabase product upsert")
  }

  if (!DRY && !SKIP_DEPLOY) {
    prepareManualTraefikOriginLock()
    const uuid = await triggerDeploy()
    console.log(`Deployment queued: ${uuid}`)
    await waitDeploy(uuid)
    refreshManualTraefikRoute()
    // The application image runs compatibility migrations during startup.
    // Reassert the newest claim contract after the new container is healthy so
    // an older bundled function cannot silently remove product-evidence retries.
    console.log(await applyLeadSourceProductEvidenceRetryMigration(envs))
    await seedMarketingHomepages(envs)
    await seedEnglishJapanEntryBlog(envs)
  } else {
    console.log("Dry/skip mode: skipped Coolify deploy")
  }

  if (!DRY && !SKIP_DEPLOY) {
    console.log(await reconcileManualWorkV4Artifacts(envs))
  }

  const smokeTargets = [
    { url: "https://paradigmjp.com/api/ready" },
    { url: "https://paradigmjp.com/ja/quote-recovery", markers: ["見積を出した後", "無料でCSV診断する"] },
    { url: "https://paradigmjp.com/ja/pet-life-movie" },
    { url: "https://paradigmjp.com/ja/admin/shopify" },
    { url: "https://paradigmjp.com/ja/admin/sales" },
    { url: "https://paradigmjp.com/ja" },
    { url: "https://paradigmjp.com/ja/blog", markers: ["GEO対策とは？AI検索時代のSEO戦略を解説", "MEO対策の基本と成功のポイント"] },
    {
      url: "https://paradigmjp.com/en",
      markers: [
        "Your Japan Country Partner",
        "$15,000",
        "Apply for a Japan Partnership",
        "Wise",
        "14 business days",
      ],
    },
    {
      url: "https://paradigmjp.com/en/services",
      markers: ["Five modules, one accountable launch.", "Japanese buyer path"],
    },
    {
      url: "https://paradigmjp.com/en/contact",
      markers: [
        "Japan Entry package.",
        "Confirm your fit and launch timing",
        "$15,000 fixed setup",
        "Preferred payment method",
        "fully refundable",
      ],
    },
    { url: "https://paradigmjp.com/en/about" },
    { url: "https://paradigmjp.com/en/pricing", markers: ["$15,000", "$2,000/month", "selected launch partners", "Wise", "delivery guarantee"] },
    { url: "https://paradigmjp.com/en/faq", markers: ["$15,000", "Which payment methods can we use?", "full setup fee is refunded"] },
    { url: "https://paradigmjp.com/en/works" },
    { url: "https://paradigmjp.com/en/blog", markers: ["What Should a Japan Entry Package Actually Deliver?", "The Source Pack That Keeps a Japan Launch Moving"] },
    { url: "https://paradigmjp.com/en/japan-opportunities/invest", markers: ["Twelve distinct decisions", "Compare opportunity types", "Browse 12 briefs"] },
    { url: "https://paradigmjp.com/en/japan-opportunities/invest/japan-data-center-investment", markers: ["Japan Data Center Investment", "Evidence readiness score", "Primary sources"] },
    { url: "https://paradigmjp.com/en/japan-opportunities/invest/compare/japan-data-center-investment-vs-japan-renewable-energy-investment", markers: ["Data centers", "Renewable power", "Source ledgers"] },
    { url: "https://paradigmjp.com/api/v1/investor-briefs", markers: ["japan-data-center-investment", "\"count\":12"] },
    { url: "https://paradigmjp.com/api/v1/investor-briefs/factory", markers: ["\"total\":189504", "indexableOnlyAfterQualityGate"] },
    { url: "https://paradigmjp.com/llms.txt", markers: ["Japan Investor Briefs", "pSEO factory manifest"] },
    { url: "https://paradigmjp.com/sitemap.xml", markers: ["japan-data-center-investment", "japan-renewable-energy-investment"] },
    { url: "https://paradigmjp.com/en/privacy" },
    { url: "https://paradigmjp.com/en/legal", markers: ["$15,000", "Wise", "100% of the USD 15,000 setup fee is refunded"] },
    { url: "https://paradigmjp.com/en/terms", markers: ["Terms of Service", "$15,000", "14 business days"] },
    { url: "https://paradigmjp.com/en/refund", markers: ["Refund", "100% of the USD 15,000 setup fee is refunded", "Start Date"] },
    { url: `https://paradigmjp.com${envValue("RELEASE_REPORT_SMOKE_PATH", "/en/report/ccbc-xynd21")}` },
    { url: "https://twenty.paradigmjp.com" },
  ]
  for (const target of smokeTargets) {
    const status = await smoke(target.url, target.markers)
    console.log(`Smoke OK: ${target.url} HTTP ${status}`)
  }
  if (!DRY) {
    console.log(await refreshIntegrationStatus(envs))
    // Public seed/smoke endpoints can load bundled compatibility contracts.
    // Make the newest claim RPC the final DB mutation before post-deploy doctor.
    console.log(await applyLeadSourceProductEvidenceRetryMigration(envs))
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
