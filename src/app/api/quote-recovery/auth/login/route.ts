import { NextResponse } from "next/server"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { createQuoteRecoverySession, getQuoteRecoveryDb, verifyQuoteRecoveryPassword, writeQuoteRecoveryAudit } from "@/lib/quote-recovery/auth"
import { quoteRecoveryLoginSchema, zodCommercialError } from "@/lib/quote-recovery/commercial-schemas"
import { quoteRecoveryJsonAllowed } from "@/lib/quote-recovery/http"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (!quoteRecoveryJsonAllowed(request)) return NextResponse.json({ ok: false, error: "Invalid request origin or content type" }, { status: 403 })
  const limit = checkRateLimit({ ip: getClientIp(request), key: "quote-recovery-login", max: 10, windowMs: 15 * 60_000 })
  if (!limit.ok) return NextResponse.json({ ok: false, error: "ログイン試行回数が上限に達しました" }, { status: 429 })
  try {
    const parsed = quoteRecoveryLoginSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: zodCommercialError(parsed.error) }, { status: 400 })
    const db = getQuoteRecoveryDb()
    const { data: user, error } = await db
      .from("quote_recovery_users")
      .select("id,email,password_hash,failed_login_count,locked_until")
      .eq("email", parsed.data.email)
      .maybeSingle()
    if (error) throw new Error(error.message)
    const locked = user?.locked_until && new Date(user.locked_until).getTime() > Date.now()
    const valid = user && !locked ? await verifyQuoteRecoveryPassword(parsed.data.password, user.password_hash) : false
    if (!user || !valid) {
      if (user && !locked) {
        const failures = Number(user.failed_login_count ?? 0) + 1
        const lockedUntil = failures >= 5 ? new Date(Date.now() + 15 * 60_000).toISOString() : null
        const { error: updateError } = await db.from("quote_recovery_users").update({ failed_login_count: failures, locked_until: lockedUntil, updated_at: new Date().toISOString() }).eq("id", user.id)
        if (updateError) console.error("[quote-recovery/login] failed-attempt update failed:", updateError.message)
      }
      return NextResponse.json({ ok: false, error: locked ? "アカウントは一時的にロックされています" : "メールアドレスまたはパスワードが違います" }, { status: 401 })
    }
    const now = new Date().toISOString()
    const { error: updateError } = await db.from("quote_recovery_users").update({ failed_login_count: 0, locked_until: null, last_login_at: now, updated_at: now }).eq("id", user.id)
    if (updateError) throw new Error(updateError.message)
    await createQuoteRecoverySession(user.id)
    await writeQuoteRecoveryAudit({ organizationId: null, actorUserId: user.id, action: "auth.login", targetType: "user", targetId: user.id })
    return NextResponse.json({ ok: true, redirect: "/ja/quote-recovery/app" })
  } catch (error) {
    console.error("[quote-recovery/login] failed:", error)
    return NextResponse.json({ ok: false, error: "ログイン処理に失敗しました" }, { status: 500 })
  }
}
