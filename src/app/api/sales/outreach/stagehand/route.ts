import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { StagehandProvider } from "@/lib/sales/outreach/browser-provider"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

interface StagehandBody {
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

  const { url, fields, message, dryRun = true } = body
  if (!url) return NextResponse.json({ ok: false, error: "url is required" }, { status: 400 })
  if (!fields) return NextResponse.json({ ok: false, error: "fields is required" }, { status: 400 })
  if (!message) return NextResponse.json({ ok: false, error: "message is required" }, { status: 400 })

  const stagehandUrl = process.env.STAGEHAND_URL
  const stagehandApiKey = process.env.STAGEHAND_API_KEY
  if (!stagehandUrl) {
    return NextResponse.json({ ok: false, error: "STAGEHAND_URL is not configured" }, { status: 503 })
  }

  const provider = new StagehandProvider(stagehandUrl, stagehandApiKey)
  const result = await provider.submitForm({
    formUrl: url,
    fields,
    message,
    dryRun,
  })

  return NextResponse.json(result)
}
