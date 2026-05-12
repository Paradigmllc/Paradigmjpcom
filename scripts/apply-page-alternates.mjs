#!/usr/bin/env node
/**
 * apply-page-alternates.mjs — Apply `pageAlternates(locale, "/path")` to all page
 *                              metadata blocks (Sprint audit fix #2).
 *
 * 各 page の generateMetadata return に `alternates: pageAlternates(...)` を追加し、
 * 必要な import を追加。
 */

import { readFileSync, writeFileSync } from "node:fs"

// path = file path / route = pageAlternates 第2引数 (locale 後の path)
const FILES = [
  { path: "src/app/[locale]/about/page.tsx", route: "/about" },
  { path: "src/app/[locale]/services/page.tsx", route: "/services" },
  { path: "src/app/[locale]/services/web/page.tsx", route: "/services/web" },
  { path: "src/app/[locale]/services/meo/page.tsx", route: "/services/meo" },
  { path: "src/app/[locale]/services/seo/page.tsx", route: "/services/seo" },
  { path: "src/app/[locale]/services/ai/page.tsx", route: "/services/ai" },
  { path: "src/app/[locale]/pricing/page.tsx", route: "/pricing" },
  { path: "src/app/[locale]/contact/page.tsx", route: "/contact" },
  { path: "src/app/[locale]/faq/page.tsx", route: "/faq" },
  { path: "src/app/[locale]/legal/page.tsx", route: "/legal" },
  { path: "src/app/[locale]/privacy/page.tsx", route: "/privacy" },
  { path: "src/app/[locale]/works/page.tsx", route: "/works" },
  { path: "src/app/[locale]/blog/page.tsx", route: "/blog" },
  { path: "src/app/[locale]/lp/web/page.tsx", route: "/lp/web" },
  { path: "src/app/[locale]/lp/meo/page.tsx", route: "/lp/meo" },
  { path: "src/app/[locale]/lp/seo/page.tsx", route: "/lp/seo" },
  { path: "src/app/[locale]/lp/ai/page.tsx", route: "/lp/ai" },
]

let modified = 0
let skipped = 0
const errors = []

for (const { path, route } of FILES) {
  try {
    let src = readFileSync(path, "utf8")

    // Skip if already applied
    if (src.includes("pageAlternates(locale,")) {
      console.log(`[skip] ${path} — already has pageAlternates`)
      skipped++
      continue
    }

    // 1. Add import after the `getTranslations from "next-intl/server"` import line.
    //    CRLF tolerant: \r? for Windows.
    if (!src.includes('from "@/lib/page-metadata"')) {
      const importRE = /(import \{ getTranslations \} from "next-intl\/server"\r?\n)/
      if (!importRE.test(src)) {
        errors.push(`${path}: getTranslations import not found`)
        continue
      }
      src = src.replace(
        importRE,
        `$1import { pageAlternates } from "@/lib/page-metadata"\n`,
      )
    }

    // 2. Add alternates field in generateMetadata return (last property pattern).
    //    CRLF tolerant.
    const returnRE = /(\s+description:\s*t\([^)]*\)),?\r?\n(\s+)\}/
    if (!returnRE.test(src)) {
      errors.push(`${path}: generateMetadata return shape not matched`)
      continue
    }
    src = src.replace(
      returnRE,
      `$1,\n$2  alternates: pageAlternates(locale, "${route}"),\n$2}`,
    )

    writeFileSync(path, src, "utf8")
    console.log(`[ok]   ${path} → alternates added for "${route}"`)
    modified++
  } catch (e) {
    errors.push(`${path}: ${e.message}`)
  }
}

console.log(`\n=== modified=${modified} skipped=${skipped} errors=${errors.length} ===`)
if (errors.length > 0) {
  console.log("\nErrors:")
  for (const e of errors) console.log(`  - ${e}`)
  process.exit(1)
}
