import type {
  PetMovieAssetRow,
  PetMoviePipelineManifest,
  PetMovieProjectRow,
  PetMovieScene,
  PetMovieStoryboard,
} from "./types"
import { templateForMood } from "./templates"

const copy = {
  ja: { title: (name: string) => `${name}との大切な時間`, opening: (name: string) => `${name}と出会えたこと`, closing: "ずっと、たいせつな家族。" },
  en: { title: (name: string) => `A life with ${name}`, opening: (name: string) => `The day ${name} came into our lives`, closing: "Always part of the family." },
  es: { title: (name: string) => `Una vida con ${name}`, opening: (name: string) => `El día que ${name} llegó a nuestra vida`, closing: "Siempre parte de la familia." },
  pt: { title: (name: string) => `Uma vida com ${name}`, opening: (name: string) => `O dia em que ${name} chegou à nossa vida`, closing: "Sempre parte da família." },
} as const

const motions: PetMovieScene["motion"][] = ["slow_zoom", "pan_left", "parallax", "pan_right"]

export function buildFactualStoryboard(project: PetMovieProjectRow, assets: PetMovieAssetRow[]): PetMovieStoryboard {
  if (assets.length < 5) throw new Error("At least 5 uploaded photos are required")
  const language = copy[project.locale]
  const facts = [
    { caption: language.opening(project.pet_name), source: "pet_name" as const },
    ...(project.time_together ? [{ caption: project.time_together, source: "time_together" as const }] : []),
    ...project.memories.slice(0, 3).map((caption) => ({ caption, source: "memory" as const })),
    { caption: language.closing, source: "closing" as const },
  ]
  const sceneCount = Math.max(5, Math.min(8, facts.length))
  const scenes = Array.from({ length: sceneCount }, (_, index): PetMovieScene => {
    const fact = facts[Math.min(index, facts.length - 1)]
    const asset = assets[index % assets.length]
    return {
      id: `scene-${index + 1}`,
      assetId: asset.id,
      durationSeconds: 2,
      motion: motions[index % motions.length],
      caption: fact.caption,
      source: fact.source,
    }
  })
  return {
    version: 2,
    locale: project.locale,
    title: language.title(project.pet_name),
    templateId: templateForMood(project.mood),
    factualOnly: true,
    durationSeconds: scenes.reduce((total, scene) => total + scene.durationSeconds, 0),
    scenes,
    closing: language.closing,
  }
}

function configured(name: string): boolean {
  const value = process.env[name]
  return Boolean(value && value.trim())
}

export function buildPipelineManifest(): PetMoviePipelineManifest {
  return {
    version: 1,
    identityProtection: { enabled: true, fallbackThreshold: 0.78, fallbackMotion: "parallax" },
    stages: [
      {
        id: "compose",
        provider: "ffmpeg",
        required: true,
        endpointConfigured: configured("PET_MOVIE_RENDERER_API_URL") || configured("VIDEO_FACTORY_INTERNAL_URL"),
      },
    ],
  }
}

