import { describe, expect, it } from "vitest"

import { listFormats, requireFormat } from "../formats/registry"
import { getPattern, requirePattern } from "./patterns"
import { normalizeDraft, estimateDurationSec } from "./normalize"
import { buildScript, type DraftGenerator } from "./build"
import { composeSystemPrompt } from "./patterns/common"
import { deriveThumbnailText, minCharsPerScene } from "./compose"
import type { ScriptDraft, ScriptIdea } from "./types"

const SENTENCE = "計算の順序を入れ替えると結果が変わる場面をここで確認します。"

const IDEA: ScriptIdea = {
  topic: "計算順序と誤差",
  angle: "直観が破れる具体例から入る",
  keywords: ["浮動小数点", "誤差"],
  sources: [
    { claim: "誤差の蓄積", url: "https://example.com/ieee754", retrievedAt: "2026-08-01" },
  ],
}

/** 品質契約を満たすドラフトを組み立てる。テストごとに1箇所だけ壊す。 */
function draft(overrides: Partial<ScriptDraft> = {}): ScriptDraft {
  return {
    title: "計算の順序を入れ替えると",
    description: SENTENCE,
    tags: ["解説"],
    thumbnailText: ["計算の順序"],
    hook: SENTENCE,
    originalValue: {
      kind: "original_visualization",
      statement: "誤差の蓄積を図で可視化する。",
      evidenceSceneIndexes: [0],
    },
    scenes: Array.from({ length: 8 }, () => ({
      narration: SENTENCE.repeat(12),
      onScreenText: ["計算の順序"],
      visualSpec: { describe: "数直線上の丸め" },
      sourceUrls: [],
    })),
    ...overrides,
  }
}

describe("パターンレジストリと形式定義の整合", () => {
  it("すべての形式のpatternIdが実在する", () => {
    for (const format of listFormats()) {
      expect(getPattern(format.script.patternId), `${format.id} の ${format.script.patternId}`).toBeTruthy()
    }
  })

  it("未登録パターンは例外になる", () => {
    expect(() => requirePattern("no-such-pattern")).toThrow(/未登録の台本パターン/)
  })

  it("パターンのプロンプトに品質閾値と修復指示が反映される", () => {
    const format = requireFormat("manim-explainer-ja")
    const pattern = requirePattern(format.script.patternId)
    const prompt = composeSystemPrompt(
      { format, idea: IDEA, recentTitles: ["前回のタイトル"], repairNotes: ["サムネ文言が本編にありません。"] },
      pattern.role,
      pattern.structure,
    )
    expect(prompt).toContain(`毎分${format.quality.minNarrationCharsPerMinute}文字`)
    expect(prompt).toContain("前回のタイトル")
    expect(prompt).toContain("サムネ文言が本編にありません。")
  })
})

describe("normalizeDraft", () => {
  const format = requireFormat("manim-explainer-ja")
  const pattern = requirePattern(format.script.patternId)

  it("シーンIDと開始時刻を決定論的に振る", () => {
    const { script } = normalizeDraft({ draft: draft(), format, pattern, idea: IDEA, channelId: "ch1" })
    expect(script.scenes.map((scene) => scene.id).slice(0, 3)).toEqual(["s1", "s2", "s3"])
    expect(script.scenes[0].startSec).toBe(0)
    expect(script.scenes[1].startSec).toBe(script.scenes[0].durationSec)
  })

  it("尺をナレーション長と話速から見積もる", () => {
    const { script } = normalizeDraft({ draft: draft(), format, pattern, idea: IDEA, channelId: "ch1" })
    expect(script.scenes[0].durationSec).toBe(estimateDurationSec(SENTENCE.repeat(12), "ja"))
  })

  it("入力に無い根拠URLを破棄して警告する", () => {
    const withFakeUrl = draft({
      scenes: draft().scenes.map((scene, index) =>
        index === 0 ? { ...scene, sourceUrls: ["https://example.com/ieee754", "https://fake.invalid/x"] } : scene,
      ),
    })
    const { script, warnings } = normalizeDraft({ draft: withFakeUrl, format, pattern, idea: IDEA, channelId: "ch1" })
    expect(script.scenes[0].sources.map((source) => source.url)).toEqual(["https://example.com/ieee754"])
    expect(warnings.join()).toContain("fake.invalid")
  })

  it("存在しないシーン位置を指す固有価値を落として警告する", () => {
    const { script, warnings } = normalizeDraft({
      draft: draft({ originalValue: { kind: "original_analysis", statement: "独自の整理。", evidenceSceneIndexes: [0, 99] } }),
      format,
      pattern,
      idea: IDEA,
      channelId: "ch1",
    })
    expect(script.originalValue.evidenceSceneIds).toEqual(["s1"])
    expect(warnings.join()).toContain("index=99")
  })

  it("写実的でない形式には開示文を付けない", () => {
    const { script } = normalizeDraft({ draft: draft(), format, pattern, idea: IDEA, channelId: "ch1" })
    expect(script.synthetic.realisticPersonOrEvent).toBe(false)
    expect(script.synthetic.disclosureText).toBeNull()
  })

  it("写実的な形式には開示文を自動で付ける", () => {
    const shorts = requireFormat("ai-visual-shorts-en")
    const { script } = normalizeDraft({
      draft: draft(),
      format: shorts,
      pattern: requirePattern(shorts.script.patternId),
      idea: IDEA,
      channelId: "ch2",
    })
    expect(script.synthetic.realisticPersonOrEvent).toBe(true)
    expect(script.synthetic.disclosureText).toContain("AI-generated")
  })
})

describe("逐次生成 (sequential)", () => {
  const FORMAT = requireFormat("manim-explainer-ja")

  /**
   * 構成案 → シーン本文 の順に返す生成器。
   * 1回目は構成案、以降はシーン本文を返す(実際の LLM の呼ばれ方と同じ)。
   */
  function sequentialGenerator(options: {
    sceneCount: number
    charsPerScene: number
    prompts: string[]
    thumbnailText?: string[]
    sceneSourceUrls?: string[]
  }): DraftGenerator {
    let call = 0
    return async ({ systemPrompt }) => {
      options.prompts.push(systemPrompt)
      call += 1
      if (call === 1) {
        return {
          ok: true,
          draft: {
            title: "計算の順序を入れ替えると結果が変わる",
            description: SENTENCE,
            tags: ["解説"],
            thumbnailText: options.thumbnailText ?? ["計算の順序"],
            hook: SENTENCE,
            originalValue: {
              kind: "original_visualization",
              statement: "誤差の蓄積を図で可視化する。",
              evidenceSceneIndexes: [0],
            },
            scenes: Array.from({ length: options.sceneCount }, (_, i) => ({
              purpose: `第${i + 1}節の役割`,
              sourceUrls: options.sceneSourceUrls ?? [],
            })),
          } as unknown as ScriptDraft,
        }
      }
      const repeats = Math.ceil(options.charsPerScene / SENTENCE.length)
      return {
        ok: true,
        draft: {
          narration: SENTENCE.repeat(repeats),
          onScreenText: ["計算の順序"],
          visualSpec: { describe: "数直線" },
          sourceUrls: [],
        } as unknown as ScriptDraft,
      }
    }
  }

  it("構成案1回 + シーン数回の呼び出しになる", async () => {
    const prompts: string[] = []
    const result = await buildScript({
      formatId: "manim-explainer-ja",
      channelId: "ch1",
      idea: IDEA,
      generate: sequentialGenerator({ sceneCount: 8, charsPerScene: 400, prompts }),
    })
    expect(result.ok).toBe(true)
    // 構成案1 + シーン8 + メタ情報1
    expect(result.llmCalls).toBe(10)
    expect(result.script?.scenes.length).toBe(8)
  })

  it("シーン用プロンプトに下限文字数と担当範囲が入る", async () => {
    const prompts: string[] = []
    await buildScript({
      formatId: "manim-explainer-ja",
      channelId: "ch1",
      idea: IDEA,
      generate: sequentialGenerator({ sceneCount: 8, charsPerScene: 400, prompts }),
    })
    const expected = minCharsPerScene(FORMAT, 8)
    expect(prompts[0]).toContain("構成案だけを作ります")
    expect(prompts[1]).toContain(`${expected} 文字以上書く`)
    expect(prompts[1]).toContain("1 番目のシーンだけを書きます")
    expect(prompts[2]).toContain("2 番目のシーンだけを書きます")
  })

  it("2シーン目以降には直前のナレーションを見せる", async () => {
    const prompts: string[] = []
    await buildScript({
      formatId: "manim-explainer-ja",
      channelId: "ch1",
      idea: IDEA,
      generate: sequentialGenerator({ sceneCount: 8, charsPerScene: 400, prompts }),
    })
    expect(prompts[1]).toContain("これが最初のシーンです")
    expect(prompts[2]).toContain("直前のシーンのナレーション")
  })

  it("構成案が形式の上限を超えたら切り詰めて警告する", async () => {
    const prompts: string[] = []
    const result = await buildScript({
      formatId: "manim-explainer-ja",
      channelId: "ch1",
      idea: IDEA,
      maxAttempts: 1,
      generate: sequentialGenerator({ sceneCount: 30, charsPerScene: 400, prompts }),
    })
    expect(result.script?.scenes.length ?? 0).toBe(FORMAT.quality.maxSceneCount)
    expect(result.warnings.join()).toContain("切り詰め")
  })

  it("構成案が入力に無いURLを挙げたら除外して警告する", async () => {
    const prompts: string[] = []
    const result = await buildScript({
      formatId: "manim-explainer-ja",
      channelId: "ch1",
      idea: IDEA,
      maxAttempts: 1,
      generate: sequentialGenerator({
        sceneCount: 8,
        charsPerScene: 400,
        prompts,
        sceneSourceUrls: ["https://fabricated.invalid/x"],
      }),
    })
    expect(result.warnings.join()).toContain("入力に無いURL")
  })

  it("構成案の生成に失敗したら試行を打ち切る", async () => {
    const failing: DraftGenerator = async () => ({ ok: false, errorMessage: "llm down" })
    const result = await buildScript({
      formatId: "manim-explainer-ja",
      channelId: "ch1",
      idea: IDEA,
      maxAttempts: 2,
      generate: failing,
    })
    expect(result.ok).toBe(false)
    expect(result.llmCalls).toBe(2)
    expect(result.errorMessage).toContain("llm down")
  })
})

describe("deriveThumbnailText", () => {
  it("画面表示テキストから重複なく採る", () => {
    const scenes = [
      { onScreenText: ["計算の順序", "誤差"] },
      { onScreenText: ["計算の順序", "丸め"] },
    ]
    expect(deriveThumbnailText(scenes)).toEqual(["計算の順序", "誤差", "丸め"])
  })

  it("長すぎる文と短すぎる断片は落とす", () => {
    const scenes = [
      { onScreenText: ["あ", "これは画面に載せるには明らかに長すぎる説明文です", "誤差"] },
    ]
    expect(deriveThumbnailText(scenes)).toEqual(["誤差"])
  })

  it("3個までに絞る", () => {
    const scenes = [{ onScreenText: ["一", "二つ目", "三つ目", "四つ目", "五つ目"] }]
    expect(deriveThumbnailText(scenes).length).toBe(3)
  })

  it("画面表示テキストが無ければ空を返す", () => {
    expect(deriveThumbnailText([{ onScreenText: [] }, {}])).toEqual([])
  })
})

describe("minCharsPerScene", () => {
  it("目標尺と話速からシーンあたりの文字数を配分する", () => {
    const format = requireFormat("manim-explainer-ja")
    // 480秒 × 350文字/分 ÷ 8シーン = 350文字。モデルの目減り分1.35倍を上乗せする。
    expect(minCharsPerScene(format, 8)).toBe(473)
  })

  it("シーン数が増えれば1シーンあたりは減る", () => {
    const format = requireFormat("manim-explainer-ja")
    expect(minCharsPerScene(format, 16) < minCharsPerScene(format, 8)).toBe(true)
  })
})

describe("buildScript", () => {
  function generatorReturning(drafts: ScriptDraft[], captured: string[]): DraftGenerator {
    let index = 0
    return async ({ systemPrompt }) => {
      captured.push(systemPrompt)
      const next = drafts[Math.min(index, drafts.length - 1)]
      index += 1
      return { ok: true, draft: next }
    }
  }

  it("ゲートを通れば1回で完了する", async () => {
    const prompts: string[] = []
    const result = await buildScript({
      formatId: "manim-explainer-ja",
      channelId: "ch1",
      idea: IDEA,
      mode: "single",
      generate: generatorReturning([draft()], prompts),
    })
    expect(result.ok).toBe(true)
    expect(result.attempts.length).toBe(1)
    expect(result.script?.scenes.length).toBe(8)
  })

  it("却下されたら指摘を添えて再生成し、次で通れば成功する", async () => {
    const prompts: string[] = []
    // 1回目はサムネ文言が本編に無い。2回目は修正済み。
    const bad = draft({ thumbnailText: ["衝撃の真実がここに"] })
    const result = await buildScript({
      formatId: "manim-explainer-ja",
      channelId: "ch1",
      idea: IDEA,
      mode: "single",
      generate: generatorReturning([bad, draft()], prompts),
    })
    expect(result.ok).toBe(true)
    expect(result.attempts.length).toBe(2)
    // 2回目のプロンプトにゲートの指摘が差し戻されている。
    expect(prompts[1]).toContain("衝撃の真実がここに")
  })

  it("修復できなければ試行回数で打ち切り、最後のゲート結果を返す", async () => {
    const prompts: string[] = []
    const bad = draft({ thumbnailText: ["衝撃の真実がここに"] })
    const result = await buildScript({
      formatId: "manim-explainer-ja",
      channelId: "ch1",
      idea: IDEA,
      maxAttempts: 2,
      mode: "single",
      generate: generatorReturning([bad], prompts),
    })
    expect(result.ok).toBe(false)
    expect(result.script).toBeNull()
    expect(result.attempts.length).toBe(2)
    expect(result.gate?.findings.map((finding) => finding.code)).toContain("metadata.thumbnail_not_in_body")
  })

  it("直近作と酷似していれば却下される", async () => {
    const prompts: string[] = []
    const first = await buildScript({
      formatId: "manim-explainer-ja",
      channelId: "ch1",
      idea: IDEA,
      mode: "single",
      generate: generatorReturning([draft()], prompts),
    })
    const second = await buildScript({
      formatId: "manim-explainer-ja",
      channelId: "ch1",
      idea: IDEA,
      maxAttempts: 1,
      mode: "single",
      recentScripts: [first.script!],
      generate: generatorReturning([draft()], prompts),
    })
    expect(second.ok).toBe(false)
    expect(second.gate?.findings.map((finding) => finding.code)).toContain("repetition.script_similar")
  })

  it("生成器が失敗しても再試行し、最終的に失敗を返す", async () => {
    const failing: DraftGenerator = async () => ({ ok: false, errorMessage: "dify timeout" })
    const result = await buildScript({
      formatId: "manim-explainer-ja",
      channelId: "ch1",
      idea: IDEA,
      maxAttempts: 2,
      mode: "single",
      generate: failing,
    })
    expect(result.ok).toBe(false)
    expect(result.attempts.length).toBe(2)
    expect(result.errorMessage).toContain("dify timeout")
  })
})
