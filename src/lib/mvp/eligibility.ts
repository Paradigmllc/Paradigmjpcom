/**
 * Eligibility gate — 送信可否を判定する中央集権ロジック.
 *
 * 8 軸 check (全部通過しないと送信不可):
 *   1. blocklist (entity_id / domain): opt-out / 大企業 / 反社 / 手動 block
 *   2. duplicate window (同 entity_id 30 日 cooling)
 *   3. large_company filter (employees >= threshold or listed)
 *   4. antisocial filter (gov_activity collector の反社 flag)
 *   5. contact_form_url 存在 + 信頼度
 *   6. quota check (daily/monthly send_count + llm_cost)
 *   7. time window (region 別 9-18 時)
 *   8. enrichment_complete (まだ収集中の lead は送らない)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getEntityId, normalizeDomain, type LeadCore } from "./entity-id";

export type EligibilityVerdict = "pass" | "block";
export type BlockReason =
  | "blocklist_match"
  | "duplicate_window"
  | "large_company"
  | "antisocial"
  | "missing_form_url"
  | "low_form_url_confidence"
  | "quota_paused"
  | "outside_time_window"
  | "enrichment_incomplete"
  | "missing_company_name";

export interface EligibilityResult {
  verdict: EligibilityVerdict;
  reasons: Array<{ code: BlockReason; detail?: string }>;
  entity_id: string;
  domain: string;
  metadata: {
    employees?: number | null;
    is_listed?: boolean | null;
    last_outreach_at?: string | null;
    industry_slug?: string | null;
  };
}

export interface EligibilityLead extends LeadCore {
  company_name?: string | null;
  contact_form_url?: string | null;
  region?: string | null;
}

const COOLING_DAYS = parseInt(process.env.MVP_COOLING_DAYS ?? "30", 10);
const LARGE_EMPLOYEES_THRESHOLD = parseInt(process.env.MVP_LARGE_COMPANY_EMPLOYEES ?? "500", 10);
const FORM_URL_MIN_CONFIDENCE = parseFloat(process.env.MVP_FORM_URL_MIN_CONFIDENCE ?? "0.6");

const REGION_TIMEZONE: Record<string, string> = {
  ja: "Asia/Tokyo", ko: "Asia/Seoul", zh: "Asia/Shanghai",
  sea: "Asia/Bangkok", en: "America/New_York", europe: "Europe/Berlin",
  es: "Europe/Madrid", pt: "America/Sao_Paulo", ru: "Europe/Moscow",
  ar: "Asia/Riyadh", africa: "Africa/Lagos", others: "UTC",
};
const SEND_HOUR_START = parseInt(process.env.MVP_SEND_TIME_START ?? "9", 10);
const SEND_HOUR_END = parseInt(process.env.MVP_SEND_TIME_END ?? "18", 10);

export async function checkEligibility(
  sb: SupabaseClient,
  lead: EligibilityLead,
  opts: { skipTimeWindow?: boolean; skipQuota?: boolean; isDryRun?: boolean } = {}
): Promise<EligibilityResult> {
  const reasons: EligibilityResult["reasons"] = [];
  const entity_id = getEntityId(lead);
  const domain = normalizeDomain(lead.domain ?? "");
  const meta = (lead.meta ?? {}) as Record<string, unknown>;
  const profile = (meta.unified_profile as Record<string, unknown> | undefined) ?? {};
  const company = (profile.company_profile as Record<string, unknown> | undefined) ?? {};

  if (!lead.company_name) reasons.push({ code: "missing_company_name" });
  if (!opts.isDryRun && !lead.contact_form_url) reasons.push({ code: "missing_form_url" });

  if (meta.form_discovery_confidence != null) {
    const conf = Number(meta.form_discovery_confidence);
    if (Number.isFinite(conf) && conf < FORM_URL_MIN_CONFIDENCE) {
      reasons.push({ code: "low_form_url_confidence", detail: `confidence=${conf}` });
    }
  }

  if (!profile || Object.keys(profile).length === 0) {
    reasons.push({ code: "enrichment_incomplete" });
  }

  // ── 1. blocklist (entity_id or domain match) ──
  const { data: blocklist } = await sb
    .from("mvp_blocklist")
    .select("reason, reason_detail, expires_at")
    .or(`entity_id.eq.${entity_id},domain.eq.${domain}`)
    .or("expires_at.is.null,expires_at.gt.now()")
    .limit(1)
    .maybeSingle();
  if (blocklist) reasons.push({ code: "blocklist_match", detail: `${blocklist.reason}: ${blocklist.reason_detail ?? ""}` });

  // ── 2. duplicate window (same entity_id within COOLING_DAYS) ──
  const cooling = new Date(Date.now() - COOLING_DAYS * 86400_000).toISOString();
  const { data: recent } = await sb
    .from("mvp_outreach_runs")
    .select("id, completed_at, status")
    .eq("entity_id", entity_id)
    .in("status", ["sent", "replied"])
    .gte("completed_at", cooling)
    .limit(1)
    .maybeSingle();
  if (recent) reasons.push({ code: "duplicate_window", detail: `last sent ${recent.completed_at}` });

  // ── 3. large company ──
  const employees = pickNumber(company.employees) ?? pickNumber((profile as Record<string, unknown>).employees);
  const isListed = pickBoolean(company.is_listed) ?? pickBoolean(company.listed);
  if (isListed === true) reasons.push({ code: "large_company", detail: "listed" });
  if (employees != null && employees >= LARGE_EMPLOYEES_THRESHOLD) {
    reasons.push({ code: "large_company", detail: `employees=${employees}` });
  }

  // ── 4. antisocial ──
  const govActivity = (profile.gov_activity as Record<string, unknown> | undefined) ?? {};
  if (pickBoolean(govActivity.antisocial_flag) === true || pickBoolean(govActivity.is_antisocial) === true) {
    reasons.push({ code: "antisocial" });
  }

  // ── 6. quota ──
  if (!opts.skipQuota && !opts.isDryRun) {
    const region = lead.region ?? "ja";
    const { data: quotas } = await sb
      .from("mvp_send_quotas")
      .select("scope, scope_key, paused_at, paused_reason")
      .or(`scope.eq.global,and(scope.eq.region,scope_key.eq.${region})`)
      .not("paused_at", "is", null)
      .limit(1);
    if (quotas && quotas.length > 0) {
      reasons.push({ code: "quota_paused", detail: quotas[0].paused_reason ?? "paused" });
    }
  }

  // ── 7. time window ──
  if (!opts.skipTimeWindow && !opts.isDryRun && lead.region) {
    const tz = REGION_TIMEZONE[lead.region] ?? "Asia/Tokyo";
    const hour = parseInt(new Intl.DateTimeFormat("en-US", { hour: "2-digit", hour12: false, timeZone: tz }).format(new Date()), 10);
    if (hour < SEND_HOUR_START || hour >= SEND_HOUR_END) {
      reasons.push({ code: "outside_time_window", detail: `${tz} hour=${hour}` });
    }
  }

  return {
    verdict: reasons.length === 0 ? "pass" : "block",
    reasons,
    entity_id,
    domain,
    metadata: {
      employees,
      is_listed: isListed,
      last_outreach_at: meta.last_outreach_at as string | undefined ?? null,
      industry_slug: meta.industry_slug as string | undefined ?? null,
    },
  };
}

function pickNumber(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; }
  if (typeof v === "object" && v && "value" in v) return pickNumber((v as { value: unknown }).value);
  return null;
}
function pickBoolean(v: unknown): boolean | null {
  if (v == null) return null;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.toLowerCase() === "true" || v === "1";
  if (typeof v === "object" && v && "value" in v) return pickBoolean((v as { value: unknown }).value);
  return null;
}
