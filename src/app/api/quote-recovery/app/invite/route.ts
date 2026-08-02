import { randomBytes } from "node:crypto"
import { NextResponse } from "next/server"
import { getQuoteRecoveryIdentity, getQuoteRecoveryDb, hashQuoteRecoveryToken, quoteRecoveryCanManage, quoteRecoveryHasPaidAccess, writeQuoteRecoveryAudit } from "@/lib/quote-recovery/auth"
import { quoteRecoveryInviteSchema, zodCommercialError } from "@/lib/quote-recovery/commercial-schemas"
import { quoteRecoveryJsonAllowed } from "@/lib/quote-recovery/http"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (!quoteRecoveryJsonAllowed(request)) return NextResponse.json({ ok: false, error: "Invalid request origin or content type" }, { status: 403 })
  try {
    const identity = await getQuoteRecoveryIdentity()
    if (!identity) return NextResponse.json({ ok: false, error: "ログインが必要です" }, { status: 401 })
    if (!quoteRecoveryHasPaidAccess(identity)) return NextResponse.json({ ok: false, error: "有効な契約が必要です" }, { status: 402 })
    if (!quoteRecoveryCanManage(identity)) return NextResponse.json({ ok: false, error: "メンバーを招待する権限がありません" }, { status: 403 })
    const parsed = quoteRecoveryInviteSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: zodCommercialError(parsed.error) }, { status: 400 })
    const db = getQuoteRecoveryDb()
    const [{ count, error: countError }, { data: existingUser, error: userError }] = await Promise.all([
      db.from("quote_recovery_memberships").select("id", { count: "exact", head: true }).eq("organization_id", identity.organization.id),
      db.from("quote_recovery_users").select("id").eq("email", parsed.data.email).maybeSingle(),
    ])
    if (countError || userError) throw new Error(countError?.message ?? userError?.message ?? "Invite validation failed")
    if ((count ?? 0) >= identity.organization.seatLimit) return NextResponse.json({ ok: false, error: `現在のプランは${identity.organization.seatLimit}名までです` }, { status: 409 })
    if (existingUser) return NextResponse.json({ ok: false, error: "このメールアドレスは既に別組織で利用されています" }, { status: 409 })
    const token = randomBytes(32).toString("base64url")
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000)
    const { data, error } = await db.from("quote_recovery_invitations").insert({
      organization_id: identity.organization.id,
      email: parsed.data.email,
      role: parsed.data.role,
      token_hash: hashQuoteRecoveryToken(token),
      invited_by: identity.user.id,
      expires_at: expiresAt.toISOString(),
    }).select("id").single()
    if (error) throw new Error(error.message)
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://paradigmjp.com").replace(/\/$/, "")
    const invitationUrl = `${baseUrl}/ja/quote-recovery/login?mode=signup&invite=${encodeURIComponent(token)}&email=${encodeURIComponent(parsed.data.email)}`
    await writeQuoteRecoveryAudit({ organizationId: identity.organization.id, actorUserId: identity.user.id, action: "membership.invited", targetType: "invitation", targetId: data.id, metadata: { role: parsed.data.role } })
    return NextResponse.json({ ok: true, invitationUrl, expiresAt: expiresAt.toISOString() }, { status: 201 })
  } catch (error) {
    console.error("[quote-recovery/invite] failed:", error)
    return NextResponse.json({ ok: false, error: "招待を作成できませんでした" }, { status: 500 })
  }
}
