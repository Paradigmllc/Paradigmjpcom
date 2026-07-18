import type { DemoDesignSpec, PageBlock, PageSpec } from "./demo-design-types"
import { validateDesignSpec } from "./demo-design-prompts"
import type {
  DemoAboutPage,
  DemoBrandSystem,
  DemoContentPage,
  DemoCreativeDirection,
  DemoFeatureItem,
  DemoMultiPageData,
  DemoServicesPage,
  DemoStatsItem,
} from "./demo-site-types"

/**
 * Runtime bridge for the rich design spec. The generator may produce a much
 * richer JSON document than the renderer needs, so this module projects it
 * into the renderer's typed primitives instead of leaking arbitrary JSX/CSS
 * onto the public surface.
 */

const INTERNAL_COPY = /(?:生成イメージ|AI生成|スクリーンショット|screenshot|提案用|権利確認前|非公開|preview|placeholder)/iu

export function readPersistedDemoDesignSpec(value: unknown): DemoDesignSpec | null {
  const result = validateDesignSpec(value)
  if (!result.ok || !result.spec) {
    if (value != null) console.warn("[demo-design-spec] persisted spec rejected", result.errors)
    return null
  }
  return result.spec
}

function safeText(value: unknown, fallback = ""): string {
  const text = typeof value === "string" ? value.replace(/\s+/gu, " ").trim() : ""
  return text && !INTERNAL_COPY.test(text) ? text : fallback
}

function safeUrl(value: unknown, fallback: string): string {
  const text = typeof value === "string" ? value.trim() : ""
  if (!text || INTERNAL_COPY.test(text)) return fallback
  if (text.startsWith("#") || text.startsWith("/")) return text
  try {
    const url = new URL(text)
    return url.protocol === "https:" ? url.toString() : fallback
  } catch (error) {
    console.warn("[demo-design-spec] invalid URL in spec", { value: text, error })
    return fallback
  }
}

function industryProfile(data: DemoMultiPageData): string {
  return data.presentation?.industryProfile ?? String(data.industry ?? "consulting")
}

function industrySafeText(data: DemoMultiPageData, value: unknown, fallback: string): string {
  const text = safeText(value, fallback)
  const profile = industryProfile(data)
  if (profile === "restaurant" && /コンサルティング|施工|採用|法人営業/iu.test(text)) return fallback
  if (profile === "dental" && /飲食|メニュー|来店/iu.test(text)) return fallback
  return text
}

function mapTypography(value: DemoDesignSpec["design_philosophy"]["typography_personality"]): DemoCreativeDirection["typographyStyle"] {
  if (value === "classic-serif") return "editorial-serif"
  if (value === "modern-geometric" || value === "clean-sans") return "modern-grotesk"
  if (value === "mixed-display") return "technical-sans"
  return "humanist-sans"
}

function mapPalette(value: DemoDesignSpec["design_philosophy"]["color_strategy"]): DemoCreativeDirection["paletteMood"] {
  if (value === "warm-earthy") return "warm-neutral"
  if (value === "cool-trust") return "cool-professional"
  if (value === "dark-premium" || value === "neutral-luxury") return "monochrome"
  if (value === "vibrant-pop") return "soft-contrast"
  return "earth"
}

function mapMotion(value: DemoDesignSpec["design_philosophy"]["motion_character"]): DemoCreativeDirection["motion"] {
  if (value === "still-dignified" || value === "subtle-micro") return "restrained"
  if (value === "bold-impact") return "expressive"
  return "editorial"
}

function mapCreativeDirection(data: DemoMultiPageData, spec: DemoDesignSpec): DemoCreativeDirection {
  const philosophy = spec.design_philosophy
  const profile = industryProfile(data)
  const heroComposition: DemoCreativeDirection["heroComposition"] = philosophy.layout_rhythm === "asymmetric-fluid"
    ? "mosaic"
    : philosophy.layout_rhythm === "z-pattern"
      ? "editorial-split"
      : profile === "restaurant"
        ? "cinematic"
        : "precision-split"
  const serviceLayout: DemoCreativeDirection["serviceLayout"] = philosophy.layout_rhythm === "single-column"
    ? "editorial-list"
    : profile === "restaurant" || profile === "retail"
      ? "editorial-list"
      : "precision-grid"
  const worksLayout: DemoCreativeDirection["worksLayout"] = profile === "beauty_salon"
    ? "salon-lookbook"
    : philosophy.visual_language === "documentary"
      ? "case-grid"
      : "journal"
  return {
    source: "deepseek",
    concept: safeText(spec.creative_brief.company_essence, `${data.companyName}の個性を主役にしたアートディレクション`),
    typographyStyle: mapTypography(philosophy.typography_personality),
    heroComposition,
    serviceLayout,
    worksLayout,
    paletteMood: mapPalette(philosophy.color_strategy),
    density: philosophy.layout_rhythm === "single-column" ? "airy" : philosophy.layout_rhythm === "modular-grid" ? "compact" : "balanced",
    motion: mapMotion(philosophy.motion_character),
    signatureMotif: philosophy.layout_rhythm === "asymmetric-fluid" ? "offset-grid" : philosophy.visual_language === "typographic" ? "numbered-index" : "framed-media",
  }
}

function hex(value: unknown, fallback: string): string {
  const text = typeof value === "string" ? value.trim() : ""
  return /^#[0-9a-f]{6}$/iu.test(text) ? text : fallback
}

export function brandSystemFromDesignSpec(spec: DemoDesignSpec, data: DemoMultiPageData): DemoBrandSystem {
  const palette = spec.design_tokens.palette
  const typography = spec.design_tokens.typography
  const profile = industryProfile(data)
  const fallback = data.brandSystem
  return {
    id: `spec-${spec.slug}`,
    displayFont: safeText(typography.headingFont, fallback?.displayFont ?? '"Noto Sans JP", sans-serif'),
    bodyFont: safeText(typography.bodyFont, fallback?.bodyFont ?? '"Noto Sans JP", sans-serif'),
    headingWeight: spec.design_philosophy.typography_personality === "clean-sans" ? 600 : 500,
    surface: hex(palette.background, fallback?.surface ?? "#f7f7f5"),
    surfaceAlt: hex(palette.surface, fallback?.surfaceAlt ?? "#ecebe6"),
    ink: hex(palette.text, fallback?.ink ?? "#171717"),
    muted: hex(palette.textMuted, fallback?.muted ?? "#686868"),
    line: `${hex(palette.border, "#d8d8d2")}99`,
    heroTone: profile === "restaurant" ? "cinematic" : spec.design_philosophy.visual_language === "minimal-luxe" ? "editorial" : "precision",
    imageTreatment: spec.design_philosophy.color_strategy === "warm-earthy" ? "warm" : spec.design_philosophy.color_strategy === "monochrome-crisp" ? "monochrome" : "natural",
    shape: spec.design_tokens.radius === "sharp" ? "square" : spec.design_tokens.radius === "pill" ? "rounded" : "soft",
  }
}

function blockList(page: PageSpec | undefined, type: string): PageBlock[] {
  return page?.blocks.filter((block) => block.type === type) ?? []
}

function blockItems(block: PageBlock): unknown[] {
  return "items" in block && Array.isArray(block.items) ? block.items : []
}

function pageFromSpec(spec: DemoDesignSpec, key: string): PageSpec | undefined {
  return spec.pages[key]
}

function toSections(data: DemoMultiPageData, page: PageSpec | undefined, fallback: DemoContentPage["sections"]): DemoContentPage["sections"] {
  if (!page) return fallback
  const blocks = page.blocks.filter((block) => block.type !== "hero")
  const sections = blocks.flatMap((block, index) => {
    if (block.type === "cards" || block.type === "faq" || block.type === "timeline" || block.type === "testimonials") {
      const items = blockItems(block)
      return items.slice(0, 6).map((item, itemIndex) => {
        const row = item as Record<string, unknown>
        const heading = industrySafeText(data, row.title ?? row.question ?? row.author, "ご案内")
        const body = industrySafeText(data, row.body ?? row.answer ?? row.quote, "詳しい内容は正式なご案内をご確認ください。")
        return { id: `${block.type}-${index}-${itemIndex}`, heading, body, note: safeText(row.role ?? row.date_label) || undefined }
      })
    }
    if (block.type === "media-text" || block.type === "company-info" || block.type === "cta" || block.type === "proof") {
      const raw = block as unknown as Record<string, unknown>
      return [{ id: `${block.type}-${index}`, heading: industrySafeText(data, raw.headline ?? raw.title, "ご案内"), body: industrySafeText(data, raw.body ?? raw.subtitle, "詳しい内容は正式なご案内をご確認ください。") }]
    }
    return []
  })
  return sections.length >= 3 ? sections : fallback
}

function applyHome(data: DemoMultiPageData, page: PageSpec | undefined): DemoMultiPageData["pages"]["home"] {
  const current = data.pages.home
  const hero = page?.hero
  const cards = blockList(page, "cards").flatMap(blockItems).slice(0, 4)
  const features: DemoFeatureItem[] = cards.map((item, index) => {
    const row = item as Record<string, unknown>
    return {
      title: industrySafeText(data, row.title, current.features[index]?.title ?? "特徴"),
      description: industrySafeText(data, row.body, current.features[index]?.description ?? "詳しい内容をご案内します。"),
      icon: String(row.icon_emoji ?? current.features[index]?.icon ?? "sparkles"),
      metricLabel: "",
      metricValue: "",
      metricBench: "",
      severity: "info",
    }
  })
  const proofItems = blockList(page, "proof").flatMap(blockItems).slice(0, 4)
  const stats: DemoStatsItem[] = proofItems.map((item, index) => {
    const row = item as Record<string, unknown>
    return { amount: safeText(row.value, current.stats[index]?.amount ?? "—"), title: safeText(row.label, current.stats[index]?.title ?? "確認できる情報"), icon: "sparkles" }
  })
  return {
    ...current,
    hero: hero ? {
      ...current.hero,
      title: industrySafeText(data, hero.headline, current.hero.title),
      subtitle: industrySafeText(data, hero.subheadline, current.hero.subtitle),
      tagline: industrySafeText(data, hero.eyebrow, current.hero.tagline),
      primaryCta: { text: industrySafeText(data, hero.primary_cta?.label, current.hero.primaryCta.text), href: safeUrl(hero.primary_cta?.href, current.hero.primaryCta.href) },
      secondaryCta: { text: industrySafeText(data, hero.secondary_cta?.label, current.hero.secondaryCta.text), href: safeUrl(hero.secondary_cta?.href, current.hero.secondaryCta.href) },
    } : current.hero,
    features: features.length >= 2 ? features : current.features,
    stats: stats.length >= 2 ? stats : current.stats,
    narrativeModules: (() => {
      const sections = toSections(data, page, [])
      return (sections.length > 0 ? sections : []).slice(0, 4).map((section) => ({ eyebrow: "NOTE", title: section.heading, body: section.body, points: [] }))
    })(),
  }
}

function applyServices(data: DemoMultiPageData, page: PageSpec | undefined): DemoServicesPage {
  const current = data.pages.services
  const cards = blockList(page, "cards").flatMap(blockItems).slice(0, 8)
  const services = cards.map((item, index) => {
    const row = item as Record<string, unknown>
    return {
      title: industrySafeText(data, row.title, current.services[index]?.title ?? "サービス"),
      description: industrySafeText(data, row.body, current.services[index]?.description ?? "詳しい内容をご案内します。"),
      icon: String(row.icon_emoji ?? "sparkles"),
      features: Array.isArray(row.bullets) ? row.bullets.map((value) => industrySafeText(data, value, "確認事項")) : current.services[index]?.features ?? [],
    }
  })
  return { ...current, services: services.length >= 2 ? services : current.services }
}

export function applyDemoDesignSpec(data: DemoMultiPageData, spec: DemoDesignSpec): DemoMultiPageData {
  if (spec.slug !== data.slug && spec.company.name !== data.companyName) return data
  const creativeDirection = mapCreativeDirection(data, spec)
  const brand = brandSystemFromDesignSpec(spec, data)
  const designRecipe = data.designRecipe
    ? { ...data.designRecipe, creativeDirection, motionVariant: creativeDirection.motion }
    : {
        templateId: "hyper-personalized",
        heroVariant: creativeDirection.heroComposition,
        featureLayout: "editorial",
        serviceCardStyle: creativeDirection.serviceLayout,
        navStyle: spec.design_philosophy.navigation_style,
        footerStyle: "editorial",
        sectionOrder: ["hero", "intro", "services", "journal", "contact"],
        palette: { accent: brand.surfaceAlt, accentDark: brand.ink },
        density: creativeDirection.density,
        containerWidth: "wide",
        compositionVariant: 0,
        rhythmVariant: 0,
        motionVariant: creativeDirection.motion,
        typographyPreset: brand.id,
        creativeDirection,
      }
  const aboutSpec = pageFromSpec(spec, "about")
  const servicesSpec = pageFromSpec(spec, "services")
  const homeSpec = pageFromSpec(spec, "home")
  const about: DemoAboutPage = {
    ...data.pages.about,
    title: industrySafeText(data, aboutSpec?.title, data.pages.about.title),
    subtitle: industrySafeText(data, aboutSpec?.description, data.pages.about.subtitle),
    story: industrySafeText(data, spec.creative_brief.transformation_story, data.pages.about.story),
    mission: industrySafeText(data, spec.creative_brief.company_essence, data.pages.about.mission),
    chapters: toSections(data, aboutSpec, []).slice(0, 4).map((section) => ({ eyebrow: "STORY", title: section.heading, body: section.body, points: [] })),
  }
  return {
    ...data,
    brandSystem: brand,
    designRecipe,
    meta: { ...data.meta, footerDescription: safeText(spec.site.footer.tagline, data.meta.footerDescription ?? "") },
    pages: {
      ...data.pages,
      home: applyHome(data, homeSpec),
      about,
      services: applyServices(data, servicesSpec),
      works: data.pages.works ? { ...data.pages.works, sections: toSections(data, pageFromSpec(spec, "cases"), data.pages.works.sections) } : data.pages.works,
      faq: data.pages.faq ? { ...data.pages.faq, sections: toSections(data, pageFromSpec(spec, "faq"), data.pages.faq.sections) } : data.pages.faq,
      news: data.pages.news ? { ...data.pages.news, sections: toSections(data, pageFromSpec(spec, "blog"), data.pages.news.sections) } : data.pages.news,
    },
  }
}
