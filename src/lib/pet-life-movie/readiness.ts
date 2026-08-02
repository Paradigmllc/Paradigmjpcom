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
  const required = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "RESEND_API_KEY",
    ...PLAN_PRICE_ENVS,
  ]
  const missing = required.filter((name) => !configured(name))
  if (!rendererEnabled) missing.push("VIDEO_FACTORY_INTERNAL_URL")
  return { checkoutEnabled: missing.length === 0, rendererEnabled, missing }
}
