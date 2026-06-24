import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { listLeadCandidates } from "@/lib/sales/lead-candidates"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const QuerySchema = z.object({
  country_code: z.string().length(2).optional(),
  technology: z.string().min(1).max(80).optional(),
  status: z.enum(["candidate", "scored", "promoted", "rejected"]).optional(),
  lane: z.enum(["tech_footprint", "no_website_local_smb", "dns_freshness"]).optional(),
  min_score: z.coerce.number().min(0).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "lead candidate request failed"
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()))
    if (!parsed.success) {
      console.error("[lead-candidates] invalid query:", parsed.error)
      return NextResponse.json({ ok: false, error: "Invalid query", details: parsed.error.flatten() }, { status: 400 })
    }

    const candidates = await listLeadCandidates({
      countryCode: parsed.data.country_code,
      technology: parsed.data.technology,
      status: parsed.data.status,
      lane: parsed.data.lane,
      minScore: parsed.data.min_score,
      limit: parsed.data.limit,
    })
    return NextResponse.json({ ok: true, candidates, count: candidates.length })
  } catch (error) {
    console.error("[lead-candidates] request failed:", error)
    return NextResponse.json({ ok: false, error: errorMessage(error), candidates: [] }, { status: 500 })
  }
}
