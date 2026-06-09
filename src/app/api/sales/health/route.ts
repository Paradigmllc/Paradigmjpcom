import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import {
  checkBrowserlessHealth,
  checkCrawl4AiHealth,
  checkCrawleeHealth,
  checkDifyHealth,
  checkPlaywrightStealthHealth,
  checkStagehandHealth,
  type ServiceHealthResult,
} from "@/lib/sales/oss-service-health"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

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
  return {
    name,
    status:
      result.balanceStatus === "ok" || result.balanceStatus === "checkable" || result.balanceStatus === "manual"
        ? "ok"
        : result.balanceStatus === "not_configured"
          ? "not_configured"
          : "error",
    detail: result.balanceLabel ?? "",
    url,
  }
}

async function checkSupabase(): Promise<ServiceCheck> {
  const url = env("NEXT_PUBLIC_SUPABASE_URL") ?? env("SALES_SUPABASE_URL")
  const key = env("SUPABASE_SERVICE_ROLE_KEY") ?? env("SALES_SUPABASE_SERVICE_ROLE_KEY")
  if (!url || !key) {
    return {
      name: "Supabase",
      status: "not_configured",
      detail: "SUPABASE_SERVICE_ROLE_KEY または NEXT_PUBLIC_SUPABASE_URL が未設定です",
      url,
    }
  }

  const sb = getServiceSalesSupabase()
  if (!sb) {
    return { name: "Supabase", status: "error", detail: "Supabase service client の作成に失敗しました", url }
  }

  try {
    const { error } = await sb.from("sales_companies").select("id", { count: "exact", head: true }).limit(1)
    if (error) return { name: "Supabase", status: "error", detail: error.message, url }
    return { name: "Supabase", status: "ok", detail: "sales_companies テーブルに接続できました", url }
  } catch (error) {
    return { name: "Supabase", status: "error", detail: error instanceof Error ? error.message : String(error), url }
  }
}

async function checkSearxng(): Promise<ServiceCheck> {
  const base = env("SEARXNG_BASE_URL")
  if (!base) {
    return {
      name: "SearxNG",
      status: "not_configured",
      detail: "SEARXNG_BASE_URL が未設定です。リスト生成はフォールバック動作になります",
      url: null,
    }
  }

  try {
    const url = new URL("/search", base)
    url.searchParams.set("q", "test")
    url.searchParams.set("format", "json")
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8_000) })
    if (!res.ok) return { name: "SearxNG", status: "error", detail: `HTTP ${res.status}`, url: base }
    return { name: "SearxNG", status: "ok", detail: "検索エンドポイントに到達できました", url: base }
  } catch (error) {
    return { name: "SearxNG", status: "error", detail: error instanceof Error ? error.message : String(error), url: base }
  }
}

async function checkDify(): Promise<ServiceCheck> {
  const result = await checkDifyHealth()
  return serviceHealthToCheck(
    "Dify",
    result,
    env("DIFY_API_BASE") ?? env("DIFY_API_URL") ?? env("DIFY_BASE_URL") ?? "https://api.dify.ai",
  )
}

async function checkTriggerDev(): Promise<ServiceCheck> {
  const secretKey = env("TRIGGER_SECRET_KEY") ?? env("TRIGGER_ACCESS_TOKEN") ?? env("TRIGGER_DEV_API_KEY")
  const base = env("TRIGGER_API_URL") ?? "http://localhost:8030"
  if (!secretKey) {
    return {
      name: "Trigger.dev",
      status: "not_configured",
      detail: "TRIGGER_SECRET_KEY / TRIGGER_ACCESS_TOKEN / TRIGGER_DEV_API_KEY が未設定です",
      url: base,
    }
  }

  try {
    const url = new URL(base)
    url.pathname = `${url.pathname}/api/v1/runs`.replace(/\/+/g, "/")
    url.searchParams.set("limit", "1")
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${secretKey}` },
      signal: AbortSignal.timeout(6_000),
    })
    if (!res.ok) return { name: "Trigger.dev", status: "error", detail: `HTTP ${res.status}`, url: base }
    return { name: "Trigger.dev", status: "ok", detail: "Trigger.dev API に到達でき、認証が成功しました", url: base }
  } catch (error) {
    return { name: "Trigger.dev", status: "error", detail: error instanceof Error ? error.message : String(error), url: base }
  }
}

function checkOutreachEnvSummary(): ServiceCheck {
  const provider = env("OUTREACH_BROWSER_PROVIDER") ?? "auto"
  const remoteReady = !!env("OUTREACH_WORKER_URL") && !!env("OUTREACH_WORKER_SECRET")
  const crawleeReady = !!env("CRAWLEE_WORKER_URL") && !!(env("CRAWLEE_WORKER_SECRET") ?? env("OUTREACH_WORKER_SECRET"))
  const browserlessReady = !!env("BROWSERLESS_URL") && !!env("BROWSERLESS_TOKEN")
  const stagehandReady = !!env("STAGEHAND_URL") && !!env("STAGEHAND_API_KEY")
  const crawl4AiReady = !!env("CRAWL4AI_BASE_URL")
  const externalReady = remoteReady || crawleeReady || browserlessReady || stagehandReady || crawl4AiReady

  if (provider === "auto" && externalReady) {
    return {
      name: "フォーム営業レーン",
      status: "ok",
      detail: "auto: 標準HTTPフォーム + 外部抽出/ブラウザレーンが設定されています",
    }
  }

  if (provider === "auto") {
    return {
      name: "フォーム営業レーン",
      status: "not_configured",
      detail: "auto: 標準HTTPフォームのみ。本番SPA対応には Crawl4AI / Browserless / Stagehand / worker のいずれかを設定してください",
    }
  }

  return {
    name: "フォーム営業レーン",
    status: externalReady || provider === "http" || provider === "dry" ? "ok" : "not_configured",
    detail: `provider=${provider}`,
  }
}

function checkEnvSummary(): ServiceCheck {
  const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "DEEPSEEK_API_KEY"]
  const requiredAny = [["TRIGGER_SECRET_KEY", "TRIGGER_ACCESS_TOKEN", "TRIGGER_DEV_API_KEY"]]
  const optional = [
    "SEARXNG_BASE_URL",
    "DIFY_API_KEY",
    "TWENTY_BASE_URL",
    "TWENTY_API_KEY",
    "CLOUDFLARE_R2_BUCKET",
    "CRAWL4AI_BASE_URL",
    "BROWSERLESS_URL",
    "BROWSERLESS_TOKEN",
    "STAGEHAND_URL",
    "STAGEHAND_API_KEY",
    "OUTREACH_WORKER_URL",
    "OUTREACH_WORKER_SECRET",
  ]
  const missing = required.filter((name) => !env(name))
  const missingAny = requiredAny
    .filter((names) => names.every((name) => !env(name)))
    .map((names) => names.join(" or "))
  const optionalMissing = optional.filter((name) => !env(name))

  if (missing.length > 0 || missingAny.length > 0) {
    return {
      name: "環境変数",
      status: "error",
      detail: `必須: [${[...missing, ...missingAny].join(", ")}] が未設定です`,
    }
  }

  if (optionalMissing.length > 0) {
    return {
      name: "環境変数",
      status: "ok",
      detail: `必須設定は完了。任意の未設定: ${optionalMissing.join(", ")}`,
    }
  }

  return { name: "環境変数", status: "ok", detail: "必須・任意の環境変数はすべて設定済みです" }
}

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const [supabase, searxng, dify, triggerDev, crawl4ai, browserless, stagehand, crawlee, worker] = await Promise.all([
    checkSupabase(),
    checkSearxng(),
    checkDify(),
    checkTriggerDev(),
    checkCrawl4AiHealth().then((result) => serviceHealthToCheck("Crawl4AI", result, env("CRAWL4AI_BASE_URL"))),
    checkBrowserlessHealth().then((result) => serviceHealthToCheck("Browserless", result, env("BROWSERLESS_URL"))),
    checkStagehandHealth().then((result) => serviceHealthToCheck("Stagehand", result, env("STAGEHAND_URL"))),
    checkCrawleeHealth().then((result) => serviceHealthToCheck("Crawlee worker", result, env("CRAWLEE_WORKER_URL"))),
    checkPlaywrightStealthHealth().then((result) => serviceHealthToCheck("Outreach worker", result, env("OUTREACH_WORKER_URL"))),
  ])

  const checks: ServiceCheck[] = [
    checkEnvSummary(),
    checkOutreachEnvSummary(),
    supabase,
    searxng,
    dify,
    triggerDev,
    crawl4ai,
    browserless,
    stagehand,
    crawlee,
    worker,
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
