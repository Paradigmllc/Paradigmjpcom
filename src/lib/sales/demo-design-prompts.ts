/**
 * demo-design-prompts.ts — DeepSeek prompt builders for generating hyper-personalized
 * design specifications from real company data + diagnostic findings.
 */
import type { DemoDesignSpec } from "./demo-design-types"

export interface DesignPromptInput {
  company: {
    name: string
    domain: string
    industry: string | null
    location: string | null
  }
  /** images available from website extraction */
  images: {
    hero_url: string | null
    logo_url: string | null
    gallery_urls: string[]
  }
  /** extracted colors from the company's real website */
  colors: {
    primary: string | null
    background: string | null
    accent: string | null
    text: string | null
  } | null
  /** real text content from the company's actual subpages */
  content: {
    about: string | null
    services: string | null
    testimonials: string | null
    pricing: string | null
  }
  /** diagnostic findings */
  diagnosis: {
    pain_summary: string
    issues: string[]
    pagespeed_mobile: number | null
    pagespeed_desktop: number | null
    tech_stack: string[]
    improvements: { headline: string; body: string; metrics: string[] }[]
  }
  locale: "ja" | "en"
}

// ── System Prompt ──

function buildSystemPrompt(input: DesignPromptInput): string {
  const isJa = input.locale === "ja"

  return isJa
    ? [
        "あなたは Apple、Stripe、Linear、Figma レベルのWebサイトを設計するシニアクリエイティブディレクターです。",
        "",
        "== 絶対ルール ==",
        "1. 与えられたデータだけを使うこと。企業名・業種・所在地・実画像URL・実テキスト・診断データ以外は一切捏造しない。",
        "2. 出力は有効なJSONのみ。余計なテキストは一切出力しない。",
        "3. JSONの値はすべて埋めること。null は明示的な「情報なし」の場合のみ。空文字や欠落は不可。",
        "4. 画像sourceは必ず「hero」「logo」「gallery」のいずれか。実画像URLがなければ null。",
        "5. 色は必ず #hex 形式（6桁）。",
        "6. コピー（見出し・本文・CTA）はすべて日本語で、自然でプロフェッショナルな文体。バズワード禁止。",
        "7. すべての企業が異なるサイトに見えるよう、哲学の全6軸で違う選択をすること。同じ組み合わせを繰り返さない。",
        "8. 「フリー素材」「AI生成画像」「Unsplash」「ストックフォト」等の表現は一切使用しない。画像は実画像のみ。",
        "",
        "== デザイン哲学6軸 ==",
        "まったく異なるサイトを作るために、6軸すべてを独立して選択する:",
        "  visual_language: photographic | illustrative | typographic | documentary | minimal-luxe | editorial",
        "  layout_rhythm: modular-grid | asymmetric-fluid | editorial-narrative | single-column | z-pattern",
        "  navigation_style: classic-top | floating-minimal | hidden-drawer | sidebar | mega-menu",
        "  color_strategy: warm-earthy | cool-trust | neutral-luxury | vibrant-pop | dark-premium | monochrome-crisp | extracted",
        "  typography_personality: classic-serif | modern-geometric | humanist-warm | mixed-display | clean-sans",
        "  motion_character: still-dignified | scroll-reveal | fluid-parallax | bold-impact | subtle-micro",
        "",
        "== コピーライティング方針 ==",
        "- 診断データの数値（PageSpeedスコア、離脱率、機会損失額）を自然に織り込む",
        "- 企業名・地名・業種を具体的に本文に入れる",
        "- Before/After の物語構造（現状の課題 → 改善後の未来）",
        "- 「御社」「貴社」ではなく企業名で呼ぶ",
        "",
        "== ページ構成 ==",
        "以下のページを状況に応じて含める（少なくとも home は必須）:",
        "home: Hero + Proof + Services概要 + BeforeAfter + Testimonials + CTA",
        "about: MediaText + Timeline + CompanyInfo",
        "services: Cards + MediaText",
        "pricing: Plans",
        "cases: Cards",
        "faq: FAQ",
        "blog: Cards",
        "contact: Contact + CompanyInfo",
        "privacy, terms, tokushoho: FAQ（法務テキストは一般的な内容で）",
    ].join("\n")
    : [
        "You are a senior creative director who designs websites at the level of Apple, Stripe, Linear, and Figma.",
        "",
        "== ABSOLUTE RULES ==",
        "1. Use ONLY the provided data. Never invent company names, addresses, statistics, or facts.",
        "2. Output valid JSON only. No extra text, no markdown fences, no explanations.",
        "3. Fill ALL values. Use null only for explicitly missing information. No empty strings or missing keys.",
        "4. Image source must be 'hero', 'logo', or 'gallery'. If no real image URL exists, use null.",
        "5. Colors must be #hex format (6 digits).",
        "6. All copy (headlines, body, CTAs) must be in English, natural, and professional. No buzzwords.",
        "7. Every company must look like a different agency built it. Vary ALL 6 axes independently.",
        "8. Never reference 'stock photos', 'AI-generated images', 'Unsplash', or 'free assets'. Use only real images.",
        "",
        "== 6-AXIS DESIGN PHILOSOPHY ==",
        "Choose independently for each company to create entirely different-looking sites:",
        "  visual_language: photographic | illustrative | typographic | documentary | minimal-luxe | editorial",
        "  layout_rhythm: modular-grid | asymmetric-fluid | editorial-narrative | single-column | z-pattern",
        "  navigation_style: classic-top | floating-minimal | hidden-drawer | sidebar | mega-menu",
        "  color_strategy: warm-earthy | cool-trust | neutral-luxury | vibrant-pop | dark-premium | monochrome-crisp | extracted",
        "  typography_personality: classic-serif | modern-geometric | humanist-warm | mixed-display | clean-sans",
        "  motion_character: still-dignified | scroll-reveal | fluid-parallax | bold-impact | subtle-micro",
        "",
        "== COPY GUIDELINES ==",
        "- Weave diagnostic metrics (PageSpeed scores, bounce rates, revenue loss) naturally into copy",
        "- Use the company name, location, and industry specifically throughout",
        "- Before/After narrative structure (current problems → improved future)",
        "- Address the company by name, not 'you' or 'your company'",
        "",
        "== PAGE STRUCTURE ==",
        "Include pages as appropriate (home is mandatory):",
        "home: Hero + Proof + Services preview + BeforeAfter + Testimonials + CTA",
        "about: MediaText + Timeline + CompanyInfo",
        "services: Cards + MediaText",
        "pricing: Plans",
        "cases: Cards",
        "faq: FAQ",
        "blog: Cards",
        "contact: Contact + CompanyInfo",
        "privacy, terms, tokushoho: FAQ (use standard legal text)",
    ].join("\n")
}

// ── User Prompt (data injection) ──

function buildUserPrompt(input: DesignPromptInput): string {
  const isJa = input.locale === "ja"

  const companySection = [
    `企業名: ${input.company.name}`,
    `ドメイン: ${input.company.domain}`,
    `業種: ${input.company.industry || "不明"}`,
    `所在地: ${input.company.location || "不明"}`,
  ].join("\n")

  const imageSection = [
    "== 利用可能な実画像 ==",
    `Hero候補: ${input.images.hero_url || "なし"}`,
    `ロゴ: ${input.images.logo_url || "なし"}`,
    `ギャラリー (${input.images.gallery_urls.length}枚): ${input.images.gallery_urls.map((url, i) => `[${i}] ${url}`).join(", ") || "なし"}`,
  ].join("\n")

  const colorSection = input.colors
    ? [
        "== 抽出された実ブランド色 ==",
        `primary: ${input.colors.primary || "なし"}`,
        `background: ${input.colors.background || "なし"}`,
        `accent: ${input.colors.accent || "なし"}`,
        `text: ${input.colors.text || "なし"}`,
        "(color_strategy=extracted の場合、これをベースに展開すること)",
      ].join("\n")
    : "抽出されたブランド色: なし"

  const contentSection = [
    "== 実サイトから抽出されたテキスト ==",
    input.content.about ? `会社概要: ${input.content.about.slice(0, 1500)}` : "会社概要: なし",
    input.content.services ? `サービス内容: ${input.content.services.slice(0, 1500)}` : "サービス内容: なし",
    input.content.testimonials ? `顧客の声: ${input.content.testimonials.slice(0, 1500)}` : "顧客の声: なし",
    input.content.pricing ? `料金: ${input.content.pricing.slice(0, 1500)}` : "料金: なし",
  ].join("\n")

  const diagSection = [
    "== 診断結果 ==",
    `主な課題: ${input.diagnosis.pain_summary}`,
    `検出された問題: ${input.diagnosis.issues.join(", ") || "なし"}`,
    `PageSpeed モバイル: ${input.diagnosis.pagespeed_mobile ?? "未測定"}`,
    `PageSpeed デスクトップ: ${input.diagnosis.pagespeed_desktop ?? "未測定"}`,
    `技術スタック: ${input.diagnosis.tech_stack.join(", ") || "不明"}`,
    "改善アクション:",
    ...input.diagnosis.improvements.map((a, i) => `  ${i + 1}. ${a.headline} — ${a.body} (期待効果: ${a.metrics.join(", ")})`),
  ].join("\n")

  const outputInstruction = isJa
    ? [
        "== 出力指示 ==",
        "以下のJSONスキーマに従って、この企業のための完全なデザイン仕様を生成せよ。",
        "全フィールドを埋めること。実画像がない場合は画像URLをnullに。",
        "数値は必ず計算・推計されたものを使い、誇張しない。",
        "出力は有効なJSON 1つのみ。",
      ].join("\n")
    : [
        "== OUTPUT INSTRUCTION ==",
        "Generate a complete design specification for this company following the JSON schema below.",
        "Fill all fields. Use null for image URLs when no real image is available.",
        "Use only calculated/estimated metrics — do not exaggerate.",
        "Output exactly one valid JSON object.",
      ].join("\n")

  return [
    companySection,
    "",
    imageSection,
    "",
    colorSection,
    "",
    contentSection,
    "",
    diagSection,
    "",
    outputInstruction,
  ].join("\n")
}

// ── Output format prompt (injected as part of user message) ──

export function buildDesignSpecPrompt(input: DesignPromptInput, slug: string): {
  system: string
  user: string
} {
  const isJa = input.locale === "ja"
  const today = new Date().toISOString()

  const schemaSnippet = isJa
    ? `{
  "schema_version": 1,
  "slug": "${slug}",
  "locale": "${input.locale}",
  "generated_at": "${today}",
  "engine": "deepseek-v4-pro",
  "company": {
    "name": "${input.company.name}",
    "domain": "${input.company.domain}",
    "industry": "${input.company.industry || ""}",
    "location": "${input.company.location || ""}",
    "available_images": { "hero": {"url":"実際のURLまたはnull","alt":"説明","source":"hero"}, "logo": ..., "gallery": [...] },
    "extracted_colors": { "primary":"#hex","background":"#hex","accent":"#hex","text":"#hex" },
    "real_content": { "about_text":"抽出テキストの要約","services_text":"...","testimonials_text":"...","pricing_text":"..." },
    "diagnosis": { "pain_summary":"...", "issues":[...], "pagespeed_mobile":数値, "pagespeed_desktop":数値, "tech_stack":[...], "improvement_actions":[{headline,body,metrics}] }
  },
  "creative_brief": { "company_essence":"1行の本質", "customer_psychology":"顧客心理", "competitive_context":"競合状況", "transformation_story":"Before→After物語" },
  "design_philosophy": { "visual_language":"...", "layout_rhythm":"...", "navigation_style":"...", "color_strategy":"...", "typography_personality":"...", "motion_character":"...", "rationale":"なぜこの選択か" },
  "design_tokens": { "palette":{"primary":"#hex",...}, "typography":{"headingFont":"...","bodyFont":"...","scale":"..."}, "radius":"sharp|soft|pill" },
  "site": { "pages":["home","about",...], "nav":[{label,section,href}], "footer":{tagline,address,phone,email,social_links} },
   "pages": {
     "home": { "title":"...", "description":"...", "hero":{"headline":"見出し","subheadline":"サブ見出し","eyebrow":"ラベル","primary_cta":{"label":"ボタン","href":"#section"},"secondary_cta":{"label":"ボタン2","href":"#section2"},"image":null,"variant":"fullbleed|split|centered|type-marquee|before-after"}, "blocks":[{type:"proof",...}, {type:"cards",...}, ...] },
    "about": { "title":"...", "blocks":[...] },
    "services": { ... },
    ...
  }
}`
    : `{ "schema_version":1, "slug":"${slug}", "locale":"${input.locale}", "generated_at":"${today}", "engine":"deepseek-v4-pro", "company":{...}, "creative_brief":{...}, "design_philosophy":{...}, "design_tokens":{...}, "site":{...}, "pages":{...} }`

  return {
    system: buildSystemPrompt(input),
    user: buildUserPrompt(input) + `\n\n出力スキーマ:\n${schemaSnippet}`,
  }
}

// ── Validation ──

export function validateDesignSpec(spec: unknown): { ok: boolean; spec?: DemoDesignSpec; errors: string[] } {
  const errors: string[] = []
  if (!spec || typeof spec !== "object") {
    return { ok: false, errors: ["spec is not an object"] }
  }

  const s = spec as Record<string, unknown>

  if (s.schema_version !== 1) errors.push("schema_version must be 1")
  if (typeof s.slug !== "string" || !s.slug) errors.push("slug is required")
  if (!s.company || typeof s.company !== "object") errors.push("company is required")
  if (!s.creative_brief || typeof s.creative_brief !== "object") errors.push("creative_brief is required")
  if (!s.design_philosophy || typeof s.design_philosophy !== "object") errors.push("design_philosophy is required")
  if (!s.design_tokens || typeof s.design_tokens !== "object") errors.push("design_tokens is required")

  const pages = s.pages as Record<string, unknown> | undefined
  if (!pages || typeof pages !== "object") {
    errors.push("pages is required")
  } else if (!pages.home) {
    errors.push("pages.home is required")
  }

  // Validate design_philosophy 6 axes
  const dp = s.design_philosophy as Record<string, unknown> | undefined
  if (dp) {
    const validVisual = ["photographic", "illustrative", "typographic", "documentary", "minimal-luxe", "editorial"]
    const validLayout = ["modular-grid", "asymmetric-fluid", "editorial-narrative", "single-column", "z-pattern"]
    const validNav = ["classic-top", "floating-minimal", "hidden-drawer", "sidebar", "mega-menu"]
    const validColor = ["warm-earthy", "cool-trust", "neutral-luxury", "vibrant-pop", "dark-premium", "monochrome-crisp", "extracted"]
    const validTypo = ["classic-serif", "modern-geometric", "humanist-warm", "mixed-display", "clean-sans"]
    const validMotion = ["still-dignified", "scroll-reveal", "fluid-parallax", "bold-impact", "subtle-micro"]

    if (!validVisual.includes(dp.visual_language as string)) errors.push(`invalid visual_language: ${dp.visual_language}`)
    if (!validLayout.includes(dp.layout_rhythm as string)) errors.push(`invalid layout_rhythm: ${dp.layout_rhythm}`)
    if (!validNav.includes(dp.navigation_style as string)) errors.push(`invalid navigation_style: ${dp.navigation_style}`)
    if (!validColor.includes(dp.color_strategy as string)) errors.push(`invalid color_strategy: ${dp.color_strategy}`)
    if (!validTypo.includes(dp.typography_personality as string)) errors.push(`invalid typography_personality: ${dp.typography_personality}`)
    if (!validMotion.includes(dp.motion_character as string)) errors.push(`invalid motion_character: ${dp.motion_character}`)
  }

  return { ok: errors.length === 0, spec: errors.length === 0 ? (s as unknown as DemoDesignSpec) : undefined, errors }
}
