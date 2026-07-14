import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { ingestLeadCandidatesDurable } from "@/lib/sales/lead-candidate-runs"
import { getLeadSourceReadiness } from "@/lib/sales/lead-source-records"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const BodySchema = z.object({
  countryCode: z.string().length(2),
  technology: z.string().min(1).max(80).optional(),
  limit: z.number().int().min(1).max(10000).optional(),
  verifyLimit: z.number().int().min(0).max(5000).optional(),
  promote: z.boolean().optional(),
  minOpportunityScore: z.number().min(0).max(100).optional(),
  minSmbScore: z.number().min(0).max(100).optional(),
  syncVerifyBatchSize: z.number().int().min(0).max(120).optional(),
  requireVerifiedForm: z.boolean().optional(),
  minFormConfidence: z.number().int().min(0).max(100).optional(),
  syncTwenty: z.boolean().optional(),
})

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Multi-source candidate ingestion failed"
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      console.error("[lead-candidates/multi-source] invalid body:", parsed.error)
      return NextResponse.json({ ok: false, error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 })
    }
    const countryCode = parsed.data.countryCode.toUpperCase()
    const readiness = await getLeadSourceReadiness([countryCode])
    const sourceConfigIds = readiness[countryCode]?.sourceIds ?? []
    if (sourceConfigIds.length === 0) {
      return NextResponse.json({ ok: false, error: `No evidence-bearing lead source is ready for ${countryCode}` }, { status: 409 })
    }
    const result = await ingestLeadCandidatesDurable({ ...parsed.data, countryCode, sourceConfigIds })
    return NextResponse.json(result, { status: result.ok ? 200 : 502 })
  } catch (error) {
    console.error("[lead-candidates/multi-source] request failed:", error)
    return NextResponse.json({ ok: false, error: errorMessage(error) }, { status: 500 })
  }
}
