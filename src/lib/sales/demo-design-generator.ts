/**
 * demo-design-generator.ts — Orchestrates DeepSeek to generate a complete,
 * hyper-personalized DemoDesignSpec from real company data.
 */
import type { DemoDesignSpec } from "./demo-design-types"
import { buildDesignSpecPrompt, validateDesignSpec, type DesignPromptInput } from "./demo-design-prompts"

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
const DEEPSEEK_MODEL = "deepseek-chat"
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
      const body = await response.text().catch(() => "")
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

// ── Parse DeepSeek output ──

function parseDesignSpecOutput(raw: string): DemoDesignSpec | null {
  try {
    let jsonStr = raw.trim()
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim()
    }

    const parsed = JSON.parse(jsonStr) as unknown
    const { ok, spec, errors } = validateDesignSpec(parsed)

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

  const spec = parseDesignSpecOutput(raw)
  if (!spec) {
    return { ok: false, error: "Failed to parse or validate DeepSeek output" }
  }

  console.info(`[demo-design-generator] generated design spec: ${spec.design_philosophy.visual_language} / ${spec.design_philosophy.layout_rhythm} / ${spec.design_philosophy.color_strategy}`)

  return { ok: true, spec }
}
