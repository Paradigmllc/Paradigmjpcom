import { createHash } from "node:crypto"
import { PET_MOVIE_TABLES, requirePetMovieDatabase } from "@/lib/pet-life-movie/data"
import type { PetMarketingAttributionInput } from "./types"

function attributionSalt(): string {
  const salt = [
    process.env.PET_MOVIE_ATTRIBUTION_SALT,
    process.env.ADMIN_SESSION_SECRET,
    process.env.PAYLOAD_SECRET,
  ].map((value) => value?.trim()).find((value): value is string => Boolean(value && value.length >= 16))
  if (!salt) throw new Error("Pet Life Movie attribution salt is not configured")
  return salt
}

function optional(value: string | undefined): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function referrerHost(referrer: string | undefined): string | null {
  if (!referrer) return null
  try {
    return new URL(referrer).hostname.slice(0, 200)
  } catch (error) {
    console.error("[pet-marketing-attribution] invalid referrer", error)
    return null
  }
}

export async function recordPetMarketingAttribution(
  input: PetMarketingAttributionInput,
): Promise<void> {
  const database = requirePetMovieDatabase()
  const anonymousIdHash = createHash("sha256")
    .update(`${attributionSalt()}:${input.anonymousId}`, "utf8")
    .digest("hex")
  const { error } = await database.from(PET_MOVIE_TABLES.MARKETING_EVENTS).insert({
    event_name: input.eventName,
    anonymous_id_hash: anonymousIdHash,
    locale: input.locale,
    market: optional(input.market),
    path: input.path,
    referrer_host: referrerHost(input.referrer),
    utm_source: optional(input.utmSource),
    utm_medium: optional(input.utmMedium),
    utm_campaign: optional(input.utmCampaign),
    utm_content: optional(input.utmContent),
  })
  if (error) throw new Error(`Attribution event insert failed: ${error.message}`)
}
