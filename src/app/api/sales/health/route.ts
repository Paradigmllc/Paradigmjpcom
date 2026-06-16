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
        : "error"

  return { name, status, detail: result.balanceLabel ?? "", url }
}

async function checkSupabase(): Promise<ServiceCheck> {
  const config = getSalesSupabaseConfig()
  if (!config) {
    return {
      name: "Supabase",
      status: "not_configured",
      detail: "NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY or SALES_SUPABASE_* is not configured",
      url: env("NEXT_PUBLIC_SUPABASE_URL") ?? env("SALES_SUPABASE_URL"),
    }
  }

  const sb = getServiceSalesSupabase()
  if (!sb) {
    return { name: "Supabase", status: "error", detail: "Supabase service client could not be created", url: config.url }
  }

  try {
    const { error } = await sb.from(DB_TABLES.SALES_COMPANIES).select("id", { count: "exact", head: true }).limit(1)
    if (error) return { name: "Supabase", status: "error", detail: `${config.source}: ${error.message}`, url: config.url }
    return { name: "Supabase", status: "ok", detail: `${config.source}: sales_companies reachable`, url: config.url }
  } catch (error) {
    return { name: "Supabase", status: "error", detail: error instanceof Error ? error.message : String(error), url: config.url }
  }
}

async function checkSearxng(): Promise<ServiceCheck> {
  const base = env("SEARXNG_BASE_URL")
  if (!base) return { name: "SearxNG", status: "not_configured", detail: "SEARXNG_BASE_URL is not configured", url: null }

  try {
    const candidates = [base, base.includes("searxng.paradigmjp.com") ? "http://searxng:8080" : null].filter((value): value is string => Boolean(value))
    let lastStatus: number | null = null
    for (const candidate of candidates) {
      const url = new URL("/search", candidate)
      url.searchParams.set("q", "test")
      url.searchParams.set("format", "json")
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8_000) })
      lastStatus = res.status
      if (res.ok) return { name: "SearxNG", status: "ok", detail: "search endpoint reachable", url: candidate }
    }
    return { name: "SearxNG", status: "error", detail: `HTTP ${lastStatus ?? "unknown"}`, url: base }
  } catch (error) {
    return { name: "SearxNG", status: "error", detail: error instanceof Error ? error.message : String(error), url: base }
  }
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

async function checkTriggerDev(): Promise<ServiceCheck> {
  const secretKey = env("TRIGGER_SECRET_KEY") ?? env("TRIGGER_ACCESS_TOKEN") ?? env("TRIGGER_DEV_API_KEY")
  const base = env("TRIGGER_API_URL")
  if (!base) return { name: "Trigger.dev", status: "not_configured", detail: "TRIGGER_API_URL is not configured" }
  if (!secretKey) return { name: "Trigger.dev", status: "not_configured", detail: "Trigger.dev secret key is not configured", url: base }

  try {
    const url = new URL(base)
    url.pathname = `${url.pathname}/api/v1/runs`.replace(/\/+/g, "/")
    url.searchParams.set("limit", "1")
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${secretKey}` },
      signal: AbortSignal.timeout(6_000),
    })
    if (!res.ok) return { name: "Trigger.dev", status: "error", detail: `HTTP ${res.status}`, url: base }
    return { name: "Trigger.dev", status: "ok", detail: "runs API reachable", url: base }
  } catch (error) {
    return { name: "Trigger.dev", status: "error", detail: error instanceof Error ? error.message : String(error), url: base }
  }
}

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
  const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "DEEPSEEK_API_KEY"]
  const requiredAny = [["TRIGGER_SECRET_KEY", "TRIGGER_ACCESS_TOKEN", "TRIGGER_DEV_API_KEY"]]
  const optional = [
    "SEARXNG_BASE_URL",
    "FLARESOLVERR_API_URL",
    "STEEL_BASE_URL",
    "DIFY_API_KEY",
    "DIFY_DIAGNOSIS_API_KEY",
    "DIFY_FORM_MESSAGE_API_KEY",
    "DIFY_FORM_MESSAGE_KEY",
    "DIFY_FREELANCE_AUTOREPLY_KEY",
    "TWENTY_BASE_URL",
    "TWENTY_API_KEY",
    "NOTION_API_KEY",
    "CRAWL4AI_BASE_URL",
    "BROWSERLESS_URL",
    "BROWSERLESS_TOKEN",
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
      checkBrowserSearch(),
      checkSearxng(),
      checkDify(),
      checkTriggerDev(),
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
