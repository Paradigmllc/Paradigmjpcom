import { NextResponse } from "next/server"
import { getQuoteRecoveryDb, hashQuoteRecoveryPassword, hashQuoteRecoveryToken } from "@/lib/quote-recovery/auth"
import { quoteRecoveryResetPasswordSchema, zodCommercialError } from "@/lib/quote-recovery/commercial-schemas"
import { quoteRecoveryJsonAllowed } from "@/lib/quote-recovery/http"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (!quoteRecoveryJsonAllowed(request)) return NextResponse.json({ ok: false, error: "Invalid request origin or content type" }, { status: 403 })
  try {
    const parsed = quoteRecoveryResetPasswordSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: zodCommercialError(parsed.error) }, { status: 400 })
    const db = getQuoteRecoveryDb()
    const tokenHash = hashQuoteRecoveryToken(parsed.data.token)
    const passwordHash = await hashQuoteRecoveryPassword(parsed.data.password)
    const { data, error } = await db.rpc("quote_recovery_reset_password", { p_token_hash: tokenHash, p_password_hash: passwordHash })
    if (error) throw new Error(error.message)
    if (data !== true) return NextResponse.json({ ok: false, error: "再設定リンクが無効または期限切れです" }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[quote-recovery/reset-password] failed:", error)
    return NextResponse.json({ ok: false, error: "パスワードを再設定できませんでした" }, { status: 500 })
  }
}
