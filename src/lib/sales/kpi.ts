/**
 * lib/sales/kpi.ts — 日次 KPI スナップショット (Phase 4 / ⑤進捗可視化)
 *
 * 役割: sales_companies / sales_activity_log / sales_calendar_events から
 *       その日の営業 KPI を集計し sales_kpi に 1 行 upsert する。
 *       Notion KPI ダッシュボード / weekly-digest の元データ。
 *
 * sales_kpi は date に UNIQUE が無いため「同日 1 行」を JS 側で担保
 * (既存 id があれば update・無ければ insert)。
 */

import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

export interface KpiSnapshot {
  date: string
  new_leads: number
  outreach_sent: number
  replies_received: number
  meetings_booked: number
  proposals_sent: number
  deals_closed: number
  deals_lost: number
  revenue: number
}

function dayRange(dateIso: string): { start: string; end: string } {
  const start = `${dateIso}T00:00:00.000Z`
  const end = `${dateIso}T23:59:59.999Z`
  return { start, end }
}

async function countIn(
  table: string,
  col: string,
  start: string,
  end: string,
): Promise<number> {
  const sb = getServiceSalesSupabase()
  if (!sb) return 0
  const { count } = await sb
    .from(table)
    .select("*", { count: "exact", head: true })
    .gte(col, start)
    .lte(col, end)
  return count ?? 0
}

/** その日の KPI を集計 (date = YYYY-MM-DD・default 今日 UTC) */
export async function computeKpiForDate(dateIso?: string): Promise<KpiSnapshot> {
  const date = dateIso ?? new Date().toISOString().slice(0, 10)
  const { start, end } = dayRange(date)
  const sb = getServiceSalesSupabase()
  if (!sb) {
    return {
      date,
      new_leads: 0,
      outreach_sent: 0,
      replies_received: 0,
      meetings_booked: 0,
      proposals_sent: 0,
      deals_closed: 0,
      deals_lost: 0,
      revenue: 0,
    }
  }

  const [
    new_leads,
    { data: acts },
    meetings_booked,
    proposals_sent,
    { data: deals },
    { data: contracts },
  ] = await Promise.all([
    countIn("sales_companies", "created_at", start, end),
    sb.from(DB_TABLES.SALES_ACTIVITY_LOG)
      .select("meta, result")
      .gte("occurred_at", start)
      .lte("occurred_at", end)
      .limit(5000),
    countIn("sales_calendar_events", "start_at", start, end),
    countIn("sales_companies", "sent_at", start, end),
    sb.from(DB_TABLES.SALES_COMPANIES)
      .select("deal_stage")
      .gte("updated_at", start)
      .lte("updated_at", end)
      .in("deal_stage", ["成約", "失注"])
      .limit(5000),
    sb.from(DB_TABLES.SALES_CONTRACTS)
      .select("amount_yen")
      .gte("signed_at", start)
      .lte("signed_at", end)
      .limit(5000),
  ])
  const outreachActs = (acts ?? []).filter(
    (a) => (a.meta as Record<string, unknown> | null)?.kind === "form_outreach",
  )
  const outreach_sent = outreachActs.filter((a) => a.result === "success").length
  const replies_received = outreachActs.filter((a) => a.result === "completed").length
  const deals_closed = (deals ?? []).filter((d) => d.deal_stage === "成約").length
  const deals_lost = (deals ?? []).filter((d) => d.deal_stage === "失注").length
  const revenue = (contracts ?? []).reduce(
    (sum, c) => sum + Number(c.amount_yen ?? 0),
    0,
  )

  return {
    date,
    new_leads,
    outreach_sent,
    replies_received,
    meetings_booked,
    proposals_sent,
    deals_closed,
    deals_lost,
    revenue,
  }
}

/** 集計して sales_kpi に同日 1 行 upsert */
export async function snapshotKpi(
  dateIso?: string,
): Promise<{ ok: boolean; snapshot?: KpiSnapshot; error?: string }> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, error: "Supabase service_role not configured" }
  const snapshot = await computeKpiForDate(dateIso)

  // TOCTOU race: concurrent snapshotKpi calls for the same date can produce
  // duplicate rows since sales_kpi.date has no UNIQUE constraint.
  // Consider adding UNIQUE on "date" then switching to .upsert() with onConflict: "date".
  const { data: existing } = await sb
    .from(DB_TABLES.SALES_KPI)
    .select("id")
    .eq("date", snapshot.date)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await sb.from(DB_TABLES.SALES_KPI).update(snapshot).eq("id", existing.id)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await sb.from(DB_TABLES.SALES_KPI).insert(snapshot)
    if (error) return { ok: false, error: error.message }
  }
  return { ok: true, snapshot }
}
