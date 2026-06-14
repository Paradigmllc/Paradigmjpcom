import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json() as {
      country_code?: string
      countryCode?: string
      tech_stacks?: string[]
      techStacks?: string[]
      target_count?: number
      targetCount?: number
    }

    const { runBrowserBulkSearch } = await import("@/lib/sales/sources/search-orchestrator")
    const result = await runBrowserBulkSearch({
      countryCode: body.countryCode ?? body.country_code ?? "IN",
      techStacks: body.techStacks ?? body.tech_stacks ?? ["Shopify", "WordPress"],
      targetCount: body.targetCount ?? body.target_count ?? 500,
    })

    return NextResponse.json(result, { status: result.ok ? 200 : 503 })
  } catch (error) {
    console.error("[browser-bulk-search] request failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "request failed" },
      { status: 400 },
    )
  }
}
