import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { recordLeadOperatorEvent } from "@/lib/sales/lead-operator-audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PatchSchema = z.object({
  active: z.boolean().optional(),
  termsChecked: z.boolean().optional(),
  trustTier: z.number().int().min(1).max(3).optional(),
  fieldMapping: z.record(z.string().max(80), z.string().max(500)).refine((value) => Object.keys(value).length <= 30, "At most 30 field mappings are allowed").optional(),
  approvalStatus: z.enum(["draft", "approved", "suspended"]).optional(),
  operatorName: z.string().trim().min(2).max(120),
}).refine((value) => value.active !== undefined
  || value.termsChecked !== undefined
  || value.trustTier !== undefined
  || value.fieldMapping !== undefined
  || value.approvalStatus !== undefined, "At least one mutable field is required")

export async function PATCH(req: NextRequest, context: { params: Promise<{ sourceId: string }> }) {
  try {
    if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    const { sourceId } = await context.params
    if (!z.string().uuid().safeParse(sourceId).success) return NextResponse.json({ ok: false, error: "Invalid source ID" }, { status: 400 })
    const parsed = PatchSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 })
    const sb = getServiceSalesSupabase()
    if (!sb) return NextResponse.json({ ok: false, error: "Sales Supabase not configured" }, { status: 503 })
    const currentResult = await sb.from(DB_TABLES.SALES_LEAD_SOURCE_CONFIGS).select("*").eq("id", sourceId).single()
    if (currentResult.error) return NextResponse.json({ ok: false, error: currentResult.error.message }, { status: 404 })
    const current = currentResult.data as Record<string, unknown>
    const patch: Record<string, unknown> = {}
    const nextTermsChecked = parsed.data.termsChecked ?? current.terms_checked === true
    const currentApproval = String(current.approval_status ?? "draft")
    const requestedApproval = parsed.data.approvalStatus ?? currentApproval
    if (requestedApproval === "approved") {
      const preview = current.last_preview && typeof current.last_preview === "object" ? current.last_preview as Record<string, unknown> : {}
      const previewedAt = typeof current.last_previewed_at === "string" ? Date.parse(current.last_previewed_at) : Number.NaN
      const previewFresh = Number.isFinite(previewedAt) && Date.now() - previewedAt <= 7 * 24 * 60 * 60_000
      if (!nextTermsChecked || Number(preview.accepted ?? 0) < 1 || !previewFresh) {
        return NextResponse.json({ ok: false, error: "A successful preview from the last 7 days and terms confirmation are required before approval" }, { status: 409 })
      }
    }
    if (parsed.data.active === true && requestedApproval !== "approved") {
      return NextResponse.json({ ok: false, error: "Only an approved source can be activated" }, { status: 409 })
    }
    if (parsed.data.active !== undefined) patch.active = parsed.data.active
    if (parsed.data.termsChecked !== undefined) {
      patch.terms_checked = parsed.data.termsChecked
      if (!parsed.data.termsChecked) {
        patch.approval_status = "draft"
        patch.active = false
        patch.approved_by = null
        patch.approved_at = null
        patch.pilot_approved_by = null
        patch.pilot_approved_at = null
      }
    }
    if (parsed.data.trustTier !== undefined) patch.trust_tier = parsed.data.trustTier
    if (parsed.data.fieldMapping !== undefined) {
      patch.field_mapping = parsed.data.fieldMapping
      patch.last_status = "never_run"
      patch.last_record_count = 0
      patch.last_preview = {}
      patch.last_previewed_at = null
      patch.last_preflight = {}
      patch.last_preflighted_at = null
      patch.approval_status = "draft"
      patch.active = false
      patch.approved_by = null
      patch.approved_at = null
      patch.pilot_approved_by = null
      patch.pilot_approved_at = null
    }
    if (parsed.data.approvalStatus !== undefined) {
      patch.approval_status = parsed.data.approvalStatus
      if (parsed.data.approvalStatus === "approved") {
        patch.approved_by = parsed.data.operatorName
        patch.approved_at = new Date().toISOString()
        patch.active = true
      } else {
        patch.active = false
        patch.approved_by = null
        patch.approved_at = null
        patch.pilot_approved_by = null
        patch.pilot_approved_at = null
      }
    }
    await recordLeadOperatorEvent({
      entityType: "source",
      entityId: sourceId,
      action: "source_update_requested",
      operatorName: parsed.data.operatorName,
      detail: { requestedApproval, changedFields: Object.keys(patch) },
    })
    const { data, error } = await sb.from(DB_TABLES.SALES_LEAD_SOURCE_CONFIGS).update(patch).eq("id", sourceId).select("*").single()
    if (error) throw new Error(error.message)
    await recordLeadOperatorEvent({
      entityType: "source",
      entityId: sourceId,
      action: parsed.data.approvalStatus ? `approval_${parsed.data.approvalStatus}` : "source_updated",
      operatorName: parsed.data.operatorName,
      detail: { active: data.active, termsChecked: data.terms_checked, changedFields: Object.keys(patch) },
    })
    try {
      const { notifyBothChannels } = await import("@/lib/notify")
      await notifyBothChannels("sales", {
        title: "候補収集元を更新",
        message: `${String(data.name ?? sourceId)} の有効状態・規約確認・信頼設定を更新しました。`,
        link: "/ja/admin/lead-factory",
        type: "lead_source_updated",
      })
    } catch (error) {
      console.error("[lead-source] notification failed:", error)
    }
    return NextResponse.json({ ok: true, source: data })
  } catch (error) {
    console.error("[lead-source] update failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Lead source could not be updated" }, { status: 500 })
  }
}
