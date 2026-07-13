import { describe, expect, it } from "vitest"
import { detectPublicSourceEvidence } from "./demo-multi-page-builder"
import { sourceManifestToCompanyMeta, validateDemoSourceManifest } from "./demo-source-policy"

function validManifest() {
  return {
    version: "2026-07-13.1" as const,
    mode: "reviewed_manifest" as const,
    collectionPolicy: "no_automated_fetch" as const,
    assetStrategy: "reviewed_real_assets" as const,
    sources: [{
      id: "official",
      type: "official_profile_link" as const,
      url: "https://www.instagram.com/example/",
      ownerLabel: "Example",
      verifiedAt: "2026-07-13T00:00:00.000Z",
      fetchPolicy: "never" as const,
    }],
    facts: [
      { key: "business_name", value: "Example", sourceId: "official", verified: true as const },
      { key: "service", value: "Baked goods", sourceId: "official", verified: true as const },
      { key: "hours", value: "Announced on the official account", sourceId: "official", verified: true as const },
    ],
    assets: [1, 2, 3].map((index) => ({
      id: `asset-${index}`,
      kind: "image" as const,
      sourceUrl: `https://assets.example.com/${index}.webp`,
      ownerLabel: "Example",
      sourceAccount: "https://www.instagram.com/example/",
      useBasis: "private_proposal" as const,
      officialSource: true,
      peopleVisible: false,
      watermarkVisible: false,
      alt: `Product ${index}`,
    })),
  }
}

describe("reviewed demo source manifest", () => {
  it("accepts operator-reviewed facts and assets without any fetch instruction", () => {
    const result = validateDemoSourceManifest(validManifest())
    expect(result.ok).toBe(true)
    expect(result.manifest?.sources.every((source) => source.fetchPolicy === "never")).toBe(true)
  })

  it("rejects automated source retrieval modes", () => {
    const input = validManifest() as Record<string, unknown>
    const sources = input.sources as Array<Record<string, unknown>>
    sources[0].fetchPolicy = "scrape"
    const result = validateDemoSourceManifest(input)
    expect(result.ok).toBe(false)
  })

  it("maps reviewed inputs to the existing quality-gated company meta", () => {
    const review = validateDemoSourceManifest(validManifest())
    expect(review.manifest).toBeDefined()
    const meta = sourceManifestToCompanyMeta(review.manifest!)
    expect(meta.skip_enrichment).toBe(true)
    expect(meta.official_instagram_url).toBe("https://www.instagram.com/example/")
    expect(meta.demo_media).toHaveLength(3)
  })

  it("recognizes a reviewed public registry as verified source evidence", () => {
    const base = validManifest()
    const manifest = {
      ...base,
      sources: [{
        ...base.sources[0],
        type: "public_registry" as const,
        url: "https://example.go.jp/registry.pdf",
      }],
    }
    const meta = sourceManifestToCompanyMeta(manifest)

    expect(detectPublicSourceEvidence({ meta })).toContain("public_registry")
  })
})
