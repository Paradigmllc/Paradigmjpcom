import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { FRESH_DOMAIN_WEBSITE_STATES } from "@/lib/sales/global-smb-scoring"
import { discoverAndIngestFreshDomains } from "@/lib/sales/fresh-domain-discovery"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const BodySchema = z.object({
  countryCode: z.string().length(2),
  limit: z.number().int().min(1).max(500).optional(),
  lookupLimit: z.number().int().min(1).max(120).optional(),
  promote: z.boolean().optional(),
  websiteState: z.enum(FRESH_DOMAIN_WEBSITE_STATES).optional(),
})

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "fresh domain discovery failed"
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      console.error("[lead-candidates/fresh-domains/discover] invalid body:", parsed.error)
      return NextResponse.json({ ok: false, error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 })
    }

    const result = await discoverAndIngestFreshDomains(parsed.data)
    if (result.ingestion.upserted > 0) {
      const { notifyBothChannels } = await import("@/lib/notify")
      await notifyBothChannels("sales", {
        title: "Fresh domain candidates updated",
        message: `${result.countryCode}: discovered ${result.discovered}, upserted ${result.ingestion.upserted}, promoted ${result.ingestion.promoted}`,
        link: "https://twenty.paradigmjp.com",
        type: "info",
      }).catch((error) => console.error("[lead-candidates/fresh-domains/discover] notification failed:", error))
    }
    return NextResponse.json(result, { status: result.ok ? 200 : 502 })
  } catch (error) {
    console.error("[lead-candidates/fresh-domains/discover] request failed:", error)
    return NextResponse.json({ ok: false, error: errorMessage(error) }, { status: 500 })
  }
}
