/**
 * lib/youtube/render/figures.ts — 正規化済み items から SVG 図表を描く
 *
 * これまでのレンダラーは CSS の色とグラデーションだけで、<img> も <svg> も出していなかった。
 * 結果として全シーンが「文字が並ぶだけ」の画面になり、視覚的な訴求が無かった。
 *
 * 方針:
 *   - 外部素材を取りに行かない。ネットワーク・APIキー・GPU・第三者の権利が一切絡まない。
 *     台本が既に構造化データ(items)を持っているので、そこから図を組み立てられる。
 *   - 数値が読めないときは図を出さない。中身の無い飾りの図形は、無いほうがましで、
 *     「それらしいが根拠の無い図」は事実性の面でも危険。空文字を返して既存の文字表現に任せる。
 *   - 幾何は items から決定論的に導く。HyperFrames は任意時刻へシークして描画するため、
 *     乱数や現在時刻が混ざるとフレームが一致しなくなる。
 *   - 段階表示は data-beat に載せる。既存のビート機構をそのまま使い、別の仕組みを作らない。
 */

import type { LayoutItem, SceneLayout } from "./layouts"

/** 既存コンポジションの配色に合わせる。 */
const AMBER = "#E8A33D"
const AMBER_SOFT = "rgba(232,163,61,0.16)"
const CREAM = "#F5F1E8"
const CREAM_DIM = "rgba(245,241,232,0.45)"

export interface ParsedNumber {
  /** 単位を掛けたあとの比較可能な値。 */
  value: number
  /** 画面に出す表記。元の見た目を保つ。 */
  display: string
  isPercent: boolean
}

/** 日本語の桁単位。比較のために実数へ揃える。 */
const SCALES: Array<[string, number]> = [
  ["兆", 1_000_000_000_000],
  ["億", 100_000_000],
  ["万", 10_000],
]

/** 桁単位のあとに続く助数詞。表記を「820万」で切らず「820万台」まで残すために読む。 */
const COUNTER_RE = "円|台|人|件|社|本|個|倍|年|月|日|時間|km|kg|GB|TB"

const NUMBER_RE = new RegExp(
  `(-?\\d[\\d,]*(?:\\.\\d+)?)\\s*(%|％|パーセント|兆|億|万)?(?:${COUNTER_RE})?`,
)

/**
 * テキストから最初の数値を読む。読めなければ null。
 * 「45%」「3,200億円」「1.8倍」などを想定する。
 */
export function parseNumber(text: string): ParsedNumber | null {
  if (typeof text !== "string") return null
  const match = NUMBER_RE.exec(text)
  if (!match) return null

  const raw = match[1].replace(/,/g, "")
  const base = Number.parseFloat(raw)
  if (!Number.isFinite(base)) return null

  const unit = match[2] ?? ""
  const isPercent = unit === "%" || unit === "％" || unit === "パーセント"
  const scale = SCALES.find(([symbol]) => symbol === unit)?.[1] ?? 1

  return {
    value: base * scale,
    display: match[0].trim(),
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

function svg(viewBoxHeight: number, body: string[]): string {
  return [
    `        <svg class="figure" viewBox="0 0 1000 ${viewBoxHeight}" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid meet">`,
    ...body,
    `        </svg>`,
  ].join("\n")
}

/**
 * 割合を円弧ゲージで描く。0〜100 に収める。
 * 100を超える値(「120%成長」など)はゲージが一周してしまい誤読を招くので満針で止める。
 */
function arcGauge(percent: number): string[] {
  const clamped = Math.max(0, Math.min(100, percent))
  const cx = 500
  const cy = 200
  const r = 130
  // 上端から時計回り。
  const angle = (clamped / 100) * Math.PI * 2 - Math.PI / 2
  const x = round2(cx + r * Math.cos(angle))
  const y = round2(cy + r * Math.sin(angle))
  const largeArc = clamped > 50 ? 1 : 0

  return [
    `          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${AMBER_SOFT}" stroke-width="26" />`,
    clamped > 0
      ? `          <path d="M ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y}" fill="none" stroke="${AMBER}" stroke-width="26" stroke-linecap="round" />`
      : "",
  ].filter((row) => row.length > 0)
}

/** stat: 主要な数値を1つ、割合ならゲージ、それ以外は下線付きの大きな数字で見せる。 */
export function buildStatFigure(items: LayoutItem[]): string {
  const lead = items[0]
  if (!lead) return ""
  const parsed = parseNumber(lead.marker) ?? parseNumber(lead.body)
  if (!parsed) return ""

  if (parsed.isPercent) {
    return svg(400, [
      `          <g data-beat="0">`,
      ...arcGauge(parsed.value),
      `            <text x="500" y="215" text-anchor="middle" font-size="92" font-weight="700" fill="${CREAM}">${escapeXml(parsed.display)}</text>`,
      `          </g>`,
    ])
  }

  return svg(300, [
    `          <g data-beat="0">`,
    `            <text x="500" y="150" text-anchor="middle" font-size="120" font-weight="700" fill="${CREAM}">${escapeXml(parsed.display)}</text>`,
    `            <rect x="330" y="196" width="340" height="8" rx="4" fill="${AMBER}" />`,
    `          </g>`,
  ])
}

/**
 * columns: 項目に数値があるときだけ比較棒グラフにする。
 * 数値が揃わない対比は、棒の長さが根拠の無い印象を与えるので描かない。
 */
export function buildColumnsFigure(items: LayoutItem[]): string {
  const parsed = items
    .slice(0, 3)
    .map((item) => ({ item, num: parseNumber(item.marker) ?? parseNumber(item.body) }))
    .filter((entry): entry is { item: LayoutItem; num: ParsedNumber } => entry.num !== null)

  if (parsed.length < 2) return ""

  const max = Math.max(...parsed.map((entry) => Math.abs(entry.num.value)))
  if (max <= 0) return ""

  const rowHeight = 92
  const barTop = 40
  const maxWidth = 620
  const labelX = 40

  const rows = parsed.flatMap((entry, index) => {
    const y = barTop + index * rowHeight
    const width = round2(Math.max(6, (Math.abs(entry.num.value) / max) * maxWidth))
    const label = clip(entry.item.body || entry.item.marker, 14)
    return [
      `          <g data-beat="${index}">`,
      `            <text x="${labelX}" y="${y + 34}" font-size="30" fill="${CREAM_DIM}">${escapeXml(label)}</text>`,
      `            <rect x="290" y="${y + 8}" width="${width}" height="38" rx="8" fill="${AMBER}" />`,
      `            <text x="${round2(290 + width + 16)}" y="${y + 36}" font-size="30" font-weight="700" fill="${CREAM}">${escapeXml(entry.num.display)}</text>`,
      `          </g>`,
    ]
  })

  return svg(barTop + parsed.length * rowHeight, rows)
}

/**
 * timeline: marker が時間軸として読めるときだけ横軸に点を打つ。
 * 既存の縦並びリストは CSS 側で描いているので、こちらは時間の広がりを見せる役に絞る。
 */
export function buildTimelineFigure(items: LayoutItem[]): string {
  const points = items.slice(0, 5).filter((item) => item.marker.trim().length > 0)
  if (points.length < 2) return ""

  const axisY = 96
  const left = 70
  const right = 930
  const step = (right - left) / (points.length - 1)

  const marks = points.flatMap((item, index) => {
    const x = round2(left + step * index)
    return [
      `          <g data-beat="${index}">`,
      `            <circle cx="${x}" cy="${axisY}" r="13" fill="${AMBER}" />`,
      `            <text x="${x}" y="${axisY - 34}" text-anchor="middle" font-size="30" font-weight="700" fill="${CREAM}">${escapeXml(clip(item.marker, 10))}</text>`,
      `            <text x="${x}" y="${axisY + 54}" text-anchor="middle" font-size="24" fill="${CREAM_DIM}">${escapeXml(clip(item.body, 12))}</text>`,
      `          </g>`,
    ]
  })

  return svg(170, [
    `          <line x1="${left}" y1="${axisY}" x2="${right}" y2="${axisY}" stroke="${AMBER_SOFT}" stroke-width="6" stroke-linecap="round" />`,
    ...marks,
  ])
}

/**
 * レイアウトに対応する図を返す。描くだけの根拠が無ければ空文字。
 * quote と headline は文字組みそのものが表現なので図を足さない。
 */
export function buildFigure(layout: SceneLayout, items: LayoutItem[]): string {
  if (layout === "stat") return buildStatFigure(items)
  if (layout === "columns") return buildColumnsFigure(items)
  if (layout === "timeline") return buildTimelineFigure(items)
  return ""
}
