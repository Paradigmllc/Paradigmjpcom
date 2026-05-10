/**
 * Persona injection helper (B36-P7B).
 *
 * 役割: paradigm_personas テーブルから system_prompt 用 injection payload を取得し、
 * Dify call の system_prompt 冒頭に prepend する.
 *
 * 5 layer 設計:
 *   Brain (Dify) ←──prepend──── Persona (Supabase row + 本 helper)
 *
 * cache 戦略:
 *   - persona_slug 単位の in-memory LRU (TTL 60s) で複数 lead 連続処理時の DB hit 削減
 *   - DeepSeek context cache 観点では payload 文字列が安定 → 高 cache hit 維持
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ローカル LRU (60s TTL).
const cache = new Map<string, { payload: string; expires: number }>();
const TTL_MS = 60_000;

interface PersonaRow {
  slug: string;
  name: string;
  locale: string;
  system_prompt: string;
  tone: string;
  vocab_allowed: string[];
  vocab_banned: string[];
  style_examples: Array<{ paragraph: string; why_good: string }>;
  version: number;
}

/**
 * paradigm-advisor-{locale} 命名規約で persona slug を導出.
 * 未登録 locale は paradigm-advisor-ja に fallback (ja は seed 必須).
 */
export function deriveAdvisorSlug(locale: string): string {
  const candidates = ["ja", "en", "ko", "zh", "de", "fr", "es", "pt", "ru", "ar", "vi", "id"];
  const safe = candidates.includes(locale) ? locale : "ja";
  return `paradigm-advisor-${safe}`;
}

/**
 * persona row を取得 → injection payload (system prompt 冒頭 prepend 用) を返却.
 * 失敗時は null (caller は base system_prompt のみで進行・persona injection を skip).
 */
export async function getPersonaInjection(
  sb: SupabaseClient,
  slug: string,
): Promise<string | null> {
  const hit = cache.get(slug);
  if (hit && hit.expires > Date.now()) return hit.payload;

  const { data, error } = await sb
    .from("paradigm_personas")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) {
    console.warn(`[persona-injection] miss for slug=${slug}: ${error?.message ?? "no row"}`);
    return null;
  }
  const payload = buildInjectionPayload(data as PersonaRow);
  cache.set(slug, { payload, expires: Date.now() + TTL_MS });
  return payload;
}

function buildInjectionPayload(row: PersonaRow): string {
  const banned = row.vocab_banned.length
    ? row.vocab_banned.map((v) => `「${v}」`).join("・")
    : "(なし)";
  const allowed = row.vocab_allowed.length
    ? row.vocab_allowed.slice(0, 12).map((v) => `「${v}」`).join("・")
    : "(なし)";
  return [
    `# Persona: ${row.name} (locale=${row.locale}, version=${row.version})`,
    "",
    row.system_prompt,
    "",
    `## トーン: ${row.tone}`,
    "",
    `## 🚨 禁止語彙 (使用厳禁・違反時は server-side で reject):`,
    banned,
    "",
    `## ✅ 推奨語彙 (積極的に使う):`,
    allowed,
    "",
    `## スタイル例 (参考):`,
    ...row.style_examples.slice(0, 2).map((ex, i) => `(例 ${i + 1}) ${ex.paragraph}`),
    "",
    "─────────────────────────────────────",
    "",
  ].join("\n");
}

/**
 * helper: base system_prompt の冒頭に persona injection を prepend.
 * persona 取得失敗時は base のみそのまま返却.
 */
export async function withPersonaPrefix(
  sb: SupabaseClient,
  locale: string,
  baseSystemPrompt: string,
): Promise<string> {
  const slug = deriveAdvisorSlug(locale);
  const injection = await getPersonaInjection(sb, slug);
  return injection ? `${injection}\n${baseSystemPrompt}` : baseSystemPrompt;
}
