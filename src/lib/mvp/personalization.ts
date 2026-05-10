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
 * Dify Cloud workflow response → mvp_outreach_runs.cost_jpy + total_tokens 変換.
 *
 * 実 Dify Cloud workflow response shape (smoke test 確認 2026-05-10):
 *   { data: { status, outputs, total_tokens, total_steps, elapsed_time, ... } }
 *
 * Notes:
 *   - cost (total_price) は Dify Cloud workflow API で expose されない → token 数 × 単価で estimate
 *   - prompt_cache_hit_tokens も expose されない → cache_hit_rate は null (DeepSeek 直叩き時のみ取得可)
 *   - underlying DeepSeek V4 cache hit は per-token cost に反映されるが、Dify が抽象化しているため見えない
 */
export interface CacheTelemetry {
  cost_jpy: number;
  cache_hit_rate: number | null; // null = Dify が cache stat 非公開
  total_tokens: number;
}

// DeepSeek V4 token 単価 (¥/1M tokens・cache hit + miss 平均推定)
const PROMPT_TOKEN_JPY_PER_1M = 14;     // cache hit (90% OFF) 想定 default ¥0.014/1M ≈ ¥14/100M
const COMPLETION_TOKEN_JPY_PER_1M = 280; // ¥0.28/1M ≈ ¥280/1M

export function parseDifyUsage(rawData: unknown): CacheTelemetry | null {
  if (!rawData || typeof rawData !== "object") return null;
  const root = rawData as { data?: { total_tokens?: number; usage?: { total_price?: string | number; prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; prompt_cache_hit_tokens?: number } } };
  const data = root.data;
  if (!data) return null;

  // Prefer data.usage.* if present (some Dify versions return it), else data.total_tokens
  const usage = data.usage ?? {};
  const total = usage.total_tokens ?? data.total_tokens ?? 0;
  if (total === 0) return null;

  // cost: prefer Dify-provided total_price (USD) when available, else estimate from token count
  let cost_jpy = 0;
  if (usage.total_price != null) {
    const totalPriceUsd = typeof usage.total_price === "string" ? parseFloat(usage.total_price) : usage.total_price;
    cost_jpy = totalPriceUsd * 150; // USD → JPY rough
  } else {
    // Estimate: assume 60% prompt / 40% completion if not split
    const prompt = usage.prompt_tokens ?? Math.floor(total * 0.6);
    const completion = usage.completion_tokens ?? (total - prompt);
    cost_jpy = (prompt / 1_000_000) * PROMPT_TOKEN_JPY_PER_1M + (completion / 1_000_000) * COMPLETION_TOKEN_JPY_PER_1M;
  }

  // cache_hit_rate: only available if Dify exposes prompt_cache_hit_tokens
  let cache_hit_rate: number | null = null;
  if (usage.prompt_cache_hit_tokens != null && total > 0) {
    cache_hit_rate = Math.min(usage.prompt_cache_hit_tokens / total, 1);
    cache_hit_rate = Math.round(cache_hit_rate * 1000) / 1000;
  }

  return {
    cost_jpy: Math.round(cost_jpy * 10000) / 10000,
    cache_hit_rate,
    total_tokens: total,
  };
}
