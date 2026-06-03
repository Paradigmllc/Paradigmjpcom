import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { uploadToR2 } from "@/lib/sales/r2-storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

interface ScreenshotBody {
  companyId?: string
  domain?: string
  width?: number
  height?: number
  mobile?: boolean
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

  const { companyId, domain: inputDomain, width = 1280, height = 800, mobile = false } = body
  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase service_role not configured" }, { status: 503 })

  let company: { id: string; domain: string; company_name: string; meta: Record<string, unknown> } | null = null
  if (companyId) {
    const res = await sb.from("sales_companies").select("id, domain, company_name, meta").eq("id", companyId).single()
    if (res.data) company = res.data
  } else if (inputDomain) {
    const res = await sb.from("sales_companies").select("id, domain, company_name, meta").eq("domain", inputDomain).single()
    if (res.data) company = res.data
  }

  if (!company) {
    return NextResponse.json({ ok: false, error: "Company not found" }, { status: 404 })
  }

  const browserlessUrl = process.env.BROWSERLESS_URL
  if (!browserlessUrl) {
    return NextResponse.json({ ok: false, error: "BROWSERLESS_URL is not configured" }, { status: 503 })
  }

  const targetUrl = company.domain.startsWith("http") ? company.domain : `https://${company.domain}`
  
  // Format the url endpoint for browserless /screenshot
  // Browserless screenshot API endpoint handles rendering, custom resolutions, and running JS commands
  let bUrlObj: URL
  try {
    bUrlObj = new URL(browserlessUrl)
  } catch {
    // If it's a websocket path wss://, map to https://
    const normalized = browserlessUrl.replace(/^ws/, "http")
    bUrlObj = new URL(normalized)
  }

  const token = process.env.BROWSERLESS_TOKEN ?? bUrlObj.searchParams.get("token")
  bUrlObj.pathname = "/screenshot"
  if (token) bUrlObj.searchParams.set("token", token)

  const scrapoxyUrl = process.env.SCRAPOXY_URL

  // Build browserless screenshot options
  // Set resolution, clean overlays/popups, and configure Scrapoxy proxy rotation if available
  const screenshotOpts: Record<string, unknown> = {
    url: targetUrl,
    options: {
      type: "png",
      fullPage: false,
    },
    viewport: {
      width: mobile ? 390 : width,
      height: mobile ? 844 : height,
      isMobile: mobile,
      hasTouch: mobile,
    },
    // Reject common cookie banners, chat widgets, and overlays
    addStyleTag: [
      {
        content: `
          #cookie-consent, .cookie-banner, .cookie-consent, [id*="cookie"], [class*="cookie"] { display: none !important; }
          .fc-consent-root { display: none !important; }
          #drift-widget-container, #hubspot-messages-iframe-container { display: none !important; }
        `
      }
    ],
    gotoOptions: {
      waitUntil: "networkidle2",
      timeout: 30000,
    }
  }

  if (scrapoxyUrl) {
    screenshotOpts.proxy = scrapoxyUrl
  }

  try {
    const res = await fetch(bUrlObj.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(screenshotOpts),
      signal: AbortSignal.timeout(45000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      return NextResponse.json({ ok: false, error: `Browserless HTTP ${res.status}: ${errText.slice(0, 200)}` }, { status: 502 })
    }

    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Save screenshot image to Cloudflare R2
    const dateStr = new Date().toISOString().slice(0, 7) // YYYY-MM
    const fileSlug = company.domain.replace(/[^a-zA-Z0-9.-]+/g, "-")
    const objectKey = `screenshots/${dateStr}/${fileSlug}-${mobile ? "mobile" : "desktop"}.png`
    const publicUrl = await uploadToR2(objectKey, buffer, "image/png")

    // Update company meta and save to database
    const meta = {
      ...(company.meta ?? {}),
      screenshot_url: publicUrl,
      screenshot_captured_at: new Date().toISOString(),
      screenshot_mobile: mobile,
    }

    const updateRes = await sb.from("sales_companies").update({ meta }).eq("id", company.id)
    if (updateRes.error) {
      console.error("[api/sales/screenshot] database update failed:", updateRes.error.message)
      return NextResponse.json({ ok: false, error: `Database update failed: ${updateRes.error.message}` }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      screenshotUrl: publicUrl,
      objectKey,
    })
  } catch (error) {
    console.error("[api/sales/screenshot] processing failed:", error)
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
