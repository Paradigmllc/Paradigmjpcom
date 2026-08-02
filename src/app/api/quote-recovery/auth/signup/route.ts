import { NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { createQuoteRecoverySession, getQuoteRecoveryDb, hashQuoteRecoveryPassword, hashQuoteRecoveryToken, writeQuoteRecoveryAudit } from "@/lib/quote-recovery/auth"
import { quoteRecoverySignupSchema, zodCommercialError } from "@/lib/quote-recovery/commercial-schemas"
import { quoteRecoveryJsonAllowed } from "@/lib/quote-recovery/http"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function organizationSlug(name: string): string {
  const normalized = name.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 45)
  return `${normalized || "company"}-${randomBytes(4).toString("hex")}`
}

function accountIds(value: unknown): { userId: string; organizationId: string } | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  return typeof record.user_id === "string" && typeof record.organization_id === "string"
    ? { userId: record.user_id, organizationId: record.organization_id }
    : null
}

export async function POST(request: Request) {
  if (!quoteRecoveryJsonAllowed(request)) return NextResponse.json({ ok: false, error: "Invalid request origin or content type" }, { status: 403 })
  const limit = checkRateLimit({ ip: getClientIp(request), key: "quote-recovery-signup", max: 5, windowMs: 15 * 60_000 })
  if (!limit.ok) return NextResponse.json({ ok: false, error: "しばらく待ってから再度お試しください" }, { status: 429 })
  try {
    const parsed = quoteRecoverySignupSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: zodCommercialError(parsed.error) }, { status: 400 })
    const input = parsed.data
    const organizationName = input.organizationName ?? ""
    const db = getQuoteRecoveryDb()
    const { data: existing, error: existingError } = await db
      .from("quote_recovery_users")
      .select("id")
      .eq("email", input.email)
      .maybeSingle()
    if (existingError) throw new Error(existingError.message)
    if (existing) return NextResponse.json({ ok: false, error: "このメールアドレスは登録済みです" }, { status: 409 })

    const passwordHash = await hashQuoteRecoveryPassword(input.password)
    const { data, error } = input.inviteToken
      ? await db.rpc("quote_recovery_accept_invitation_create_user", {
          p_token_hash: hashQuoteRecoveryToken(input.inviteToken),
          p_email: input.email,
          p_password_hash: passwordHash,
          p_display_name: input.displayName,
        })
      : await db.rpc("quote_recovery_create_account", {
          p_email: input.email,
          p_password_hash: passwordHash,
          p_display_name: input.displayName,
          p_organization_name: organizationName,
          p_organization_slug: organizationSlug(organizationName),
        })
    if (error) throw new Error(error.message)
    const ids = accountIds(data)
    if (!ids) throw new Error("Account creation returned an invalid result")
    await createQuoteRecoverySession(ids.userId)
    await writeQuoteRecoveryAudit({
      organizationId: ids.organizationId,
      actorUserId: ids.userId,
      action: "auth.signup",
      targetType: "user",
      targetId: ids.userId,
    })
    return NextResponse.json({ ok: true, redirect: input.inviteToken ? "/ja/quote-recovery/app" : "/ja/quote-recovery/app?onboarding=billing" }, { status: 201 })
  } catch (error) {
    console.error("[quote-recovery/signup] failed:", error)
    return NextResponse.json({ ok: false, error: "アカウントを作成できませんでした" }, { status: 500 })
  }
}
