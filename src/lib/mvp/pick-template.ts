/**
 * STRICT_LANGUAGE_GUARD 3 層防御 (B33 #17 永久ルール).
 *   Layer 1: DB SELECT で language eq filter
 *   Layer 2: post-fetch で再度 language === expected を assertion
 *   Layer 3: caller (Dify pickup 後) で final assertion
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const VALID_LANGUAGES = [
  "ja", "en", "ko", "zh", "es", "pt", "ru", "ar", "vi", "id", "de", "fr",
] as const;
const VALID_REGIONS = [
  "ja", "ko", "zh", "en", "europe", "es", "pt", "ru", "ar", "sea", "africa", "others",
] as const;

export type Language = (typeof VALID_LANGUAGES)[number];
export type SalesRegion = (typeof VALID_REGIONS)[number];

export interface PickTemplateInput {
  region: SalesRegion;
  language: Language;
  industrySlug?: string;
  variant?: string;
}

export interface FormMessageTemplate {
  id: string;
  region: SalesRegion;
  language: Language;
  industry_slug: string;
  variant: string;
  applicability: "jp_only" | "overseas_only" | "global";
  subject_template: string | null;
  body_template: string;
  cta_phrase: string | null;
}

export async function pickFormMessageTemplate(
  sb: SupabaseClient,
  input: PickTemplateInput
): Promise<FormMessageTemplate | null> {
  const { region, language } = input;
  const industry = input.industrySlug ?? "default";
  const variant = input.variant ?? "a";

  // ── Layer 1: DB SELECT で language eq filter (STRICT) ──
  const phases: Array<Partial<{ industry: string; variant: string }>> = [
    { industry, variant },
    { industry: "default", variant },
    { industry, variant: "a" },
    { industry: "default", variant: "a" },
  ];

  for (const phase of phases) {
    const q = sb
      .from("form_message_templates")
      .select("*")
      .eq("region", region)
      .eq("language", language)
      .eq("is_active", true);
    if (phase.industry) q.eq("industry_slug", phase.industry);
    if (phase.variant) q.eq("variant", phase.variant);
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
