#!/usr/bin/env node
/**
 * audit-i18n-leaks.mjs — Scan live .tsx files for JP/CN chars OUTSIDE comments.
 *
 * 役割: ハードコード JP 文字 (ひらがな/カタカナ/漢字) のうち、コメント (// or /* * /)
 *       内ではなく実コード/JSX 内に存在するものを精密検出。Sprint 0-4 完了後の
 *       「完璧化検証」用 audit script。
 *
 * 使い方: node scripts/audit-i18n-leaks.mjs
 * 出力:   files × line:col × content  (markdown table 風)
 */

import { readFileSync } from "node:fs"
import { execSync } from "node:child_process"

const JP_RE = /[぀-ゟ゠-ヿ一-龯ｦ-ﾟ]/

// strip /* ... */ block comments and // line comments while keeping line numbers
function stripComments(src) {
  // remove block comments (preserve newlines for line-number alignment)
  src = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
  // remove line comments
  src = src.replace(/(^|\s)\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length))
  return src
}

// strip "string literal" and 'string literal' and `template literal` JP — those ARE legitimate
// JSX text? No — we want to FIND JP. So don't strip those.
// We want to KEEP: JSX text, attr values, string literals (those are bugs)
// We want to STRIP: comments only.

const all = execSync("git ls-files src", { encoding: "utf8" })
  .split("\n")
  .filter((f) => f.endsWith(".tsx"))
  .filter((f) => !f.includes("_archive_"))
  .filter((f) => !f.endsWith(".test.tsx"))

const hits = []
for (const file of all) {
  const src = readFileSync(file, "utf8")
  const stripped = stripComments(src)
  const lines = stripped.split("\n")
  const orig = src.split("\n")
  lines.forEach((line, i) => {
    if (JP_RE.test(line)) {
      hits.push({ file, line: i + 1, content: orig[i].trim() })
    }
  })
}

console.log(`Found ${hits.length} JP-bearing lines in live .tsx outside comments\n`)
for (const h of hits) {
  console.log(`${h.file}:${h.line}: ${h.content}`)
}
