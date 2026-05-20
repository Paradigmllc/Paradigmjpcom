/**
 * autoTranslate.ts — PayloadCMS 自動多言語翻訳フック (2026-05-20)
 *
 * 役割:
 *   admin が **日本語 (ja)** でコンテンツを保存すると、afterChange フックが
 *   DeepSeek V4 で残り 11 locale に自動翻訳し、各 locale の localized フィールドへ
 *   payload.update で保存する。さらに availableLocales を全 12 に設定して全 locale 配信する。
 *   → 「日本語で 1 回書けば全 12 言語に自動展開」。
 *
 * 設計:
 *   - 起点 = "ja" のみ (req.locale==="ja" の保存時だけ発火)。他 locale の手動編集は上書きしない。
 *   - text/textarea フィールド = そのまま翻訳。richText (lexical) = text node を DFS で
 *     収集→翻訳→同順で差し戻し (構造保持・count 不一致時は安全に skip)。
 *   - ループ防止: payload.update に context.skipAutoTranslate=true を渡し、再入時は即 return。
 *   - 耐障害: 1 locale の翻訳/保存が失敗しても他に影響させない (try/catch + console.error)。
 *   - Coolify は persistent Node server のため同期実行で timeout しない (serverless 非該当)。
 *
 * 注意:
 *   - DEEPSEEK_API_KEY 未設定時は no-op (保存は成功・翻訳のみ skip)。
 *   - 翻訳は target ごとに逐次 (共有 Supabase pooler の接続を枯渇させないため直列)。
 */

import type { CollectionAfterChangeHook } from "payload"
import { callDeepSeek } from "@/lib/deepseek"
import { routing } from "@/i18n/routing"

const SOURCE_LOCALE = "ja"
const TARGET_LOCALES = routing.locales.filter((l) => l !== SOURCE_LOCALE)

const LANG_NAME: Record<string, string> = {
  en: "English",
  ko: "Korean",
  zh: "Simplified Chinese",
  de: "German",
  fr: "French",
  es: "Spanish",
  pt: "Portuguese (Brazil)",
  ru: "Russian",
  ar: "Arabic",
  vi: "Vietnamese",
  id: "Indonesian",
}

// cache-friendly 固定 system prompt (DeepSeek Context Cache ヒット率最大化)
const TRANSLATE_SYSTEM =
  "You are a professional localization engine for Paradigm LLC, a Tokyo-based digital agency. " +
  "You translate Japanese marketing/content JSON values into the requested target language. " +
  "Rules: (1) Return ONLY a JSON object with the EXACT same keys as the input. " +
  "(2) Translate ONLY the values, never the keys. (3) Keep brand names (Paradigm, PARADIGM) and " +
  "technical acronyms (SEO, MEO, GEO, AI, B2B, SMB, LINE, PayPay, EC) as-is. " +
  "(4) Natural, professional tone for the target market. (5) Preserve any markdown/placeholders."

type LexicalNode = { type?: string; text?: string; children?: LexicalNode[]; root?: LexicalNode; [k: string]: unknown }

function collectText(node: LexicalNode | undefined | null, out: string[]): void {
  if (!node || typeof node !== "object") return
  if (node.type === "text" && typeof node.text === "string") out.push(node.text)
  const kids = node.root?.children ?? node.children
  if (Array.isArray(kids)) for (const k of kids) collectText(k, out)
}

function applyText(node: LexicalNode, texts: string[], cursor: { i: number }): void {
  if (!node || typeof node !== "object") return
  if (node.type === "text" && typeof node.text === "string") {
    node.text = texts[cursor.i] ?? node.text
    cursor.i += 1
  }
  const kids = node.root?.children ?? node.children
  if (Array.isArray(kids)) for (const k of kids) applyText(k, texts, cursor)
}

async function translateValues(
  values: Record<string, string>,
  targetLang: string,
): Promise<Record<string, string> | null> {
  const res = await callDeepSeek(
    [
      { role: "system", content: TRANSLATE_SYSTEM },
      { role: "user", content: `Target language: ${targetLang}\nTranslate these JSON values:\n${JSON.stringify(values)}` },
    ],
    { responseFormat: "json_object", maxTokens: 4000, temperature: 0.3 },
  )
  if (!res.ok || !res.text) return null
  try {
    const parsed = JSON.parse(res.text)
    return typeof parsed === "object" && parsed ? (parsed as Record<string, string>) : null
  } catch {
    return null
  }
}

export interface AutoTranslateOpts {
  /** プレーンテキスト系 localized フィールド (text / textarea) */
  text?: string[]
  /** richText (lexical) localized フィールド */
  rich?: string[]
}

export function makeAutoTranslateHook(opts: AutoTranslateOpts): CollectionAfterChangeHook {
  const textFields = opts.text ?? []
  const richFields = opts.rich ?? []

  return async ({ doc, req, collection, context }) => {
    // ループ防止 + 起点 ja 限定
    if ((context as Record<string, unknown> | undefined)?.skipAutoTranslate) return doc
    if (req?.locale && req.locale !== SOURCE_LOCALE) return doc
    const payload = req?.payload
    const id = (doc as { id?: string | number })?.id
    if (!payload || id === undefined) return doc

    // 翻訳対象を flat 化 (text: "t:field" / richText: "r:field:index")
    const flat: Record<string, string> = {}
    for (const f of textFields) {
      const v = (doc as Record<string, unknown>)[f]
      if (typeof v === "string" && v.trim()) flat[`t:${f}`] = v
    }
    const richTexts: Record<string, string[]> = {}
    for (const f of richFields) {
      const arr: string[] = []
      collectText((doc as Record<string, LexicalNode>)[f], arr)
      if (arr.length) {
        richTexts[f] = arr
        arr.forEach((s, i) => {
          if (s.trim()) flat[`r:${f}:${i}`] = s
        })
      }
    }
    if (Object.keys(flat).length === 0) return doc

    for (const loc of TARGET_LOCALES) {
      try {
        const tr = await translateValues(flat, LANG_NAME[loc] ?? loc)
        if (!tr) continue
        const data: Record<string, unknown> = {}
        for (const f of textFields) {
          if (typeof tr[`t:${f}`] === "string") data[f] = tr[`t:${f}`]
        }
        for (const f of richFields) {
          const orig = (doc as Record<string, LexicalNode>)[f]
          const count = richTexts[f]?.length ?? 0
          if (!orig || count === 0) continue
          const translated = richTexts[f].map((s, i) => (s.trim() ? (tr[`r:${f}:${i}`] ?? s) : s))
          // count が一致する時のみ差し戻し (構造破壊を防ぐ)
          const clone = JSON.parse(JSON.stringify(orig)) as LexicalNode
          applyText(clone, translated, { i: 0 })
          data[f] = clone
        }
        // 全 locale 配信化
        const available = Array.from(new Set([...(routing.locales as readonly string[])]))
        data.availableLocales = available
        // drafts 有効 collection で翻訳が draft 版に入って公開版に反映されない問題の対策:
        // ソース doc の publish 状態 (_status) を翻訳 update にも伝播させる
        // (ja を published で保存 → 各 locale 翻訳も published 版へ保存される)。
        const srcStatus = (doc as Record<string, unknown>)._status
        if (typeof srcStatus === "string") data._status = srcStatus
        if (Object.keys(data).length === 0) continue
        await payload.update({
          collection: collection.slug as Parameters<typeof payload.update>[0]["collection"],
          id,
          locale: loc,
          data,
          context: { skipAutoTranslate: true },
          req,
        })
      } catch (e) {
        console.error(`[autoTranslate] ${collection.slug}#${id} → ${loc} failed:`, e instanceof Error ? e.message : e)
      }
    }
    return doc
  }
}
