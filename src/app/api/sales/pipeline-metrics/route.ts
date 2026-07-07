import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { getPipelineMetricsSummary } from "@/lib/sales/pipeline-metrics"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const windowHours = parseInt(url.searchParams.get("hours") ?? "168", 10) || 168
    const summary = await getPipelineMetricsSummary(Math.min(windowHours, 720))
    return NextResponse.json({ ok: true, ...summary, checkedAt: new Date().toISOString() })
  } catch (e) {
    console.error("[pipeline-metrics-api] failed:", e instanceof Error ? e.message : String(e))
    return NextResponse.json({ ok: false, error: "Metrics query failed" }, { status: 500 })
  }
}
