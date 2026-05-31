import { describe, expect, it } from "vitest"
import {
  buildR2AssetPrefix,
  buildVideoAssetManifest,
  normalizeVideoProductionProfile,
  platformSpec,
} from "./video-production"

describe("video production profiles", () => {
  it("normalizes invalid values into a professional default", () => {
    const profile = normalizeVideoProductionProfile({
      productionGenre: "bad",
      voiceStyle: "bad",
      avatarStyle: "bad",
      captionStyle: "bad",
      storyFramework: "bad",
      qualityTier: "bad",
    })

    expect(profile).toEqual({
      productionGenre: "executive_diagnostic",
      voiceStyle: "calm_consultant",
      avatarStyle: "none",
      captionStyle: "clean_lower_third",
      storyFramework: "problem_agitate_solve",
      qualityTier: "professional",
    })
  })

  it("creates deterministic Cloudflare R2 prefixes per locale, company, job, and genre", () => {
    const prefix = buildR2AssetPrefix({
      locale: "en",
      companySlug: "Acme Japan Entry",
      jobType: "subscription_video",
      productionGenre: "japan_entry_pitch",
      createdAt: new Date("2026-05-31T00:00:00Z"),
    })

    expect(prefix).toBe("sales-videos/en/acme-japan-entry/2026-05/subscription_video/japan_entry_pitch/")
  })

  it("requires master video, captions, thumbnail, transcript, and metadata in the R2 manifest", () => {
    const profile = normalizeVideoProductionProfile({ productionGenre: "shorts_reel", captionStyle: "social_safe_area" })
    const manifest = buildVideoAssetManifest({
      r2Bucket: "paradigm-deliveries",
      r2AssetPrefix: "sales-videos/ja/example/2026-05/sales_video/shorts_reel/",
      platform: "shorts_9_16",
      profile,
    })

    expect(manifest.storage).toBe("cloudflare_r2")
    expect(manifest.required_outputs).toContain("master.mp4")
    expect(manifest.required_outputs).toContain("captions.srt")
    expect(manifest.required_outputs).toContain("render-metadata.json")
    expect(platformSpec("shorts_9_16")).toMatchObject({ ratio: "9:16", durationSec: 35 })
  })
})
