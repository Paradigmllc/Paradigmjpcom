import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { ingestCommonCrawlCandidatesDurable } from "@/lib/sales/lead-candidate-runs"

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
  syncVerifyBatchSize: z.number().int().min(0).max(120).optional(),
})

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Common Crawl candidate ingestion failed"
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      console.error("[lead-candidates/common-crawl] invalid body:", parsed.error)
      return NextResponse.json({ ok: false, error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 })
    }

    const result = await ingestCommonCrawlCandidatesDurable(parsed.data)
    return NextResponse.json(result, { status: result.ok ? 200 : 502 })
  } catch (error) {
    console.error("[lead-candidates/common-crawl] request failed:", error)
    return NextResponse.json({ ok: false, error: errorMessage(error) }, { status: 500 })
  }
}
