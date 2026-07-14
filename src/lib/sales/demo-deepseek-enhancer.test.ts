import { describe, expect, it } from "vitest"
import {
  DEMO_COPY_MAX_TOKENS,
  DEMO_COPY_TIMEOUT_MS,
  extractVerifiedPublicFacts,
} from "./demo-deepseek-enhancer"
import { buildJapaneseUserPrompt } from "./demo-deepseek-prompts"
import type { DemoTemplate } from "./demo-templates/registry"
import { parseDeepSeekOutput } from "./demo-deepseek-client"

describe("DeepSeek V4 full-site generation budget", () => {
  it("allows complete non-thinking multi-page JSON without model fallback", () => {
    expect(DEMO_COPY_MAX_TOKENS).toBeGreaterThanOrEqual(8_192)
    expect(DEMO_COPY_TIMEOUT_MS).toBeGreaterThanOrEqual(180_000)
  })
})

describe("extractVerifiedPublicFacts", () => {
  it("serializes only scalar verified facts", () => {
    const result = extractVerifiedPublicFacts({
      public_facts: {
        address: "東京都世田谷区桜2丁目10-7",
        specialty: "フレンチトーストとドリップコーヒー",
        nested: { unsupported: true },
      },
    })

    expect(result).toContain("address: 東京都世田谷区桜2丁目10-7")
    expect(result).toContain("specialty: フレンチトーストとドリップコーヒー")
    expect(result).not.toContain("unsupported")
  })

  it("returns an explicit empty marker when facts are unavailable", () => {
    expect(extractVerifiedPublicFacts(null)).toBe("（確認済み公開情報なし）")
  })
})

describe("DeepSeek prompt cache layout", () => {
  it("keeps a long identical prefix and moves company-specific input to the suffix", () => {
    const tokens = {} as DemoTemplate["designTokens"]
    const common = ["", "", "", "ja", "", "split", "grid", "bordered", "minimal", tokens] as const
    const first = buildJapaneseUserPrompt("Cafe A", "restaurant", "東京都", "a.example", "unknown", ...common, "- specialty: coffee")
    const second = buildJapaneseUserPrompt("Cafe B", "restaurant", "大阪府", "b.example", "unknown", ...common, "- specialty: tea")
    const marker = "【企業固有入力・ここから末尾だけ案件ごとに変化】"
    const firstMarker = first.indexOf(marker)
    const secondMarker = second.indexOf(marker)

    expect(firstMarker).toBeGreaterThan(1_500)
    expect(first.slice(0, firstMarker)).toBe(second.slice(0, secondMarker))
    expect(first.indexOf("Cafe A")).toBeGreaterThan(firstMarker)
    expect(second.indexOf("Cafe B")).toBeGreaterThan(secondMarker)
    expect(first).not.toContain('"faq"')
    expect(first).not.toContain('"contact"')
    expect(first).toContain('"art_directions"')
    expect(first).toContain("候補間で明確に異なる")
  })
})

describe("DeepSeek executable art direction parsing", () => {
  it("keeps three bounded visual directions in the shared response", () => {
    const artDirections = [
      ["zenith", "editorial-serif", "cinematic", "hairline"],
      ["aether", "humanist-sans", "mosaic", "offset-grid"],
      ["prism", "technical-sans", "precision-split", "numbered-index"],
    ].map(([template_id, typography_style, hero_composition, signature_motif], index) => ({
      template_id,
      concept: `企業固有のデザイン構想 ${index + 1}`,
      typography_style,
      hero_composition,
      service_layout: index === 1 ? "salon-catalogue" : index === 0 ? "editorial-list" : "precision-grid",
      works_layout: index === 1 ? "salon-lookbook" : index === 0 ? "journal" : "case-grid",
      palette_mood: index === 0 ? "warm-neutral" : "cool-professional",
      density: index === 0 ? "airy" : "balanced",
      motion: index === 2 ? "restrained" : "editorial",
      signature_motif,
    }))
    const parsed = parseDeepSeekOutput(JSON.stringify({
      home: { hero_title: "見出し", hero_subtitle: "本文", features: [] },
      about: {},
      services: {},
      contact: {},
      art_directions: artDirections,
    }), "ja")

    expect(parsed?.artDirections).toHaveLength(3)
    expect(new Set(parsed?.artDirections.map((direction) => direction.template_id))).toEqual(new Set(["zenith", "aether", "prism"]))
    expect(parsed?.artDirections[1]?.hero_composition).toBe("mosaic")
  })
})
