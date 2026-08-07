import { describe, expect, it } from "vitest"

import {
  buildColumnsFigure,
  buildFigure,
  buildStatFigure,
  buildTimelineFigure,
  parseNumber,
} from "./figures"
import type { LayoutItem } from "./layouts"

const item = (marker: string, body: string): LayoutItem => ({ marker, body })

describe("parseNumber", () => {
  it("百分率を割合として読む", () => {
    expect(parseNumber("45%")).toEqual({ value: 45, display: "45%", isPercent: true })
    expect(parseNumber("全角の ７ ではなく 62％ を読む")?.isPercent).toBe(true)
  })

  it("桁単位を掛けて比較可能な実数にする", () => {
    expect(parseNumber("3,200億円")?.value).toBe(320_000_000_000)
    expect(parseNumber("15万人")?.value).toBe(150_000)
  })

  it("桁区切りと小数を落とさない", () => {
    expect(parseNumber("1,234.5倍")?.value).toBe(1234.5)
  })

  it("助数詞まで表記に残す", () => {
    // 「820万」で切ると台数なのか金額なのか読めなくなる。
    expect(parseNumber("820万台")?.display).toBe("820万台")
    expect(parseNumber("3,200億円")?.display).toBe("3,200億円")
    expect(parseNumber("820万台")?.value).toBe(8_200_000)
  })

  it("数値が無ければ null", () => {
    expect(parseNumber("数字のない文")).toBeNull()
    expect(parseNumber("")).toBeNull()
  })
})

describe("buildStatFigure", () => {
  it("割合は円弧ゲージを描く", () => {
    const svg = buildStatFigure([item("45%", "導入率")])
    expect(svg).toContain("<svg")
    expect(svg).toContain("<path")
    expect(svg).toContain("45%")
  })

  it("100%を超えても円弧が一周しない", () => {
    const svg = buildStatFigure([item("320%", "成長")])
    // 満針で止まる = large-arc-flag 1 の単一パスに収まる
    expect(svg.match(/<path/g)?.length).toBe(1)
  })

  it("数値が読めなければ図を出さない", () => {
    expect(buildStatFigure([item("", "根拠のない文")])).toBe("")
    expect(buildStatFigure([])).toBe("")
  })
})

describe("buildColumnsFigure", () => {
  it("数値が2つ以上あるとき比較棒になり、最大値が最長になる", () => {
    const svg = buildColumnsFigure([item("", "国内 120億円"), item("", "海外 60億円")])
    expect(svg).toContain("<rect")
    const widths = [...svg.matchAll(/width="([\d.]+)" height="38"/g)].map((m) => Number(m[1]))
    expect(widths).toHaveLength(2)
    expect(widths[0]).toBeGreaterThan(widths[1])
  })

  it("数値が1つしか無い対比は棒にしない", () => {
    expect(buildColumnsFigure([item("", "120億円"), item("", "数字なし")])).toBe("")
  })
})

describe("buildTimelineFigure", () => {
  it("marker が2つ以上あるとき横軸に点を打つ", () => {
    const svg = buildTimelineFigure([
      item("2024", "着手"),
      item("2025", "拡大"),
      item("2026", "完了"),
    ])
    expect(svg.match(/<circle/g)?.length).toBe(3)
    expect(svg).toContain("2026")
  })

  it("marker が足りなければ図を出さない", () => {
    expect(buildTimelineFigure([item("", "本文だけ"), item("", "本文だけ")])).toBe("")
  })
})

describe("buildFigure", () => {
  it("quote と headline には図を足さない", () => {
    expect(buildFigure("quote", [item("出典", "引用文 50%")])).toBe("")
    expect(buildFigure("headline", [item("", "見出し 50%")])).toBe("")
  })

  it("ビート属性を付けて既存の段階表示に載せる", () => {
    expect(buildFigure("stat", [item("45%", "導入率")])).toContain('data-beat="0"')
  })

  it("同じ入力からは同じ出力になる(決定論)", () => {
    const input = [item("2024", "着手"), item("2025", "完了")]
    expect(buildFigure("timeline", input)).toBe(buildFigure("timeline", input))
  })

  it("stat は数値トークンだけを取り出すので周囲のマークアップが混入しない", () => {
    const svg = buildFigure("stat", [item("<script>50%", "x")])
    expect(svg).not.toContain("<script>")
    expect(svg).toContain(">50%<")
  })

  it("図に載る項目テキストは XML エスケープされる", () => {
    // timeline / columns は marker と body をそのまま描くため、ここが実際の escape 経路。
    const svg = buildFigure("timeline", [item("<b>2024", "着手 & 準備"), item("2025", "完了")])
    expect(svg).not.toContain("<b>2024")
    expect(svg).toContain("&lt;b&gt;2024")
    expect(svg).toContain("&amp;")
  })
})
