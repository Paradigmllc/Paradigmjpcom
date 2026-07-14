import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PatchSchema = z.object({
  active: z.boolean().optional(),
  termsChecked: z.boolean().optional(),
  trustTier: z.number().int().min(1).max(3).optional(),
  fieldMapping: z.record(z.string().max(80), z.string().max(500)).refine((value) => Object.keys(value).length <= 30, "At most 30 field mappings are allowed").optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one field is required")

export async function PATCH(req: NextRequest, context: { params: Promise<{ sourceId: string }> }) {
  try {
    if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    const { sourceId } = await context.params
    if (!z.string().uuid().safeParse(sourceId).success) return NextResponse.json({ ok: false, error: "Invalid source ID" }, { status: 400 })
    const parsed = PatchSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 })
    const patch: Record<string, unknown> = {}
    if (parsed.data.active !== undefined) patch.active = parsed.data.active
    if (parsed.data.termsChecked !== undefined) patch.terms_checked = parsed.data.termsChecked
    if (parsed.data.trustTier !== undefined) patch.trust_tier = parsed.data.trustTier
    if (parsed.data.fieldMapping !== undefined) {
      patch.field_mapping = parsed.data.fieldMapping
      patch.last_status = "never_run"
      patch.last_record_count = 0
    }
    const sb = getServiceSalesSupabase()
    if (!sb) return NextResponse.json({ ok: false, error: "Sales Supabase not configured" }, { status: 503 })
    const { data, error } = await sb.from(DB_TABLES.SALES_LEAD_SOURCE_CONFIGS).update(patch).eq("id", sourceId).select("*").single()
    if (error) throw new Error(error.message)
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
