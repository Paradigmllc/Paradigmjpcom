import { describe, expect, it } from "vitest"

import type { Scene, VideoScript } from "../formats/types"
import { buildComposition, buildTimeline } from "./hyperframes"
import { buildCaptionCues, resolveCueOverlaps, splitByPunctuation } from "./captions"
import { diversifyLayouts, normalizeItem, normalizeLayout, normalizeLayoutName } from "./layouts"
import { formatRate } from "./tts"
import type { SceneAudio } from "./tts"

function scene(
  id: string,
  durationSec: number,
  onScreenText: string[],
  spec: Record<string, unknown> = {},
  sourceCount = 0,
): Scene {
  return {
    id,
    startSec: 0,
    durationSec,
    narration: "ナレーション本文です。",
    onScreenText,
    visual: { kind: "html", spec },
    sources: Array.from({ length: sourceCount }, (_, i) => ({
      claim: `根拠${i}`,
      url: `https://example.com/${i}`,
      retrievedAt: "2026-08-07",
    })),
  }
}

function script(scenes: Scene[]): VideoScript {
  return {
    formatId: "news-trend-ja",
    channelId: "ch-test",
    title: "テスト動画",
    description: "説明",
    tags: [],
    thumbnailText: ["見出し"],
    hook: "掴み",
    scenes,
    originalValue: { kind: "original_analysis", statement: "独自の整理", evidenceSceneIds: ["s1"] },
    synthetic: { syntheticVoice: true, syntheticVisuals: false, realisticPersonOrEvent: false, disclosureText: null },
  }
}

function audio(sceneId: string, actual: number, estimated: number, segments: SceneAudio["segments"] = []): SceneAudio {
  return { sceneId, filePath: `audio/${sceneId}.mp3`, actualDurationSec: actual, estimatedDurationSec: estimated, segments }
}

const TIMELINE_SPEC = {
  layout: "timeline",
  items: [
    { date: "2026-08-05", text: "税率を8%へ引き下げ" },
    { date: "2028-08-01", text: "10%へ戻す予定" },
  ],
}

/* ───── layouts ───── */

describe("normalizeItem", () => {
  it("時間軸キーと内容キーを別々に拾う", () => {
    expect(normalizeItem({ date: "2026-08-05", text: "発表" })).toEqual({ marker: "2026-08-05", body: "発表" })
    expect(normalizeItem({ year: 2026, label: "見直し" })).toEqual({ marker: "2026", body: "見直し" })
    expect(normalizeItem({ event: "再増税", date: "2028-8" })).toEqual({ marker: "2028-8", body: "再増税" })
  })

  it("文字列の項目も扱う", () => {
    expect(normalizeItem("財源確保の課題")).toEqual({ marker: "", body: "財源確保の課題" })
  })

  it("モデルが出したURLを取り込まない", () => {
    // 実測で存在しない画像URLを生成していた。根拠URLと同じ扱いにする。
    expect(normalizeItem({ text: "写真 https://j-cast.com/image/x.jpg あり" })?.body).toBe("写真  あり")
  })

  it("数値を持つ兄弟キーを捨てない", () => {
    // 最初の内容キーだけを読むと 820万台 が消え、本文からも図表からも数量が失われていた。
    expect(normalizeItem({ name: "中国", value: "820万台" })).toEqual({ marker: "820万台", body: "中国" })
  })

  it("時間軸キーがあるときは数値の兄弟キーで上書きしない", () => {
    expect(normalizeItem({ date: "2026", label: "見直し", value: "42%" })).toEqual({
      marker: "2026",
      body: "見直し",
    })
  })

  it("数値でない兄弟キーは marker にしない", () => {
    expect(normalizeItem({ name: "中国", detail: "拡大が続く" })).toEqual({ marker: "", body: "中国" })
  })

  it("中身が無ければ null", () => {
    expect(normalizeItem({})).toBeNull()
    expect(normalizeItem(null)).toBeNull()
  })
})

describe("normalizeLayoutName", () => {
  it("表記ゆれを扱える種類に丸める", () => {
    expect(normalizeLayoutName("timeline", 3)).toBe("timeline")
    expect(normalizeLayoutName("two-columns", 2)).toBe("columns")
    expect(normalizeLayoutName("comparison", 2)).toBe("columns")
    expect(normalizeLayoutName("quote", 1)).toBe("quote")
  })

  it("未知のレイアウトは項目数から決める", () => {
    expect(normalizeLayoutName("CENTER", 2)).toBe("columns")
    expect(normalizeLayoutName("CENTER", 4)).toBe("timeline")
    expect(normalizeLayoutName("CENTER", 1)).toBe("headline")
  })
})

describe("normalizeLayout", () => {
  it("items が無ければ onScreenText を項目にする", () => {
    const result = normalizeLayout({ layout: "CENTER" }, ["一行目", "二行目"])
    expect(result.items.map((item) => item.body)).toEqual(["一行目", "二行目"])
  })
})

describe("diversifyLayouts", () => {
  it("同じレイアウトの連続を崩す", () => {
    // 実測ではモデルが7シーン中5シーンで timeline を指定してきた。
    const result = diversifyLayouts(["timeline", "timeline", "timeline", "columns"])
    expect(result[0] === result[1]).toBe(false)
    expect(result[1] === result[2]).toBe(false)
  })
})

/* ───── captions ───── */

describe("splitByPunctuation", () => {
  it("句読点を前のかたまりに残して割る", () => {
    expect(splitByPunctuation("首相は述べた、これは一時的だ。")).toEqual(["首相は述べた、", "これは一時的だ。"])
  })
})

describe("buildCaptionCues", () => {
  it("上限に収まる文は割らない", () => {
    const cues = buildCaptionCues([
      { text: "首相は述べました、これは一時的な措置です。", startSec: 10, durationSec: 6 },
    ])
    expect(cues.length).toBe(1)
    expect(cues[0].startSec).toBe(10)
  })

  it("上限を超える文は句読点で割り、開始時刻は保つ", () => {
    const cues = buildCaptionCues(
      [{ text: "首相は述べました、これは一時的な措置です。", startSec: 10, durationSec: 6 }],
      { maxChars: 12 },
    )
    expect(cues.length).toBe(2)
    expect(cues[0].startSec).toBe(10)
    // 最後のキューは文の終わりに揃える。
    const last = cues[cues.length - 1]
    expect(Math.round(last.startSec + last.durationSec)).toBe(16)
  })

  it("長すぎる句をさらに詰める", () => {
    const long = "あ".repeat(70)
    const cues = buildCaptionCues([{ text: long, startSec: 0, durationSec: 10 }], { maxChars: 20 })
    expect(cues.length).toBeGreaterThan(2)
    for (const cue of cues) expect(cue.text.length <= 20).toBe(true)
  })
})

describe("resolveCueOverlaps", () => {
  it("重なりを切り捨てで解消する", () => {
    // 四捨五入だと丸め上げで重なりが復活する。実測で0.08秒残った。
    const resolved = resolveCueOverlaps([
      { text: "A", startSec: 0, durationSec: 5 },
      { text: "B", startSec: 3.333, durationSec: 2 },
    ])
    expect(resolved[0].startSec + resolved[0].durationSec <= 3.333).toBe(true)
  })
})

/* ───── tts ───── */

describe("formatRate", () => {
  it("正負の符号を付ける", () => {
    expect(formatRate(10)).toBe("+10%")
    expect(formatRate(-15)).toBe("-15%")
    expect(formatRate(0)).toBeNull()
  })
})

/* ───── composition ───── */

describe("buildTimeline", () => {
  const SCRIPT = script([scene("s1", 30, ["見出し"]), scene("s2", 20, ["次"])])
  const AUDIOS = [audio("s1", 31.64, 30), audio("s2", 18.21, 20)]

  it("見積もりではなく音声の実測尺を使う", () => {
    const timeline = buildTimeline(SCRIPT, AUDIOS)
    expect(timeline[0].durationSec).toBe(31.64)
    expect(timeline[1].startSec).toBe(31.64)
  })

  it("音声が無いシーンは台本の見積もりを使う", () => {
    expect(buildTimeline(SCRIPT, [AUDIOS[0]])[1].durationSec).toBe(20)
  })
})

describe("buildComposition", () => {
  const SCRIPT = script([
    scene("s1", 30, ["食料品の税率を引き下げ"], TIMELINE_SPEC, 2),
    scene("s2", 20, ["財源の課題"], { layout: "two-columns", items: [{ text: "課題A" }, { text: "課題B" }] }),
  ])
  const AUDIOS = [
    audio("s1", 30, 30, [{ text: "首相は述べました、一時的な措置です。", startSec: 0, durationSec: 6 }]),
    audio("s2", 20, 20, []),
  ]
  const result = buildComposition(SCRIPT, AUDIOS, { channelLabel: "TEST CH" })

  it("完全なHTML文書を出す", () => {
    expect(result.html.startsWith("<!DOCTYPE html>")).toBe(true)
  })

  it("visualSpec の構造をマークアップに反映する", () => {
    // 初版はここを捨てて全シーン同じ見た目になっていた。
    expect(result.html).toContain('class="tl-marker">2026-08-05')
    expect(result.html).toContain("税率を8%へ引き下げ")
    expect(result.html).toContain('class="columns"')
  })

  it("項目ごとにビートを振って順番に出す", () => {
    // 1シーン=1静止画面にしないための仕掛け。
    expect(result.html).toContain("data-beat='0'")
    expect(result.html).toContain("data-beat='1'")
  })

  it("発話区間から字幕クリップを作る", () => {
    expect(result.captionCount).toBeGreaterThan(0)
    expect(result.html).toContain('class="caption clip"')
  })

  it("発話区間が無いシーンは字幕を作らない", () => {
    // s2 は segments が空。字幕なしでも成立させる。
    const s2Captions = (result.html.match(/data-track-index="40"/g) ?? []).length
    expect(s2Captions).toBe(result.captionCount)
  })

  it("タイムド要素に clip クラスを付ける", () => {
    expect(result.html).toContain('id="s1" class="scene clip layout-timeline"')
    expect(result.html).toContain('<audio id="a-s1" class="clip"')
  })

  it("隣り合うシーンと音声を別トラックに置く", () => {
    expect(result.html).toContain('data-track-index="1"')
    expect(result.html).toContain('data-track-index="2"')
    expect(result.html).toContain('data-track-index="5"')
    expect(result.html).toContain('data-track-index="6"')
  })

  it("背景と進捗バーを全編動かす", () => {
    expect(result.html).toContain('tl.fromTo(".bg-drift"')
    expect(result.html).toContain('tl.fromTo(".progress-fill"')
  })

  it("最終シーン以外に退場アニメーションを付けない", () => {
    expect(result.html.includes('tl.to("#s1"')).toBe(false)
    expect(result.html).toContain('tl.to("#s2"')
  })

  it("HTMLを含むテキストをエスケープする", () => {
    const risky = script([scene("s1", 10, ['<img src=x onerror="alert(1)">'])])
    const html = buildComposition(risky, []).html
    expect(html).toContain("&lt;img")
    expect(html.includes("<img src=x")).toBe(false)
  })
})

/* ───── 図表の組み込み ───── */

describe("composition figures", () => {
  const STAT_SPEC = { layout: "stat", items: ["45% が導入済み"] }
  const QUOTE_SPEC = { layout: "quote", items: ["引用された一文"] }

  it("数値の読めるシーンにはSVG図表が入る", () => {
    const result = buildComposition(
      script([scene("s1", 6, ["導入率"], STAT_SPEC), scene("s2", 6, ["経緯"], TIMELINE_SPEC)]),
      [audio("s1", 6, 6), audio("s2", 6, 6)],
    )
    expect(result.html).toContain('<svg class="figure"')
    // 図の段階表示は既存のビート機構に載る。
    expect(result.html).toContain('<g data-beat="0">')
  })

  it("引用シーンには図表を足さない", () => {
    const result = buildComposition(
      script([scene("s1", 6, ["引用"], QUOTE_SPEC)]),
      [audio("s1", 6, 6)],
    )
    expect(result.html).not.toContain('<svg class="figure"')
  })

  it("同じ台本からは同じHTMLが出る(決定論)", () => {
    const build = () =>
      buildComposition(
        script([scene("s1", 6, ["導入率"], STAT_SPEC)]),
        [audio("s1", 6, 6)],
      ).html
    expect(build()).toBe(build())
  })
})
