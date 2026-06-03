import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 20

type ServiceStatus = "ok" | "error" | "not_configured"

interface ServiceCheck {
  name: string
  status: ServiceStatus
  detail: string
  url?: string | null
}

function env(name: string): string | null {
  const v = process.env[name]
  return v && v.trim().length > 0 ? v.trim() : null
}

async function checkSupabase(): Promise<ServiceCheck> {
  const url = env("NEXT_PUBLIC_SUPABASE_URL") ?? env("SALES_SUPABASE_URL")
  const key = env("SUPABASE_SERVICE_ROLE_KEY") ?? env("SALES_SUPABASE_SERVICE_ROLE_KEY")
  if (!url || !key) {
    return {
      name: "Supabase",
      status: "not_configured",
      detail: "SUPABASE_SERVICE_ROLE_KEY または NEXT_PUBLIC_SUPABASE_URL が未設定",
      url,
    }
  }
  const sb = getServiceSalesSupabase()
  if (!sb) {
    return { name: "Supabase", status: "error", detail: "クライアント生成失敗", url }
  }
  try {
    const { error } = await sb.from("sales_companies").select("id", { count: "exact", head: true }).limit(1)
    if (error) return { name: "Supabase", status: "error", detail: error.message, url }
    return { name: "Supabase", status: "ok", detail: "sales_companies テーブルに接続できました", url }
  } catch (e) {
    return { name: "Supabase", status: "error", detail: e instanceof Error ? e.message : String(e), url }
  }
}

async function checkSearxng(): Promise<ServiceCheck> {
  const base = env("SEARXNG_BASE_URL")
  if (!base) {
    return {
      name: "SearxNG",
      status: "not_configured",
      detail: "SEARXNG_BASE_URL が未設定 — リスト生成が動きません",
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
  } catch (e) {
    return { name: "SearxNG", status: "error", detail: e instanceof Error ? e.message : String(e), url: base }
  }
}

async function checkDify(): Promise<ServiceCheck> {
  const key =
    env("DIFY_DIAGNOSIS_API_KEY") ??
    env("DIFY_KARTE_TO_REPORT_API_KEY") ??
    env("DIFY_KARTE_TO_REPORT_KEY") ??
    env("DIFY_API_KEY")
  const base = env("DIFY_BASE_URL") ?? env("DIFY_API_URL") ?? "https://api.dify.ai"
  if (!key) {
    return {
      name: "Dify",
      status: "not_configured",
      detail: "DIFY_API_KEY 系が未設定 — ローカルフォールバックで動作",
      url: base,
    }
  }
  try {
    const res = await fetch(`${base}/v1/workflows/run`, {
      method: "HEAD",
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(6_000),
    })
    // HEAD が 405 でも到達できていれば OK
    if (res.status === 404 || res.status === 0) {
      return { name: "Dify", status: "error", detail: `HTTP ${res.status}`, url: base }
    }
    return { name: "Dify", status: "ok", detail: `APIキー設定済み (${key.slice(0, 12)}...)`, url: base }
  } catch (e) {
    return { name: "Dify", status: "error", detail: e instanceof Error ? e.message : String(e), url: base }
  }
}

async function checkN8n(): Promise<ServiceCheck> {
  const base = env("N8N_BASE_URL")
  const apiKey = env("N8N_API_KEY")
  if (!base) {
    return { name: "n8n", status: "not_configured", detail: "N8N_BASE_URL が未設定", url: null }
  }
  try {
    const headers: Record<string, string> = {}
    if (apiKey) headers["X-N8N-API-KEY"] = apiKey
    const res = await fetch(`${base}/healthz`, { headers, signal: AbortSignal.timeout(6_000) })
    if (!res.ok) return { name: "n8n", status: "error", detail: `HTTP ${res.status}`, url: base }
    return { name: "n8n", status: "ok", detail: "n8n インスタンスに到達できました", url: base }
  } catch (e) {
    return { name: "n8n", status: "error", detail: e instanceof Error ? e.message : String(e), url: base }
  }
}

function checkEnvSummary(): ServiceCheck {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "N8N_WEBHOOK_SECRET",
    "DEEPSEEK_API_KEY",
  ]
  const optional = [
    "SEARXNG_BASE_URL",
    "DIFY_API_KEY",
    "TWENTY_BASE_URL",
    "TWENTY_API_KEY",
    "CLOUDFLARE_R2_BUCKET",
    "OUTREACH_WORKER_URL",
  ]
  const missing = required.filter((name) => !env(name))
  const optionalMissing = optional.filter((name) => !env(name))
  if (missing.length > 0) {
    return {
      name: "環境変数",
      status: "error",
      detail: `必須: [${missing.join(", ")}] が未設定`,
    }
  }
  if (optionalMissing.length > 0) {
    return {
      name: "環境変数",
      status: "ok",
      detail: `必須は全設定済み。オプション未設定: ${optionalMissing.join(", ")}`,
    }
  }
  return { name: "環境変数", status: "ok", detail: "必須・オプション全て設定済み" }
}

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const [supabase, searxng, dify, n8n] = await Promise.all([
    checkSupabase(),
    checkSearxng(),
    checkDify(),
    checkN8n(),
  ])

  const envCheck = checkEnvSummary()
  const checks: ServiceCheck[] = [envCheck, supabase, searxng, dify, n8n]
  const hasError = checks.some((c) => c.status === "error")
  const hasNotConfigured = checks.some((c) => c.status === "not_configured")

  return NextResponse.json({
    ok: !hasError,
    status: hasError ? "error" : hasNotConfigured ? "degraded" : "healthy",
    checkedAt: new Date().toISOString(),
    checks,
  })
}
