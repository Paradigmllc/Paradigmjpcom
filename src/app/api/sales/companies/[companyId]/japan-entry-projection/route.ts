import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { generateJapanEntryProjection, getLatestJapanEntryProjection } from "@/lib/sales/japan-entry-projection-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const bodySchema = z.object({
  business_model: z.enum(["ecommerce", "saas", "service"]).optional(),
  average_order_value_usd: z.number().positive().max(1_000_000).optional(),
  conversion_rate: z.number().positive().max(0.5).optional(),
  gross_margin: z.number().positive().max(1).optional(),
  current_japan_share: z.number().min(0).max(0.3).optional(),
  target_japan_share_month_24: z.number().positive().max(0.5).optional(),
}).strict()

interface RouteContext {
  params: Promise<{ companyId: string }>
}

function errorStatus(message: string | undefined): number {
  if (message === "company not found") return 404
  if (message?.includes("required") || message?.includes("must exceed")) return 422
  return 503
}

export async function GET(req: NextRequest, context: RouteContext) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const { companyId } = await context.params
  const result = await getLatestJapanEntryProjection(companyId)
  return NextResponse.json(result, { status: result.ok ? 200 : 503 })
}

export async function POST(req: NextRequest, context: RouteContext) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  try {
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid request", issues: parsed.error.issues }, { status: 400 })
    }
    const { companyId } = await context.params
    const result = await generateJapanEntryProjection(companyId, {
      businessModel: parsed.data.business_model,
      averageOrderValueUsd: parsed.data.average_order_value_usd,
      conversionRate: parsed.data.conversion_rate,
      grossMargin: parsed.data.gross_margin,
      currentJapanShare: parsed.data.current_japan_share,
      targetJapanShareMonth24: parsed.data.target_japan_share_month_24,
    })
    return NextResponse.json(result, { status: result.ok ? 201 : errorStatus(result.error) })
  } catch (error) {
    console.error("[japan-entry-projection-api] POST failed:", error)
    return NextResponse.json({ ok: false, error: "invalid json body" }, { status: 400 })
  }
}
