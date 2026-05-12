#!/usr/bin/env node
/**
 * audit-metadata.mjs — 全 page.tsx が AE-PHP-3 (canonical + hreflang + JSON-LD)
 *                       を満たすか検証
 *
 * チェック項目:
 *   ① export const metadata or export async function generateMetadata
 *   ② title + description が存在 (literal or i18n)
 *   ③ alternates.canonical 設定
 *   ④ alternates.languages (hreflang multi-locale) 設定
 *   ⑤ openGraph 設定
 *   ⑥ twitter 設定 (推奨)
 *   ⑦ JSON-LD (構造化データ) 描画
 */

import { readFileSync } from "node:fs"
import { execSync } from "node:child_process"

const pages = execSync("git ls-files src/app", { encoding: "utf8" })
  .split("\n")
  .filter((f) => f.match(/page\.tsx$/))
  .filter((f) => !f.includes("_archive_"))

const report = []

for (const file of pages) {
  const src = readFileSync(file, "utf8")
  const r = {
    file,
    hasMetadata: /export\s+const\s+metadata/.test(src) || /export\s+async\s+function\s+generateMetadata/.test(src),
    hasTitle: /title:/.test(src),
    hasDescription: /description:/.test(src),
    hasCanonical:
      /canonical:/.test(src) ||
      /alternates:\s*\{[\s\S]*?canonical/.test(src) ||
      /alternates:\s*pageAlternates\(/.test(src),
    hasLanguages:
      /languages:/.test(src) ||
      /alternates:\s*\{[\s\S]*?languages/.test(src) ||
      /alternates:\s*pageAlternates\(/.test(src),
    hasOpenGraph: /openGraph:/.test(src),
    hasTwitter: /twitter:/.test(src),
    hasJsonLd: /application\/ld\+json|JsonLd|buildArticleSchema|buildLocalBusinessSchema|buildBreadcrumbSchema|buildServiceSchema|buildFAQSchema|buildWebSiteSchema/.test(src),
    // 役割コメント (AE-PHP-4)
    hasRoleComment: /役割[:：]/.test(src) || /\* (Role|Purpose)/.test(src),
  }
  report.push(r)
}

console.log(`# 全 page.tsx generateMetadata + JSON-LD audit (${pages.length} files)\n`)
console.log("| file | meta | title | desc | canonical | languages | OG | twitter | JSON-LD | 役割 |")
console.log("|------|------|-------|------|-----------|-----------|-----|---------|---------|------|")

let issues = 0
for (const r of report) {
  const mark = (b) => (b ? "✅" : "❌")
  const missing = [
    !r.hasMetadata && "meta",
    !r.hasTitle && "title",
    !r.hasDescription && "desc",
    !r.hasCanonical && "canonical",
    !r.hasLanguages && "languages",
    !r.hasOpenGraph && "OG",
    !r.hasJsonLd && "JSON-LD",
    !r.hasRoleComment && "役割",
  ].filter(Boolean)
  if (missing.length > 0) issues += missing.length
  console.log(
    `| ${r.file} | ${mark(r.hasMetadata)} | ${mark(r.hasTitle)} | ${mark(r.hasDescription)} | ${mark(r.hasCanonical)} | ${mark(r.hasLanguages)} | ${mark(r.hasOpenGraph)} | ${mark(r.hasTwitter)} | ${mark(r.hasJsonLd)} | ${mark(r.hasRoleComment)} |`,
  )
}

console.log(`\n=== TOTAL ISSUE FIELDS: ${issues} (across ${pages.length} pages) ===`)
