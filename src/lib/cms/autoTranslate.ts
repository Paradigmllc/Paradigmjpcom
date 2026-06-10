/**
 * autoTranslate.ts — PayloadCMS 自動多言語翻訳フック (2026-05-20・v2)
 *
 * admin が日本語 (ja) で保存すると afterChange フックが DeepSeek V4 で残り 11 locale に
 * 自動翻訳し各 locale の localized フィールドへ保存。availableLocales を全 12 に設定。
 * → 「日本語で 1 回書けば全 12 言語に自動展開」。
 *
 * 対応フィールド (v2):
 *   - text     : top-level text/textarea。dot-path (例 "seo.metaTitle") で group 配下も可。
 *   - rich     : richText (lexical)。text node を DFS 収集→翻訳→同順差戻し (count 不一致は skip)。
 *   - arrays   : array フィールド配下の localized sub-field (例 features[].feature)。row id 保持。
 *
 * 安全性: loop 防止 (context.skipAutoTranslate)・耐障害 (locale 毎 try/catch)・
 *   drafts は _status を伝播 (公開版へ反映)・DEEPSEEK_API_KEY 未設定時 no-op・
 *   翻訳は target 逐次 (共有 pooler 接続を枯渇させない)・timeout 90s。
 *   起点=ja 限定 (他 locale の手動編集は上書きしない)。
 */

import type { CollectionAfterChangeHook } from "payload"
import { callDeepSeek } from "@/lib/deepseek"
import { routing } from "@/i18n/routing"

const SOURCE_LOCALE = "ja"
const TARGET_LOCALES = routing.locales.filter((l) => l !== SOURCE_LOCALE)
const TRANSLATE_TIMEOUT_MS = 90_000

// 2026-05-21: globals (Header/Footer) の auto-translate でも再利用するため export 化。
// 真のソースは本ファイル (collection 版)。global 版 (autoTranslateGlobal.ts) は
// 同じ翻訳エンジン・同じ言語名マップ・同じ起点 locale を共有して挙動を一致させる。
export { SOURCE_LOCALE, TARGET_LOCALES, TRANSLATE_TIMEOUT_MS }

export const LANG_NAME: Record<string, string> = {
  en: "English", ko: "Korean", zh: "Simplified Chinese", de: "German", fr: "French",
  es: "Spanish", pt: "Portuguese (Brazil)", ru: "Russian", ar: "Arabic", vi: "Vietnamese", id: "Indonesian",
}

const TRANSLATE_SYSTEM =
  "You are a professional localization engine for Paradigm LLC, a Tokyo-based digital agency. " +
  "Translate the Japanese JSON values into the requested target language. " +
  "Rules: (1) Return ONLY a JSON object with the EXACT same keys as the input. " +
  "(2) Translate ONLY the values, never the keys. (3) Keep brand names (Paradigm) and acronyms " +
  "(SEO, MEO, GEO, AI, B2B, SMB, JaaS, DesignJoy, LINE, PayPay, EC, CVR) as-is. " +
  "(4) Keep ¥ symbols and numbers. (5) Natural, professional tone for the target market."

type Lexical = { type?: string; text?: string; children?: Lexical[]; root?: Lexical; [k: string]: unknown }
type Row = { id?: string | number; [k: string]: unknown }

/* ---- helpers: dot-path get/set ---- */
function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj)
}
function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".")
  let cur = target
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i]
    if (typeof cur[k] !== "object" || cur[k] === null) cur[k] = {}
    cur = cur[k] as Record<string, unknown>
  }
  cur[parts[parts.length - 1]] = value
}

/* ---- helpers: lexical text collect/apply ---- */
function collectText(node: Lexical | undefined | null, out: string[]): void {
  if (!node || typeof node !== "object") return
  if (node.type === "text" && typeof node.text === "string") out.push(node.text)
  const kids = node.root?.children ?? node.children
  if (Array.isArray(kids)) for (const k of kids) collectText(k, out)
}
function applyText(node: Lexical, texts: string[], cur: { i: number }): void {
  if (!node || typeof node !== "object") return
  if (node.type === "text" && typeof node.text === "string") { node.text = texts[cur.i] ?? node.text; cur.i += 1 }
  const kids = node.root?.children ?? node.children
  if (Array.isArray(kids)) for (const k of kids) applyText(k, texts, cur)
}

export async function translateValues(values: Record<string, string>, targetLang: string): Promise<Record<string, string> | null> {
  const res = await callDeepSeek(
    [
      { role: "system", content: TRANSLATE_SYSTEM },
      { role: "user", content: `Target language: ${targetLang}\nTranslate these JSON values:\n${JSON.stringify(values)}` },
    ],
    { responseFormat: "json_object", maxTokens: 8000, temperature: 0.3, timeoutMs: TRANSLATE_TIMEOUT_MS },
  )
  if (!res.ok || !res.text) return null
  try {
    const parsed = JSON.parse(res.text)
    return typeof parsed === "object" && parsed ? (parsed as Record<string, string>) : null
  } catch (e) {
    console.warn("[autoTranslate] JSON parse failed:", e instanceof Error ? e.message : String(e))
    return null
  }
}

export interface AutoTranslateOpts {
  /** text/textarea (dot-path 可: "seo.metaTitle") */
  text?: string[]
  /** richText (lexical) */
  rich?: string[]
  /** array フィールド配下の localized sub-field */
  arrays?: { name: string; text?: string[] }[]
}

export function makeAutoTranslateHook(opts: AutoTranslateOpts): CollectionAfterChangeHook {
  const textFields = opts.text ?? []
  const richFields = opts.rich ?? []
  const arrayFields = opts.arrays ?? []

  return async ({ doc, req, collection, context }) => {
    if ((context as Record<string, unknown> | undefined)?.skipAutoTranslate) return doc
    if (req?.locale && req.locale !== SOURCE_LOCALE) return doc
    const payload = req?.payload
    const id = (doc as { id?: string | number })?.id
    if (!payload || id === undefined) return doc

    const d = doc as Record<string, unknown>
    const flat: Record<string, string> = {}

    // text (dot-path)
    for (const f of textFields) {
      const v = getPath(d, f)
      if (typeof v === "string" && v.trim()) flat[`t:${f}`] = v
    }
    // richText
    const richTexts: Record<string, string[]> = {}
    for (const f of richFields) {
      const arr: string[] = []
      collectText(getPath(d, f) as Lexical, arr)
      if (arr.length) { richTexts[f] = arr; arr.forEach((s, i) => { if (s.trim()) flat[`r:${f}:${i}`] = s }) }
    }
    // arrays
    for (const a of arrayFields) {
      const rows = d[a.name]
      if (!Array.isArray(rows)) continue
      rows.forEach((row, ri) => {
        for (const sf of a.text ?? []) {
          const v = (row as Row)[sf]
          if (typeof v === "string" && v.trim()) flat[`a:${a.name}:${ri}:${sf}`] = v
        }
      })
    }

    if (Object.keys(flat).length === 0) return doc
    const srcStatus = d._status

    for (const loc of TARGET_LOCALES) {
      try {
        const tr = await translateValues(flat, LANG_NAME[loc] ?? loc)
        if (!tr) continue
        const data: Record<string, unknown> = {}
        // text (dot-path)
        for (const f of textFields) if (typeof tr[`t:${f}`] === "string") setPath(data, f, tr[`t:${f}`])
        // richText
        for (const f of richFields) {
          const orig = getPath(d, f) as Lexical | undefined
          const count = richTexts[f]?.length ?? 0
          if (!orig || count === 0) continue
          const translated = richTexts[f].map((s, i) => (s.trim() ? (tr[`r:${f}:${i}`] ?? s) : s))
          const clone = JSON.parse(JSON.stringify(orig)) as Lexical
          applyText(clone, translated, { i: 0 })
          setPath(data, f, clone)
        }
        // arrays: 非ローカライズ兄弟 (included / image 等) を保持しつつ
        // localized sub-field のみ翻訳で上書き。upload/relationship は populated object
        // → bare id に正規化 (afterChange の doc は populated されているため)。
        for (const a of arrayFields) {
          const rows = d[a.name]
          if (!Array.isArray(rows)) continue
          data[a.name] = rows.map((row, ri) => {
            const out: Row = {}
            for (const [k, v] of Object.entries(row as Row)) {
              out[k] =
                v && typeof v === "object" && !Array.isArray(v) && "id" in (v as Record<string, unknown>)
                  ? (v as Record<string, unknown>).id
                  : v
            }
            for (const sf of a.text ?? []) {
              const key = `a:${a.name}:${ri}:${sf}`
              if (typeof tr[key] === "string") out[sf] = tr[key]
            }
            return out
          })
        }
        // 全 locale 配信 + 公開状態の伝播
        data.availableLocales = [...(routing.locales as readonly string[])]
        if (typeof srcStatus === "string") data._status = srcStatus
        if (Object.keys(data).length === 0) continue
        await payload.update({
          collection: collection.slug as Parameters<typeof payload.update>[0]["collection"],
          id, locale: loc, data, context: { skipAutoTranslate: true }, req,
        })
      } catch (e) {
        console.error(`[autoTranslate] ${collection.slug}#${id} → ${loc} failed:`, e instanceof Error ? e.message : e)
      }
    }
    return doc
  }
}
