import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { DB_TABLES } from "@/lib/sales/db-tables"
import {
  checkCrawl4AiHealth,
  checkCrawleeHealth,
  checkDifyHealth,
  checkFlareSolverrServiceHealth,
  checkPlaywrightStealthHealth,
  checkStagehandHealth,
  checkSteelHealth,
  type ServiceHealthResult,
} from "@/lib/sales/oss-service-health"
import { getBrowserSearchBackendStatus } from "@/lib/sales/sources/browser-search"
import { getSalesSupabaseConfig, getServiceSalesSupabase } from "@/lib/supabase"
import { checkPoolHealth, getPoolConfigSummary } from "@/lib/db/pool-monitor"
import { getPayloadPoolMetrics, getConsecutiveFailures } from "@/lib/payload-availability"
import { twentyBaseUrl, twentyFetch, type TwentyListResponse, type TwentyRecord } from "@/lib/sales/twenty-sync-utils"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 15

type ServiceStatus = "ok" | "error" | "not_configured"

interface ServiceCheck {
  name: string
  status: ServiceStatus
  detail: string
  url?: string | null
}

function isDisabledInternalServiceUrl(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const host = new URL(url).hostname
    return ["outreach-worker", "paradigm-outreach-worker", "services-steel-browser-1"].includes(host)
  } catch (error) {
    console.warn("[sales-health] invalid service URL:", { url, error })
    return false
  }
}

function env(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : null
}

function serviceHealthToCheck(name: string, result: ServiceHealthResult, url?: string | null): ServiceCheck {
  const status =
    result.balanceStatus === "ok" || result.balanceStatus === "checkable" || result.balanceStatus === "manual"
      ? "ok"
      : result.balanceStatus === "not_configured"
        ? "not_configured"
        : isDisabledInternalServiceUrl(url)
          ? "not_configured"
          : "error"

  return { name, status, detail: result.balanceLabel ?? "", url }
}

async function checkSupabase(): Promise<ServiceCheck> {
  const config = getSalesSupabaseConfig()
  if (!config) {
    return {
      name: "Supabase Event Store",
      status: "not_configured",
      detail: "NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY or SALES_SUPABASE_* is not configured",
      url: env("NEXT_PUBLIC_SUPABASE_URL") ?? env("SALES_SUPABASE_URL"),
    }
  }

  const sb = getServiceSalesSupabase()
  if (!sb) {
    return { name: "Supabase Event Store", status: "error", detail: "Supabase service client could not be created", url: config.url }
  }

  try {
    const { error } = await sb.from(DB_TABLES.SALES_COMPANIES).select("id", { count: "exact", head: true }).limit(1)
    if (error) return { name: "Supabase Event Store", status: "error", detail: `${config.source}: ${error.message}`, url: config.url }
    return { name: "Supabase Event Store", status: "ok", detail: `${config.source}: event store reachable`, url: config.url }
  } catch (error) {
    return { name: "Supabase Event Store", status: "error", detail: error instanceof Error ? error.message : String(error), url: config.url }
  }
}

async function checkTwentyApi(): Promise<ServiceCheck> {
  const baseUrl = twentyBaseUrl()
  const apiKey = env("TWENTY_API_KEY")
  if (!baseUrl || !apiKey) {
    return {
      name: "Twenty Sales OS API",
      status: "error",
      detail: "TWENTY_BASE_URL and TWENTY_API_KEY are required because Twenty is the Sales OS SSOT",
      url: baseUrl,
    }
  }

  let lastError = "Twenty API request failed"
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/rest/companies?limit=1`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(8_000),
      })
      if (response.ok) {
        return { name: "Twenty Sales OS API", status: "ok", detail: "companies REST API reachable", url: baseUrl }
      }
      lastError = `Twenty API HTTP ${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      if (attempt < 2) console.warn("[sales-health] Twenty probe failed; retrying:", error)
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return { name: "Twenty Sales OS API", status: "error", detail: lastError, url: baseUrl }
}

async function checkBrowserSearch(): Promise<ServiceCheck> {
  const backend = getBrowserSearchBackendStatus()
  if (!backend.configured) {
    return { name: "Browser search", status: "not_configured", detail: backend.error ?? "Browser search backend is not configured" }
  }

  if (backend.flaresolverrUrl) {
    const result = await checkFlareSolverrServiceHealth()
    return serviceHealthToCheck("Browser search (FlareSolverr)", result, backend.flaresolverrUrl)
  }

  return { name: "Browser search (Steel)", status: "ok", detail: "Steel backend configured", url: backend.steelBaseUrl }
}

async function checkDify(): Promise<ServiceCheck> {
  const result = await checkDifyHealth()
  return serviceHealthToCheck("Dify", result, env("DIFY_API_BASE") ?? env("DIFY_API_URL") ?? env("DIFY_BASE_URL") ?? "https://api.dify.ai")
}

async function checkOpenClaw(): Promise<ServiceCheck> {
  const results: string[] = []
  let ok = true

  // 1. Verify pipeline scripts are deployed
  try {
    const { readdirSync, existsSync } = await import("node:fs")
    const pipeDir = "/app/openclaw-pipeline"
    const skills = ["lead-discovery", "diagnosis-output", "crm-sync", "outreach-exec"]
    let scriptsFound = 0
    for (const skill of skills) {
      const scriptsDir = `${pipeDir}/${skill}/scripts`
      if (existsSync(scriptsDir)) {
        const files = readdirSync(scriptsDir).filter((f) => f.endsWith(".js"))
        scriptsFound += files.length
      }
    }
    if (scriptsFound === 0) {
      results.push("no pipeline scripts found")
      ok = false
    } else {
      results.push(`${scriptsFound} pipeline scripts deployed`)
    }
  } catch (e) {
    results.push("pipeline scripts check failed")
    ok = false
  }

  // Twenty API is checked once by checkTwentyApi above. Duplicating the
  // request here made health probes contend with each other during deploys.
  results.push("Twenty API checked separately")

  // 3. Verify DeepSeek API key
  if (process.env.DEEPSEEK_API_KEY) {
    results.push("DeepSeek configured")
  } else {
    results.push("DeepSeek missing")
    ok = false
  }

  return {
    name: "OpenClaw Pipeline",
    status: ok ? "ok" : "error",
    detail: results.join("; "),
  }
}

/** @deprecated 2026-07-06 */
const checkTriggerDev = checkOpenClaw

function checkOutreachEnvSummary(): ServiceCheck {
  const provider = env("OUTREACH_BROWSER_PROVIDER") ?? "auto"
  const remoteReady = !!env("OUTREACH_WORKER_URL") && !!env("OUTREACH_WORKER_SECRET")
  const crawleeReady = !!env("CRAWLEE_WORKER_URL") && !!(env("CRAWLEE_WORKER_SECRET") ?? env("OUTREACH_WORKER_SECRET"))
  const stagehandReady = !!env("STAGEHAND_URL") && !!env("STAGEHAND_API_KEY")
  const crawl4AiReady = !!env("CRAWL4AI_BASE_URL")
  const externalReady = remoteReady || crawleeReady || stagehandReady || crawl4AiReady

  if (provider === "auto" && externalReady) {
    return { name: "Form URL / outreach lane", status: "ok", detail: "auto provider has HTTP plus external extraction lanes configured" }
  }
  if (provider === "auto") {
    return { name: "Form URL / outreach lane", status: "not_configured", detail: "auto provider has only standard HTTP lane configured" }
  }
  return {
    name: "Form URL / outreach lane",
    status: externalReady || provider === "http" || provider === "dry" ? "ok" : "not_configured",
    detail: `provider=${provider}`,
  }
}

function checkEnvSummary(): ServiceCheck {
  const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "DEEPSEEK_API_KEY", "TWENTY_BASE_URL", "TWENTY_API_KEY"]
  const requiredAny: string[][] = []
  const optional = [
    "FLARESOLVERR_API_URL",
    "STEEL_BASE_URL",
    "DIFY_API_KEY",
    "DIFY_DIAGNOSIS_API_KEY",
    "DIFY_FORM_MESSAGE_API_KEY",
    "DIFY_FORM_MESSAGE_KEY",
    "DIFY_FREELANCE_AUTOREPLY_KEY",
    "CRAWL4AI_BASE_URL",
    "STAGEHAND_URL",
    "STAGEHAND_API_KEY",
    "OUTREACH_WORKER_URL",
    "OUTREACH_WORKER_SECRET",
    "GBIZ_API_TOKEN",
    "GOOGLE_PSI_API_KEY",
    "HUNTER_API_KEY",
  ]
  const missing = required.filter((name) => !env(name))
  const missingAny = requiredAny.filter((names) => names.every((name) => !env(name))).map((names) => names.join(" or "))
  const optionalMissing = optional.filter((name) => !env(name))

  if (missing.length > 0 || missingAny.length > 0) {
    return { name: "Environment", status: "error", detail: `required missing: ${[...missing, ...missingAny].join(", ")}` }
  }
  if (optionalMissing.length > 0) {
    return { name: "Environment", status: "ok", detail: `required configured; optional missing: ${optionalMissing.join(", ")}` }
  }
  return { name: "Environment", status: "ok", detail: "required and optional envs configured" }
}

async function checkPayloadPool(): Promise<ServiceCheck> {
  try {
    const poolHealth = await checkPoolHealth()
    const summary = getPoolConfigSummary()
    const metrics = getPayloadPoolMetrics()

    const poolDetail = `${summary.host}:${summary.port} | ${poolHealth.poolerMode} | max=${summary.poolMax} | failures=${metrics.consecutiveFailures}`

    if (poolHealth.status === "unavailable") {
      return { name: "PayloadCMS DB Pool", status: "error", detail: poolDetail + " | " + poolHealth.warnings.join("; "), url: summary.uri as string }
    }
    if (poolHealth.status === "degraded") {
      return { name: "PayloadCMS DB Pool", status: "ok", detail: poolDetail + " (degraded: " + poolHealth.warnings.join("; ") + ")", url: summary.uri as string }
    }
    return { name: "PayloadCMS DB Pool", status: "ok", detail: poolDetail, url: summary.uri as string }
  } catch (error) {
    return { name: "PayloadCMS DB Pool", status: "error", detail: error instanceof Error ? error.message : String(error) }
  }
}

async function guardHealth(name: string, url: string | null, fn: () => Promise<ServiceHealthResult>): Promise<ServiceCheck> {
  try {
    return serviceHealthToCheck(name, await fn(), url)
  } catch (error) {
    return { name, status: "error", detail: error instanceof Error ? error.message : String(error), url }
  }
}

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const checks: ServiceCheck[] = [
    checkEnvSummary(),
    checkOutreachEnvSummary(),
    ...(await Promise.all([
      checkSupabase(),
      checkTwentyApi(),
      checkPayloadPool(),
      checkBrowserSearch(),
      checkDify(),
      checkOpenClaw(),
      guardHealth("Crawl4AI", env("CRAWL4AI_BASE_URL"), checkCrawl4AiHealth),
      guardHealth("Stagehand", env("STAGEHAND_URL"), checkStagehandHealth),
      guardHealth("Steel.dev", env("STEEL_BASE_URL"), checkSteelHealth),
      guardHealth("Crawlee worker", env("CRAWLEE_WORKER_URL"), checkCrawleeHealth),
      guardHealth("Outreach worker", env("OUTREACH_WORKER_URL"), checkPlaywrightStealthHealth),
    ])),
  ]
  const hasError = checks.some((check) => check.status === "error")
  const hasNotConfigured = checks.some((check) => check.status === "not_configured")

  return NextResponse.json({
    ok: !hasError,
    status: hasError ? "error" : hasNotConfigured ? "degraded" : "healthy",
    checkedAt: new Date().toISOString(),
    checks,
  })
}
