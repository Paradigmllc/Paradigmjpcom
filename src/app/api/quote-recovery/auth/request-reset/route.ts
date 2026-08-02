import { randomBytes } from "node:crypto"
import { NextResponse } from "next/server"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { getQuoteRecoveryDb, hashQuoteRecoveryToken } from "@/lib/quote-recovery/auth"
import { quoteRecoveryResetRequestSchema } from "@/lib/quote-recovery/commercial-schemas"
import { sendQuoteRecoveryEmail } from "@/lib/quote-recovery/email"
import { quoteRecoveryJsonAllowed } from "@/lib/quote-recovery/http"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (!quoteRecoveryJsonAllowed(request)) return NextResponse.json({ ok: false, error: "Invalid request origin or content type" }, { status: 403 })
  const limit = checkRateLimit({ ip: getClientIp(request), key: "quote-recovery-reset", max: 3, windowMs: 30 * 60_000 })
  if (!limit.ok) return NextResponse.json({ ok: true }, { status: 202 })
  try {
    const parsed = quoteRecoveryResetRequestSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ ok: true }, { status: 202 })
    const db = getQuoteRecoveryDb()
    const { data: user, error } = await db.from("quote_recovery_users").select("id,email").eq("email", parsed.data.email).maybeSingle()
    if (error) throw new Error(error.message)
    if (user) {
      const token = randomBytes(32).toString("base64url")
      const { error: insertError } = await db.from("quote_recovery_password_resets").insert({ user_id: user.id, token_hash: hashQuoteRecoveryToken(token), expires_at: new Date(Date.now() + 60 * 60_000).toISOString() })
      if (insertError) throw new Error(insertError.message)
      const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://paradigmjp.com").replace(/\/$/, "")
      const url = `${baseUrl}/ja/quote-recovery/reset?token=${encodeURIComponent(token)}`
      const delivery = await sendQuoteRecoveryEmail({
        to: user.email,
        subject: "Quote Recovery パスワード再設定",
        html: `<p>パスワード再設定のリクエストを受け付けました。</p><p><a href="${url}">1時間以内にパスワードを再設定する</a></p><p>心当たりがない場合はこのメールを破棄してください。</p>`,
      })
      if (!delivery.ok) console.error("[quote-recovery/reset] email delivery failed:", delivery.error)
    }
    return NextResponse.json({ ok: true }, { status: 202 })
  } catch (error) {
    console.error("[quote-recovery/reset-request] failed:", error)
    return NextResponse.json({ ok: true }, { status: 202 })
  }
}
