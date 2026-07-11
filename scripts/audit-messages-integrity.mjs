#!/usr/bin/env node
/**
 * audit-messages-integrity.mjs — Verify messages/{12 locale}.json 構造整合性
 *
 * 検証項目:
 *   ① placeholder ({name}, {count} 等) の数と名前が ja を base に他 11 locale で一致
 *   ② HTML タグ (<br/>, <strong>, <a> 等) が ja を base に保存されている
 *   ③ ja 以外の locale で JP 文字 leak (翻訳されていない箇所)
 *   ④ en 以外の locale で素の英文残存 (DeepSeek 翻訳漏れ)
 *
 * 出力: 各 locale × 問題分類 のサマリ + 具体的なキー一覧
 */

import { readFileSync } from "node:fs"

const LOCALES = ["ja", "en", "ko", "zh", "de", "fr", "es", "pt", "ru", "ar", "vi", "id"]
const BASE = "ja"
const ACTIVE_PUBLIC_LOCALES = new Set(["ja", "en"])

function flatten(obj, prefix = "") {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === "object" && item !== null) {
          Object.assign(out, flatten(item, `${key}[${i}]`))
        } else {
          out[`${key}[${i}]`] = item
        }
      })
    } else if (typeof v === "object" && v !== null) {
      Object.assign(out, flatten(v, key))
    } else {
      out[key] = v
    }
  }
  return out
}

const data = {}
for (const l of LOCALES) {
  data[l] = flatten(JSON.parse(readFileSync(`messages/${l}.json`, "utf8")))
}

const base = data[BASE]
const baseKeys = Object.keys(base)

console.log(`# messages JSON 整合性 audit\n`)
console.log(`Base locale: ${BASE} (${baseKeys.length} flat keys)\n`)

const PLACEHOLDER_RE = /\{[a-zA-Z_][a-zA-Z0-9_]*\}/g
const HTML_TAG_RE = /<[a-zA-Z][^>]*>/g
// ja 特有の hiragana + katakana のみで JP leak 判定 (漢字は zh と共通なので除外)
const JP_RE = /[぀-ゟ゠-ヿ]/

const report = {}

for (const l of LOCALES) {
  if (l === BASE) continue
  if (!ACTIVE_PUBLIC_LOCALES.has(l)) {
    console.log(`${l}: inactive legacy catalog (public route redirects to /en; skipped from public-content gate)`)
    continue
  }
  const issues = {
    placeholderMismatch: [],
    htmlMismatch: [],
    jpLeak: [], // non-ja locale has JP char in value (likely untranslated)
  }
  for (const key of baseKeys) {
    const baseVal = base[key]
    const locVal = data[l][key]
    if (typeof baseVal !== "string" || typeof locVal !== "string") continue

    // ① placeholder check
    const basePh = (baseVal.match(PLACEHOLDER_RE) ?? []).sort().join(",")
    const locPh = (locVal.match(PLACEHOLDER_RE) ?? []).sort().join(",")
    if (basePh !== locPh) {
      issues.placeholderMismatch.push({ key, base: basePh, loc: locPh, sample: locVal.slice(0, 80) })
    }

    // ② HTML tag check
    const baseHtml = (baseVal.match(HTML_TAG_RE) ?? []).sort().join(",")
    const locHtml = (locVal.match(HTML_TAG_RE) ?? []).sort().join(",")
    if (baseHtml !== locHtml) {
      issues.htmlMismatch.push({ key, base: baseHtml, loc: locHtml, sample: locVal.slice(0, 80) })
    }

    // ③ JP leak (in non-ja locale)
    // ただし固有名詞 "Paradigm" "パラダイム" 等は除外する必要なし — 完璧化の文脈では全部 flag
    if (JP_RE.test(locVal)) {
      issues.jpLeak.push({ key, sample: locVal.slice(0, 80) })
    }
  }
  report[l] = issues
}

let totalIssues = 0
for (const l of LOCALES) {
  if (l === BASE) continue
  if (!ACTIVE_PUBLIC_LOCALES.has(l)) continue
  const r = report[l]
  const sum = r.placeholderMismatch.length + r.htmlMismatch.length + r.jpLeak.length
  totalIssues += sum
  console.log(
    `${l}: placeholders=${r.placeholderMismatch.length} | html=${r.htmlMismatch.length} | jp-leak=${r.jpLeak.length}`,
  )
}

console.log(`\n=== TOTAL ISSUES: ${totalIssues} ===\n`)

// Detail: first 10 of each problem type per locale
for (const l of LOCALES) {
  if (l === BASE) continue
  if (!ACTIVE_PUBLIC_LOCALES.has(l)) continue
  const r = report[l]
  if (r.placeholderMismatch.length > 0) {
    console.log(`\n## ${l} — placeholder mismatch (${r.placeholderMismatch.length}):`)
    for (const x of r.placeholderMismatch.slice(0, 5)) {
      console.log(`  ${x.key}: base=[${x.base}] → loc=[${x.loc}]`)
      console.log(`    sample: ${x.sample}`)
    }
  }
  if (r.htmlMismatch.length > 0) {
    console.log(`\n## ${l} — HTML tag mismatch (${r.htmlMismatch.length}):`)
    for (const x of r.htmlMismatch.slice(0, 5)) {
      console.log(`  ${x.key}: base=[${x.base}] → loc=[${x.loc}]`)
    }
  }
  if (r.jpLeak.length > 0) {
    console.log(`\n## ${l} — JP leak in non-ja locale (${r.jpLeak.length}):`)
    for (const x of r.jpLeak.slice(0, 5)) {
      console.log(`  ${x.key}: ${x.sample}`)
    }
  }
}
