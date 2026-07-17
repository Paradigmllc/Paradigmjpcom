import { createHash } from "node:crypto"

const INDUSTRY_LABELS: Record<string, string> = {
  restaurant: "DINING / PLACE",
  dental: "CARE / WELLNESS",
  beauty_salon: "BEAUTY / RITUAL",
  construction: "CRAFT / BUILD",
  retail: "STORE / OBJECTS",
  cleaning: "CARE / HOME",
  accounting: "ADVISORY / TRUST",
  consulting: "STUDIO / THINKING",
}

const PALETTES = [
  ["#0d1b2a", "#1b4965", "#cae9ff", "#f6ae2d"],
  ["#201a23", "#5a3d5c", "#f5d0fe", "#f59e0b"],
  ["#102a2c", "#1e5b5c", "#d7f9f1", "#e9c46a"],
  ["#1d1d1f", "#4d4d4d", "#f5f5f0", "#d97706"],
  ["#161b33", "#344e8c", "#dbeafe", "#fb7185"],
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

function paletteFor(seed: string): readonly [string, string, string, string] {
  const hash = createHash("sha256").update(seed).digest().readUInt32BE(0)
  return PALETTES[hash % PALETTES.length] ?? PALETTES[0]
}

function safeIndex(value: number): number {
  return Number.isInteger(value) && value >= 1 && value <= 6 ? value : 1
}

function motif(industry: string, accent: string, muted: string, index: number): string {
  const offset = (index * 37) % 180
  if (industry === "restaurant") {
    return `<circle cx="1260" cy="255" r="150" fill="none" stroke="${accent}" stroke-width="2"/><circle cx="1260" cy="255" r="95" fill="none" stroke="${accent}" stroke-width="12" opacity=".55"/><path d="M1260 105v300M1110 255h300" stroke="${muted}" stroke-width="2" opacity=".7"/>`
  }
  if (industry === "dental") {
    return `<path d="M1220 100c-45 0-83 35-83 87 0 72 39 164 83 164s83-92 83-164c0-52-38-87-83-87Z" fill="none" stroke="${accent}" stroke-width="10"/><path d="M1165 196h110M1220 141v110" stroke="${muted}" stroke-width="2" opacity=".75"/>`
  }
  if (industry === "beauty_salon") {
    return `<path d="M1190 95c145 40 155 180 10 310-80-52-115-150-10-310Z" fill="none" stroke="${accent}" stroke-width="4"/><path d="M1200 120c-28 110-13 188 0 270M1240 122c45 105 42 179 12 260" stroke="${muted}" stroke-width="3" opacity=".7"/>`
  }
  if (industry === "construction") {
    return `<path d="M1110 360 1290 ${145 + offset % 60} 1470 360Z" fill="none" stroke="${accent}" stroke-width="8"/><path d="M1160 320h260M1210 270h160M1260 215v145" stroke="${muted}" stroke-width="3" opacity=".75"/>`
  }
  if (industry === "retail") {
    return `<rect x="1110" y="115" width="300" height="300" rx="150" fill="none" stroke="${accent}" stroke-width="9"/><path d="M1200 175v175M1320 175v175M1150 255h220" stroke="${muted}" stroke-width="2" opacity=".75"/>`
  }
  return `<path d="M1110 350 1260 120l150 230-150 230Z" fill="none" stroke="${accent}" stroke-width="7"/><path d="M1110 350h300M1260 120v460" stroke="${muted}" stroke-width="2" opacity=".7"/>`
}

export function buildGeneratedDemoVisualSvg(input: {
  slug: string
  industry?: string | null
  variant: number
  label?: string | null
}): string {
  const variant = safeIndex(input.variant)
  const industry = input.industry?.trim() || "consulting"
  const label = input.label?.trim() || INDUSTRY_LABELS[industry] || "LOCAL BUSINESS / STORY"
  const [background, surface, paper, accent] = paletteFor(`${input.slug}:${industry}:${variant}`)
  const safeLabel = escapeXml(label.toUpperCase().slice(0, 36))
  const safeIndustryLabel = escapeXml((INDUSTRY_LABELS[industry] || "LOCAL BUSINESS / STORY").toUpperCase())
  const safeVariant = String(variant).padStart(2, "0")
  const motifMarkup = motif(industry, accent, paper, variant)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img" aria-labelledby="title desc">
  <title id="title">${safeLabel} generated visual ${safeVariant}</title>
  <desc id="desc">A high-resolution editorial visual direction for a local business website.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${background}"/><stop offset="1" stop-color="${surface}"/></linearGradient>
    <radialGradient id="glow" cx="72%" cy="22%" r="70%"><stop stop-color="${accent}" stop-opacity=".45"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse"><path d="M42 0H0V42" fill="none" stroke="${paper}" stroke-opacity=".1" stroke-width="1"/></pattern>
    <filter id="blur"><feGaussianBlur stdDeviation="48"/></filter>
  </defs>
  <rect width="1600" height="1000" fill="url(#bg)"/>
  <rect width="1600" height="1000" fill="url(#grid)"/>
  <circle cx="1190" cy="195" r="270" fill="${accent}" opacity=".16" filter="url(#blur)"/>
  <rect width="1600" height="1000" fill="url(#glow)"/>
  <path d="M0 790C270 650 410 920 710 780s455-220 890-15V1000H0Z" fill="${paper}" opacity=".06"/>
  <g transform="translate(94 100)" fill="${paper}">
    <text x="0" y="0" font-family="Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="7" fill="${accent}">${safeLabel}</text>
    <text x="0" y="76" font-family="Georgia, serif" font-size="68" font-weight="400" letter-spacing="-1">A place with</text>
    <text x="0" y="152" font-family="Georgia, serif" font-size="68" font-weight="400" letter-spacing="-1">a point of view.</text>
    <rect x="0" y="212" width="360" height="2" fill="${paper}" opacity=".45"/>
    <text x="0" y="270" font-family="Arial, sans-serif" font-size="18" letter-spacing="2" opacity=".78">VISUAL DIRECTION / ${safeVariant}</text>
    <text x="0" y="304" font-family="Arial, sans-serif" font-size="14" letter-spacing="3" opacity=".58">${safeIndustryLabel}</text>
  </g>
  <g transform="translate(0 0)">${motifMarkup}</g>
  <g fill="${paper}" opacity=".74" font-family="Arial, sans-serif" font-size="16" letter-spacing="4">
    <text x="96" y="906">LOCAL / DISTINCT / CONSIDERED</text>
    <text x="1450" y="906" text-anchor="end">${safeVariant} — 06</text>
  </g>
  <rect x="94" y="850" width="70" height="3" fill="${accent}"/>
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
