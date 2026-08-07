#!/usr/bin/env node
import { Client } from "pg"
import { execFileSync } from "node:child_process"
import { readCoolifyApplicationEnvs, DEFAULT_APP_UUID } from "./lib/coolify-env.mjs"
import {
  SALES_TABLES,
  countTables,
  createLegacyCloudSupabaseScriptClient,
  createSalesSupabaseScriptClient,
} from "./lib/sales-supabase-client.mjs"

const BASE_URL = argValue("--base") ?? process.env.REVENUEOS_BASE_URL ?? "https://paradigmjp.com"
const BURN_IN = Number(argValue("--burn-in") ?? process.env.REVENUEOS_BURN_IN ?? "5")
const WRITEBACK_EVERY = Number(argValue("--writeback-every") ?? process.env.REVENUEOS_WRITEBACK_EVERY ?? "0")
const SKIP_CLOUD_CANCEL_GATE = process.argv.includes("--skip-cloud-cancel-gate")
const JSON_OUT = process.argv.includes("--json")
const APP_UUID = process.env.PARADIGM_APP_UUID ?? DEFAULT_APP_UUID
const TEST_COMPANY_ID = process.env.REVENUEOS_TEST_COMPANY_ID ?? "16f7791d-fb6a-473f-b4ef-94c8c5cf40d0"

const REQUIRED_OPTIONAL_ENV_GROUPS = [
  ["DIFY_DIAGNOSIS_API_KEY", "DIFY_API_KEY"],
  ["DIFY_FORM_MESSAGE_API_KEY", "DIFY_FORM_MESSAGE_KEY"],
  ["NOTION_API_KEY"],
  ["GBIZ_API_TOKEN"],
  ["GOOGLE_PSI_API_KEY", "GOOGLE_PAGESPEED_KEY"],
  ["HUNTER_API_KEY"],
]

const TWENTY_EXPECTED_FIELDS = [
  "paradigmKarteScore",
  "paradigmSourceCoverage",
  "paradigmDataStatus",
  "paradigmDataSources",
  "paradigmNextAction",
  "paradigmLastError",
  "paradigmKarteSummary",
]

const checks = []

function argValue(name) {
  const item = process.argv.find((arg) => arg.startsWith(`${name}=`))
  return item ? item.slice(name.length + 1) : null
}

function envValue(envs, name) {
  const value = envs[name] ?? process.env[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function maskUrl(url) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.host}`
  } catch {
    return "(invalid url)"
  }
}

function add(name, status, detail, severity = "blocker", data = undefined) {
  checks.push({ name, status, detail, severity, data })
  if (!JSON_OUT) {
    const mark = status === "pass" ? "PASS" : status === "warn" ? "WARN" : "FAIL"
    console.log(`[${mark}] ${name}: ${detail}`)
  }
}

async function authedFetch(envs, path, init = {}) {
  const secret =
    envValue(envs, "TRIGGER_WEBHOOK_SECRET") ??
    envValue(envs, "N8N_WEBHOOK_SECRET") ??
    envValue(envs, "PARADIGM_ADMIN_TOKEN")
  if (!secret) throw new Error("TRIGGER_WEBHOOK_SECRET/N8N_WEBHOOK_SECRET/PARADIGM_ADMIN_TOKEN is not configured")
  const { timeoutMs = 120_000, ...requestInit } = init
  const res = await fetch(`${BASE_URL}${path}`, {
    ...requestInit,
    headers: {
      "x-webhook-secret": secret,
      "content-type": "application/json",
      ...(requestInit.headers ?? {}),
    },
    signal: AbortSignal.timeout(timeoutMs),
  })
  const text = await res.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text.slice(0, 500)
  }
  return { res, body }
}

async function checkProductionApis(envs) {
  const health = await authedFetch(envs, "/api/sales/health")
  const failing = Array.isArray(health.body?.checks)
    ? health.body.checks.filter((check) => check.status !== "ok")
    : []
  add(
    "Production health",
    health.res.ok && health.body?.status === "healthy" && failing.length === 0 ? "pass" : "fail",
    `${health.res.status} status=${health.body?.status ?? "unknown"} failing=${failing.length}`,
    "blocker",
    failing,
  )

  const r2 = await authedFetch(envs, "/api/sales/r2")
  add("R2 delivery", r2.res.ok && r2.body?.ready === true ? "pass" : "fail", `ready=${Boolean(r2.body?.ready)}`)

  const screenshot = await authedFetch(envs, "/api/sales/screenshot", {
    method: "POST",
    body: JSON.stringify({ companyId: TEST_COMPANY_ID, viewport: "desktop" }),
    timeoutMs: 180_000,
  })
  add(
    "Screenshot evidence",
    screenshot.res.ok && screenshot.body?.provider ? "pass" : "fail",
    screenshot.res.ok ? `provider=${screenshot.body.provider}` : `HTTP ${screenshot.res.status}: ${screenshot.body?.error ?? "failed"}`,
  )

  const twenty = await authedFetch(envs, "/api/sales/twenty-sync", {
    method: "POST",
    body: JSON.stringify({ limit: 10 }),
    timeoutMs: 180_000,
  })
  add(
    "Twenty writeback",
    twenty.res.ok && twenty.body?.ok === true && (twenty.body.failed ?? 1) === 0 ? "pass" : "fail",
    twenty.res.ok ? `synced=${twenty.body.synced} failed=${twenty.body.failed} limit=${twenty.body.limit}` : `HTTP ${twenty.res.status}`,
  )
}

async function checkSalesDatabase(envs) {
  const { client, url, source } = createSalesSupabaseScriptClient(envs)
  if (!client) {
    add("Sales Supabase client", "fail", "not configured")
    return null
  }
  add("Sales Supabase client", "pass", `${source} ${maskUrl(url)}`)

  const tableCounts = await countTables(client)
  const failed = tableCounts.filter((row) => !row.ok)
  const emptyCritical = tableCounts.filter((row) =>
    ["sales_companies", "sales_pipeline_runs", "sales_pipeline_steps", "sales_source_runs"].includes(row.table) &&
    row.ok &&
    row.count === 0
  )
  add(
    "Sales table visibility",
    failed.length === 0 && emptyCritical.length === 0 ? "pass" : "fail",
    `tables=${tableCounts.length} failed=${failed.length} emptyCritical=${emptyCritical.length}`,
    "blocker",
    tableCounts,
  )

  const { data: screenshotRow, error: screenshotError } = await client
    .from("sales_companies")
    .select("id, visual_evidence, meta")
    .eq("id", TEST_COMPANY_ID)
    .maybeSingle()
  const hasScreenshot =
    Boolean(screenshotRow?.visual_evidence?.screenshots?.desktop?.url) ||
    Boolean(screenshotRow?.meta?.visual_evidence?.screenshots?.desktop?.url)
  add(
    "Screenshot DB reflection",
    !screenshotError && hasScreenshot ? "pass" : "fail",
    screenshotError ? screenshotError.message : `desktopEvidence=${hasScreenshot}`,
  )

  const { data: recentRuns, error: runError } = await client
    .from("sales_pipeline_runs")
    .select("id,status,trigger_run_id,steps_total,steps_completed,updated_at")
    .order("updated_at", { ascending: false })
    .limit(200)
  if (runError) {
    add("Pipeline recent runs", "fail", runError.message)
  } else {
    const stuck = (recentRuns ?? []).filter((run) =>
      ["queued", "running", "waiting_external"].includes(run.status) &&
      !run.trigger_run_id
    )
    add("Pipeline recent runs", stuck.length === 0 ? "pass" : "warn", `recent=${recentRuns?.length ?? 0} undispatchedActive=${stuck.length}`, stuck.length === 0 ? "blocker" : "warning")
  }

  return client
}

async function checkCloudCancellationGate(envs) {
  if (SKIP_CLOUD_CANCEL_GATE) {
    add("Cloud Supabase cancellation gate", "warn", "skipped by --skip-cloud-cancel-gate", "warning")
    return
  }
  const { client: legacyClient, url: legacyUrl } = createLegacyCloudSupabaseScriptClient(envs)
  const { client: ossClient } = createSalesSupabaseScriptClient(envs)
  if (!legacyClient || !ossClient) {
    add(
      "Cloud Supabase cancellation gate",
      "fail",
      "legacy cloud URL/service role env not configured; cannot prove cancellation-safe",
    )
    return
  }
  const [legacyCounts, ossCounts] = await Promise.all([countTables(legacyClient, SALES_TABLES), countTables(ossClient, SALES_TABLES)])
  const mismatches = []
  for (const legacy of legacyCounts) {
    const oss = ossCounts.find((row) => row.table === legacy.table)
    if (!legacy.ok || !oss?.ok || legacy.count !== oss.count) {
      mismatches.push({ table: legacy.table, cloud: legacy.count, oss: oss?.count ?? null, cloudOk: legacy.ok, ossOk: oss?.ok ?? false })
    }
  }
  add(
    "Cloud Supabase cancellation gate",
    mismatches.length === 0 ? "pass" : "fail",
    `cloud=${maskUrl(legacyUrl)} compared=${legacyCounts.length} mismatches=${mismatches.length}`,
    "blocker",
    mismatches,
  )
}

async function checkTwentyMetadata(envs) {
  const connectionString = envValue(envs, "TWENTY_DATABASE_URL") ?? envValue(envs, "TWENTY_METADATA_DATABASE_URL")
  if (!connectionString) {
    add("Twenty metadata order", "fail", "TWENTY_DATABASE_URL/TWENTY_METADATA_DATABASE_URL not configured")
    return
  }
  const client = new Client({ connectionString })
  try {
    await client.connect()
    const result = await client.query(
      `
        select f.name, min(vf."position")::int as position, bool_or(vf."isVisible") as visible
        from core."objectMetadata" object
        join core."fieldMetadata" f on f."objectMetadataId" = object.id
        left join core."viewField" vf on vf."fieldMetadataId" = f.id
        where object."nameSingular" = 'company'
          and f.name = any($1::text[])
        group by f.name
      `,
      [TWENTY_EXPECTED_FIELDS],
    )
    const rows = result.rows
    const missing = TWENTY_EXPECTED_FIELDS.filter((field) => !rows.some((row) => row.name === field))
    const hidden = rows.filter((row) => row.visible !== true)
    add(
      "Twenty metadata order",
      missing.length === 0 && hidden.length === 0 ? "pass" : "fail",
      `fields=${rows.length}/${TWENTY_EXPECTED_FIELDS.length} missing=${missing.length} hidden=${hidden.length}`,
      "blocker",
      { missing, hidden },
    )
  } catch (error) {
    add("Twenty metadata order", "fail", error instanceof Error ? error.message : String(error))
  } finally {
    await client.end().catch(() => {})
  }
}

function checkOptionalSourceKeys(envs) {
  const missing = REQUIRED_OPTIONAL_ENV_GROUPS
    .filter((group) => group.every((name) => !envValue(envs, name)))
    .map((group) => group.join(" or "))
  add(
    "Paid/manual source keys",
    missing.length === 0 ? "pass" : "warn",
    missing.length === 0 ? "all configured" : `missing=${missing.join(", ")}`,
    "warning",
    missing,
  )
}

function checkHostRuntime() {
  try {
    const output = execFileSync("ssh", [
      "-o",
      "BatchMode=yes",
      "-o",
      "ConnectTimeout=10",
      "root@178.105.138.55",
      "uptime; df -h / | tail -1; docker ps --format '{{.Names}} {{.Status}}' | grep -E 'n8i2sjiqvr2d8hrzppop2m2i|paradigm-outreach-worker|supabase-db-1|supabase-rest-1|services-crawl4ai-1|services-steel-browser-1'",
    ], { encoding: "utf8", timeout: 30_000 })
    const diskLine = output.split("\n").find((line) => line.includes("/dev/"))
    const diskPct = Number(diskLine?.match(/\s(\d+)%\s/)?.[1] ?? "0")
    add("Host runtime", diskPct > 0 && diskPct < 88 ? "pass" : "warn", `disk=${diskPct || "unknown"}%`, diskPct > 0 && diskPct < 88 ? "blocker" : "warning", output)
  } catch (error) {
    add("Host runtime", "warn", error instanceof Error ? error.message : String(error), "warning")
  }
}

async function runBurnIn(envs, salesClient) {
  if (!Number.isFinite(BURN_IN) || BURN_IN <= 0) {
    add("Burn-in", "warn", "not run; use --burn-in=N", "warning")
    return
  }
  let failures = 0
  for (let i = 1; i <= BURN_IN; i++) {
    try {
      const health = await authedFetch(envs, "/api/sales/health", { timeoutMs: 45_000 })
      if (!health.res.ok || health.body?.status !== "healthy") failures += 1
      if (salesClient) {
        const { error } = await salesClient.from("sales_companies").select("id", { count: "exact", head: true }).limit(1)
        if (error) failures += 1
      }
      if (WRITEBACK_EVERY > 0 && i % WRITEBACK_EVERY === 0) {
        const writeback = await authedFetch(envs, "/api/sales/twenty-sync", {
          method: "POST",
          body: JSON.stringify({ limit: 10 }),
          timeoutMs: 120_000,
        })
        if (!writeback.res.ok || writeback.body?.ok !== true) failures += 1
      }
    } catch {
      failures += 1
    }
  }
  add("Burn-in", failures === 0 ? "pass" : "fail", `iterations=${BURN_IN} failures=${failures}`)
}

function summarize() {
  const blockers = checks.filter((check) => check.status === "fail" && check.severity === "blocker")
  const warnings = checks.filter((check) => check.status === "warn" || (check.status === "fail" && check.severity === "warning"))
  const result = {
    ok: blockers.length === 0,
    cloudSupabaseCancellationReady: blockers.every((check) => check.name !== "Cloud Supabase cancellation gate"),
    checkedAt: new Date().toISOString(),
    blockers,
    warnings,
    checks,
  }
  if (JSON_OUT) console.log(JSON.stringify(result, null, 2))
  else {
    console.log("")
    console.log(`Summary: ${result.ok ? "PASS" : "FAIL"} blockers=${blockers.length} warnings=${warnings.length}`)
    if (blockers.length > 0) {
      for (const blocker of blockers) console.log(`  BLOCKER ${blocker.name}: ${blocker.detail}`)
    }
  }
  process.exit(result.ok ? 0 : 1)
}

async function main() {
  if (!JSON_OUT) console.log(`RevenueOS readiness gate: ${BASE_URL}`)
  const envs = await readCoolifyApplicationEnvs(APP_UUID)
  checkOptionalSourceKeys(envs)
  checkHostRuntime()
  await checkProductionApis(envs)
  const salesClient = await checkSalesDatabase(envs)
  await checkTwentyMetadata(envs)
  await checkCloudCancellationGate(envs)
  await runBurnIn(envs, salesClient)
  summarize()
}

main().catch((error) => {
  add("Readiness gate", "fail", error instanceof Error ? error.message : String(error))
  summarize()
})
