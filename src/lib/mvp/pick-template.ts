/**
 * STRICT_LANGUAGE_GUARD 3 層防御 (B33 #17 永久ルール).
 *   Layer 1: DB SELECT で language eq filter
 *   Layer 2: post-fetch で再度 language === expected を assertion
 *   Layer 3: caller (Dify pickup 後) で final assertion
 *
 * B36-P7B (2026-05-10): pitch_angle 5 軸対応 + 8-phase fallback.
 *   most-specific (industry × pitch_angle × variant) →
 *   variant 緩和 → angle 緩和 → industry 緩和 → ultimate (default × null × a)
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const VALID_LANGUAGES = [
  "ja", "en", "ko", "zh", "es", "pt", "ru", "ar", "vi", "id", "de", "fr",
] as const;
const VALID_REGIONS = [
  "ja", "ko", "zh", "en", "europe", "es", "pt", "ru", "ar", "sea", "africa", "others",
] as const;
const VALID_PITCH_ANGLES = [
  "risk", "opportunity", "competitor", "authority", "social_proof",
] as const;

export type Language = (typeof VALID_LANGUAGES)[number];
export type SalesRegion = (typeof VALID_REGIONS)[number];
export type PitchAngle = (typeof VALID_PITCH_ANGLES)[number];

export interface PickTemplateInput {
  region: SalesRegion;
  language: Language;
  industrySlug?: string;
  pitchAngle?: PitchAngle;
  variant?: string;
}

export interface FormMessageTemplate {
  id: string;
  region: SalesRegion;
  language: Language;
  industry_slug: string;
  pitch_angle: PitchAngle | null;
  variant: string;
  applicability: "jp_only" | "overseas_only" | "global";
  subject_template: string | null;
  body_template: string;
  cta_phrase: string | null;
}

/**
 * 8-phase fallback (B36-P7B).
 * most-specific (industry × pitch_angle × variant) → ultimate (default × null × 'a').
 * pitch_angle が `null` の phase は DB の `pitch_angle IS NULL` 行に hit する
 * (Phase 6 LP/CRO rewrite で投入した default+a 行は pitch_angle=NULL のまま残置).
 */
function buildPhases(
  industry: string,
  pitchAngle: PitchAngle | undefined,
  variant: string,
): Array<{ industry: string; pitch_angle: PitchAngle | null; variant: string }> {
  const phases: Array<{ industry: string; pitch_angle: PitchAngle | null; variant: string }> = [];
  // industry × angle × variant
  if (pitchAngle) phases.push({ industry, pitch_angle: pitchAngle, variant });
  // variant fallback ('a')
  if (pitchAngle && variant !== "a") phases.push({ industry, pitch_angle: pitchAngle, variant: "a" });
  // angle fallback (NULL — 旧 default+a 行が hit)
  phases.push({ industry, pitch_angle: null, variant });
  if (variant !== "a") phases.push({ industry, pitch_angle: null, variant: "a" });
  // industry fallback ('default')
  if (industry !== "default") {
    if (pitchAngle) phases.push({ industry: "default", pitch_angle: pitchAngle, variant });
    if (pitchAngle && variant !== "a") phases.push({ industry: "default", pitch_angle: pitchAngle, variant: "a" });
    phases.push({ industry: "default", pitch_angle: null, variant });
    if (variant !== "a") phases.push({ industry: "default", pitch_angle: null, variant: "a" });
  }
  return phases;
}

export async function pickFormMessageTemplate(
  sb: SupabaseClient,
  input: PickTemplateInput
): Promise<FormMessageTemplate | null> {
  const { region, language, pitchAngle } = input;
  const industry = input.industrySlug ?? "default";
  const variant = input.variant ?? "a";

  // ── Layer 1: DB SELECT で language eq filter (STRICT) ──
  const phases = buildPhases(industry, pitchAngle, variant);

  for (const phase of phases) {
    const q = sb
      .from("form_message_templates")
      .select("*")
      .eq("region", region)
      .eq("language", language)
      .eq("is_active", true)
      .eq("industry_slug", phase.industry)
      .eq("variant", phase.variant);
    // pitch_angle: NULL or specific value (Supabase JS では .is(col, null) を使う)
    if (phase.pitch_angle === null) {
      q.is("pitch_angle", null);
    } else {
      q.eq("pitch_angle", phase.pitch_angle);
    }
    const { data, error } = await q.limit(1).maybeSingle();
    if (error) {
      if ((error as { code?: string }).code !== "PGRST116") {
        throw new Error(`[pick-template] DB error: ${error.message}`);
      }
      continue;
    }
    if (!data) continue;

    // ── Layer 2: post-fetch assertion ──
    if (data.language !== language) {
      throw new Error(
        `[STRICT_LANGUAGE_GUARD] post-fetch mismatch: expected=${language} got=${data.language}`
      );
    }
    if (data.region !== region) {
      throw new Error(
        `[STRICT_LANGUAGE_GUARD] region mismatch: expected=${region} got=${data.region}`
      );
    }

    // ── B30 #13: applicability 排他 check ──
    if (data.applicability === "jp_only" && region !== "ja") {
      console.warn(`[applicability] jp_only template leaked to region=${region}`);
      continue;
    }
    if (data.applicability === "overseas_only" && region === "ja") {
      console.warn(`[applicability] overseas_only template leaked to region=ja`);
      continue;
    }

    return data as FormMessageTemplate;
  }

  return null;
}

export function isValidLanguage(x: unknown): x is Language {
  return typeof x === "string" && (VALID_LANGUAGES as readonly string[]).includes(x);
}
export function isValidRegion(x: unknown): x is SalesRegion {
  return typeof x === "string" && (VALID_REGIONS as readonly string[]).includes(x);
}
export function isValidPitchAngle(x: unknown): x is PitchAngle {
  return typeof x === "string" && (VALID_PITCH_ANGLES as readonly string[]).includes(x);
}

export function regionToPrimaryLanguage(region: SalesRegion): Language {
  switch (region) {
    case "ja": return "ja";
    case "ko": return "ko";
    case "zh": return "zh";
    case "en": return "en";
    case "europe": return "de";
    case "es": return "es";
    case "pt": return "pt";
    case "ru": return "ru";
    case "ar": return "ar";
    case "sea": return "vi";
    case "africa": return "en";
    case "others": return "en";
  }
}
