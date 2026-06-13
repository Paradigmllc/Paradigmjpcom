import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { runBrowserBulkSearch } from "@/lib/sales/sources/search-orchestrator"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 600

export async function POST(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json() as {
      country_code?: string
      tech_stacks?: string[]
      target_count?: number
    }

    const result = await runBrowserBulkSearch({
      countryCode: body.country_code ?? "IN",
      techStacks: body.tech_stacks ?? ["Shopify", "WordPress"],
      targetCount: body.target_count ?? 500,
    })

    return NextResponse.json(result, { status: result.ok ? 200 : 503 })
  } catch (error) {
    console.error("[browser-bulk-search] failed:", error)
    return NextResponse.json(
      { ok: false, domainsFound: 0, companiesCreated: 0, queries: 0, errors: [error instanceof Error ? error.message : "bulk search failed"] },
      { status: 500 },
    )
  }
}
