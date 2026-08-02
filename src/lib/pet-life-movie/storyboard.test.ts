import { describe, expect, it } from "vitest"
import { buildFactualStoryboard } from "./storyboard"
import type { PetMovieAssetRow, PetMovieProjectRow } from "./types"

function project(): PetMovieProjectRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    owner_user_id: null,
    access_token_hash: "a".repeat(64),
    share_slug: "private-share",
    pet_name: "Mugi",
    pet_species: "dog",
    occasion: "life",
    locale: "en",
    mood: "warm",
    time_together: "12 years together",
    memories: ["First walk by the river", "Sunday naps on the blue sofa", "Always waited by the front door"],
    status: "uploaded",
    plan: null,
    payment_status: "unpaid",
    stripe_checkout_session_id: null,
    stripe_payment_intent_id: null,
    customer_email: null,
    paid_at: null,
    refunded_at: null,
    deleted_at: null,
    storyboard: null,
    preview_url: null,
    delivery_url: null,
    privacy: "unlisted",
    share_enabled: true,
    expires_at: "2030-01-01T00:00:00.000Z",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  }
}

function assets(count: number): PetMovieAssetRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    project_id: "00000000-0000-4000-8000-000000000001",
    contributor_id: null,
    object_key: `photo-${index}.jpg`,
    file_name: `photo-${index}.jpg`,
    mime_type: "image/jpeg",
    size_bytes: 1000,
    sort_order: index,
    consent_confirmed: true,
    upload_status: "uploaded",
    analysis: {},
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  }))
}

describe("buildFactualStoryboard", () => {
  it("uses only supplied facts and marks the storyboard factual", () => {
    const input = project()
    const result = buildFactualStoryboard(input, assets(6))
    const allowedFacts = new Set([
      "The day Mugi came into our lives",
      input.time_together,
      ...input.memories,
      "Always part of the family.",
    ])
    expect(result.factualOnly).toBe(true)
    expect(result.scenes).toHaveLength(6)
    expect(result.scenes.every((scene) => allowedFacts.has(scene.caption))).toBe(true)
  })

  it("refuses to build a preview from fewer than five uploaded photos", () => {
    expect(() => buildFactualStoryboard(project(), assets(4))).toThrow("At least 5 uploaded photos")
  })
})

