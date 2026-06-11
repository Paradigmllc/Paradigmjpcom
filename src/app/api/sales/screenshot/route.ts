import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { captureWebsiteScreenshot, saveScreenshotEvidence, type ScreenshotViewport } from "@/lib/sales/visual-evidence"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

interface ScreenshotBody {
  companyId?: string
  domain?: string
  width?: number
  height?: number
  mobile?: boolean
  viewport?: ScreenshotViewport
}

export async function POST(req: NextRequest) {
  const dashboardAuth = await isSalesApiAuthorized(req)
  const webhookAuthErr = dashboardAuth ? null : verifyWebhookSecret(req)
  if (webhookAuthErr) return webhookAuthErr

  let body: ScreenshotBody
  try {
    body = (await req.json()) as ScreenshotBody
  } catch (e) {
    console.warn("[api/sales/screenshot] empty or invalid JSON body:", e)
    body = {}
  }

  const { companyId, domain: inputDomain, width, height, mobile = false } = body
  const viewport: ScreenshotViewport = body.viewport === "desktop" || body.viewport === "mobile"
    ? body.viewport
    : mobile
      ? "mobile"
      : "desktop"
  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase service_role not configured" }, { status: 503 })

  let company: { id: string; domain: string; company_name: string; meta: Record<string, unknown> } | null = null
  if (companyId) {
    const res = await sb.from(DB_TABLES.SALES_COMPANIES).select("id, domain, company_name, meta").eq("id", companyId).single()
    if (res.data) company = res.data
  } else if (inputDomain) {
    const res = await sb.from(DB_TABLES.SALES_COMPANIES).select("id, domain, company_name, meta").eq("domain", inputDomain).single()
    if (res.data) company = res.data
  }

  if (!company) {
    return NextResponse.json({ ok: false, error: "Company not found" }, { status: 404 })
  }

  try {
    const result = await captureWebsiteScreenshot(company, { viewport, width, height })
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
    await saveScreenshotEvidence(sb, company, result.evidence)

    return NextResponse.json({
      ok: true,
      screenshotUrl: result.evidence.url,
      objectKey: result.evidence.objectKey,
      provider: result.evidence.provider,
      viewport: result.evidence.viewport,
    })
  } catch (error) {
    console.error("[api/sales/screenshot] processing failed:", error)
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
