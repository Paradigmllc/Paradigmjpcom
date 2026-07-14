import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { recordLeadOperatorEvent } from "@/lib/sales/lead-operator-audit"
import { getLeadSourcePack, listLeadSourcePacks } from "@/lib/sales/lead-source-packs"
import { listLeadSourceConfigs } from "@/lib/sales/lead-source-records"
import { getServiceSalesSupabase } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const RegisterSchema = z.object({
  packId: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{2,99}$/).optional(),
  packIds: z.array(z.string().trim().regex(/^[a-z0-9][a-z0-9-]{2,99}$/)).min(1).max(100).optional(),
  operatorName: z.string().trim().min(2).max(120),
}).refine((value) => Boolean(value.packId) !== Boolean(value.packIds), "Provide packId or packIds")

async function notify(title: string, message: string, type: string): Promise<void> {
  try {
    const { notifyBothChannels } = await import("@/lib/notify")
    await notifyBothChannels("sales", { title, message, link: "/ja/admin/lead-factory", type })
  } catch (error) {
    console.error("[lead-source-packs] notification failed:", error)
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    const sources = await listLeadSourceConfigs()
    const packs = listLeadSourcePacks().map((pack) => {
      const registered = sources.find((source) => source.source_pack_id === pack.id && source.source_pack_version === pack.version)
      return {
        ...pack,
        registeredSource: registered ? {
          id: registered.id,
          approvalStatus: registered.approval_status,
          active: registered.active,
          termsChecked: registered.terms_checked,
        } : null,
      }
    })
    return NextResponse.json({ ok: true, packs })
  } catch (error) {
    console.error("[lead-source-packs] list failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Source packs could not be loaded" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    const parsed = RegisterSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 })
    const packIds = [...new Set(parsed.data.packIds ?? (parsed.data.packId ? [parsed.data.packId] : []))]
    const packs = packIds.map(getLeadSourcePack)
    if (packs.some((pack) => pack === null)) return NextResponse.json({ ok: false, error: "Unknown source pack" }, { status: 404 })
    const sb = getServiceSalesSupabase()
    if (!sb) return NextResponse.json({ ok: false, error: "Sales Supabase not configured" }, { status: 503 })

    const results: Array<{ packId: string; created: boolean; source: unknown }> = []
    for (const pack of packs) {
      if (!pack) continue
      const existing = await sb.from(DB_TABLES.SALES_LEAD_SOURCE_CONFIGS)
        .select("*")
        .eq("source_pack_id", pack.id)
        .eq("source_pack_version", pack.version)
        .maybeSingle()
      if (existing.error) throw new Error(existing.error.message)
      if (existing.data) {
        results.push({ packId: pack.id, created: false, source: existing.data })
        continue
      }
      const { data, error } = await sb.from(DB_TABLES.SALES_LEAD_SOURCE_CONFIGS).insert({
        name: pack.name,
        country_code: pack.countryCode,
        source_type: pack.sourceType,
        source_url: pack.sourceUrl,
        source_format: pack.sourceFormat,
        trust_tier: pack.trustTier,
        field_mapping: pack.fieldMapping,
        source_pack_id: pack.id,
        source_pack_version: pack.version,
        source_license_name: pack.licenseName,
        source_license_url: pack.licenseUrl,
        source_pack_query_sha256: pack.querySha256,
        terms_checked: false,
        active: false,
        approval_status: "draft",
      }).select("*").single()
      if (error) throw new Error(error.message)
      await recordLeadOperatorEvent({
        entityType: "source",
        entityId: String(data.id),
        action: "source_pack_registered",
        operatorName: parsed.data.operatorName,
        detail: { packId: pack.id, packVersion: pack.version, countryCode: pack.countryCode, provider: pack.provider, licenseName: pack.licenseName, querySha256: pack.querySha256, collectionStarted: false },
      })
      results.push({ packId: pack.id, created: true, source: data })
    }
    const createdCount = results.filter((result) => result.created).length
    if (createdCount > 0) {
      await notify("国別候補source packをdraft登録", `${createdCount}件をdraft登録。規約確認・preview・承認前のため収集は開始していません。`, "lead_source_pack_registered")
    }
    const single = results[0]
    return NextResponse.json({ ok: true, created: single?.created ?? false, source: single?.source, createdCount, results }, { status: createdCount > 0 ? 201 : 200 })
  } catch (error) {
    console.error("[lead-source-packs] registration failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Source pack could not be registered" }, { status: 500 })
  }
}
