/**
 * lib/sales/outreach/activity.ts — sales_activity_log への書込 (Phase 3 / ⑤進捗)
 *
 * 役割: outreach の 1 件分の結果をカルテのタイムライン (sales_activity_log) に記録。
 *       activity_type は既存 CHECK 内の 'note' を使い (DDL 不要)、
 *       outreach 固有データは meta JSONB に格納する。
 *
 * dedup: 直近 N 日に同 company へ送信済みか判定 (二重送信防止)。
 */

import { getServiceSalesSupabase } from "@/lib/supabase"
import type { Region } from "../types"

/** activity_log.result CHECK = success|no_answer|follow_up|declined|completed */
export type ActivityResult = "success" | "no_answer" | "follow_up" | "declined" | "completed"

export interface LogOutreachInput {
  companyId: string
  region: Region
  pipelineRunId?: string | null
  subject: string
  body: string
  result: ActivityResult
  meta: Record<string, unknown>
  occurredAt?: string
}

export async function logOutreachActivity(
  input: LogOutreachInput,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, error: "Supabase service_role not configured" }
  const { error } = await sb.from("sales_activity_log").insert({
    region: input.region,
    company_id: input.companyId,
    pipeline_run_id: input.pipelineRunId ?? null,
    activity_type: "note", // 既存 CHECK 内で outreach を表現 (meta.kind で識別)
    subject: input.subject,
    body: input.body,
    result: input.result,
    occurred_at: input.occurredAt ?? new Date().toISOString(),
    meta: { kind: "form_outreach", ...input.meta },
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * 直近 withinDays 日に同 company へ form_outreach 済みか (二重送信防止)。
 */
export async function recentlyContacted(
  companyId: string,
  withinDays: number = 30,
): Promise<boolean> {
  const sb = getServiceSalesSupabase()
  if (!sb) return false
  const since = new Date(Date.now() - withinDays * 86_400_000).toISOString()
  const { data } = await sb
    .from("sales_activity_log")
    .select("id, meta")
    .eq("company_id", companyId)
    .gte("occurred_at", since)
    .limit(20)
  if (!data) return false
  return data.some((row) => (row.meta as Record<string, unknown> | null)?.kind === "form_outreach")
}
