import type { PetMovieMood } from "./types"

export const PET_MOVIE_TEMPLATE_IDS = [
  "warm-keepsake",
  "playful-scrapbook",
  "cinematic-tribute",
] as const

export type PetMovieTemplateId = (typeof PET_MOVIE_TEMPLATE_IDS)[number]

export interface PetMovieTemplate {
  id: PetMovieTemplateId
  name: string
  description: string
  rhythm: string
  accent: string
  canvas: string
  transition: "focus-pull" | "paper-reveal" | "light-leak"
  transitionSeconds: number
}

export const PET_MOVIE_TEMPLATES: Record<PetMovieTemplateId, PetMovieTemplate> = {
  "warm-keepsake": {
    id: "warm-keepsake",
    name: "Warm Keepsake",
    description: "柔らかな紙と写真の質感で、日々の記憶を丁寧に綴る定番テンプレート。",
    rhythm: "slow-build-breathe-resolve",
    accent: "#D97A62",
    canvas: "#F7F1E8",
    transition: "focus-pull",
    transitionSeconds: 0.65,
  },
  "playful-scrapbook": {
    id: "playful-scrapbook",
    name: "Playful Scrapbook",
    description: "軽快な紙面切替と写真の方向感を活かし、元気な日常を描くテンプレート。",
    rhythm: "hook-bounce-hold-smile",
    accent: "#E8A838",
    canvas: "#F7F1E8",
    transition: "paper-reveal",
    transitionSeconds: 0.38,
  },
  "cinematic-tribute": {
    id: "cinematic-tribute",
    name: "Cinematic Tribute",
    description: "抑制した光と長い呼吸で、節目や追憶を映画のように残すテンプレート。",
    rhythm: "drift-build-peak-resolve",
    accent: "#8D7BAF",
    canvas: "#17131A",
    transition: "light-leak",
    transitionSeconds: 0.8,
  },
}

export function templateForMood(mood: PetMovieMood): PetMovieTemplateId {
  if (mood === "playful") return "playful-scrapbook"
  if (mood === "cinematic") return "cinematic-tribute"
  return "warm-keepsake"
}

export function resolvePetMovieTemplate(value: string | null | undefined): PetMovieTemplate {
  if (value && PET_MOVIE_TEMPLATE_IDS.includes(value as PetMovieTemplateId)) {
    return PET_MOVIE_TEMPLATES[value as PetMovieTemplateId]
  }
  return PET_MOVIE_TEMPLATES["warm-keepsake"]
}
