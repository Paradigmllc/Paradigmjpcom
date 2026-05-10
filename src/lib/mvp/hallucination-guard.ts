/**
 * Hallucination guard for Dify karteToReport blocks (B36-P4).
 *
 * 80% Real Data 規律 (s10-5 #5) 準拠:
 *   LLM が unified_profile に存在しない数値・文字列を捏造することを **server-side で物理的に防ぐ**.
 *
 * 戦略: blocks JSON を walk し、数値型 prop が unified_profile から派生可能な
 * 既知 field 名 (employees / pagespeed_score / seo_visibility_score 等) と
 * マッチしない場合は null に置換 OR field ごと削除.
 *
 * Whitelist 設計: unified_profile から取得可能な「LLM が引用してよい数値 field」を
 * KNOWN_NUMERIC_SOURCES に明示. それ以外の数値 prop は LLM 捏造とみなし null 化.
 */

const ALLOWED_NUMERIC_KEYS = new Set([
  "employees",                  // company_profile.employees.value
  "pagespeed_score",            // web_performance.pagespeed_score
  "mobile_friendly_score",      // web_performance.mobile_friendly
  "seo_visibility_score",       // seo.visibility_score
  "domain_authority",           // seo.domain_authority
  "monthly_visits",             // web_performance.monthly_visits
  "load_time_seconds",          // web_performance.load_time
  "ssl_grade_numeric",          // security.ssl_grade
  "google_rating",              // google.rating
  "review_count",               // google.reviews_count
]);

interface BlockShape {
  type?: string;
  props?: Record<string, unknown>;
  [k: string]: unknown;
}

export interface SanitizeResult {
  blocks: unknown[];
  stripped_keys: string[]; // どの key を null 化したか (audit log 用)
  total_blocks: number;
}

/**
 * unified_profile から「実在する数値値」の Set を構築.
 * 浅い + meta 直下も対象.
 */
function collectKnownNumericFields(profile: Record<string, unknown>, prefix = ""): Map<string, number> {
  const result = new Map<string, number>();
  if (!profile || typeof profile !== "object") return result;
  for (const [k, v] of Object.entries(profile)) {
    if (v == null) continue;
    if (typeof v === "number" && Number.isFinite(v)) {
      result.set(k.toLowerCase(), v);
    } else if (typeof v === "string") {
      const n = parseFloat(v);
      if (Number.isFinite(n) && /^\d/.test(v.trim())) result.set(k.toLowerCase(), n);
    } else if (typeof v === "object" && !Array.isArray(v)) {
      const nested = collectKnownNumericFields(v as Record<string, unknown>, k + ".");
      // merge nested
      for (const [nk, nv] of nested) result.set(nk, nv);
      // Also handle { value: N } pattern from Appexxme collectors (FieldWithSources)
      if ("value" in v) {
        const inner = (v as { value?: unknown }).value;
        if (typeof inner === "number" && Number.isFinite(inner)) result.set(k.toLowerCase(), inner);
        else if (typeof inner === "string") {
          const n = parseFloat(inner);
          if (Number.isFinite(n)) result.set(k.toLowerCase(), n);
        }
      }
    }
  }
  return result;
}

export function sanitizeBlocks(
  rawBlocks: unknown,
  unifiedProfile: Record<string, unknown> | null | undefined
): SanitizeResult {
  const stripped: string[] = [];
  if (!Array.isArray(rawBlocks)) return { blocks: [], stripped_keys: stripped, total_blocks: 0 };

  const known = collectKnownNumericFields((unifiedProfile ?? {}) as Record<string, unknown>);

  const cleaned = (rawBlocks as BlockShape[]).map((block) => {
    if (!block || typeof block !== "object") return block;
    const props = block.props && typeof block.props === "object" ? { ...(block.props as Record<string, unknown>) } : {};
    for (const [key, val] of Object.entries(props)) {
      if (typeof val === "number" && Number.isFinite(val) && !ALLOWED_NUMERIC_KEYS.has(key.toLowerCase())) {
        // unknown numeric field — likely hallucinated
        props[key] = null;
        stripped.push(`${block.type ?? "?"}.props.${key}=${val}`);
        continue;
      }
      if (typeof val === "number" && ALLOWED_NUMERIC_KEYS.has(key.toLowerCase())) {
        // allowed key — but verify value matches unified_profile if known
        const expected = known.get(key.toLowerCase());
        if (expected != null && Math.abs(expected - val) > 0.01) {
          // Mismatched — strip (LLM corrupted it)
          props[key] = expected;
          stripped.push(`${block.type ?? "?"}.props.${key}: ${val}→${expected} (corrected)`);
        }
      }
      // Recursively sanitize nested arrays of blocks (e.g. karte_pain_list.pains[])
      if (Array.isArray(val)) {
        props[key] = val.map((item) => {
          if (item && typeof item === "object") {
            const sub = { ...(item as Record<string, unknown>) };
            for (const [sk, sv] of Object.entries(sub)) {
              if (typeof sv === "number" && Number.isFinite(sv) && !ALLOWED_NUMERIC_KEYS.has(sk.toLowerCase())) {
                sub[sk] = null;
                stripped.push(`${block.type ?? "?"}.${key}[].${sk}=${sv}`);
              }
            }
            return sub;
          }
          return item;
        });
      }
    }
    return { ...block, props };
  });

  return { blocks: cleaned, stripped_keys: stripped, total_blocks: cleaned.length };
}
