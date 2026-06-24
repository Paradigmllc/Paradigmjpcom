/**
 * POST /api/sales/sync-knowledge-from-notion
 *
 * Notion Webhook → Supabase 双方向同期 (Tools/Phases/Diagnosis).
 * WW-EVENT: Webhook駆動のみ。cron/pg_cron不使用。
 *
 * Body: { db_type?: "tools"|"phases"|"diagnosis", db_id?: string }
 *   - db_type 指定で単一DB同期。未指定で全3DB同期。
 *   - db_id 未指定: env NOTION_DB_TOOLS / NOTION_DB_PHASES / NOTION_DB_DIAGNOSIS から取得
 *
 * 認証: X-Webhook-Secret ヘッダ必須
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { notionQueryDatabase, extractProperty } from "@/lib/notion"
import { getServiceSalesSupabase } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const DB_TOOLS   = process.env.NOTION_DB_TOOLS    ?? "389a2b78f3fc8169a987deb00a3e373e"
const DB_PHASES  = process.env.NOTION_DB_PHASES   ?? "389a2b78-f3fc-81b8-b0fd-d3730ec12560"
const DB_DIAGNOSIS = process.env.NOTION_DB_DIAGNOSIS ?? "389a2b78-f3fc-81e1-a8da-c784a4fb1976"

type DbType = "tools" | "phases" | "diagnosis"
type SalesSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

interface SyncConfig {
  dbId: string
  table: string
  mapRow: (row: { id: string; properties: Record<string, unknown>; last_edited_time: string }) => Record<string, unknown>
}

const configs: Record<DbType, SyncConfig> = {
  tools: {
    dbId: DB_TOOLS,
    table: "sales_knowledge_tools",
    mapRow: (row) => ({
      notion_page_id: row.id,
      name: (extractProperty(row.properties, "Name") as string) ?? "",
      category: (extractProperty(row.properties, "Category") as string) ?? null,
      status: (extractProperty(row.properties, "Status") as string) ?? null,
      notes: (extractProperty(row.properties, "Notes") as string) ?? null,
      notion_last_edited: row.last_edited_time,
      updated_at: new Date().toISOString(),
    }),
  },
  phases: {
    dbId: DB_PHASES,
    table: "sales_knowledge_phases",
    mapRow: (row) => ({
      notion_page_id: row.id,
      name: (extractProperty(row.properties, "フェーズ名") as string) ?? "",
      phase_number: (extractProperty(row.properties, "番号") as number) ?? null,
      role: (extractProperty(row.properties, "役割") as string) ?? null,
      tools: (extractProperty(row.properties, "主要ツール") as string) ?? null,
      notion_last_edited: row.last_edited_time,
      updated_at: new Date().toISOString(),
    }),
  },
  diagnosis: {
    dbId: DB_DIAGNOSIS,
    table: "sales_knowledge_diagnosis",
    mapRow: (row) => ({
      notion_page_id: row.id,
      pain_category: (extractProperty(row.properties, "痛みカテゴリ") as string) ?? "",
      pain_number: (extractProperty(row.properties, "番号") as number) ?? null,
      tool_list: (extractProperty(row.properties, "使用ツール") as string) ?? null,
      technical_fact: (extractProperty(row.properties, "技術的事実") as string) ?? null,
      fear_amount: (extractProperty(row.properties, "恐怖の金額変換") as string) ?? null,
      optimal_product: (extractProperty(row.properties, "最適商材") as string) ?? null,
      notion_last_edited: row.last_edited_time,
      updated_at: new Date().toISOString(),
    }),
  },
}

async function syncOne(supabase: SalesSupabase, config: SyncConfig): Promise<{ synced: number; errors: string[] }> {
  let synced = 0
  const errors: string[] = []

  const r = await notionQueryDatabase(config.dbId, undefined, 100)
  if (!r.ok || !r.data) {
    errors.push(`Notion query failed: ${r.error}`)
    return { synced, errors }
  }

  for (const row of r.data.results) {
    const mapped = config.mapRow(row)
    const { error } = await supabase
      .from(config.table)
      .upsert(mapped, { onConflict: "notion_page_id" })

    if (error) {
      errors.push(`${row.id}: ${error.message}`)
    } else {
      synced++
    }
  }

  return { synced, errors }
}

export async function POST(req: NextRequest) {
  const authErr = verifyWebhookSecret(req)
  if (authErr) return authErr

  let body: { db_type?: string; db_id?: string }
  try {
    body = (await req.json()) as { db_type?: string; db_id?: string }
  } catch (error) {
    console.error("[sync-knowledge-from-notion] invalid JSON body:", error)
    body = {}
  }

  const supabase = getServiceSalesSupabase()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Sales Supabase service_role not configured" }, { status: 503 })
  }

  const type = (body.db_type ?? "") as DbType | ""
  const results: Record<string, { synced: number; errors: string[] }> = {}

  if (type && configs[type]) {
    const cfg = { ...configs[type], dbId: body.db_id || configs[type].dbId }
    results[type] = await syncOne(supabase, cfg)
  } else {
    for (const [t, cfg] of Object.entries(configs)) {
      results[t] = await syncOne(supabase, { ...cfg, dbId: body.db_id || cfg.dbId })
    }
  }

  const total = Object.values(results).reduce((s, r) => s + r.synced, 0)
  return NextResponse.json({ ok: true, total, results })
}
