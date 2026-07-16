import type { DemoMultiPageData } from "./demo-site-types"

export type DemoArtDirectionId = "hospitality" | "beauty" | "precision" | "retail" | "corporate"

export interface DemoArtDirection {
  id: DemoArtDirectionId
  hero: "cinematic" | "editorial-split" | "precision-split" | "mosaic"
  serviceLayout: "editorial-list" | "salon-catalogue" | "precision-grid"
  worksLayout: "journal" | "salon-lookbook" | "case-grid"
  labels: {
    category: string
    place: string
    information: string
    story: string
    gallery: string
  }
}

const ART_DIRECTIONS: Record<string, DemoArtDirection> = {
  restaurant: {
    id: "hospitality",
    hero: "cinematic",
    serviceLayout: "editorial-list",
    worksLayout: "journal",
    labels: { category: "お店", place: "場所", information: "最新情報", story: "店について", gallery: "店の景色" },
  },
  beauty_salon: {
    id: "beauty",
    hero: "editorial-split",
    serviceLayout: "salon-catalogue",
    worksLayout: "salon-lookbook",
    labels: { category: "サロン", place: "エリア", information: "ご予約・最新情報", story: "サロンの考え方", gallery: "スタイル" },
  },
  dental: {
    id: "precision",
    hero: "precision-split",
    serviceLayout: "precision-grid",
    worksLayout: "case-grid",
    labels: { category: "診療", place: "所在地", information: "受診案内", story: "医院について", gallery: "院内紹介" },
  },
  construction: {
    id: "precision",
    hero: "precision-split",
    serviceLayout: "precision-grid",
    worksLayout: "case-grid",
    labels: { category: "事業", place: "拠点", information: "お問い合わせ", story: "仕事への姿勢", gallery: "施工・仕事" },
  },
  retail: {
    id: "retail",
    hero: "editorial-split",
    serviceLayout: "editorial-list",
    worksLayout: "journal",
    labels: { category: "お店", place: "場所", information: "店舗情報", story: "店について", gallery: "セレクション" },
  },
  accounting: {
    id: "corporate",
    hero: "precision-split",
    serviceLayout: "precision-grid",
    worksLayout: "case-grid",
    labels: { category: "事務所", place: "所在地", information: "ご相談・お問い合わせ", story: "事務所について", gallery: "ご支援の風景" },
  },
  cleaning: {
    id: "precision",
    hero: "editorial-split",
    serviceLayout: "editorial-list",
    worksLayout: "journal",
    labels: { category: "サービス", place: "対応エリア", information: "ご相談・お問い合わせ", story: "私たちについて", gallery: "サービスの風景" },
  },
  consulting: {
    id: "corporate",
    hero: "precision-split",
    serviceLayout: "precision-grid",
    worksLayout: "case-grid",
    labels: { category: "専門サービス", place: "拠点", information: "ご相談・お問い合わせ", story: "私たちについて", gallery: "ご支援の風景" },
  },
  "Hospitality / Food": {
    id: "hospitality",
    hero: "cinematic",
    serviceLayout: "editorial-list",
    worksLayout: "journal",
    labels: { category: "お店", place: "場所", information: "最新情報", story: "店について", gallery: "店の景色" },
  },
  "E-Commerce / Retail": {
    id: "retail",
    hero: "editorial-split",
    serviceLayout: "editorial-list",
    worksLayout: "journal",
    labels: { category: "ショップ", place: "所在地", information: "商品・お知らせ", story: "ブランドについて", gallery: "商品と空間" },
  },
}

const CORPORATE: DemoArtDirection = {
  id: "corporate",
  hero: "precision-split",
  serviceLayout: "precision-grid",
  worksLayout: "case-grid",
  labels: { category: "事業", place: "拠点", information: "お問い合わせ", story: "私たちについて", gallery: "仕事・実績" },
}

function normalized(value: string | undefined): string {
  return (value ?? "").replace(/[\s、。！？・／/「」『』（）()]/gu, "").toLowerCase()
}

export function resolveDemoArtDirection(page: Pick<DemoMultiPageData, "industry" | "designRecipe" | "presentation">): DemoArtDirection {
  const profile = page.presentation?.industryProfile ?? String(page.industry)
  const base = ART_DIRECTIONS[profile] ?? CORPORATE
  const creative = page.designRecipe?.creativeDirection
  if (!creative) return base
  return {
    ...base,
    hero: creative.heroComposition,
    serviceLayout: creative.serviceLayout,
    worksLayout: creative.worksLayout,
  }
}

export function demoHeadlineClass(value: string, scale: "hero" | "section" | "card" = "section"): string {
  const length = [...normalized(value)].length
  if (scale === "hero") {
    return length >= 18
      ? "text-[clamp(2.15rem,3.8vw,3.8rem)] leading-[1.2] tracking-[-.025em]"
      : "text-[clamp(2.3rem,4.3vw,4rem)] leading-[1.1] tracking-[-.03em]"
  }
  if (scale === "card") return "text-[clamp(1.25rem,1.8vw,1.8rem)] leading-[1.34] tracking-[-.015em]"
  return length >= 22
    ? "text-[clamp(1.9rem,3vw,3.1rem)] leading-[1.22] tracking-[-.025em]"
    : "text-[clamp(2rem,3.5vw,3.5rem)] leading-[1.16] tracking-[-.03em]"
}

export function demoHeadlineText(value: string): string {
  if (value.includes("\n")) return value
  const characters = [...value.trim()]
  if (characters.length < 18) return value

  const midpoint = characters.length / 2
  const punctuationBreaks = characters
    .map((character, index) => ({ character, index: index + 1 }))
    .filter(({ character, index }) => /[、。！？]/u.test(character) && index >= 7 && characters.length - index >= 7)
    .sort((left, right) => Math.abs(left.index - midpoint) - Math.abs(right.index - midpoint))
  const breakAt = punctuationBreaks[0]?.index ?? Math.ceil(characters.length / 2)

  return `${characters.slice(0, breakAt).join("")}\n${characters.slice(breakAt).join("")}`
}

export function hasRepeatedHomeNarrative(page: DemoMultiPageData): boolean {
  const heroTitle = normalized(page.pages.home.hero.title)
  const introTitle = normalized(page.premium?.intro.title)
  const introBody = normalized(page.premium?.intro.body)
  const aboutStory = normalized(page.pages.about.story)
  return Boolean(
    (heroTitle.length >= 10 && heroTitle === introTitle)
    || (introBody.length >= 50 && introBody === aboutStory),
  )
}
