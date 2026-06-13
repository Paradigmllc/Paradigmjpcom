import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Fire-and-forget: start the search and return immediately.
// The bulk search runs asynchronously in the background.
// Results appear in Supabase when done.
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

    // Fire in background — don't await
    import("@/lib/sales/sources/search-orchestrator").then(({ runBrowserBulkSearch }) => {
      runBrowserBulkSearch({
        countryCode: body.country_code ?? "IN",
        techStacks: body.tech_stacks ?? ["Shopify", "WordPress"],
        targetCount: body.target_count ?? 500,
      }).catch(e => console.error("[browser-bulk-search] background failed:", e))
    })

    return NextResponse.json({
      ok: true,
      status: "started",
      message: `Bulk search started: ${body.target_count ?? 500} target domains, background processing. Check Supabase for results.`,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "request failed" },
      { status: 400 },
    )
  }
}
