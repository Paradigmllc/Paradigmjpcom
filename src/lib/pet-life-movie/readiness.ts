const PLAN_PRICE_ENVS = [
  "STRIPE_PRICE_PET_MOVIE_MINI",
  "STRIPE_PRICE_PET_MOVIE_STORY",
  "STRIPE_PRICE_PET_MOVIE_CINEMA",
] as const

function configured(name: string): boolean {
  return Boolean(process.env[name]?.trim())
}

export interface PetMovieMarketReadiness {
  checkoutEnabled: boolean
  rendererEnabled: boolean
  missing: string[]
}

export function getPetMovieMarketReadiness(): PetMovieMarketReadiness {
  const rendererEnabled = configured("VIDEO_FACTORY_INTERNAL_URL")
    && configured("PET_MOVIE_GPU_WORKFLOW_ID")
    && process.env.PET_MOVIE_GPU_RENDER_ENABLED?.trim() === "true"
  const required = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "RESEND_API_KEY",
    "PET_MOVIE_RATE_LIMIT_SALT",
    "PET_MOVIE_GPU_WORKFLOW_ID",
    "PET_MOVIE_GPU_RENDER_ENABLED",
    ...PLAN_PRICE_ENVS,
  ]
  const missing = required.filter((name) => !configured(name))
  if (!configured("VIDEO_FACTORY_INTERNAL_URL")) missing.push("VIDEO_FACTORY_INTERNAL_URL")
  if (configured("PET_MOVIE_GPU_RENDER_ENABLED") && process.env.PET_MOVIE_GPU_RENDER_ENABLED?.trim() !== "true") {
    missing.push("PET_MOVIE_GPU_RENDER_ENABLED=true")
  }
  return { checkoutEnabled: missing.length === 0, rendererEnabled, missing }
}
