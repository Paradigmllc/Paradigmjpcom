/**
 * lib/sales/demo-deepseek-enhancer.ts — DeepSeek-Powered AI Demo Enhancer
 *
 * Calls the DeepSeek API (OpenAI-compatible chat completions) to generate
 * personalized copy for all 4 demo pages (Home, About, Services, Contact).
 * Falls back gracefully on any error — the caller uses rules-based generation.
 *
 * Key rules (per AGENTS.md):
 * - No catch{} swallowing — every error is logged with console.error
 * - Graceful fallback: never crash, always return usable data or null
 * - Timeout 60s, 1 retry
 * - API key check: skip AI if DEEPSEEK_API_KEY is not set
 *
 * v1 (2026-06-23): Initial — replaces Dify with direct DeepSeek calls.
 */

import type { DiagnosticReportData } from "./diagnostic";
import type { DemoTemplate } from "./demo-templates/registry";
import type { ReportLocale } from "./types";
import type { DeepSeekEnhancedOutput } from "./demo-deepseek-types";
import { cacheHitRatio, callDeepSeek } from "@/lib/deepseek";
import { parseDeepSeekOutput } from "./demo-deepseek-client";
import {
  buildEnglishSystemPrompt,
  buildEnglishUserPrompt,
  buildJapaneseSystemPrompt,
  buildJapaneseUserPrompt,
} from "./demo-deepseek-prompts";

/**
 * DeepSeek V4 Pro includes reasoning tokens in max_tokens. A complete Japanese
 * four-page payload regularly exceeds the former 4,096-token / 60-second
 * budget, which left otherwise valid generations as truncated JSON.
 */
export const DEMO_COPY_MAX_TOKENS = 12_288;
export const DEMO_COPY_TIMEOUT_MS = 180_000;

type ParsedDeepSeekOutput = NonNullable<ReturnType<typeof parseDeepSeekOutput>>

export interface DemoCopyCompletenessReport {
  passed: boolean
  reasons: string[]
  counts: {
    homeFeatures: number
    homeNarratives: number
    aboutValues: number
    aboutChapters: number
    services: number
    processSteps: number
    serviceGuidance: number
    worksSections: number
    artDirections: number
  }
  bodyLengths: {
    homeNarratives: number[]
    aboutChapters: number[]
    serviceGuidance: number[]
    worksSections: number[]
  }
}

export function inspectDemoCopyCompleteness(
  parsed: ParsedDeepSeekOutput,
  expectedTemplateIds: readonly string[],
  locale: ReportLocale,
): DemoCopyCompletenessReport {
  const narrativeMinimum = locale === "ja" ? 120 : 450
  const worksMinimum = locale === "ja" ? 120 : 320
  const bodyLengths = {
    homeNarratives: parsed.home?.narrative_modules.map((item) => item.body.trim().length) ?? [],
    aboutChapters: parsed.about?.chapters.map((item) => item.body.trim().length) ?? [],
    serviceGuidance: parsed.services?.guidance.map((item) => item.body.trim().length) ?? [],
    worksSections: parsed.works?.sections.map((item) => item.body.trim().length) ?? [],
  }
  const counts = {
    homeFeatures: parsed.home?.features.length ?? 0,
    homeNarratives: bodyLengths.homeNarratives.length,
    aboutValues: parsed.about?.values.length ?? 0,
    aboutChapters: bodyLengths.aboutChapters.length,
    services: parsed.services?.services.length ?? 0,
    processSteps: parsed.services?.process.length ?? 0,
    serviceGuidance: bodyLengths.serviceGuidance.length,
    worksSections: bodyLengths.worksSections.length,
    artDirections: parsed.artDirections.length,
  }
  const expectedIds = new Set(expectedTemplateIds)
  const actualIds = parsed.artDirections.map((direction) => direction.template_id)
  const reasons = [
    ...(!parsed.home?.hero_title?.trim() ? ["home_hero_missing"] : []),
    ...(counts.homeFeatures < 3 ? ["home_features_incomplete"] : []),
    ...(!parsed.about?.story?.trim() ? ["about_story_missing"] : []),
    ...(!parsed.about?.mission?.trim() ? ["about_mission_missing"] : []),
    ...(counts.aboutValues < 4 ? ["about_values_incomplete"] : []),
    ...(counts.services < 3 ? ["services_incomplete"] : []),
    ...(counts.processSteps < 4 ? ["process_incomplete"] : []),
    ...(counts.homeNarratives < 3 ? ["home_narratives_incomplete"] : []),
    ...(bodyLengths.homeNarratives.some((length) => length < narrativeMinimum) ? ["home_narratives_short"] : []),
    ...(counts.aboutChapters < 3 ? ["about_chapters_incomplete"] : []),
    ...(bodyLengths.aboutChapters.some((length) => length < narrativeMinimum) ? ["about_chapters_short"] : []),
    ...(counts.serviceGuidance < 3 ? ["service_guidance_incomplete"] : []),
    ...(bodyLengths.serviceGuidance.some((length) => length < narrativeMinimum) ? ["service_guidance_short"] : []),
    ...(counts.worksSections < 4 ? ["works_sections_incomplete"] : []),
    ...(bodyLengths.worksSections.some((length) => length < worksMinimum) ? ["works_sections_short"] : []),
    ...(actualIds.length !== expectedIds.size ? ["art_direction_count_mismatch"] : []),
    ...(new Set(actualIds).size !== expectedIds.size ? ["art_direction_duplicate"] : []),
    ...(actualIds.some((id) => !expectedIds.has(id)) ? ["art_direction_template_mismatch"] : []),
  ]
  return { passed: reasons.length === 0, reasons, counts, bodyLengths }
}

export type {
  DeepSeekAboutEnhancement,
  DeepSeekContactEnhancement,
  DeepSeekEnhancedOutput,
  DeepSeekFAQ,
  DeepSeekFeature,
  DeepSeekHomeEnhancement,
  DeepSeekNarrativeModule,
  DeepSeekProcessStep,
  DeepSeekServiceItem,
  DeepSeekServicesEnhancement,
  DeepSeekTestimonial,
  DeepSeekValue,
  DeepSeekWorksEnhancement,
} from "./demo-deepseek-types";

/* ───── Core function ───── */

/**
 * Enhance demo content using DeepSeek AI.
 *
 * @returns Structured enhancement data, or null if AI is unavailable or fails.
 */
export async function enhanceDemoWithDeepSeek(
  company: {
    id: string;
    company_name: string;
    domain: string;
    slug?: string | null;
    industry: string | null;
    prefecture?: string | null;
    report_locale?: string | null;
    tech_stack?: Record<string, unknown> | null;
    pain_diagnosis?: Record<string, unknown> | null;
    meta?: Record<string, unknown> | null;
  },
  report: DiagnosticReportData,
  templates: readonly DemoTemplate[],
  locale: ReportLocale,
): Promise<DeepSeekEnhancedOutput | null> {
  const messages = buildPrompt(company, report, templates, locale);
  const model = process.env.DEMO_LLM_MODEL?.trim()
    || (process.env.LITELLM_API_KEY?.trim() ? "deepseek-v4-pro" : process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat");
  const result = await callDeepSeek(messages, {
    model,
    modelPolicy: "strict",
    temperature: 0.4,
    maxTokens: DEMO_COPY_MAX_TOKENS,
    responseFormat: "json_object",
    thinking: "disabled",
    timeoutMs: DEMO_COPY_TIMEOUT_MS,
  });
  if (!result.ok || !result.text) {
    console.error("[deepseek-enhancer] strict DeepSeek V4 Pro generation failed:", result.error ?? "empty response");
    return null;
  }

  const parsed = parseDeepSeekOutput(result.text, locale);
  if (!parsed) return null;
  const completeness = inspectDemoCopyCompleteness(parsed, templates.map((template) => template.id), locale)
  if (!completeness.passed) {
    console.error("[deepseek-enhancer] output failed full-site copy completeness checks:", JSON.stringify(completeness));
    return null;
  }

  return {
    engine: "deepseek",
    generatedAt: new Date().toISOString(),
    model: result.usedModel ?? model,
    usage: result.usage ? {
      promptTokens: result.usage.prompt_tokens,
      completionTokens: result.usage.completion_tokens,
      cacheHitTokens: result.usage.cache_hit_tokens ?? 0,
      cacheMissTokens: result.usage.cache_miss_tokens ?? 0,
      cacheHitRatio: cacheHitRatio(result.usage),
    } : undefined,
    home: parsed.home ?? {},
    about: parsed.about ?? {},
    services: parsed.services ?? {},
    works: parsed.works ?? {},
    contact: parsed.contact ?? {},
    artDirections: parsed.artDirections,
  };
}

/* ───── Prompt builder ───── */

function buildPrompt(
  company: {
    id: string;
    company_name: string;
    domain: string;
    slug?: string | null;
    industry: string | null;
    prefecture?: string | null;
    report_locale?: string | null;
    tech_stack?: Record<string, unknown> | null;
    pain_diagnosis?: Record<string, unknown> | null;
    meta?: Record<string, unknown> | null;
  },
  report: DiagnosticReportData,
  templates: readonly DemoTemplate[],
  locale: ReportLocale,
): Array<{ role: "system" | "user"; content: string }> {
  const isJa = locale === "ja";
  const name = company.company_name || "Company";
  const industry = company.industry ?? report.industry ?? "consulting";
  const prefecture = company.prefecture ?? "";
  const domain = company.domain || "";
  const verifiedFacts = extractVerifiedPublicFacts(company.meta);

  // Summarize tech stack
  let techSummary = "unknown";
  if (company.tech_stack && Object.keys(company.tech_stack).length > 0) {
    const keys = Object.keys(company.tech_stack).slice(0, 5);
    techSummary = keys.join(", ");
  }

  // Report summary
  const hook = report.hook ?? "";
  const acts = (report.acts ?? []).slice(0, 3);
  const totalLoss = "not publicly verified";
  const actSummaries = acts
    .map((a) => `- ${a.headline ?? ""}`)
    .join("\n");

  // Template summary
  const primaryTemplate = templates[0];
  if (!primaryTemplate) throw new Error("At least one demo template candidate is required");
  const homeSections = primaryTemplate.layout.home.sections.join(", ");
  const heroVariant = primaryTemplate.layout.home.heroVariant;
  const featureLayout = primaryTemplate.layout.home.featureLayout;
  const cardStyle = primaryTemplate.layout.services.cardStyle;
  const nav = primaryTemplate.nav;
  const tokens = primaryTemplate.designTokens;
  const candidateTemplates = templates.map((template, index) => [
    `${index + 1}. template_id=${template.id}`,
    `hero=${template.layout.home.heroVariant}`,
    `features=${template.layout.home.featureLayout}`,
    `cards=${template.layout.services.cardStyle}`,
    `nav=${template.nav}`,
  ].join(", ")).join("\n");

  const systemPrompt = isJa
    ? buildJapaneseSystemPrompt()
    : buildEnglishSystemPrompt();

  const userPrompt = isJa
    ? buildJapaneseUserPrompt(
        name,
        industry,
        prefecture,
        domain,
        techSummary,
        hook,
        totalLoss,
        actSummaries,
        locale,
        homeSections,
        heroVariant,
        featureLayout,
        cardStyle,
        nav,
        tokens,
        verifiedFacts,
        candidateTemplates,
        templates.length,
      )
    : buildEnglishUserPrompt(
        name,
        industry,
        prefecture,
        domain,
        techSummary,
        hook,
        totalLoss,
        actSummaries,
        locale,
        homeSections,
        heroVariant,
        featureLayout,
        cardStyle,
        nav,
        tokens,
        verifiedFacts,
        candidateTemplates,
        templates.length,
      );

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}

export function extractVerifiedPublicFacts(meta?: Record<string, unknown> | null): string {
  const facts = meta?.public_facts
  const factRecord = facts && typeof facts === "object" && !Array.isArray(facts)
    ? facts as Record<string, unknown>
    : {}
  const entries = Object.entries(factRecord)
    .filter(([, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    .slice(0, 20)
    .map(([key, value]) => `- ${key}: ${String(value).slice(0, 300)}`)
  const mediaEntries = Array.isArray(meta?.demo_media)
    ? meta.demo_media.slice(0, 8).flatMap((entry, index) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return []
        const item = entry as Record<string, unknown>
        if (!["owned", "licensed", "proposal_only"].includes(String(item.usage ?? ""))) return []
        const alt = typeof item.alt === "string" ? item.alt.trim() : ""
        const caption = typeof item.caption === "string" ? item.caption.trim() : ""
        const description = [alt, caption].filter(Boolean).join(" / ")
        return description ? [`- reviewed_image_${index + 1}: ${description.slice(0, 300)}`] : []
      })
    : []
  const allEntries = [...entries, ...mediaEntries]
  return allEntries.length > 0 ? allEntries.join("\n") : "（確認済み公開情報なし）"
}
