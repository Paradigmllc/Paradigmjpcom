import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { generateJapanReadinessInsight, getJapanReadinessInsight } from "@/lib/sales/japan-readiness"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

interface RouteContext {
  params: Promise<{ companyId: string }>
}

interface GenerateBody {
  refresh_audit?: boolean
  probe_shopify?: boolean
  use_dify?: boolean
}

export async function GET(req: NextRequest, context: RouteContext) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const { companyId } = await context.params
  const result = await getJapanReadinessInsight(companyId)
  return NextResponse.json(result, { status: result.ok ? 200 : 503 })
}

export async function POST(req: NextRequest, context: RouteContext) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  let body: GenerateBody = {}
  try {
    body = (await req.json()) as GenerateBody
  } catch (error) {
    console.error("[sales-japan-readiness] invalid JSON body:", error)
    return NextResponse.json({ ok: false, error: "invalid json body" }, { status: 400 })
  }

  const { companyId } = await context.params
  const result = await generateJapanReadinessInsight(companyId, {
    refreshAudit: body.refresh_audit !== false,
    probeShopify: body.probe_shopify !== false,
    useDify: body.use_dify !== false,
  })
  return NextResponse.json(result, { status: result.ok ? 200 : 503 })
}
