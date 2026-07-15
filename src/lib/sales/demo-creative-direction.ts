import type { DeepSeekArtDirection } from "./demo-deepseek-types"
import type {
  DemoCreativeDirection,
  DemoMultiPageData,
} from "./demo-site-types"
import type { DemoTemplate } from "./demo-templates/registry"

const TYPOGRAPHY_STYLES = ["editorial-serif", "humanist-sans", "modern-grotesk", "technical-sans"] as const
const HERO_COMPOSITIONS = ["cinematic", "editorial-split", "precision-split", "mosaic"] as const
const SERVICE_LAYOUTS = ["editorial-list", "salon-catalogue", "precision-grid"] as const
const WORKS_LAYOUTS = ["journal", "salon-lookbook", "case-grid"] as const
const PALETTE_MOODS = ["warm-neutral", "cool-professional", "earth", "monochrome", "soft-contrast"] as const
const DENSITIES = ["airy", "balanced", "compact"] as const
const MOTIONS = ["restrained", "editorial", "expressive"] as const
const SIGNATURE_MOTIFS = ["hairline", "numbered-index", "framed-media", "offset-grid", "kinetic-rail"] as const

function hashSeed(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function pick<T>(values: readonly T[], seed: number, salt: number): T {
  const index = (seed + Math.imul(salt, 2654435761)) >>> 0
  return values[index % values.length] ?? values[0]
}

export function buildDemoCreativeDirection(
  template: DemoTemplate,
  page: Pick<DemoMultiPageData, "companyName" | "industry"> & Partial<Pick<DemoMultiPageData, "premium">>,
  candidateIndex: number,
  generated?: DeepSeekArtDirection,
): DemoCreativeDirection {
  let direction: DemoCreativeDirection
  if (generated?.template_id === template.id) {
    direction = {
      source: "deepseek",
      concept: generated.concept,
      typographyStyle: generated.typography_style,
      heroComposition: generated.hero_composition,
      serviceLayout: generated.service_layout,
      worksLayout: generated.works_layout,
      paletteMood: generated.palette_mood,
      density: generated.density,
      motion: generated.motion,
      signatureMotif: generated.signature_motif,
    }
  } else {
    // A three-item fallback list caused every later company to collide with
    // one of the first three creative grammars. Derive each axis from the
    // company/template seed so a large reviewed batch remains visually
    // diverse while staying inside the renderer's bounded vocabulary.
    const seed = hashSeed(`${page.companyName}:${page.industry ?? "business"}:${template.id}:${candidateIndex}`)
    direction = {
      source: "deterministic",
      concept: `${page.companyName} ${String(page.industry ?? "business")} ${template.id} ${seed.toString(16)}`,
      typographyStyle: pick(TYPOGRAPHY_STYLES, seed, 1),
      heroComposition: pick(HERO_COMPOSITIONS, seed, 2),
      serviceLayout: pick(SERVICE_LAYOUTS, seed, 3),
      worksLayout: pick(WORKS_LAYOUTS, seed, 4),
      paletteMood: pick(PALETTE_MOODS, seed, 5),
      density: pick(DENSITIES, seed, 6),
      motion: pick(MOTIONS, seed, 7),
      signatureMotif: pick(SIGNATURE_MOTIFS, seed, 8),
    }
  }

  const primaryMedia = page.premium?.heroMedia[0]
  const needsMosaic = primaryMedia?.kind === "image"
    && (typeof primaryMedia.width !== "number"
      || typeof primaryMedia.height !== "number"
      || primaryMedia.width < 1_200
      || primaryMedia.height < 720)
  return needsMosaic && candidateIndex === 0
    ? { ...direction, heroComposition: "mosaic" }
    : direction
}

export function visualGrammar(value: DemoCreativeDirection): Record<string, string> {
  return {
    typographyStyle: value.typographyStyle,
    heroComposition: value.heroComposition,
    serviceLayout: value.serviceLayout,
    worksLayout: value.worksLayout,
    paletteMood: value.paletteMood,
    motion: value.motion,
  }
}

export function readCreativeDirection(value: unknown): DemoCreativeDirection | null {
  if (!isRecord(value) || !isRecord(value.creativeDirection)) return null
  const direction = value.creativeDirection
  if (!isOneOf(direction.source, ["deepseek", "deterministic"] as const)
    || typeof direction.concept !== "string"
    || !isOneOf(direction.typographyStyle, TYPOGRAPHY_STYLES)
    || !isOneOf(direction.heroComposition, HERO_COMPOSITIONS)
    || !isOneOf(direction.serviceLayout, SERVICE_LAYOUTS)
    || !isOneOf(direction.worksLayout, WORKS_LAYOUTS)
    || !isOneOf(direction.paletteMood, PALETTE_MOODS)
    || !isOneOf(direction.density, DENSITIES)
    || !isOneOf(direction.motion, MOTIONS)
    || !isOneOf(direction.signatureMotif, SIGNATURE_MOTIFS)) return null
  return {
    source: direction.source,
    concept: direction.concept,
    typographyStyle: direction.typographyStyle,
    heroComposition: direction.heroComposition,
    serviceLayout: direction.serviceLayout,
    worksLayout: direction.worksLayout,
    paletteMood: direction.paletteMood,
    density: direction.density,
    motion: direction.motion,
    signatureMotif: direction.signatureMotif,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isOneOf<const T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === "string" && options.some((option) => option === value)
}
