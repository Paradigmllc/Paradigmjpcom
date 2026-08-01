import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { LEAD_SOURCE_FORMATS, LEAD_SOURCE_TYPES, listLeadSourceConfigs } from "@/lib/sales/lead-source-records"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { recordLeadOperatorEvent } from "@/lib/sales/lead-operator-audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const CreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  countryCode: z.string().trim().regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()),
  sourceType: z.enum(LEAD_SOURCE_TYPES),
  sourceUrl: z.string().url().refine((value) => value.startsWith("https://"), "HTTPS URL is required"),
  sourceFormat: z.enum(LEAD_SOURCE_FORMATS),
  trustTier: z.number().int().min(1).max(3),
  fieldMapping: z.record(z.string().max(80), z.string().max(500)).refine((value) => Object.keys(value).length <= 30, "At most 30 field mappings are allowed").default({}),
  termsChecked: z.boolean().default(false),
  operatorName: z.string().trim().min(2).max(120),
})

async function notify(title: string, message: string, type: string): Promise<void> {
  try {
    const { notifyBothChannels } = await import("@/lib/notify")
    await notifyBothChannels("sales", { title, message, link: "/ja/admin/lead-factory", type })
  } catch (error) {
    console.error("[lead-sources] notification failed:", error)
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    return NextResponse.json({ ok: true, sources: await listLeadSourceConfigs() })
  } catch (error) {
    console.error("[lead-sources] list failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Lead sources could not be loaded" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    const parsed = CreateSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 })
    const sb = getServiceSalesSupabase()
    if (!sb) return NextResponse.json({ ok: false, error: "Sales Supabase not configured" }, { status: 503 })
    const { data, error } = await sb.from(DB_TABLES.SALES_LEAD_SOURCE_CONFIGS).insert({
      name: parsed.data.name,
      country_code: parsed.data.countryCode,
      source_type: parsed.data.sourceType,
      source_url: parsed.data.sourceUrl,
      source_format: parsed.data.sourceFormat,
      trust_tier: parsed.data.trustTier,
      field_mapping: parsed.data.fieldMapping,
      terms_checked: parsed.data.termsChecked,
      active: false,
      approval_status: "draft",
    }).select("*").single()
    if (error) throw new Error(error.message)
    await recordLeadOperatorEvent({
      entityType: "source",
      entityId: String(data.id),
      action: "created",
      operatorName: parsed.data.operatorName,
      detail: { countryCode: parsed.data.countryCode, sourceType: parsed.data.sourceType, sourceFormat: parsed.data.sourceFormat },
    })
    await notify("候補収集元を登録", `${parsed.data.countryCode} / ${parsed.data.name}。収集実行前に規約確認と取込テストが必要です。`, "lead_source_created")
    return NextResponse.json({ ok: true, source: data }, { status: 201 })
  } catch (error) {
    console.error("[lead-sources] create failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Lead source could not be created" }, { status: 500 })
  }
}
