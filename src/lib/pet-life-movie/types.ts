export const PET_MOVIE_STATUSES = [
  "draft",
  "uploaded",
  "analyzing",
  "storyboard_ready",
  "preview_generating",
  "preview_ready",
  "payment_required",
  "full_rendering",
  "quality_check",
  "delivered",
  "expired",
  "deleted",
] as const

export type PetMovieStatus = (typeof PET_MOVIE_STATUSES)[number]
export type PetSpecies = "dog" | "cat"
export type PetOccasion = "life" | "birthday" | "adoption" | "growth" | "memorial"
export type PetMovieLocale = "ja" | "en" | "es" | "pt"
export type PetMovieMood = "warm" | "playful" | "cinematic" | "gentle"
export type PetMoviePlan = "mini" | "story" | "cinema"

export interface PetMovieProjectRow {
  id: string
  owner_user_id: string | null
  access_token_hash: string
  share_slug: string
  pet_name: string
  pet_species: PetSpecies
  occasion: PetOccasion
  locale: PetMovieLocale
  mood: PetMovieMood
  time_together: string
  memories: string[]
  status: PetMovieStatus
  plan: PetMoviePlan | null
  payment_status: "unpaid" | "pending" | "paid" | "refunded" | "failed"
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  customer_email: string | null
  paid_at: string | null
  refunded_at: string | null
  deleted_at: string | null
  storyboard: PetMovieStoryboard | null
  preview_url: string | null
  delivery_url: string | null
  privacy: "private" | "unlisted"
  share_enabled: boolean
  expires_at: string
  created_at: string
  updated_at: string
}

export interface PetMovieDeliverableRow {
  id: string
  project_id: string
  job_id: string
  name: string
  object_key: string
  mime_type: "video/mp4" | "video/webm"
  size_bytes: number
  sha256: string
  created_at: string
}

export interface PetMovieAssetRow {
  id: string
  project_id: string
  contributor_id: string | null
  object_key: string
  file_name: string
  mime_type: string
  size_bytes: number
  sort_order: number
  consent_confirmed: boolean
  upload_status: "pending" | "uploaded" | "failed"
  analysis: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface PetMovieScene {
  id: string
  assetId: string
  durationSeconds: number
  motion: "slow_zoom" | "pan_left" | "pan_right" | "parallax" | "ai_motion"
  caption: string
  source: "pet_name" | "time_together" | "memory" | "closing"
}

export interface PetMovieStoryboard {
  version: 1
  locale: PetMovieLocale
  title: string
  factualOnly: true
  durationSeconds: number
  scenes: PetMovieScene[]
  closing: string
}

export interface PetMoviePipelineManifest {
  version: 1
  identityProtection: {
    enabled: true
    fallbackThreshold: number
    fallbackMotion: "parallax"
  }
  stages: Array<{
    id: string
    provider: "real-esrgan" | "rembg" | "sam2" | "wan2.2-ti2v-5b" | "chatterbox" | "ace-step" | "ffmpeg"
    required: boolean
    endpointConfigured: boolean
  }>
}

