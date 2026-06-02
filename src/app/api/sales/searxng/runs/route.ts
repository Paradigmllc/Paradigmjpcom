import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { salesScopeFromCountry, salesScopeFromLocale } from "@/lib/sales/locale-scope"
import { listSearxngRuns, runSearxngSearch, type SearxngTimeRange } from "@/lib/sales/searxng-source"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

interface CreateBody {
  query?: string
  report_locale?: string | null
  target_country?: string | null
  engines?: string[] | string | null
  categories?: string[] | string | null
  language?: string | null
  safesearch?: number | null
  time_range?: SearxngTimeRange | null
  pages?: number | null
}

function tokenList(value: string[] | string | null | undefined): string[] | null {
  if (Array.isArray(value)) return value
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean)
  return null
}

function isTimeRange(value: unknown): value is SearxngTimeRange {
  return value === "day" || value === "month" || value === "year"
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "SearxNG request failed"
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }
    const scope = salesScopeFromLocale(req.nextUrl.searchParams.get("locale") ?? "en")
    const limit = Math.max(1, Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 8), 20))
    const result = await listSearxngRuns(scope, limit)
    return NextResponse.json(result, { status: result.ok ? 200 : 503 })
  } catch (error) {
    console.error("[sales-searxng-runs] GET failed:", error)
    return NextResponse.json({ ok: false, error: errorMessage(error), runs: [] }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    let body: CreateBody
    try {
      body = (await req.json()) as CreateBody
    } catch (error) {
      console.error("[sales-searxng-runs] invalid JSON body:", error)
      return NextResponse.json({ ok: false, error: "invalid json body" }, { status: 400 })
    }

    const query = body.query?.trim()
    if (!query) return NextResponse.json({ ok: false, error: "query is required" }, { status: 400 })
    if (query.length > 400) return NextResponse.json({ ok: false, error: "query must be 400 characters or less" }, { status: 400 })
    const scope = salesScopeFromCountry({ reportLocale: body.report_locale, targetCountry: body.target_country })
    const result = await runSearxngSearch({
      query,
      reportLocale: scope.reportLocale,
      targetCountry: scope.targetCountry,
      engines: tokenList(body.engines),
      categories: tokenList(body.categories),
      language: body.language,
      safesearch: body.safesearch,
      timeRange: isTimeRange(body.time_range) ? body.time_range : null,
      pages: body.pages,
    })
    return NextResponse.json(result, { status: result.ok ? 200 : 503 })
  } catch (error) {
    console.error("[sales-searxng-runs] POST failed:", error)
    return NextResponse.json({ ok: false, error: errorMessage(error) }, { status: 500 })
  }
}
