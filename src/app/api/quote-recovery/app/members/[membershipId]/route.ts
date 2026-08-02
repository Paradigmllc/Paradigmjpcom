import { NextResponse } from "next/server"
import { getQuoteRecoveryDb, getQuoteRecoveryIdentity, quoteRecoveryCanManage, quoteRecoveryHasPaidAccess, writeQuoteRecoveryAudit } from "@/lib/quote-recovery/auth"
import { quoteRecoveryMemberUpdateSchema, zodCommercialError } from "@/lib/quote-recovery/commercial-schemas"
import { quoteRecoveryJsonAllowed, quoteRecoveryMutationAllowed } from "@/lib/quote-recovery/http"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Context = { params: Promise<{ membershipId: string }> }

async function manageableMembership(membershipId: string) {
  const identity = await getQuoteRecoveryIdentity()
  if (!identity) return { response: NextResponse.json({ ok: false, error: "ログインが必要です" }, { status: 401 }) }
  if (!quoteRecoveryHasPaidAccess(identity)) return { response: NextResponse.json({ ok: false, error: "有効な契約が必要です" }, { status: 402 }) }
  if (!quoteRecoveryCanManage(identity)) return { response: NextResponse.json({ ok: false, error: "メンバーを管理する権限がありません" }, { status: 403 }) }
  const db = getQuoteRecoveryDb()
  const { data: membership, error } = await db.from("quote_recovery_memberships")
    .select("id,user_id,role")
    .eq("id", membershipId)
    .eq("organization_id", identity.organization.id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!membership) return { response: NextResponse.json({ ok: false, error: "メンバーが見つかりません" }, { status: 404 }) }
  if (membership.role === "owner") return { response: NextResponse.json({ ok: false, error: "オーナー権限は変更できません" }, { status: 409 }) }
  if (identity.role === "admin" && membership.role === "admin") return { response: NextResponse.json({ ok: false, error: "管理者を変更できるのはオーナーだけです" }, { status: 403 }) }
  return { identity, membership, db }
}

export async function PATCH(request: Request, context: Context) {
  if (!quoteRecoveryJsonAllowed(request)) return NextResponse.json({ ok: false, error: "Invalid request origin or content type" }, { status: 403 })
  try {
    const parsed = quoteRecoveryMemberUpdateSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: zodCommercialError(parsed.error) }, { status: 400 })
    const { membershipId } = await context.params
    const target = await manageableMembership(membershipId)
    if ("response" in target) return target.response
    if (target.identity.role !== "owner" && parsed.data.role === "admin") return NextResponse.json({ ok: false, error: "管理者を追加できるのはオーナーだけです" }, { status: 403 })
    const { error } = await target.db.from("quote_recovery_memberships").update({ role: parsed.data.role }).eq("id", membershipId).eq("organization_id", target.identity.organization.id)
    if (error) throw new Error(error.message)
    await writeQuoteRecoveryAudit({ organizationId: target.identity.organization.id, actorUserId: target.identity.user.id, action: "membership.role_updated", targetType: "membership", targetId: membershipId, metadata: { previous_role: target.membership.role, role: parsed.data.role } })
    return NextResponse.json({ ok: true, role: parsed.data.role })
  } catch (error) {
    console.error("[quote-recovery/member-update] failed:", error)
    return NextResponse.json({ ok: false, error: "権限を変更できませんでした" }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!quoteRecoveryMutationAllowed(request)) return NextResponse.json({ ok: false, error: "Invalid request origin" }, { status: 403 })
  try {
    const { membershipId } = await context.params
    const target = await manageableMembership(membershipId)
    if ("response" in target) return target.response
    if (target.membership.user_id === target.identity.user.id) return NextResponse.json({ ok: false, error: "自分自身は削除できません" }, { status: 409 })
    const { error } = await target.db.from("quote_recovery_memberships").delete().eq("id", membershipId).eq("organization_id", target.identity.organization.id)
    if (error) throw new Error(error.message)
    const { error: revokeError } = await target.db.from("quote_recovery_sessions").update({ revoked_at: new Date().toISOString() }).eq("user_id", target.membership.user_id).is("revoked_at", null)
    if (revokeError) throw new Error(revokeError.message)
    await writeQuoteRecoveryAudit({ organizationId: target.identity.organization.id, actorUserId: target.identity.user.id, action: "membership.removed", targetType: "membership", targetId: membershipId, metadata: { removed_user_id: target.membership.user_id, previous_role: target.membership.role } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[quote-recovery/member-delete] failed:", error)
    return NextResponse.json({ ok: false, error: "メンバーを削除できませんでした" }, { status: 500 })
  }
}
