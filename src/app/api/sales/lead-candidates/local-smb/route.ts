import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { ingestLocalSmbCandidates } from "@/lib/sales/lead-candidates"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

const LocalSmbRowSchema = z.object({
  businessName: z.string().min(1).max(200),
  countryCode: z.string().length(2),
  listingUrl: z.string().url().nullable().optional(),
  category: z.string().max(120).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  phone: z.string().max(80).nullable().optional(),
  socialLinks: z.array(z.string().url()).max(20).optional(),
  websiteUrl: z.string().url().nullable().optional(),
  raw: z.record(z.string(), z.unknown()).optional(),
})

const BodySchema = z.object({
  rows: z.array(LocalSmbRowSchema).min(1).max(500),
  promote: z.boolean().optional(),
})

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "local SMB candidate ingestion failed"
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      console.error("[lead-candidates/local-smb] invalid body:", parsed.error)
      return NextResponse.json({ ok: false, error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 })
    }

    const result = await ingestLocalSmbCandidates(parsed.data.rows, parsed.data.promote ?? false)
    return NextResponse.json(result, { status: result.ok ? 200 : 502 })
  } catch (error) {
    console.error("[lead-candidates/local-smb] request failed:", error)
    return NextResponse.json({ ok: false, error: errorMessage(error) }, { status: 500 })
  }
}
