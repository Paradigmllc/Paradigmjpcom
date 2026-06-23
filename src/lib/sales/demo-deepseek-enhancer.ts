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
import { callDeepSeek, parseDeepSeekOutput } from "./demo-deepseek-client";
import {
  buildEnglishSystemPrompt,
  buildEnglishUserPrompt,
  buildJapaneseSystemPrompt,
  buildJapaneseUserPrompt,
} from "./demo-deepseek-prompts";

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
  const apiKey = readApiKey();
  if (!apiKey) {
    console.warn(
      "[deepseek-enhancer] DEEPSEEK_API_KEY not set — skipping AI enhancement",
    );
    return null;
  }

  const messages = buildPrompt(company, report, template, locale);

  const result = await callDeepSeek(apiKey, messages, 0);
  if (!result) return null;

  const parsed = parseDeepSeekOutput(result, locale);
  if (!parsed) return null;

  return {
    engine: "deepseek",
    generatedAt: new Date().toISOString(),
    home: parsed.home ?? {},
    about: parsed.about ?? {},
    services: parsed.services ?? {},
    contact: parsed.contact ?? {},
  };
}

/* ───── API key ───── */

function readApiKey(): string | null {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key || key.trim().length === 0) return null;
  return key.trim();
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

  // Summarize tech stack
  let techSummary = "unknown";
  if (company.tech_stack && Object.keys(company.tech_stack).length > 0) {
    const keys = Object.keys(company.tech_stack).slice(0, 5);
    techSummary = keys.join(", ");
  }

  // Report summary
  const hook = report.hook ?? "";
  const acts = (report.acts ?? []).slice(0, 3);
  const totalLoss = report.total_loss ?? "";
  const actSummaries = acts
    .map(
      (a) =>
        `- ${a.headline ?? ""}: ${a.body ?? ""} [${a.metric_label ?? ""}: ${a.metric_value ?? ""}]`,
    )
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
      );

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}
