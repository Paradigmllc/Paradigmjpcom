import { describe, expect, it } from "vitest"

import { getFormat, listFormats, requireFormat, validateAllFormats, validateFormat } from "./registry"
import { queriesForSource } from "./types"
import { MANIM_EXPLAINER_JA } from "./definitions/manim-explainer-ja"

describe("format registry", () => {
  it("登録済みの形式がすべて自己矛盾なく定義されている", () => {
    expect(validateAllFormats()).toEqual([])
  })

  it("形式IDが重複していない", () => {
    const ids = listFormats().map((format) => format.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("すべての形式が検証仮説を持つ", () => {
    for (const format of listFormats()) {
      expect(format.hypothesis.trim().length).toBeGreaterThan(0)
    }
  })

  it("ComfyUIを使う形式はcheckpointを明示している", () => {
    for (const format of listFormats()) {
      if (format.visual.engine === "comfyui") {
        expect(format.visual.checkpoint, `${format.id} に checkpoint がありません`).toBeTruthy()
      }
    }
  })

  it("GPUを使う形式にはコスト上限が設定されている", () => {
    for (const format of listFormats()) {
      if (format.cost.gpuAllowed) {
        expect(format.cost.maxGpuMinutes).toBeGreaterThan(0)
        expect(format.cost.maxUsdPerVideo).toBeGreaterThan(0)
      }
    }
  })

  it("未登録IDはgetFormatでnull、requireFormatで例外になる", () => {
    expect(getFormat("does-not-exist")).toBeNull()
    expect(() => requireFormat("does-not-exist")).toThrow(/未登録の形式/)
  })

  it("登録済みIDを引ける", () => {
    expect(getFormat("manim-explainer-ja")?.label).toContain("解説")
  })
})

describe("queriesForSource", () => {
  it("ソース別指定があればそれを使う", () => {
    const research = {
      sources: ["hackernews" as const],
      seedQueries: ["what nobody tells you"],
      sourceQueries: { hackernews: ["cryptography"] },
      watchChannels: [],
    }
    expect(queriesForSource(research, "hackernews")).toEqual(["cryptography"])
  })

  it("ソース別指定が無ければ既定にフォールバックする", () => {
    const research = {
      sources: ["rss" as const],
      seedQueries: ["最新 まとめ"],
      sourceQueries: { hackernews: ["cryptography"] },
      watchChannels: [],
    }
    expect(queriesForSource(research, "rss")).toEqual(["最新 まとめ"])
  })

  it("空配列の指定は無効として既定にフォールバックする", () => {
    const research = { sources: [], seedQueries: ["既定"], sourceQueries: { rss: [] }, watchChannels: [] }
    expect(queriesForSource(research, "rss")).toEqual(["既定"])
  })
})

describe("validateFormat", () => {
  it("ComfyUI形式でcheckpointが無ければ検出する", () => {
    const broken = {
      ...MANIM_EXPLAINER_JA,
      id: "broken-comfy",
      visual: { engine: "comfyui" as const },
      cost: { ...MANIM_EXPLAINER_JA.cost, gpuAllowed: true, maxGpuMinutes: 5 },
    }
    const issues = validateFormat(broken)
    expect(issues.map((issue) => issue.field)).toContain("visual.checkpoint")
  })

  it("台本の目標尺と品質契約の目標尺のずれを検出する", () => {
    const broken = {
      ...MANIM_EXPLAINER_JA,
      id: "broken-duration",
      script: { ...MANIM_EXPLAINER_JA.script, targetSec: 999 },
    }
    expect(validateFormat(broken).map((issue) => issue.field)).toContain("script.targetSec")
  })

  it("検証仮説が空なら検出する", () => {
    const broken = { ...MANIM_EXPLAINER_JA, id: "broken-hypothesis", hypothesis: "   " }
    expect(validateFormat(broken).map((issue) => issue.field)).toContain("hypothesis")
  })

  it("LivePortrait指定でfaceRefが無ければ検出する", () => {
    const broken = {
      ...MANIM_EXPLAINER_JA,
      id: "broken-portrait",
      visual: {
        engine: "comfyui" as const,
        checkpoint: "animagine-xl-4.0.safetensors",
        character: { livePortrait: true },
      },
      cost: { gpuAllowed: true, maxGpuMinutes: 5, maxUsdPerVideo: 1 },
    }
    expect(validateFormat(broken).map((issue) => issue.field)).toContain("visual.character")
  })
})
