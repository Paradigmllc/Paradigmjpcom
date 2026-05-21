/**
 * autoTranslateGlobal.ts — PayloadCMS global 用 自動多言語翻訳フック (2026-05-21)
 *
 * 役割: Header / Footer などの global で、admin が日本語 (ja) を保存すると
 *   afterChange が残り 11 locale を DeepSeek で自動翻訳し各 locale の localized
 *   値へ書き戻す。collection 版 (autoTranslate.ts) の global 対応版。
 *
 * collection 版との差分:
 *   - hook 型が GlobalAfterChangeHook (id 無し・payload.updateGlobal を使用)
 *   - 翻訳対象の指定方法を「localized な leaf field の "キー名"」で行う
 *     (例: ["label", "heading", "tagline"])。任意のネスト深さ
 *     (navItems[].label / columns[].links[].label) を再帰的に拾えるため、
 *     Footer の 2 段ネスト array でも追加設定なしで翻訳できる。
 *   - href / url / platform 等は localizedKeys に含めない限り素通し (= 保持)。
 *
 * 安全性: collection 版と同じ — loop 防止 (context.skipAutoTranslate)・
 *   起点=ja 限定・locale 毎 try/catch・DEEPSEEK_API_KEY 未設定時 no-op
 *   (translateValues が null を返すため自動的に skip)。
 */

import type { GlobalAfterChangeHook } from "payload"
import { translateValues, LANG_NAME, SOURCE_LOCALE, TARGET_LOCALES } from "./autoTranslate"

/** doc を再帰的に走査し、localizedKeys に該当する leaf string を path→value で収集 */
function collectByKeys(
  node: unknown,
  path: string,
  keys: Set<string>,
  out: Record<string, string>,
): void {
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectByKeys(item, path ? `${path}.${i}` : String(i), keys, out))
    return
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      const p = path ? `${path}.${k}` : k
      if (keys.has(k) && typeof v === "string" && v.trim()) {
        out[p] = v // localized leaf → 収集 (これ以上潜らない)
      } else {
        collectByKeys(v, p, keys, out) // それ以外は再帰
      }
    }
  }
}

/** deep-clone した target に対し path 位置の string を翻訳済み value で上書き */
function applyByPath(target: Record<string, unknown>, path: string, value: string): void {
  const parts = path.split(".")
  let cur: unknown = target
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur == null || typeof cur !== "object") return
    cur = (cur as Record<string, unknown>)[parts[i]] // 配列も arr["0"] でアクセス可
  }
  if (cur != null && typeof cur === "object") {
    ;(cur as Record<string, unknown>)[parts[parts.length - 1]] = value
  }
}

// updateGlobal に送らない system field
const SYSTEM_KEYS = new Set(["id", "createdAt", "updatedAt", "globalType"])

export interface GlobalAutoTranslateOpts {
  /** localized な leaf field の「キー名」(例: ["label", "heading", "tagline", "copyright"]) */
  localizedKeys: string[]
}

export function makeGlobalAutoTranslateHook(opts: GlobalAutoTranslateOpts): GlobalAfterChangeHook {
  const keys = new Set(opts.localizedKeys)

  return async ({ doc, req, global, context }) => {
    if ((context as Record<string, unknown> | undefined)?.skipAutoTranslate) return doc
    if (req?.locale && req.locale !== SOURCE_LOCALE) return doc
    const payload = req?.payload
    if (!payload) return doc

    const d = doc as Record<string, unknown>
    const flat: Record<string, string> = {}
    collectByKeys(d, "", keys, flat)
    if (Object.keys(flat).length === 0) return doc

    // updateGlobal に送る base (system field を除去した clone)
    const base: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(d)) if (!SYSTEM_KEYS.has(k)) base[k] = v

    for (const loc of TARGET_LOCALES) {
      try {
        const tr = await translateValues(flat, LANG_NAME[loc] ?? loc)
        if (!tr) continue
        const clone = JSON.parse(JSON.stringify(base)) as Record<string, unknown>
        for (const [path, original] of Object.entries(flat)) {
          const translated = tr[path]
          applyByPath(clone, path, typeof translated === "string" ? translated : original)
        }
        await payload.updateGlobal({
          slug: global.slug as Parameters<typeof payload.updateGlobal>[0]["slug"],
          locale: loc as Parameters<typeof payload.updateGlobal>[0]["locale"],
          data: clone,
          context: { skipAutoTranslate: true },
          req,
        })
      } catch (e) {
        console.error(
          `[autoTranslateGlobal] ${global.slug} → ${loc} failed:`,
          e instanceof Error ? e.message : e,
        )
      }
    }
    return doc
  }
}
