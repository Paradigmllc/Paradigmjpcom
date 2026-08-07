/**
 * lib/youtube/render/layouts.ts — visualSpec をレイアウトに解釈する
 *
 * 台本層は visualSpec に構造化データを出している
 * (例: {"layout":"timeline","items":[{"date":"2026-08-05","text":"…"}]})。
 * 初版のレンダラーはこれを丸ごと捨てて onScreenText のテキスト行だけを描いていたため、
 * 全シーンが同じ見た目の静止スライドになった。ここで構造を映像に反映させる。
 *
 * items の形はモデルによって毎回変わる({date,text} / {year,label} / {event,date} …)。
 * 決め打ちで読むと落ちるので、時間軸を表すキーと内容を表すキーを
 * それぞれ候補リストから拾う防御的な正規化を通す。
 */

import { parseNumber } from "./figures"

export type SceneLayout = "timeline" | "columns" | "stat" | "quote" | "headline"

export interface LayoutItem {
  /** 日付や年など、時間軸のラベル。無ければ空。 */
  marker: string
  /** 内容本文。 */
  body: string
}

export interface NormalizedLayout {
  layout: SceneLayout
  items: LayoutItem[]
}

/** 時間軸を表すキーの候補。 */
const MARKER_KEYS = ["date", "year", "start_date", "startDate", "when", "time", "period"]

/** 内容を表すキーの候補。marker に使われなかったものから拾う。 */
const BODY_KEYS = ["text", "label", "description", "title", "event", "name", "value", "detail"]

function asText(value: unknown): string {
  if (typeof value === "string") return value.trim()
  if (typeof value === "number") return String(value)
  return ""
}

/**
 * モデルが出した URL は使わない。
 * 実測で存在しない画像URL(j-cast.com/image/kamiya.jpg)を生成していた。
 * 根拠URLと同じく、創作されたURLを映像に取り込まない。
 */
function stripUrls(text: string): string {
  return text.replace(/https?:\/\/\S+/g, "").trim()
}

export function normalizeItem(raw: unknown): LayoutItem | null {
  if (typeof raw === "string") {
    const body = stripUrls(raw)
    return body.length > 0 ? { marker: "", body } : null
  }
  if (!raw || typeof raw !== "object") return null

  const record = raw as Record<string, unknown>
  let marker = stripUrls(asText(MARKER_KEYS.map((key) => record[key]).find((value) => asText(value))))

  const usedAsMarker = MARKER_KEYS.find((key) => asText(record[key]) === marker && marker.length > 0)
  const bodyKey = BODY_KEYS.filter((key) => key !== usedAsMarker).find((key) => asText(record[key]))
  const body = stripUrls(asText(bodyKey ? record[bodyKey] : undefined))

  // 時間軸キーが無く、別の内容キーに数値がある項目は、その数値を marker に採る。
  // {name:"中国", value:"820万台"} のような形は最初の内容キーだけを読むと
  // 「820万台」が丸ごと消え、本文からも図表からも数量が失われていた。
  if (marker.length === 0) {
    const numericKey = BODY_KEYS.filter((key) => key !== usedAsMarker && key !== bodyKey).find((key) => {
      const text = stripUrls(asText(record[key]))
      return text.length > 0 && parseNumber(text) !== null
    })
    if (numericKey) marker = stripUrls(asText(record[numericKey]))
  }

  if (body.length === 0 && marker.length === 0) return null
  return { marker, body: body.length > 0 ? body : marker }
}

/** レイアウト名を扱える種類に丸める。 */
export function normalizeLayoutName(raw: unknown, itemCount: number): SceneLayout {
  const name = typeof raw === "string" ? raw.toLowerCase().trim() : ""
  if (name.includes("timeline") || name.includes("flow") || name.includes("checklist")) return "timeline"
  if (name.includes("column") || name.includes("compare") || name.includes("comparison") || name.includes("venn")) {
    return "columns"
  }
  if (name.includes("stat") || name.includes("matrix")) return "stat"
  if (name.includes("quote")) return "quote"
  // 項目が2つだけなら対比として見せたほうが読みやすい。
  if (itemCount === 2) return "columns"
  if (itemCount >= 3) return "timeline"
  return "headline"
}

/**
 * visualSpec を描画可能な形に変換する。
 * items が取れない場合は onScreenText を項目として使う。
 */
export function normalizeLayout(spec: unknown, fallbackTexts: string[]): NormalizedLayout {
  const record = (spec && typeof spec === "object" ? spec : {}) as Record<string, unknown>
  const rawItems = Array.isArray(record.items) ? record.items : []

  let items = rawItems.map(normalizeItem).filter((item): item is LayoutItem => item !== null)

  if (items.length === 0) {
    items = fallbackTexts
      .map((text) => stripUrls(text))
      .filter((text) => text.length > 0)
      .map((text) => ({ marker: "", body: text }))
  }

  return { layout: normalizeLayoutName(record.layout, items.length), items }
}

/**
 * 同じレイアウトが続くと見た目が単調になる。
 * 実測ではモデルが7シーン中5シーンで timeline を指定してきた。
 * 連続した場合は表現を変えて、視覚的な反復を避ける。
 */
export function diversifyLayouts(layouts: SceneLayout[]): SceneLayout[] {
  const result = [...layouts]
  for (let i = 1; i < result.length; i += 1) {
    if (result[i] !== result[i - 1]) continue
    // 直前と同じなら、項目数に応じた代替に振り替える。
    result[i] = result[i] === "timeline" ? "columns" : "timeline"
  }
  return result
}
