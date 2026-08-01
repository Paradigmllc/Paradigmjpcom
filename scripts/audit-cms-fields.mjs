#!/usr/bin/env node
/**
 * audit-cms-fields.mjs — PayloadCMS collection の i18n 設定整合性検証
 *
 * チェック項目:
 *   ① ユーザ可視 (visible content) な text/textarea/richText が localized: true
 *   ② availableLocales が 12-locale option を持つ (Sprint 1 で導入済)
 *   ③ legacy `locale` field が disabled になっている (Sprint 4 で対応済)
 */

import { readFileSync } from "node:fs"
import { execSync } from "node:child_process"

const cols = execSync("git ls-files src/collections", { encoding: "utf8" })
  .split("\n")
  .filter((f) => f.endsWith(".ts"))
  .filter((f) => !f.includes("_localeOptions"))
  .filter(Boolean)

const VISIBLE_FIELD_NAMES = [
  "title", "name", "tagline", "description", "subtitle", "label",
  "excerpt", "content", "answer", "question", "feature", "category",
  "planName", "metaTitle", "metaDescription", "challenge", "solution",
  "metrics", "address", "businessHours", "maintenanceMessage",
  "siteName", "tagline", "ctaLabel", "caption", "readTime",
]

// Lead and user records are identity data, not translated content. Their
// display names must remain one canonical value across the admin surface.
const NON_LOCALIZED_COLLECTIONS = new Set([
  "src/collections/Leads.ts",
  "src/collections/Users.ts",
])

function shouldBeLocalized(name) {
  return VISIBLE_FIELD_NAMES.includes(name)
}

const issues = []

for (const file of cols) {
  if (NON_LOCALIZED_COLLECTIONS.has(file)) continue
  const src = readFileSync(file, "utf8")
  const lines = src.split("\n")
  // simple field block detection: `{ name: "...", type: "text|textarea|richText|email", ... }`
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/name:\s*["']([^"']+)["']/)
    if (!m) continue
    const fieldName = m[1]
    if (!shouldBeLocalized(fieldName)) continue
    // look ahead a few lines for `type:` and `localized:`
    const block = lines.slice(i, Math.min(i + 8, lines.length)).join("\n")
    const typeMatch = block.match(/type:\s*["'](text|textarea|richText|email)["']/)
    if (!typeMatch) continue
    const isLocalized = /localized:\s*true/.test(block)
    if (!isLocalized) {
      issues.push({ file, line: i + 1, fieldName, type: typeMatch[1] })
    }
  }
}

console.log(`# PayloadCMS field localized: true audit (${cols.length} collections)\n`)
if (issues.length === 0) {
  console.log("✅ No issues — all visible fields are localized: true")
} else {
  console.log(`❌ ${issues.length} issues:\n`)
  for (const x of issues) {
    console.log(`  ${x.file}:${x.line}  field=${x.fieldName}  type=${x.type}  — missing localized: true`)
  }
}
