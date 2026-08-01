/**
 * demo-design-generator.ts — Orchestrates DeepSeek to generate a complete,
 * hyper-personalized DemoDesignSpec from real company data.
 */
import type { DemoDesignSpec } from "./demo-design-types"
import { buildDesignSpecPrompt, validateDesignSpec, type DesignPromptInput } from "./demo-design-prompts"

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_API_BASE || "https://api.deepseek.com/v1"
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat" // DeepSeek V4 Pro
const DEEPSEEK_TIMEOUT_MS = 90_000
const DESIGN_SPEC_MAX_TOKENS = 16384

export interface DesignGenerateResult {
  ok: boolean
  spec?: DemoDesignSpec
  error?: string
}

// ── DeepSeek API call (reuse pattern from demo-deepseek-client) ──

async function callDeepSeek(
  apiKey: string,
  messages: Array<{ role: "system" | "user"; content: string }>,
): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT_MS)

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
        temperature: 0.8,
        max_tokens: DESIGN_SPEC_MAX_TOKENS,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const body = await response.text().catch((e) => { console.error("[demo-design-generator] response body read failed:", e); return "" })
      console.error(`[demo-design-generator] API error ${response.status}: ${body.slice(0, 500)}`)
      return null
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    return data.choices?.[0]?.message?.content ?? null
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (err instanceof DOMException && err.name === "AbortError") {
      console.error(`[demo-design-generator] DeepSeek API timed out after ${DEEPSEEK_TIMEOUT_MS / 1000}s`)
    } else {
      console.error(`[demo-design-generator] DeepSeek API call failed: ${message}`)
    }
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ── Normalize LLM output to match strict schema ──

const BLOCK_TYPE_MAP: Record<string, string> = {
  beforeafter: "before-after", mediatext: "media-text", companyinfo: "company-info",
  testimonial: "testimonials", feature: "cards", features: "cards",
  stats: "proof", hero: "hero", plans: "plans", faq: "faq",
  contact: "contact", timeline: "timeline", cards: "cards",
  "before-after": "before-after", "media-text": "media-text", "company-info": "company-info",
  testimonials: "testimonials", cta: "cta", proof: "proof",
}

// Map LLM field name variations to canonical field names
const FIELD_ALIASES: Record<string, string> = {
  heading: "headline", subheading: "subheadline", hero_title: "headline",
  hero_subtitle: "subheadline", backgroundImage: "image", bg_image: "image",
  background_image: "image", hero_image: "image", description: "body",
  body_text: "body", copy: "body", media: "image", visual: "image",
  text: "body", content: "body", summary: "body",
  link: "cta", action: "cta", cta_primary: "primary_cta",
  cta_secondary: "secondary_cta", button_text: "label", btn_text: "label",
  background: "image", photo: "image", picture: "image",
  cta1: "primary_cta", cta2: "secondary_cta",
  action_primary: "primary_cta", action_secondary: "secondary_cta",
  button_primary: "primary_cta", button_secondary: "secondary_cta",
  primary: "primary_cta", secondary: "secondary_cta",
}

// Normalize proof items: map {heading,description}→{value,label} and {name,detail}→{value,label}
function normalizeProofItems(items: unknown[]): unknown[] {
  return items.map((item: unknown) => {
    const i = item as Record<string, unknown>
    return {
      value: String(i.value ?? i.heading ?? i.name ?? i.number ?? ""),
      label: String(i.label ?? i.description ?? i.detail ?? i.text ?? ""),
      prefix: i.prefix,
      suffix: i.suffix,
    }
  })
}

// Normalize testimonial items
function normalizeTestimonialItems(items: unknown[]): unknown[] {
  return items.map((item: unknown) => {
    const i = item as Record<string, unknown>
    return {
      quote: String(i.quote ?? i.text ?? i.body ?? i.content ?? ""),
      author: String(i.author ?? i.name ?? ""),
      role: i.role ?? i.title ?? null,
      image: i.image ?? i.avatar ?? null,
    }
  })
}

// Normalize plan items
function normalizePlanItems(items: unknown[]): unknown[] {
  return items.map((item: unknown) => {
    const i = item as Record<string, unknown>
    const features = Array.isArray(i.features) ? i.features : (Array.isArray(i.includes) ? i.includes : [])
    return {
      name: String(i.name ?? i.title ?? ""),
      price_monthly: String(i.price_monthly ?? i.price ?? i.monthly ?? ""),
      price_yearly: i.price_yearly ?? i.yearly ?? null,
      description: String(i.description ?? i.body ?? i.detail ?? ""),
      features: features.map(String),
      featured: Boolean(i.featured ?? i.highlighted ?? false),
      cta: i.cta ?? { label: "申し込む", href: "#contact" },
    }
  })
}

function normalizeBlock(raw: Record<string, unknown>): Record<string, unknown> {
  const b: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    const key = FIELD_ALIASES[k] ?? k
    b[key] = v
  }

  const rawType = String(raw.type ?? "")
  const blockType = BLOCK_TYPE_MAP[rawType] ?? rawType
  b.type = blockType

  // For non-hero blocks: headline → title (hero keeps headline)
  if (blockType !== "hero" && blockType !== "timeline" && blockType !== "faq" && blockType !== "before-after" && blockType !== "media-text" && blockType !== "contact") {
    if (!b.title && b.headline) { b.title = b.headline; delete b.headline }
    if (!b.subtitle && b.subheadline) { b.subtitle = b.subheadline; delete b.subheadline }
  }

  // text → body for non-hero
  if (blockType !== "hero" && !b.body && b.text) { b.body = b.text; delete b.text }

  // Hero: normalize cta → primary_cta/secondary_cta
  if (b.type === "hero" && b.cta && !b.primary_cta) {
    if (typeof b.cta === "object" && !Array.isArray(b.cta)) {
      b.primary_cta = b.cta
    } else if (Array.isArray(b.cta) && b.cta.length > 0) {
      b.primary_cta = b.cta[0]
      if (b.cta.length > 1) b.secondary_cta = b.cta[1]
    }
    delete b.cta
  }
  // Hero: map image string/object → image ref
  if (b.type === "hero" && b.image) {
    if (typeof b.image === "string") {
      b.image = { url: b.image, alt: "", source: "hero" }
    } else if (typeof b.image === "object" && !(b.image as Record<string, unknown>).url) {
      const img = b.image as Record<string, unknown>
      b.image = { url: String(img.src ?? img.url ?? ""), alt: String(img.alt ?? ""), source: "hero" }
    }
  }
  if (b.type === "hero" && b.background && typeof b.background === "string" && !b.image) {
    b.image = { url: b.background, alt: "", source: "hero" }
    delete b.background
  }

  // Ensure hero has variant default
  if (b.type === "hero" && !b.variant) b.variant = "fullbleed"

  // Normalize block items based on block type — ensure items is always an array
  const itemsArray = Array.isArray(b.items) ? b.items : (b.items ? [b.items] : [])
  b.items = itemsArray

  if (b.type === "proof") {
    b.items = normalizeProofItems(itemsArray as unknown[])
  }
  if (b.type === "testimonials") {
    b.items = normalizeTestimonialItems(itemsArray as unknown[])
  }
  if (b.type === "plans") {
    b.items = normalizePlanItems(itemsArray as unknown[])
  }

  // before-after: ensure before/after items are arrays
  if (b.type === "before-after") {
    const before = (b.before ?? {}) as Record<string, unknown>
    if (before && !Array.isArray(before.items)) before.items = before.items ? [before.items] : []
    if (before.image && typeof before.image === "string") before.image = { url: before.image, alt: "", source: "hero" }
    b.before = before
    const after = (b.after ?? {}) as Record<string, unknown>
    if (after && !Array.isArray(after.items)) after.items = after.items ? [after.items] : []
    b.after = after
  }

  // cta: ensure ctas is an array
  if (b.type === "cta") {
    if (!b.ctas && b.items) { b.ctas = (b.items as unknown[]).map((i: unknown) => {
      const item = i as Record<string, unknown>
      return { label: String(item.label ?? item.cta ?? item.text ?? ""), href: String(item.href ?? "#") }
    })}
    if (!b.ctas && b.cta) {
      if (Array.isArray(b.cta)) b.ctas = b.cta
      else b.ctas = [b.cta]
    }
    if (!b.ctas) b.ctas = [{ label: "詳細を見る", href: "#" }]
    if (!b.title && b.headline) b.title = b.headline
  }

  // Cards: ensure items have title (not headline)
  if (b.type === "cards" && Array.isArray(b.items)) {
    b.items = (b.items as unknown[]).map((item: unknown) => {
      const i = item as Record<string, unknown>
      if (!i.title && i.headline) { i.title = i.headline; delete i.headline }
      if (!i.body && i.description) { i.body = i.description; delete i.description }
      return i
    })
  }

  // FAQ: ensure items have question/answer (not q/a)
  if (b.type === "faq" && Array.isArray(b.items)) {
    b.items = (b.items as unknown[]).map((item: unknown) => {
      const i = item as Record<string, unknown>
      if (!i.question && i.q) { i.question = i.q; delete i.q }
      if (!i.answer && i.a) { i.answer = i.a; delete i.a }
      return i
    })
  }

  return b
}

function normalizeDesignTokens(tokens: Record<string, unknown>): Record<string, unknown> {
  const p = (tokens.palette ?? {}) as Record<string, unknown>
  const t = (tokens.typography ?? {}) as Record<string, unknown>
  const scale = t.scale

  // Map secondary → accent (DeepSeek often uses 'secondary')
  if (p.secondary && !p.accent) p.accent = p.secondary
  if (p.main && !p.primary) p.primary = p.main
  if (p.dark && !p.primaryDark) p.primaryDark = p.dark
  if (p.light && !p.surface) p.surface = p.light

  // Normalize typography scale
  if (typeof scale === "string" || typeof scale === "number") {
    const n = parseFloat(String(scale))
    if (n <= 1.15) t.scale = "compact"
    else if (n >= 1.35) t.scale = "generous"
    else t.scale = "balanced"
  }

  // Fill missing palette colors
  if (!p.primaryDark) p.primaryDark = p.primary || "#1a1a2e"
  if (!p.surface) {
    const bg = String(p.background || "#ffffff")
    p.surface = bg === "#ffffff" || bg === "#fff" ? "#f8f9fa" : bg
  }
  if (!p.textMuted) p.textMuted = "#6b7280"
  if (!p.border) p.border = "#e5e7eb"
  if (!p.text) p.text = "#111827"
  if (!p.primary) p.primary = "#2563eb"
  if (!p.accent) p.accent = p.primary
  if (!p.background) p.background = "#ffffff"

  // Normalize typography
  if (!t.headingFont) t.headingFont = "Inter"
  if (!t.bodyFont) t.bodyFont = "Inter"
  if (!t.scale) t.scale = "balanced"

  tokens.palette = p
  tokens.typography = t
  return tokens
}

function normalizeNavHrefs(nav: unknown[], slug: string): unknown[] {
  return (nav ?? []).map((item: unknown) => {
    const n = item as Record<string, unknown>
    const section = String(n.section ?? "")
    const href = String(n.href ?? "")
    // Fix any anchor or short-path href to canonical /demo/{slug}/{section}
    if (href.startsWith("#") || href === "/" || href === `/${section}` || !href.includes("/demo/")) {
      n.href = section === "home" ? `/demo/${slug}` : `/demo/${slug}/${section}`
    }
    return n
  })
}

function normalizeDesignSpec(raw: Record<string, unknown>, slug: string): Record<string, unknown> {
  // Normalize design tokens
  const dt = raw.design_tokens as Record<string, unknown> | undefined
  if (dt) raw.design_tokens = normalizeDesignTokens(dt)

  // Normalize design philosophy
  const dp = raw.design_philosophy as Record<string, unknown> | undefined
  if (dp) {
    if (!dp.rationale) dp.rationale = ""
    // Ensure all 6 axes exist
    const defaults = {
      visual_language: "typographic", layout_rhythm: "modular-grid",
      navigation_style: "classic-top", color_strategy: "warm-earthy",
      typography_personality: "clean-sans", motion_character: "still-dignified",
    }
    for (const [k, v] of Object.entries(defaults)) {
      if (!dp[k]) dp[k] = v
    }
  }

  // Normalize site nav hrefs
  const site = raw.site as Record<string, unknown> | undefined
  if (site?.nav) site.nav = normalizeNavHrefs(site.nav as unknown[], slug)

  // Ensure creative_brief exists
  if (!raw.creative_brief) raw.creative_brief = { company_essence: "", customer_psychology: "", competitive_context: "", transformation_story: "" }

  // Normalize pages
  const pages = raw.pages as Record<string, Record<string, unknown>> | undefined
  if (pages) {
    for (const [key, page] of Object.entries(pages)) {
      if (!page) continue
      const p = page as Record<string, unknown>
      if (p.hero) {
        const hero = p.hero as Record<string, unknown>
        hero.type = "hero" // Force type since hero is implied by field position
        p.hero = normalizeBlock(hero)
      }
      const blocks = p.blocks as unknown[] | undefined
      if (Array.isArray(blocks)) {
        p.blocks = blocks
          .map((b: unknown) => normalizeBlock(b as Record<string, unknown>))
          .filter((b: Record<string, unknown>) => {
            const valid = ["hero","proof","cards","media-text","faq","contact","company-info","plans","before-after","timeline","testimonials","cta"]
            return valid.includes(String(b.type ?? ""))
          })
      }
    }
  }

  return raw
}

// ── Parse DeepSeek output ──

function parseDesignSpecOutput(raw: string, slug: string): DemoDesignSpec | null {
  try {
    let jsonStr = raw.trim()
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim()
    }

    const parsed = JSON.parse(jsonStr) as Record<string, unknown>
    const normalized = normalizeDesignSpec(parsed, slug)
    const { ok, spec, errors } = validateDesignSpec(normalized)

    if (!ok || !spec) {
      console.error(`[demo-design-generator] validation failed: ${errors.join(", ")}`)
      return null
    }

    return spec
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[demo-design-generator] parse failed: ${message}`)
    console.error(`[demo-design-generator] raw (first 500): ${raw.slice(0, 500)}`)
    return null
  }
}

// ── Build prompt input from company + website assets ──

export function buildDesignInput(params: {
  company_name: string
  domain: string
  industry: string | null
  location: string | null
  locale?: string
  website_assets?: Record<string, unknown> | null
  diagnosis?: Record<string, unknown> | null
}): DesignPromptInput | null {
  if (!params.company_name || !params.domain) return null

  const assets = params.website_assets ?? {}
  const diag = params.diagnosis ?? {}

  const images = assets.images as Record<string, unknown> | undefined
  const colors = assets.colors as Record<string, unknown> | undefined
  const content = assets.content as Record<string, unknown> | undefined
  const structured = assets.structured as Record<string, unknown> | undefined

  const galleryImages = Array.isArray(images?.gallery)
    ? (images.gallery as Array<Record<string, unknown>>).map((g) => String(g.url ?? ""))
    : []

  return {
    company: {
      name: params.company_name,
      domain: params.domain,
      industry: params.industry,
      location: params.location,
    },
    images: {
      hero_url: images?.hero && typeof (images.hero as Record<string, unknown>).url === "string" ? String((images.hero as Record<string, unknown>).url) : null,
      logo_url: images?.logo && typeof (images.logo as Record<string, unknown>).url === "string" ? String((images.logo as Record<string, unknown>).url) : null,
      gallery_urls: galleryImages,
    },
    colors: colors
      ? {
          primary: typeof colors.primary === "string" ? colors.primary : null,
          background: typeof colors.background === "string" ? colors.background : null,
          accent: typeof colors.accent === "string" ? colors.accent : null,
          text: typeof colors.text === "string" ? colors.text : null,
        }
      : null,
    content: {
      about: typeof content?.about === "string" ? content.about : null,
      services: typeof content?.services === "string" ? content.services : null,
      testimonials: typeof content?.testimonials === "string" ? content.testimonials : null,
      pricing: typeof content?.pricing === "string" ? content.pricing : null,
    },
    diagnosis: {
      pain_summary: String(diag.pain_summary ?? diag.primaryPain ?? ""),
      issues: Array.isArray(diag.issues) ? diag.issues.map(String) : (Array.isArray(diag.detected_issues) ? diag.detected_issues.map(String) : []),
      pagespeed_mobile: typeof diag.pagespeed_mobile === "number" ? diag.pagespeed_mobile : null,
      pagespeed_desktop: typeof diag.pagespeed_desktop === "number" ? diag.pagespeed_desktop : null,
      tech_stack: Array.isArray(diag.tech_stack) ? diag.tech_stack.map(String) : [],
      improvements: Array.isArray(diag.improvement_actions)
        ? (diag.improvement_actions as Array<Record<string, unknown>>).slice(0, 5).map((a) => ({
            headline: String(a.headline ?? ""),
            body: String(a.body ?? ""),
            metrics: Array.isArray(a.metrics) ? a.metrics.map(String) : [],
          }))
        : [],
    },
    locale: (params.locale === "en" ? "en" : "ja") as "ja" | "en",
  }
}

// ── Main generator ──

export async function generateDemoDesign(input: DesignPromptInput, slug: string): Promise<DesignGenerateResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return { ok: false, error: "DEEPSEEK_API_KEY is not configured" }
  }

  const { system, user } = buildDesignSpecPrompt(input, slug)

  console.info(`[demo-design-generator] generating design spec for ${input.company.name} (${slug})`)

  const raw = await callDeepSeek(apiKey, [
    { role: "system", content: system },
    { role: "user", content: user },
  ])

  if (!raw) {
    return { ok: false, error: "DeepSeek API returned no content" }
  }

  const spec = parseDesignSpecOutput(raw, slug)
  if (!spec) {
    return { ok: false, error: "Failed to parse or validate DeepSeek output" }
  }

  console.info(`[demo-design-generator] generated design spec: ${spec.design_philosophy.visual_language} / ${spec.design_philosophy.layout_rhythm} / ${spec.design_philosophy.color_strategy}`)

  return { ok: true, spec }
}
