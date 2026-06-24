import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { FRESH_DOMAIN_WEBSITE_STATES } from "@/lib/sales/global-smb-scoring"
import { ingestFreshDomainCandidates } from "@/lib/sales/lead-candidates-fresh-domains"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

const FreshDomainRowSchema = z.object({
  domain: z.string().min(3).max(253),
  countryCode: z.string().length(2),
  registeredAt: z.string().datetime().nullable().optional(),
  changedAt: z.string().datetime().nullable().optional(),
  companyName: z.string().max(200).nullable().optional(),
  industryHint: z.string().max(120).nullable().optional(),
  websiteState: z.enum(FRESH_DOMAIN_WEBSITE_STATES).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  publicContactUrl: z.string().url().nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  raw: z.record(z.string(), z.unknown()).optional(),
})

const BodySchema = z.object({
  rows: z.array(FreshDomainRowSchema).min(1).max(500),
  promote: z.boolean().optional(),
})

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "fresh domain candidate ingestion failed"
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      console.error("[lead-candidates/fresh-domains] invalid body:", parsed.error)
      return NextResponse.json({ ok: false, error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 })
    }

    const result = await ingestFreshDomainCandidates(parsed.data.rows, parsed.data.promote ?? false)
    return NextResponse.json(result, { status: result.ok ? 200 : 502 })
  } catch (error) {
    console.error("[lead-candidates/fresh-domains] request failed:", error)
    return NextResponse.json({ ok: false, error: errorMessage(error) }, { status: 500 })
  }
}
