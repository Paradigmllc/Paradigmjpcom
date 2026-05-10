/**
 * Personalization layer (Phase 6 徹底).
 *
 * 設計: LLM に「unified_profile を全部読ませて top_pain_summary を推測させる」設計だと
 *   ① cache hit 率低下 (user_payload が大きい・頻繁に変わる)
 *   ② hallucination 余地大
 *   ③ 80% Real Data 規律違反 (LLM が数値捏造しやすい)
 *
 * Phase 6 では server-side で **unified_profile から top_pain_summary を deterministic に計算**:
 *   - findings 全部から severity 高い順 3 件を選定
 *   - 各 finding の name + 数値 evidence を 1 行にまとめる
 *   - LLM 推測ゼロ化 → cache 効率向上 + hallucination 不可能化
 */

interface PainFinding {
  pain_id?: string;
  pain_name?: string;
  severity?: "low" | "medium" | "high" | "critical";
  description?: string;
  evidence?: { value?: number | string; unit?: string };
  source?: string;
}

interface UnifiedProfile {
  top_pain_summary?: string;
  pains?: PainFinding[];
  findings?: PainFinding[];
  company_profile?: { employees?: { value?: number } | number };
  web_performance?: { pagespeed_score?: number; load_time_seconds?: number };
  seo?: { visibility_score?: number; domain_authority?: number };
  [k: string]: unknown;
}

const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 } as const;

/**
 * unified_profile から top 3 pain を抽出して server-side で要約.
 * LLM 入力に使用 → cache hit 率向上 + hallucination ゼロ.
 */
export function derivePainSummary(profile: UnifiedProfile | null | undefined, language: string = "ja"): string {
  if (!profile || typeof profile !== "object") return "";

  // 既に summary が入ってる場合はそれを尊重 (Appexxme intake-gate 由来)
  if (typeof profile.top_pain_summary === "string" && profile.top_pain_summary.length > 0) {
    return profile.top_pain_summary;
  }

  const candidates: PainFinding[] = [
    ...(Array.isArray(profile.pains) ? profile.pains : []),
    ...(Array.isArray(profile.findings) ? profile.findings : []),
  ];
  if (candidates.length === 0) {
    // fallback: 数値 metric から推測 (deterministic・LLM 不要)
    return synthesizeFromMetrics(profile, language);
  }

  // severity 高い順 3 件
  const sorted = candidates
    .filter((p) => p.pain_name)
    .sort((a, b) => (SEVERITY_RANK[b.severity ?? "low"] ?? 0) - (SEVERITY_RANK[a.severity ?? "low"] ?? 0))
    .slice(0, 3);

  if (sorted.length === 0) return synthesizeFromMetrics(profile, language);

  return sorted.map((p, i) => {
    const evidence = p.evidence?.value != null ? `(${p.evidence.value}${p.evidence.unit ?? ""})` : "";
    return `${i + 1}. ${p.pain_name}${evidence ? " " + evidence : ""}`;
  }).join("\n");
}

/**
 * 数値 metric から deterministic に summary 合成 (pain list 不在時の fallback).
 * しきい値ベース・LLM 不要.
 */
function synthesizeFromMetrics(profile: UnifiedProfile, language: string): string {
  const lines: string[] = [];
  const pagespeed = profile.web_performance?.pagespeed_score;
  const loadTime = profile.web_performance?.load_time_seconds;
  const seoScore = profile.seo?.visibility_score;
  const da = profile.seo?.domain_authority;

  const isJa = language === "ja";

  if (typeof pagespeed === "number" && pagespeed < 50) {
    lines.push(isJa
      ? `1. PageSpeed Score 低下 (${pagespeed}/100)`
      : `1. PageSpeed Score is low (${pagespeed}/100)`);
  }
  if (typeof loadTime === "number" && loadTime > 3) {
    lines.push(isJa
      ? `${lines.length + 1}. Web ページ読み込み速度遅延 (${loadTime}秒)`
      : `${lines.length + 1}. Page load time is slow (${loadTime}s)`);
  }
  if (typeof seoScore === "number" && seoScore < 60) {
    lines.push(isJa
      ? `${lines.length + 1}. SEO 可視性スコア低位 (${seoScore})`
      : `${lines.length + 1}. SEO visibility score is low (${seoScore})`);
  }
  if (typeof da === "number" && da < 30) {
    lines.push(isJa
      ? `${lines.length + 1}. Domain Authority が低位 (${da})`
      : `${lines.length + 1}. Domain Authority is low (${da})`);
  }

  if (lines.length === 0) {
    return isJa
      ? "詳細な健康指標 data 取得中. 概況のみで暫定診断を提示します."
      : "Detailed health metrics are being collected. Preliminary diagnosis based on available data.";
  }
  return lines.join("\n");
}

/**
 * Dify response.usage を mvp_outreach_runs.cost_jpy + cache_hit_rate に変換.
 * DeepSeek V4 経由の場合 cache hit で 90% OFF (input_cache_hit_tokens / input_tokens 比率).
 */
export interface CacheTelemetry {
  cost_jpy: number;
  cache_hit_rate: number; // 0-1
  total_tokens: number;
  cache_hit_tokens: number;
}

export function parseDifyUsage(rawData: unknown): CacheTelemetry | null {
  if (!rawData || typeof rawData !== "object") return null;
  const data = rawData as { usage?: { total_price?: string | number; total_tokens?: number; prompt_tokens?: number; completion_tokens?: number; prompt_unit_price?: string | number; prompt_cache_hit_tokens?: number } };
  const u = data.usage;
  if (!u) return null;

  const totalPriceUsd = typeof u.total_price === "string" ? parseFloat(u.total_price) : (u.total_price ?? 0);
  const usdToJpy = 150; // approx exchange (could be env)
  const cost_jpy = totalPriceUsd * usdToJpy;

  const total = u.total_tokens ?? 0;
  const cacheHit = u.prompt_cache_hit_tokens ?? 0;
  const cache_hit_rate = total > 0 ? Math.min(cacheHit / total, 1) : 0;

  return {
    cost_jpy: Math.round(cost_jpy * 10000) / 10000,
    cache_hit_rate: Math.round(cache_hit_rate * 1000) / 1000,
    total_tokens: total,
    cache_hit_tokens: cacheHit,
  };
}
