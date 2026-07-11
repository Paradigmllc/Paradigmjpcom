import { NextRequest, NextResponse } from "next/server"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { checkRateLimit, getClientIp, verifyTurnstile } from "@/lib/rate-limit"
import { notifyBothChannels } from "@/lib/notify"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

interface ContactRequestBody {
  name?: unknown
  email?: unknown
  company?: unknown
  message?: unknown
  honeypot?: unknown
  turnstileToken?: unknown
}

export async function POST(req: NextRequest) {
  try {
    const rateLimit = checkRateLimit({ ip: getClientIp(req), key: "api:demo-contact", max: 5, windowMs: 60_000 })
    if (!rateLimit.ok) {
      return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } })
    }

    const rawBody: unknown = await req.json()
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 })
    }
    const body = rawBody as ContactRequestBody
    if (typeof body.honeypot === "string" && body.honeypot.trim()) {
      return NextResponse.json({ ok: false, error: "Form verification failed" }, { status: 400 })
    }
    const captchaOk = await verifyTurnstile(typeof body.turnstileToken === "string" ? body.turnstileToken : null)
    if (!captchaOk) {
      return NextResponse.json({ ok: false, error: "Bot verification failed" }, { status: 403 })
    }

    const nameValue = typeof body.name === "string" ? body.name : ""
    const emailValue = typeof body.email === "string" ? body.email : ""
    const companyValue = typeof body.company === "string" ? body.company : ""
    const messageValue = typeof body.message === "string" ? body.message : ""

    // Validate required fields
    if (!emailValue.trim()) {
      return NextResponse.json(
        { ok: false, error: "Email is required" },
        { status: 400 },
      )
    }

    if (!messageValue.trim()) {
      return NextResponse.json(
        { ok: false, error: "Message is required" },
        { status: 400 },
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailValue.trim())) {
      return NextResponse.json(
        { ok: false, error: "Invalid email format" },
        { status: 400 },
      )
    }

    // Sanitize input lengths
    const name = nameValue.trim().slice(0, 200)
    const email = emailValue.trim().slice(0, 254).toLowerCase()
    const company = companyValue.trim().slice(0, 200) || "Unknown"
    const message = messageValue.trim().slice(0, 5000)

    // Try to save to Supabase
    const supabase = getServiceSalesSupabase()
    if (!supabase) {
      console.error("[demo-contact] Supabase is not configured")
      return NextResponse.json({ ok: false, error: "Submission service unavailable" }, { status: 503 })
    }
    {
      const { error: dbError } = await supabase
        .from(DB_TABLES.DEMO_CONTACT_SUBMISSIONS)
        .insert({
          name,
          email,
          company,
          message,
          created_at: new Date().toISOString(),
        })

      if (dbError) {
        console.error("[demo-contact] DB insert error:", dbError.message)
        return NextResponse.json({ ok: false, error: "Submission could not be stored" }, { status: 503 })
      }
    }

    const notification = await notifyBothChannels(
      `${company} submitted a demo contact form.`,
      {
        title: "Demo contact submission",
        message: `${company} submitted a demo contact form. Email is stored in the database lead record.`,
        link: "https://paradigmjp.com/en/contact?intent=japan-entry",
        type: "demo_contact_submission",
        region: "global",
        priority: 70,
      },
    )
    if (!notification.database.ok) {
      console.error("[demo-contact] notification queue failed:", notification.database.error)
    }

    return NextResponse.json({ ok: true, notificationStatus: notification.ok ? "complete" : "degraded" })
  } catch (e) {
    console.error("[demo-contact] Unexpected error:", e)
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    )
  }
}
