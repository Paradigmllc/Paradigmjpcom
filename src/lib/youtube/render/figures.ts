/**
 * lib/youtube/render/figures.ts — 正規化済み items から動く SVG 図表を組み立てる
 *
 * これまでのレンダラーは CSS の色とグラデーションだけで、<img> も <svg> も出していなかった。
 * さらに初版の図表は「一度描かれて出るだけ」で、シーンの残り時間は静止していた(紙芝居)。
 *
 * 方針:
 *   - 外部素材を取りに行かない。ネットワーク・APIキー・GPU・第三者の権利が一切絡まない。
 *     台本が既に構造化データ(items)を持っているので、そこから図を組み立てられる。
 *   - 数値が読めないときは図を出さない。中身の無い飾りの図形は、無いほうがましで、
 *     「それらしいが根拠の無い図」は事実性の面でも危険。空文字を返して既存の文字表現に任せる。
 *   - 幾何は items から決定論的に導く。HyperFrames は任意時刻へシークして描画するため、
 *     乱数や現在時刻が混ざるとフレームが一致しなくなる。
 *   - quote / headline / timeline は既存の文字組みが表現として足りているので図を足さない。
 *
 * 動きの担当分け:
 *   ここは「何をどこに描くか」と「終値」だけを出す。実際のトゥイーンは hyperframes.ts が
 *   data-* 属性を読んで組む。尺とビート時刻を知っているのが向こうだけなので、
 *   図の側に時刻を埋めると二重管理になる。
 *
 *   - リングは stroke-dasharray / dashoffset で掃く (svg-path-draw)。半径と円周を同じ定数から
 *     出しているので実行時計測は要らない。
 *   - 棒は width ではなく scaleX で伸ばす (stat-bars-and-fills)。width/height のトゥイーンは禁止。
 *   - 数値は 0 から実数へ数え上げる (counting-dynamic-scale)。
 */

import type { LayoutItem, SceneLayout } from "./layouts"

/** 既存コンポジションの配色に合わせる。 */
const AMBER = "#E8A33D"
const AMBER_SOFT = "rgba(232,163,61,0.16)"
const CREAM = "#F5F1E8"
const CREAM_DIM = "rgba(245,241,232,0.45)"

/** ゲージの幾何。円周を同じ定数から出すので実行時に getTotalLength() を呼ばずに済む。 */
const RING_CX = 500
const RING_CY = 200
const RING_R = 130
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R

/** 棒グラフの幾何。 */
const BAR_LEFT = 290
const BAR_MAX_WIDTH = 620
const BAR_HEIGHT = 38
const BAR_ROW_HEIGHT = 92
const BAR_TOP = 40

export interface ParsedNumber {
  /** 桁単位を掛けたあとの比較可能な値。棒の長さ比に使う。 */
  value: number
  /** 画面に出す表記全体。元の見た目を保つ。 */
  display: string
  /** 数え上げの対象になる数値部分だけ。「820万台」なら 820。 */
  countTo: number
  /** 数値のあとに固定で付く部分。「820万台」なら "万台"。 */
  unitText: string
  /** 数え上げ中に保つ小数桁数。 */
  decimals: number
  isPercent: boolean
}

/** 桁単位のあとに続く助数詞。表記を「820万」で切らず「820万台」まで残すために読む。 */
const COUNTER_RE = "円|台|人|件|社|本|個|倍|年|月|日|時間|km|kg|GB|TB"

const NUMBER_RE = new RegExp(
  `(-?\\d[\\d,]*(?:\\.\\d+)?)\\s*(%|％|パーセント|兆|億|万)?(?:${COUNTER_RE})?`,
)

/** 日本語の桁単位。比較のために実数へ揃える。 */
const SCALES: Array<[string, number]> = [
  ["兆", 1_000_000_000_000],
  ["億", 100_000_000],
  ["万", 10_000],
]

/**
 * テキストから最初の数値を読む。読めなければ null。
 * 「45%」「3,200億円」「1.8倍」などを想定する。
 */
export function parseNumber(text: string): ParsedNumber | null {
  if (typeof text !== "string") return null
  const match = NUMBER_RE.exec(text)
  if (!match) return null

  const numberText = match[1]
  const base = Number.parseFloat(numberText.replace(/,/g, ""))
  if (!Number.isFinite(base)) return null

  const unit = match[2] ?? ""
  const isPercent = unit === "%" || unit === "％" || unit === "パーセント"
  const scale = SCALES.find(([symbol]) => symbol === unit)?.[1] ?? 1
  const display = match[0].trim()
  const decimalPart = numberText.split(".")[1]

  return {
    value: base * scale,
    display,
    countTo: base,
    // display の先頭にある数値部分を除いた残りが単位。「820万台」→「万台」。
    unitText: display.slice(numberText.length).trim(),
    decimals: Math.min(decimalPart ? decimalPart.length : 0, 1),
    isPercent,
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** 図の中では長い本文は読めない。行に収まる長さで打ち切る。 */
function clip(text: string, max: number): string {
  const trimmed = text.trim()
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`
}

/**
 * 数え上げるテキスト要素。開始表示は 0 にしておく。
 * トゥイーンが走らないうちに最終値が見えていると、数え上げの意味が消える。
 */
function countingText(
  attrs: string,
  parsed: ParsedNumber,
  extra = "",
): string {
  const zero = (0).toFixed(parsed.decimals)
  return (
    `<text ${attrs} data-count-to="${parsed.countTo}" data-count-unit="${escapeXml(parsed.unitText)}"` +
    ` data-count-decimals="${parsed.decimals}"${extra}>${zero}${escapeXml(parsed.unitText)}</text>`
  )
}

function svg(viewBoxHeight: number, body: string[]): string {
  return [
    `        <svg class="figure" viewBox="0 0 1000 ${viewBoxHeight}" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid meet">`,
    ...body,
    `        </svg>`,
  ].join("\n")
}

/**
 * stat: 主要な数値を1つ。割合は円弧ゲージ、それ以外は下線付きの大きな数字。
 * ゲージは -90度回した円に dasharray を掛け、12時から時計回りに掃かせる。
 */
export function buildStatFigure(items: LayoutItem[]): string {
  const lead = items[0]
  if (!lead) return ""
  const parsed = parseNumber(lead.marker) ?? parseNumber(lead.body)
  if (!parsed) return ""

  if (parsed.isPercent) {
    // 100%超(「120%成長」等)はゲージが一周して誤読を招くので満針で止める。
    const clamped = Math.max(0, Math.min(100, parsed.countTo))
    const circumference = round2(RING_CIRCUMFERENCE)
    const targetOffset = round2(RING_CIRCUMFERENCE * (1 - clamped / 100))

    return svg(400, [
      `          <g data-beat="0">`,
      `            <circle cx="${RING_CX}" cy="${RING_CY}" r="${RING_R}" fill="none" stroke="${AMBER_SOFT}" stroke-width="26" />`,
      `            <circle class="fig-ring" cx="${RING_CX}" cy="${RING_CY}" r="${RING_R}" fill="none" stroke="${AMBER}" stroke-width="26" stroke-linecap="round"` +
        ` transform="rotate(-90 ${RING_CX} ${RING_CY})" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}"` +
        ` data-ring-len="${circumference}" data-ring-target="${targetOffset}" />`,
      `            ` +
        countingText(
          `class="fig-num" x="${RING_CX}" y="215" text-anchor="middle" font-size="92" font-weight="700" fill="${CREAM}"`,
          parsed,
        ),
      `          </g>`,
    ])
  }

  return svg(300, [
    `          <g data-beat="0">`,
    `            ` +
      countingText(
        `class="fig-num" x="${RING_CX}" y="150" text-anchor="middle" font-size="120" font-weight="700" fill="${CREAM}"`,
        parsed,
      ),
    `            <rect class="fig-bar" x="330" y="196" width="340" height="8" rx="4" fill="${AMBER}" data-bar-origin="330 200" />`,
    `          </g>`,
  ])
}

/**
 * columns: 項目に数値があるときだけ比較棒グラフにする。
 * 数値が揃わない対比は、棒の長さが根拠の無い印象を与えるので描かない。
 *
 * 棒は width ではなく scaleX で伸ばす。値のラベルは棒の先端に付いて動くよう、
 * 伸びる幅ぶん左から translate して戻す。
 */
export function buildColumnsFigure(items: LayoutItem[]): string {
  const parsed = items
    .slice(0, 3)
    .map((item) => ({ item, num: parseNumber(item.marker) ?? parseNumber(item.body) }))
    .filter((entry): entry is { item: LayoutItem; num: ParsedNumber } => entry.num !== null)

  if (parsed.length < 2) return ""

  const max = Math.max(...parsed.map((entry) => Math.abs(entry.num.value)))
  if (max <= 0) return ""

  const rows = parsed.flatMap((entry, index) => {
    const y = BAR_TOP + index * BAR_ROW_HEIGHT
    const width = round2(Math.max(6, (Math.abs(entry.num.value) / max) * BAR_MAX_WIDTH))
    const barY = y + 8
    const originY = round2(barY + BAR_HEIGHT / 2)
    const label = clip(entry.item.body || entry.item.marker, 14)

    return [
      `          <g data-beat="${index}">`,
      `            <text x="40" y="${y + 34}" font-size="30" fill="${CREAM_DIM}">${escapeXml(label)}</text>`,
      `            <rect class="fig-bar" x="${BAR_LEFT}" y="${barY}" width="${width}" height="${BAR_HEIGHT}" rx="8" fill="${AMBER}"` +
        ` data-bar-origin="${BAR_LEFT} ${originY}" />`,
      `            ` +
        countingText(
          `class="fig-num" x="${round2(BAR_LEFT + width + 16)}" y="${y + 36}" font-size="30" font-weight="700" fill="${CREAM}"`,
          entry.num,
          ` data-count-travel="${round2(-width)}"`,
        ),
      `          </g>`,
    ]
  })

  return svg(BAR_TOP + parsed.length * BAR_ROW_HEIGHT, rows)
}

/**
 * レイアウトに対応する図を返す。描くだけの根拠が無ければ空文字。
 */
export function buildFigure(layout: SceneLayout, items: LayoutItem[]): string {
  if (layout === "stat") return buildStatFigure(items)
  if (layout === "columns") return buildColumnsFigure(items)
  // timeline は図を足さない。既存の <ol class="tl"> が同じ内容を縦に描いており重複するうえ、
  // 横軸に等間隔で点を打つと「2024/2025/2030」でも等しい間隔に見え、実際の年数差を偽る。
  return ""
}
