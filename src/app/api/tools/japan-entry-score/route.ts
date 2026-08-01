import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, getClientIp, verifyTurnstile } from "@/lib/rate-limit"
import {
  parseSelfReported,
  parseTargetCountry,
} from "@/lib/sales/japan-entry-score"
import { runJapanEntryScore } from "@/lib/sales/japan-entry-score-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

interface ScoreRequestBody {
  domain?: unknown
  targetCountry?: unknown
  selfReported?: unknown
  honeypot?: unknown
  turnstileToken?: unknown
}

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit({
    ip: getClientIp(req),
    key: "api:japan-entry-score",
    max: 3,
    windowMs: 10 * 60_000,
  })
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many score requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } },
    )
  }

  try {
    const rawBody: unknown = await req.json()
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 })
    }
    const body = rawBody as ScoreRequestBody
    if (typeof body.honeypot === "string" && body.honeypot.trim()) {
      return NextResponse.json({ ok: false, error: "Bot verification failed" }, { status: 400 })
    }
    const captchaOk = await verifyTurnstile(typeof body.turnstileToken === "string" ? body.turnstileToken : null)
    if (!captchaOk) {
      return NextResponse.json({ ok: false, error: "Bot verification failed" }, { status: 403 })
    }
    if (typeof body.domain !== "string" || body.domain.trim().length === 0) {
      return NextResponse.json({ ok: false, error: "Domain is required" }, { status: 400 })
    }

    const result = await runJapanEntryScore({
      domain: body.domain.slice(0, 300),
      targetCountry: parseTargetCountry(body.targetCountry),
      selfReported: parseSelfReported(body.selfReported),
    })
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error ?? "Unable to score this domain" }, { status: 400 })
    }
    return NextResponse.json({ ok: true, result: result.result, persisted: result.persisted }, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    console.error("[japan-entry-score] API failed:", error)
    return NextResponse.json({ ok: false, error: "The score could not be generated. Please try again." }, { status: 500 })
  }
}
