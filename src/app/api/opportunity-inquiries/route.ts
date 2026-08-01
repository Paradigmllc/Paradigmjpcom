import { NextRequest, NextResponse } from "next/server"
import { captureException } from "@/lib/error-monitor"
import { notifyBothChannels } from "@/lib/notify"
import {
  opportunityInquirySchema,
  opportunityLeadNotes,
  opportunityLeadSubject,
  validateInquiryType,
} from "@/lib/opportunities/inquiry"
import { getOpportunityBrand } from "@/lib/opportunities/brands"
import { checkRateLimit, getClientIp, verifyTurnstile } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"
const MAX_BODY_BYTES = 20_000

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit({ ip, key: "opportunity-inquiry", max: 5, windowMs: 10 * 60_000 })
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } },
    )
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415 })
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch (error) {
    console.warn("[opportunity-inquiries] invalid JSON:", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = opportunityInquirySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please review the required fields.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const input = parsed.data
  if (!validateInquiryType(input.brand, input.inquiryType)) {
    return NextResponse.json({ error: "The selected inquiry type does not match this Japan desk." }, { status: 400 })
  }

  const captchaValid = await verifyTurnstile(input.turnstileToken)
  if (!captchaValid) {
    return NextResponse.json({ error: "Security verification failed. Please reload and try again." }, { status: 403 })
  }

  try {
    const [{ getPayload }, { default: config }] = await Promise.all([
      import("payload"),
      import("@payload-config"),
    ])
    const payload = await getPayload({ config })
    const subject = opportunityLeadSubject(input)
    const lead = await payload.create({
      collection: "leads",
      data: {
        name: input.name,
        companyName: input.company,
        email: input.email,
        subject,
        message: input.message,
        serviceInterest: "japan-entry",
        budget: input.budget,
        pipelineStage: "new",
        source: `paradigmjp.com/japan-opportunities/${input.brand}`,
        locale: input.locale === "ja" ? "ja" : "en",
        notes: opportunityLeadNotes(input, {
          ip,
          userAgent: request.headers.get("user-agent"),
        }),
      },
    })

    const brand = getOpportunityBrand(input.brand, "en")
    const adminUrl = `https://paradigmjp.com/admin/collections/leads/${lead.id}`
    await notifyBothChannels(`New ${brand.name} inquiry from ${input.company}`, {
      title: subject,
      message: `${input.name} (${input.email}) / ${input.country} / ${input.budget} / ${input.timeline}`,
      link: adminUrl,
      type: "opportunity_inquiry",
      region: "global",
      priority: 95,
    })

    return NextResponse.json(
      { ok: true, id: String(lead.id), message: "Your inquiry is in review. We will reply within one business day." },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("[opportunity-inquiries] persistence failed:", error)
    await captureException(error, { source: "/api/opportunity-inquiries", severity: "error" })
    return NextResponse.json(
      { error: "We could not save your inquiry. Please try again shortly." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    )
  }
}
