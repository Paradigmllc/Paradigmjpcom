import { describe, expect, it } from "vitest"

import { buildColumnsFigure, buildFigure, buildStatFigure, parseNumber } from "./figures"
import type { LayoutItem } from "./layouts"

const item = (marker: string, body: string): LayoutItem => ({ marker, body })

describe("parseNumber", () => {
  it("百分率を割合として読む", () => {
    expect(parseNumber("45%")).toMatchObject({ value: 45, display: "45%", isPercent: true })
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

  it("数え上げ用に数値部分と単位を分ける", () => {
    // 数え上げるのは表示上の数字だけ。桁単位を掛けた実数を数えると 820 ではなく 8,200,000 になる。
    expect(parseNumber("820万台")).toMatchObject({ countTo: 820, unitText: "万台", decimals: 0 })
    expect(parseNumber("45%")).toMatchObject({ countTo: 45, unitText: "%" })
    expect(parseNumber("1,234.5倍")).toMatchObject({ countTo: 1234.5, decimals: 1 })
  })

  it("数値が無ければ null", () => {
    expect(parseNumber("数字のない文")).toBeNull()
    expect(parseNumber("")).toBeNull()
  })
})

describe("buildStatFigure", () => {
  it("割合は掃けるリングになる", () => {
    const svg = buildStatFigure([item("45%", "導入率")])
    expect(svg).toContain('class="fig-ring"')
    // 12時から時計回りに掃かせるため -90度回す。
    expect(svg).toContain("rotate(-90 500 200)")
    // 円周と目標オフセットが両方あって初めて dashoffset を動かせる。
    expect(svg).toMatch(/data-ring-len="816\.81"/)
    expect(svg).toMatch(/data-ring-target="449\.25"/)
  })

  it("100%を超えてもリングが一周を超えない", () => {
    // 満針で止める。一周を超えると 20% と 120% が同じ見た目になり誤読する。
    const svg = buildStatFigure([item("320%", "成長")])
    expect(svg).toContain('data-ring-target="0"')
  })

  it("数値は0から始まり数え上げの指示を持つ", () => {
    const svg = buildStatFigure([item("45%", "導入率")])
    expect(svg).toContain('data-count-to="45"')
    expect(svg).toContain('data-count-unit="%"')
    // 最終値が最初から見えていると数え上げの意味が消える。
    expect(svg).toContain(">0%</text>")
    expect(svg).not.toContain(">45%<")
  })

  it("割合でない数値は下線付きの大きな数字になる", () => {
    const svg = buildStatFigure([item("", "3,200億円の市場")])
    expect(svg).not.toContain("fig-ring")
    expect(svg).toContain('data-count-to="3200"')
    expect(svg).toContain('data-bar-origin=')
  })

  it("数値が読めなければ図を出さない", () => {
    expect(buildStatFigure([item("", "根拠のない文")])).toBe("")
    expect(buildStatFigure([])).toBe("")
  })
})

describe("buildColumnsFigure", () => {
  it("数値が2つ以上あるとき比較棒になり、最大値が最長になる", () => {
    const svg = buildColumnsFigure([item("", "国内 120億円"), item("", "海外 60億円")])
    const widths = [...svg.matchAll(/width="([\d.]+)" height="38"/g)].map((m) => Number(m[1]))
    expect(widths).toHaveLength(2)
    expect(widths[0]).toBeGreaterThan(widths[1])
    // 半分の値の棒は半分の長さになる。
    expect(widths[1] / widths[0]).toBeCloseTo(0.5, 2)
  })

  it("棒は左端を原点に伸ばす", () => {
    // 原点が中央のままだと真ん中から左右に広がって誤読する。
    const svg = buildColumnsFigure([item("", "国内 120億円"), item("", "海外 60億円")])
    expect(svg).toContain('data-bar-origin="290 ')
  })

  it("値のラベルは棒の伸びに合わせて動く距離を持つ", () => {
    const svg = buildColumnsFigure([item("", "国内 120億円"), item("", "海外 60億円")])
    const travels = [...svg.matchAll(/data-count-travel="(-[\d.]+)"/g)].map((m) => Number(m[1]))
    expect(travels).toHaveLength(2)
    // 長い棒ほど遠くから戻ってくる。
    expect(travels[0]).toBeLessThan(travels[1])
  })

  it("数値が1つしか無い対比は棒にしない", () => {
    expect(buildColumnsFigure([item("", "120億円"), item("", "数字なし")])).toBe("")
  })
})

describe("buildFigure", () => {
  it("quote と headline には図を足さない", () => {
    expect(buildFigure("quote", [item("出典", "引用文 50%")])).toBe("")
    expect(buildFigure("headline", [item("", "見出し 50%")])).toBe("")
  })

  it("timeline にも図を足さない", () => {
    // 既存の <ol class="tl"> と内容が重複し、等間隔の横軸は実際の年数差を偽る。
    expect(buildFigure("timeline", [item("2024", "着手"), item("2030", "完了")])).toBe("")
  })

  it("ビート属性を付けて既存の段階表示に載せる", () => {
    expect(buildFigure("stat", [item("45%", "導入率")])).toContain('data-beat="0"')
  })

  it("同じ入力からは同じ出力になる(決定論)", () => {
    const input = [item("", "国内 120億円"), item("", "海外 60億円")]
    expect(buildFigure("columns", input)).toBe(buildFigure("columns", input))
  })

  it("stat は数値トークンだけを取り出すので周囲のマークアップが混入しない", () => {
    const svg = buildFigure("stat", [item("<script>50%", "x")])
    expect(svg).not.toContain("<script>")
    expect(svg).toContain('data-count-to="50"')
  })

  it("図に載る項目テキストは XML エスケープされる", () => {
    // columns は marker と body をそのまま描くため、ここが実際の escape 経路。
    const svg = buildFigure("columns", [item("", "<b>国内 120億円"), item("", "海外 & 60億円")])
    expect(svg).not.toContain("<b>国内")
    expect(svg).toContain("&lt;b&gt;")
    expect(svg).toContain("&amp;")
  })
})
