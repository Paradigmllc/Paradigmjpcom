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

export function resolveDemoArtDirection(page: Pick<DemoMultiPageData, "industry" | "designRecipe">): DemoArtDirection {
  const base = ART_DIRECTIONS[String(page.industry)] ?? CORPORATE
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
      ? "text-[clamp(2.05rem,3.55vw,3.2rem)] leading-[1.18] tracking-[-.03em]"
      : "text-[clamp(2.45rem,4.8vw,5rem)] leading-[1.06] tracking-[-.04em]"
  }
  if (scale === "card") return "text-[clamp(1.45rem,2.1vw,2rem)] leading-[1.28] tracking-[-.025em]"
  return length >= 22
    ? "text-[clamp(2rem,3.5vw,3.35rem)] leading-[1.2] tracking-[-.03em]"
    : "text-[clamp(2.25rem,4vw,4rem)] leading-[1.12] tracking-[-.035em]"
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
