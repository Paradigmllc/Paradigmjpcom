import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import {
  generateJapanEntryProjection,
  getLatestJapanEntryProjection,
  syncJapanEntryProjectionToTwenty,
} from "@/lib/sales/japan-entry-projection-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

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
  if (message?.includes("quality gate") || message?.includes("observed public fact")) return 422
  if (message?.includes("DeepSeek V4 Pro") || message?.includes("LLM provider")) return 502
  if (message?.includes("required") || message?.includes("must exceed")) return 422
  return 503
}

function validCompanyId(value: string): boolean {
  return z.string().uuid().safeParse(value).success
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }
    const { companyId } = await context.params
    if (!validCompanyId(companyId)) {
      return NextResponse.json({ ok: false, error: "invalid companyId" }, { status: 400 })
    }
    const result = await getLatestJapanEntryProjection(companyId)
    return NextResponse.json(result, { status: result.ok ? 200 : 503 })
  } catch (error) {
    console.error("[japan-entry-projection-api] GET failed:", error)
    return NextResponse.json({ ok: false, error: "projection lookup failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }
  } catch (error) {
    console.error("[japan-entry-projection-api] authorization failed:", error)
    return NextResponse.json({ ok: false, error: "authorization failed" }, { status: 500 })
  }

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch (error) {
    console.error("[japan-entry-projection-api] invalid JSON body:", error)
    return NextResponse.json({ ok: false, error: "invalid json body" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid request", issues: parsed.error.issues }, { status: 400 })
  }

  try {
    const { companyId } = await context.params
    if (!validCompanyId(companyId)) {
      return NextResponse.json({ ok: false, error: "invalid companyId" }, { status: 400 })
    }
    const result = await generateJapanEntryProjection(companyId, {
      businessModel: parsed.data.business_model,
      averageOrderValueUsd: parsed.data.average_order_value_usd,
      conversionRate: parsed.data.conversion_rate,
      grossMargin: parsed.data.gross_margin,
      currentJapanShare: parsed.data.current_japan_share,
      targetJapanShareMonth24: parsed.data.target_japan_share_month_24,
    })
    const status = result.ok
      ? result.twentySync?.ok && !result.twentySync.statusPersistenceError
        ? 201
        : 207
      : errorStatus(result.error)
    return NextResponse.json(result, { status })
  } catch (error) {
    console.error("[japan-entry-projection-api] POST failed:", error)
    return NextResponse.json({ ok: false, error: "projection generation failed" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }
    const { companyId } = await context.params
    if (!validCompanyId(companyId)) {
      return NextResponse.json({ ok: false, error: "invalid companyId" }, { status: 400 })
    }
    const latest = await getLatestJapanEntryProjection(companyId)
    if (!latest.ok) {
      return NextResponse.json(latest, { status: 503 })
    }
    if (!latest.projection) {
      return NextResponse.json({ ok: false, error: "Japan Entry projection not found" }, { status: 404 })
    }
    const twentySync = await syncJapanEntryProjectionToTwenty(companyId, latest.projection.id)
    const ok = twentySync.ok && !twentySync.statusPersistenceError
    return NextResponse.json(
      { ok, projectionId: latest.projection.id, twentySync },
      { status: ok ? 200 : 207 },
    )
  } catch (error) {
    console.error("[japan-entry-projection-api] Twenty retry failed:", error)
    return NextResponse.json({ ok: false, error: "Twenty sync retry failed" }, { status: 500 })
  }
}
