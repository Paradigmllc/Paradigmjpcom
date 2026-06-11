/**
 * POST /api/sales/supabase-webhook — Supabase 変更 → Notion 即時反映 (S→N・cron 廃止の主経路)
 *
 * 役割: Supabase Database Webhook (sales_companies / sales_customers / sales_deliveries の
 *       INSERT/UPDATE) を受け、該当 row を Notion に push する。enrich/CSV/Stripe/手動 等
 *       「どの経路で Supabase が変わっても」数秒で Notion に反映される全自動トリガーの片翼。
 *       → 旧 5min cron (S→N 役) を置換。N→S は /api/sales/notion-webhook が担う。
 *
 * 入力: Supabase DB Webhook payload { type, table, record, old_record, schema }
 * 認証: header x-webhook-secret == env SUPABASE_WEBHOOK_SECRET (constant-time・fail-closed)
 *
 * ループ防止 (双方向 sync の要・2 重防御):
 *   1. **本側**: 直近 20s に sales_sync_logs(direction='notion->supabase', 同 notion_page_id)
 *      があれば「この変更は Notion 由来」とみなし push しない (echo 抑止)
 *   2. **対側**: notion-webhook が bot 自身の Notion 変更を無視 (authors=bot)
 *   → どちらか一方でもループは止まるが、両方で無駄打ちも消す
 *
 * 2026-05-21 新規 (相互即時同期・cron 廃止)。
 */

import { NextRequest, NextResponse } from "next/server"
import { getServiceSalesSupabase } from "@/lib/supabase"
import {
  syncCompanyToNotion,
  syncCustomerToNotion,
  syncDeliveryToNotion,
} from "@/lib/sales/sync"
import { enqueueCompanyEnrichment, triggerEnrichmentRunner } from "@/lib/sales/enrichment-jobs"
import { resolveNotionDbId } from "@/lib/sales/notion-apply"
import { runCustomerSuccessHandoff } from "@/lib/sales/customer-handoff"
import type { SalesCompany, SalesCustomer, SalesDelivery, Region } from "@/lib/sales/types"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

const ECHO_WINDOW_MS = 20_000

interface SupabaseWebhookPayload {
  type?: "INSERT" | "UPDATE" | "DELETE"
  table?: string
  schema?: string
  record?: Record<string, unknown> | null
  old_record?: Record<string, unknown> | null
}

function stringArrayFromMeta(record: Record<string, unknown>, key: string): string[] | null {
  const meta = record.meta
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null
  const value = (meta as Record<string, unknown>)[key]
  if (!Array.isArray(value)) return null
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
}

/** constant-time 比較 (timing attack 防止) */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** 直近 ECHO_WINDOW 内に Notion 由来の変更ログがあるか (echo 抑止) */
async function isNotionSourced(notionPageId: string): Promise<boolean> {
  const sb = getServiceSalesSupabase()
  if (!sb) return false
  const since = new Date(Date.now() - ECHO_WINDOW_MS).toISOString()
  const { data } = await sb
    .from(DB_TABLES.SALES_SYNC_LOGS)
    .select("id")
    .eq("direction", "notion->supabase")
    .eq("notion_page_id", notionPageId)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle()
  return !!data
}

export async function POST(req: NextRequest) {
  // ── 認証 (fail-closed) ──
  const secret = process.env.SUPABASE_WEBHOOK_SECRET
  if (!secret) {
    console.error("[supabase-webhook] SUPABASE_WEBHOOK_SECRET not set — fail-closed")
    return NextResponse.json({ ok: false, error: "webhook secret not configured" }, { status: 503 })
  }
  if (!safeEqual(req.headers.get("x-webhook-secret") ?? "", secret)) {
    return NextResponse.json({ ok: false, error: "invalid secret" }, { status: 401 })
  }

  let payload: SupabaseWebhookPayload
  try {
    payload = (await req.json()) as SupabaseWebhookPayload
  } catch (e) {
    console.error("[supabase-webhook] invalid JSON:", e)
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 })
  }

  const { type, table, record } = payload
  if (type === "DELETE" || !record) {
    return NextResponse.json({ ok: true, skipped: "delete or empty record" })
  }

  // ── echo 抑止: Notion 由来の変更は押し戻さない ──
  const notionPageId = typeof record.notion_page_id === "string" ? record.notion_page_id : null
  if (notionPageId && (await isNotionSourced(notionPageId))) {
    return NextResponse.json({ ok: true, skipped: "notion-sourced (echo prevention)" })
  }

  const region: Region = record.region === "global" ? "global" : "jp"

  try {
    switch (table) {
      case "sales_companies": {
        if (
          type === "UPDATE" &&
          typeof record.id === "string" &&
          record.deal_stage === "成約" &&
          payload.old_record?.deal_stage !== "成約"
        ) {
          await runCustomerSuccessHandoff({
            companyId: record.id,
            source: "supabase_webhook",
            contractProducts: stringArrayFromMeta(record, "recommended_products"),
            assignedTo: typeof record.assigned_to === "string" ? record.assigned_to : null,
            meta: { trigger: "deal_stage_closed_won" },
          })
        }
        if (type === "INSERT" && typeof record.id === "string") {
          const queued = await enqueueCompanyEnrichment({
            companyId: record.id,
            source: typeof record.source === "string" ? record.source : "supabase_webhook",
            triggeredBy: "supabase_database_webhook",
            priority: 55,
            payload: {
              domain: typeof record.domain === "string" ? record.domain : null,
              company_name: typeof record.company_name === "string" ? record.company_name : null,
            },
          })
          if (queued.ok) await triggerEnrichmentRunner(1)
        }
        const dbId = resolveNotionDbId("company", region)
        if (!dbId) return NextResponse.json({ ok: false, error: `no company DB id for ${region}` })
        const result = await syncCompanyToNotion(record as unknown as SalesCompany, dbId)
        return NextResponse.json({ table, ...result })
      }
      case "sales_customers": {
        const result = await syncCustomerToNotion(record as unknown as SalesCustomer)
        return NextResponse.json({ table, ...result })
      }
      case "sales_deliveries": {
        const result = await syncDeliveryToNotion(record as unknown as SalesDelivery)
        return NextResponse.json({ table, ...result })
      }
      default:
        return NextResponse.json({ ok: true, skipped: `unhandled table: ${table}` })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[supabase-webhook] push failed:", msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
