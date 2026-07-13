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
export const DEMO_COPY_MAX_TOKENS = 8_192;
export const DEMO_COPY_TIMEOUT_MS = 180_000;

export type {
  DeepSeekAboutEnhancement,
  DeepSeekContactEnhancement,
  DeepSeekEnhancedOutput,
  DeepSeekFAQ,
  DeepSeekFeature,
  DeepSeekHomeEnhancement,
  DeepSeekProcessStep,
  DeepSeekServiceItem,
  DeepSeekServicesEnhancement,
  DeepSeekTestimonial,
  DeepSeekValue,
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
  template: DemoTemplate,
  locale: ReportLocale,
): Promise<DeepSeekEnhancedOutput | null> {
  const messages = buildPrompt(company, report, template, locale);
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
  if (
    !parsed.home?.hero_title?.trim()
    || (parsed.home.features?.length ?? 0) < 3
    || !parsed.about?.story?.trim()
    || !parsed.about?.mission?.trim()
    || (parsed.services?.services?.length ?? 0) < 2
  ) {
    console.error("[deepseek-enhancer] output failed full-site copy completeness checks");
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
    contact: parsed.contact ?? {},
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
  template: DemoTemplate,
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
  const homeSections = template.layout.home.sections.join(", ");
  const heroVariant = template.layout.home.heroVariant;
  const featureLayout = template.layout.home.featureLayout;
  const cardStyle = template.layout.services.cardStyle;
  const nav = template.nav;
  const tokens = template.designTokens;

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
      );

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}

export function extractVerifiedPublicFacts(meta?: Record<string, unknown> | null): string {
  const facts = meta?.public_facts
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) return "（確認済み公開情報なし）"
  const entries = Object.entries(facts as Record<string, unknown>)
    .filter(([, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    .slice(0, 20)
    .map(([key, value]) => `- ${key}: ${String(value).slice(0, 300)}`)
  return entries.length > 0 ? entries.join("\n") : "（確認済み公開情報なし）"
}
