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

/* ───── Output types ───── */

export interface DeepSeekFeature {
  title: string;
  description: string;
  icon: string;
  metric_label: string;
  metric_value: string;
}

export interface DeepSeekTestimonial {
  quote: string;
  author: string;
}

export interface DeepSeekFAQ {
  q: string;
  a: string;
}

export interface DeepSeekValue {
  title: string;
  description: string;
  icon: string;
}

export interface DeepSeekServiceItem {
  title: string;
  description: string;
  icon: string;
  features: string[];
}

export interface DeepSeekProcessStep {
  step: number;
  title: string;
  description: string;
}

export interface DeepSeekHomeEnhancement {
  hero_title: string;
  hero_subtitle: string;
  features: DeepSeekFeature[];
  testimonials: DeepSeekTestimonial[];
  faq: DeepSeekFAQ[];
}

export interface DeepSeekAboutEnhancement {
  story: string;
  mission: string;
  values: DeepSeekValue[];
}

export interface DeepSeekServicesEnhancement {
  intro: string;
  services: DeepSeekServiceItem[];
  process: DeepSeekProcessStep[];
}

export interface DeepSeekContactEnhancement {
  intro: string;
  booking_cta: string;
  form_note: string;
}

/**
 * Structured output from DeepSeek enhancement.
 * All fields are optional — the merger applies AI content only where available.
 */
export interface DeepSeekEnhancedOutput {
  engine: "deepseek";
  generatedAt: string;
  home: Partial<DeepSeekHomeEnhancement>;
  about: Partial<DeepSeekAboutEnhancement>;
  services: Partial<DeepSeekServicesEnhancement>;
  contact: Partial<DeepSeekContactEnhancement>;
}

/* ───── API configuration ───── */

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
const DEEPSEEK_MODEL = "deepseek-chat";
const DEEPSEEK_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 1;

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

function buildJapaneseSystemPrompt(): string {
  return `あなたはプロフェッショナルなビジネスコピーライターです。日本のビジネス文化に精通し、自然な「です・ます調」で説得力のある文章を作成します。

以下のルールを必ず守ってください：
1. 日本語出力は必ず「です・ます調」で書くこと（「〜だ」「〜である」調は使用禁止）
2. 不自然なAI翻訳調（機械翻訳のような表現）は避け、日本人のビジネスパーソンが実際に使う自然な表現にすること
3. 業界や企業規模に合わせた適切な専門用語を使用すること
4. 誇張表現や空虚なキャッチコピー（「革命的な」「世界初」「唯一無二」など）は避け、具体的で信頼感のある表現にすること
5. 出力は必ず有効なJSON形式のみ。JSONの前後に説明文や注釈を付けないこと`;
}

function buildEnglishSystemPrompt(): string {
  return `You are a professional business copywriter. Write compelling, natural-sounding business copy that sounds like it was written by a native English-speaking professional.

Follow these rules strictly:
1. Output must be professional business English — natural, polished, and free of AI clichés
2. Avoid buzzwords like "revolutionary", "game-changing", "unparalleled", "world-class" unless truly justified
3. Be specific and concrete rather than vague and grandiose
4. Match the tone to the industry (formal for legal/accounting, approachable for retail/restaurant, innovative for tech)
5. Output ONLY valid JSON. No explanations before or after the JSON.`;
}

function buildJapaneseUserPrompt(
  name: string,
  industry: string,
  prefecture: string,
  domain: string,
  techSummary: string,
  hook: string,
  totalLoss: string,
  actSummaries: string,
  locale: string,
  homeSections: string,
  heroVariant: string,
  featureLayout: string,
  cardStyle: string,
  nav: string,
  tokens: DemoTemplate["designTokens"],
): string {
  return `以下の企業情報をもとに、4ページ構成のビジネスWebサイト（Home、About、Services、Contact）のパーソナライズされたコピーを生成してください。

【企業情報】
- 企業名: ${name}
- 業種: ${industry}
- 所在地: ${prefecture || "記載なし"}
- ドメイン: ${domain}
- 技術スタック: ${techSummary}
- 出力言語: ${locale === "ja" ? "日本語（です・ます調）" : locale}
- レイアウトスタイル: ヒーロー=${heroVariant}, 特徴=${featureLayout}, カード=${cardStyle}, ナビ=${nav}

【診断レポート】
- 診断フック: ${hook}
- 推定損失: ${totalLoss}
- 改善ポイント:
${actSummaries || "（特になし）"}

【出力形式】
以下のJSON形式で出力してください。日本語はすべて「です・ます調」で記述してください。

{
  "home": {
    "hero_title": "診断フックに基づいた説得力のある見出し（40文字以内）",
    "hero_subtitle": "1〜2文の価値提案（80文字以内）",
    "features": [
      {
        "title": "改善ポイントのタイトル",
        "description": "具体的な説明（60文字以内）",
        "icon": "sparkles | shield | route | star | bolt | globe | lock | target | cpu | search | chart | users | lightbulb | zap | heart | smile",
        "metric_label": "指標ラベル",
        "metric_value": "指標値"
      }
    ],
    "testimonials": [
      {
        "quote": "実際のビジネスパーソンが言いそうな自然な推薦文",
        "author": "役職, 企業名"
      }
    ],
    "faq": [
      {
        "q": "よくある質問",
        "a": "自然な回答（100文字程度）"
      }
    ]
  },
  "about": {
    "story": "企業のストーリー（2〜3段落、です・ます調）",
    "mission": "ミッションステートメント（1文）",
    "values": [
      {
        "title": "価値観",
        "description": "説明",
        "icon": "star | lightbulb | users | globe | heart | shield | zap"
      }
    ]
  },
  "services": {
    "intro": "サービス紹介のリード文（2文程度）",
    "services": [
      {
        "title": "サービス名",
        "description": "説明",
        "icon": "globe | search | cpu | chart | shield | bolt | sparkles",
        "features": ["特徴1", "特徴2", "特徴3"]
      }
    ],
    "process": [
      {"step": 1, "title": "ステップ名", "description": "説明"},
      {"step": 2, "title": "ステップ名", "description": "説明"},
      {"step": 3, "title": "ステップ名", "description": "説明"},
      {"step": 4, "title": "ステップ名", "description": "説明"}
    ]
  },
  "contact": {
    "intro": "問い合わせ導入文（2文程度）",
    "booking_cta": "予約ボタンのテキスト",
    "form_note": "フォームの補足文"
  }
}

重要: features配列は必ず3つ生成してください。testimonialsは必ず2つ生成してください。FAQは必ず4つ生成してください。valuesは必ず4つ生成してください。servicesは必ず3つ生成してください。`;
}

function buildEnglishUserPrompt(
  name: string,
  industry: string,
  prefecture: string,
  domain: string,
  techSummary: string,
  hook: string,
  totalLoss: string,
  actSummaries: string,
  locale: string,
  homeSections: string,
  heroVariant: string,
  featureLayout: string,
  cardStyle: string,
  nav: string,
  tokens: DemoTemplate["designTokens"],
): string {
  return `Generate personalized copy for a 4-page business website (Home, About, Services, Contact) based on the following company data.

[Company Info]
- Company Name: ${name}
- Industry: ${industry}
- Location: ${prefecture || "N/A"}
- Domain: ${domain}
- Tech Stack: ${techSummary}
- Output Language: ${locale === "en" ? "Professional Business English" : locale}
- Layout Style: hero=${heroVariant}, features=${featureLayout}, cards=${cardStyle}, nav=${nav}

[Diagnostic Report]
- Diagnostic Hook: ${hook}
- Estimated Loss: ${totalLoss}
- Improvement Points:
${actSummaries || "(none)"}

[Output Format]
Output the following JSON. All English copy must be professional business English — natural, polished, and free of AI clichés.

{
  "home": {
    "hero_title": "Compelling headline based on diagnostic hook (max 80 chars)",
    "hero_subtitle": "1-2 sentence value proposition (max 120 chars)",
    "features": [
      {
        "title": "Feature title",
        "description": "Specific description (max 100 chars)",
        "icon": "sparkles | shield | route | star | bolt | globe | lock | target | cpu | search | chart | users | lightbulb | zap | heart | smile",
        "metric_label": "Metric label",
        "metric_value": "Metric value"
      }
    ],
    "testimonials": [
      {
        "quote": "Natural-sounding testimonial quote",
        "author": "Title, Company Name"
      }
    ],
    "faq": [
      {
        "q": "Common question",
        "a": "Natural answer (around 100 chars)"
      }
    ]
  },
  "about": {
    "story": "Company story (2-3 paragraphs)",
    "mission": "Mission statement (1 sentence)",
    "values": [
      {
        "title": "Value name",
        "description": "Description",
        "icon": "star | lightbulb | users | globe | heart | shield | zap"
      }
    ]
  },
  "services": {
    "intro": "Services intro (2 sentences)",
    "services": [
      {
        "title": "Service name",
        "description": "Description",
        "icon": "globe | search | cpu | chart | shield | bolt | sparkles",
        "features": ["Feature 1", "Feature 2", "Feature 3"]
      }
    ],
    "process": [
      {"step": 1, "title": "Step name", "description": "Description"},
      {"step": 2, "title": "Step name", "description": "Description"},
      {"step": 3, "title": "Step name", "description": "Description"},
      {"step": 4, "title": "Step name", "description": "Description"}
    ]
  },
  "contact": {
    "intro": "Contact intro (2 sentences)",
    "booking_cta": "Booking button text",
    "form_note": "Form note text"
  }
}

IMPORTANT: Generate exactly 3 features, 2 testimonials, 4 FAQs, 4 values, 3 services, and 4 process steps.`;
}

/* ───── DeepSeek API call ───── */

async function callDeepSeek(
  apiKey: string,
  messages: Array<{ role: "system" | "user"; content: string }>,
  attempt: number,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT_MS);

  try {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(
        `[deepseek-enhancer] API error ${response.status} (attempt ${attempt + 1}): ${body.slice(0, 500)}`,
      );
      if (attempt < MAX_RETRIES) {
        return callDeepSeek(apiKey, messages, attempt + 1);
      }
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error(
        "[deepseek-enhancer] API returned empty content (attempt " +
          (attempt + 1) +
          ")",
      );
      if (attempt < MAX_RETRIES) {
        return callDeepSeek(apiKey, messages, attempt + 1);
      }
      return null;
    }

    return content;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof DOMException && err.name === "AbortError") {
      console.error(
        `[deepseek-enhancer] DeepSeek API timed out after ${DEEPSEEK_TIMEOUT_MS / 1000}s (attempt ${attempt + 1})`,
      );
    } else {
      console.error(
        `[deepseek-enhancer] DeepSeek API call failed (attempt ${attempt + 1}): ${message}`,
      );
    }

    if (attempt < MAX_RETRIES) {
      return callDeepSeek(apiKey, messages, attempt + 1);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ───── Output parsing ───── */

/**
 * Parse DeepSeek JSON output into DeepSeekEnhancedOutput shape.
 * Validates structure and sanitizes corrupted text.
 */
function parseDeepSeekOutput(
  raw: string,
  locale: ReportLocale,
): {
  home?: DeepSeekHomeEnhancement;
  about?: DeepSeekAboutEnhancement;
  services?: DeepSeekServicesEnhancement;
  contact?: DeepSeekContactEnhancement;
} | null {
  try {
    // DeepSeek sometimes wraps JSON in markdown code blocks
    let jsonStr = raw.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

    // Validate we got at least a home page (minimum viable output)
    if (!parsed.home || typeof parsed.home !== "object") {
      console.error(
        "[deepseek-enhancer] Parsed output missing 'home' key — invalid structure",
      );
      return null;
    }

    return {
      home: sanitizeHomePage(parsed.home as Record<string, unknown>),
      about: sanitizeAboutPage((parsed.about as Record<string, unknown>) ?? {}),
      services: sanitizeServicesPage(
        (parsed.services as Record<string, unknown>) ?? {},
      ),
      contact: sanitizeContactPage(
        (parsed.contact as Record<string, unknown>) ?? {},
      ),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      "[deepseek-enhancer] Failed to parse DeepSeek output: " + message,
    );
    console.error(
      "[deepseek-enhancer] Raw output (first 500 chars): " +
        raw.slice(0, 500),
    );
    return null;
  }
}

/* ───── Sanitizers ───── */

const CORRUPT_CHARS = /[�邵郢鬮隴陞陷驍縺繝譁蜑荳譛谿險螟豕邨髻蠕蝠逕莠陦蛻諡蜷繧]/;
const ENTITY_PATTERN = /&#x[0-9a-fA-F]+;|&#\d+;/g;

function cleanStr(s: unknown, fallback: string, max: number): string {
  if (typeof s !== "string") return fallback;
  let v = s.replace(/\s+/g, " ").trim();
  // Remove HTML entities
  v = v.replace(ENTITY_PATTERN, "");
  if (!v || CORRUPT_CHARS.test(v)) return fallback;
  return v.length > max ? v.slice(0, max - 1) + "…" : v;
}

function sanitizeHomePage(
  raw: Record<string, unknown>,
): DeepSeekHomeEnhancement {
  const features = Array.isArray(raw.features)
    ? raw.features.slice(0, 6).map((f: unknown) => {
        const item = f as Record<string, unknown> | undefined;
        return {
          title: cleanStr(item?.title, "", 80),
          description: cleanStr(item?.description, "", 160),
          icon: cleanStr(item?.icon, "sparkles", 30),
          metric_label: cleanStr(item?.metric_label, "", 40),
          metric_value: cleanStr(item?.metric_value, "", 30),
        };
      })
    : [];

  const testimonials = Array.isArray(raw.testimonials)
    ? raw.testimonials.slice(0, 4).map((t: unknown) => {
        const item = t as Record<string, unknown> | undefined;
        return {
          quote: cleanStr(item?.quote, "", 200),
          author: cleanStr(item?.author, "", 100),
        };
      })
    : [];

  const faq = Array.isArray(raw.faq)
    ? raw.faq.slice(0, 8).map((f: unknown) => {
        const item = f as Record<string, unknown> | undefined;
        return {
          q: cleanStr(item?.q, "", 120),
          a: cleanStr(item?.a, "", 300),
        };
      })
    : [];

  return {
    hero_title: cleanStr(raw.hero_title, "", 120),
    hero_subtitle: cleanStr(raw.hero_subtitle, "", 200),
    features,
    testimonials,
    faq,
  };
}

function sanitizeAboutPage(
  raw: Record<string, unknown>,
): DeepSeekAboutEnhancement {
  const values = Array.isArray(raw.values)
    ? raw.values.slice(0, 6).map((v: unknown) => {
        const item = v as Record<string, unknown> | undefined;
        return {
          title: cleanStr(item?.title, "", 80),
          description: cleanStr(item?.description, "", 200),
          icon: cleanStr(item?.icon, "star", 30),
        };
      })
    : [];

  return {
    story: cleanStr(raw.story, "", 800),
    mission: cleanStr(raw.mission, "", 200),
    values,
  };
}

function sanitizeServicesPage(
  raw: Record<string, unknown>,
): DeepSeekServicesEnhancement {
  const services = Array.isArray(raw.services)
    ? raw.services.slice(0, 6).map((s: unknown) => {
        const item = s as Record<string, unknown> | undefined;
        const features = Array.isArray(item?.features)
          ? item.features.slice(0, 8).map((f: unknown) => cleanStr(f, "", 80))
          : [];
        return {
          title: cleanStr(item?.title, "", 80),
          description: cleanStr(item?.description, "", 300),
          icon: cleanStr(item?.icon, "sparkles", 30),
          features: features.filter(Boolean),
        };
      })
    : [];

  const process = Array.isArray(raw.process)
    ? raw.process.slice(0, 6).map((p: unknown) => {
        const item = p as Record<string, unknown> | undefined;
        return {
          step:
            typeof item?.step === "number"
              ? item.step
              : Number(item?.step) || 1,
          title: cleanStr(item?.title, "", 80),
          description: cleanStr(item?.description, "", 200),
        };
      })
    : [];

  return {
    intro: cleanStr(raw.intro, "", 300),
    services,
    process,
  };
}

function sanitizeContactPage(
  raw: Record<string, unknown>,
): DeepSeekContactEnhancement {
  return {
    intro: cleanStr(raw.intro, "", 250),
    booking_cta: cleanStr(raw.booking_cta, "", 80),
    form_note: cleanStr(raw.form_note, "", 200),
  };
}
