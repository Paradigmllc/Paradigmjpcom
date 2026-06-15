import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { fetchPassiveInventoryDomains } from "@/lib/sales/passive-inventory"
import { fetchLeadCandidateDomains } from "@/lib/sales/lead-candidate-domain-sources"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const BodySchema = z.object({
  countryCode: z.string().min(2).max(2),
  technology: z.string().trim().min(1).max(80).nullable().optional(),
  limit: z.number().int().min(1).max(10000).optional(),
})

export async function POST(req: NextRequest) {
  const authErr = verifyWebhookSecret(req)
  if (authErr) return authErr

  let body: unknown
  try {
    body = await req.json()
  } catch (error) {
    console.error("[api/sales/passive-inventory] invalid JSON:", error)
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const result = await fetchPassiveInventoryDomains(
      parsed.data.countryCode,
      parsed.data.technology ?? null,
      parsed.data.limit ?? 500,
    )
    if (result.ok || result.domains.length > 0) return NextResponse.json({ ok: true, result, fallbackUsed: false })

    const fallback = await fetchLeadCandidateDomains(parsed.data.countryCode, parsed.data.limit ?? 500, {
      technology: parsed.data.technology ?? null,
      skipPassiveInventory: true,
    })
    return NextResponse.json({
      ok: fallback.domains.length > 0,
      result,
      fallbackUsed: true,
      fallback,
      warning: result.configuration.zoneInputsConfigured
        ? "Passive inventory returned no matching domains; free bulk fallback was used."
        : "Passive zone inputs are not configured in this runtime; free bulk fallback was used.",
    })
  } catch (error) {
    console.error("[api/sales/passive-inventory] run failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Passive inventory failed" },
      { status: 500 },
    )
  }
}
