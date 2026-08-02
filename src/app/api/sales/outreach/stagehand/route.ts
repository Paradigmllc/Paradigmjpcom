import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { StagehandProvider } from "@/lib/sales/outreach/browser-provider"
import { authorizeOutboundAttempt } from "@/lib/sales/outreach/global-suppression"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

interface StagehandBody {
  companyId?: string
  url?: string
  fields?: Record<string, string>
  message?: string
  dryRun?: boolean
}

export async function POST(req: NextRequest) {
  const dashboardAuth = await isSalesApiAuthorized(req)
  const webhookAuthErr = dashboardAuth ? null : verifyWebhookSecret(req)
  if (webhookAuthErr) return webhookAuthErr

  let body: StagehandBody
  try {
    body = (await req.json()) as StagehandBody
  } catch (e) {
    console.warn("[api/sales/outreach/stagehand] invalid JSON body:", e)
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const { companyId, url, fields, message, dryRun = false } = body
  if (!dryRun && !companyId) return NextResponse.json({ ok: false, error: "companyId is required for live submission" }, { status: 400 })
  if (!url) return NextResponse.json({ ok: false, error: "url is required" }, { status: 400 })
  if (!fields) return NextResponse.json({ ok: false, error: "fields is required" }, { status: 400 })
  if (!message) return NextResponse.json({ ok: false, error: "message is required" }, { status: 400 })

  const stagehandUrl = process.env.STAGEHAND_URL
  const stagehandApiKey = process.env.STAGEHAND_API_KEY
  if (!stagehandUrl) {
    return NextResponse.json({ ok: false, error: "STAGEHAND_URL is not configured" }, { status: 503 })
  }
  if (!stagehandApiKey) {
    return NextResponse.json({ ok: false, error: "STAGEHAND_API_KEY is not configured" }, { status: 503 })
  }

  try {
    const guard = await authorizeOutboundAttempt({
      companyId: companyId ?? "00000000-0000-0000-0000-000000000000",
      channel: "contact_form",
      recipient: url,
      message,
      dryRun,
    })
    if (!guard.allowed) return NextResponse.json({ ok: false, error: `Outbound blocked: ${guard.reason}`, guard }, { status: 409 })
    const provider = new StagehandProvider(stagehandUrl, stagehandApiKey)
    const result = await provider.submitForm({
      formUrl: url,
      fields,
      message,
      dryRun,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[api/sales/outreach/stagehand] submit failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Stagehand submit failed" },
      { status: 500 },
    )
  }
}
