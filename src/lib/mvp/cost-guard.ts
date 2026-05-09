/**
 * Cost guard + auto-pause (B36-P3 production grade).
 *
 * 3 metrics × 2 periods × 3 scopes (global / region / campaign) で hard ceiling 強制.
 * limit_value 到達で auto-pause. caller は paused=true を見て送信前 abort.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type QuotaPeriod = "daily" | "monthly";
export type QuotaMetric = "send_count" | "llm_cost_jpy" | "playwright_dispatch";
export type QuotaScope = "global" | "region" | "campaign";

const LIMITS: Record<QuotaMetric, Record<QuotaPeriod, number>> = {
  send_count: {
    daily: parseInt(process.env.MVP_DAILY_SEND_LIMIT ?? "5000", 10),
    monthly: parseInt(process.env.MVP_MONTHLY_SEND_LIMIT ?? "100000", 10),
  },
  llm_cost_jpy: {
    daily: parseFloat(process.env.MVP_DAILY_LLM_COST_JPY ?? "5000"),
    monthly: parseFloat(process.env.MVP_MONTHLY_LLM_COST_JPY ?? "100000"),
  },
  playwright_dispatch: {
    daily: parseInt(process.env.MVP_DAILY_PLAYWRIGHT_LIMIT ?? "3000", 10),
    monthly: parseInt(process.env.MVP_MONTHLY_PLAYWRIGHT_LIMIT ?? "60000", 10),
  },
};

export function periodKey(period: QuotaPeriod, d: Date = new Date()): string {
  if (period === "daily") return d.toISOString().slice(0, 10); // YYYY-MM-DD
  return d.toISOString().slice(0, 7); // YYYY-MM
}

export async function incrementQuota(
  sb: SupabaseClient,
  scope: QuotaScope,
  scopeKey: string,
  metric: QuotaMetric,
  increment: number
): Promise<{ countUsed: number; paused: boolean }> {
  const out = { countUsed: 0, paused: false };
  for (const period of ["daily", "monthly"] as const) {
    const limitVal = LIMITS[metric][period];
    const { data, error } = await sb.rpc("increment_mvp_quota", {
      p_scope: scope,
      p_scope_key: scopeKey,
      p_period: period,
      p_period_key: periodKey(period),
      p_metric: metric,
      p_increment: increment,
      p_limit_value: limitVal,
    });
    if (error) continue;
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.paused) out.paused = true;
    if (row?.count_used != null) out.countUsed = Math.max(out.countUsed, Number(row.count_used));
  }
  return out;
}

/**
 * Pre-flight check: 送信前に paused 状態を確認 (atomic でない・参考値).
 */
export async function isPaused(
  sb: SupabaseClient,
  scope: QuotaScope,
  scopeKey: string
): Promise<{ paused: boolean; reason?: string }> {
  const { data } = await sb
    .from("mvp_send_quotas")
    .select("paused_reason")
    .eq("scope", scope)
    .eq("scope_key", scopeKey)
    .not("paused_at", "is", null)
    .limit(1)
    .maybeSingle();
  return data ? { paused: true, reason: data.paused_reason ?? "paused" } : { paused: false };
}
