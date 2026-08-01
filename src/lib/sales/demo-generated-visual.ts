import { createHash } from "node:crypto"
import { renderGeneratedScene } from "./demo-generated-scenes"

const INDUSTRY_LABELS: Record<string, string> = {
  restaurant: "飲食店",
  dental: "歯科・クリニック",
  beauty_salon: "美容サロン",
  construction: "建設・リフォーム",
  retail: "ショップ・小売",
  cleaning: "暮らしのサービス",
  accounting: "会計・税務",
  consulting: "専門サービス",
}

const SCENE_LABELS: Record<string, string[]> = {
  restaurant: ["店内の光", "一皿の時間", "季節の素材", "カウンターの景色", "香りの余韻", "夜のしつらえ"],
  dental: ["受付と待合", "診療の環境", "安心の設計", "院内の光", "ケアの時間", "通いやすさ"],
  beauty_salon: ["サロンの光", "スタイルの提案", "施術の時間", "鏡越しの景色", "素材と質感", "日常の余白"],
  construction: ["素材と光", "現場の仕事", "仕上がり", "住まいの表情", "手仕事の細部", "地域の景色"],
  retail: ["選ぶ時間", "店内の景色", "商品の質感", "季節の提案", "手に取る理由", "暮らしの余白"],
  cleaning: ["整える時間", "清潔の設計", "暮らしの景色", "細部の仕事", "安心の手触り", "日々の余白"],
  accounting: ["相談の時間", "資料と対話", "判断の景色", "仕事の細部", "信頼の設計", "次の一手"],
  consulting: ["相談の時間", "仕事の景色", "考える場所", "細部の設計", "対話の余白", "次の一手"],
}

const PALETTES = [
  { deep: "#111b20", mid: "#31525b", paper: "#f1e9d8", accent: "#d59a46" },
  { deep: "#231c20", mid: "#6d4750", paper: "#f5e5dd", accent: "#d08b6f" },
  { deep: "#102426", mid: "#2e6a6b", paper: "#e3f1ea", accent: "#d8b363" },
  { deep: "#1e2021", mid: "#5b5147", paper: "#f2eee3", accent: "#c88739" },
  { deep: "#17203a", mid: "#3f638f", paper: "#e4eff5", accent: "#e78479" },
] as const

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character] ?? character)
}

function paletteFor(seed: string): (typeof PALETTES)[number] {
  const hash = createHash("sha256").update(seed).digest().readUInt32BE(0)
  return PALETTES[hash % PALETTES.length] ?? PALETTES[0]
}

function safeIndex(value: number): number {
  return Number.isInteger(value) && value >= 1 && value <= 6 ? value : 1
}

function sceneLabel(industry: string, variant: number): string {
  return SCENE_LABELS[industry]?.[variant - 1] ?? SCENE_LABELS.consulting[variant - 1] ?? "仕事の景色"
}

/**
 * Deterministic, self-hosted editorial imagery for candidates without an
 * approved source photo. This is intentionally a layered scene rather than a
 * text card or abstract placeholder, so every existing demo improves when the
 * route is deployed—without an LLM call or an external image dependency.
 */
export function buildGeneratedDemoVisualSvg(input: {
  slug: string
  industry?: string | null
  variant: number
  label?: string | null
}): string {
  const variant = safeIndex(input.variant)
  const industry = input.industry?.trim() || "consulting"
  const businessLabel = input.label?.trim() || INDUSTRY_LABELS[industry] || "地域の事業者"
  const categoryLabel = INDUSTRY_LABELS[industry] || "専門サービス"
  const palette = paletteFor(`${input.slug}:${industry}:${variant}`)
  const safeBusinessLabel = escapeXml(businessLabel.slice(0, 80))
  const safeCategoryLabel = escapeXml(categoryLabel)
  const safeSceneLabel = escapeXml(sceneLabel(industry, variant))

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img" aria-labelledby="title desc">
  <title id="title">${safeBusinessLabel} — ${safeSceneLabel}</title>
  <desc id="desc">${safeCategoryLabel}の空間と仕事を表現した、高解像度の業種別イメージです。</desc>
  <defs>
    <linearGradient id="scene" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${palette.deep}"/><stop offset=".52" stop-color="${palette.mid}"/><stop offset="1" stop-color="#0b1012"/></linearGradient>
    <radialGradient id="light" cx="78%" cy="18%" r="78%"><stop stop-color="${palette.accent}" stop-opacity=".42"/><stop offset=".45" stop-color="${palette.accent}" stop-opacity=".12"/><stop offset="1" stop-color="${palette.accent}" stop-opacity="0"/></radialGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#fff" stop-opacity="0"/><stop offset=".48" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="48"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .08"/></feComponentTransfer></filter>
    <pattern id="fineGrid" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M56 0H0V56" fill="none" stroke="${palette.paper}" stroke-opacity=".055" stroke-width="1"/></pattern>
  </defs>
  <rect width="1600" height="1000" fill="#111"/>
  <rect width="1600" height="1000" fill="url(#light)"/>
  <circle cx="1240" cy="190" r="310" fill="${palette.accent}" opacity=".2" filter="url(#blur)"/>
  ${renderGeneratedScene(industry, palette, variant)}
  <rect width="1600" height="1000" fill="url(#sheen)" opacity=".22"/>
  <rect width="1600" height="1000" fill="url(#fineGrid)" opacity=".32"/>
  <rect width="1600" height="1000" filter="url(#grain)" opacity=".35"/>
  <path d="M0 0h1600v14H0Z" fill="${palette.accent}" opacity=".75"/>
  <path d="M96 896h210" stroke="${palette.paper}" stroke-opacity=".46" stroke-width="2"/>
  <circle cx="96" cy="896" r="5" fill="${palette.accent}"/>
</svg>`
}

export function generatedDemoVisualUrl(input: {
  origin: string
  slug: string
  industry?: string | null
  variant: number
}): string {
  const pathSlug = encodeURIComponent(input.slug)
  const params = new URLSearchParams({
    industry: input.industry?.trim() || "consulting",
    variant: String(safeIndex(input.variant)),
  })
  return `${input.origin.replace(/\/$/u, "")}/api/sales/demo-visuals/${pathSlug}/${safeIndex(input.variant)}?${params.toString()}`
}
