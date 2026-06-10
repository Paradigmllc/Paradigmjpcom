/**
 * One-shot script: add JSON-LD schema markup to pages missing it.
 * Run: node scripts/add-schemas.mjs
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")

const pages = [
  {
    file: "src/app/[locale]/blog/page.tsx",
    imports: { buildArticleSchema: "@/lib/seo/schemas" },
    schema: `buildArticleSchema({ title: t("heroTitle"), description: t("heroDesc"), url: \`https://paradigmjp.com/\${locale}/blog\`, locale })`,
    after: "          </div>\n        </div>\n      </section>",
  },
  {
    file: "src/app/[locale]/works/page.tsx",
    imports: { buildArticleSchema: "@/lib/seo/schemas" },
    schema: `buildArticleSchema({ title: t("heroTitle"), description: t("heroDesc"), url: \`https://paradigmjp.com/\${locale}/works\`, locale })`,
    after: "        </div>\n      </section>",
  },
  {
    file: "src/app/[locale]/about/page.tsx",
    imports: { buildArticleSchema: "@/lib/seo/schemas" },
    schema: `buildArticleSchema({ title: t("heroTitle"), description: t("heroDesc"), url: \`https://paradigmjp.com/\${locale}/about\`, locale })`,
    after: "      </section>",
  },
  {
    file: "src/app/[locale]/contact/page.tsx",
    imports: { buildArticleSchema: "@/lib/seo/schemas" },
    schema: `buildArticleSchema({ title: t("heroTitle"), description: t("heroDesc"), url: \`https://paradigmjp.com/\${locale}/contact\`, locale })`,
    after: "      </section>",
  },
  {
    file: "src/app/[locale]/video/page.tsx",
    imports: { buildServiceSchema: "@/lib/seo/schemas" },
    schema: `buildServiceSchema({ name: t("metaTitle"), description: t("metaDescription"), url: \`https://paradigmjp.com/\${locale}/video\`, locale, serviceType: "Video Subscription" })`,
    after: "      <RichCtaBand",
  },
  {
    file: "src/app/[locale]/agency/page.tsx",
    imports: { buildServiceSchema: "@/lib/seo/schemas" },
    schema: `buildServiceSchema({ name: t("metaTitle"), description: t("metaDescription"), url: \`https://paradigmjp.com/\${locale}/agency\`, locale, serviceType: "Agency White-Label" })`,
    after: "      <RichCtaBand",
  },
  {
    file: "src/app/[locale]/lp/web/page.tsx",
    imports: { buildServiceSchema: "@/lib/seo/schemas" },
    schema: `buildServiceSchema({ name: t("metaTitle"), description: t("metaDescription"), url: \`https://paradigmjp.com/\${locale}/lp/web\`, locale, serviceType: "Web Development" })`,
    after: "      <RichCtaBand",
  },
  {
    file: "src/app/[locale]/lp/meo/page.tsx",
    imports: { buildServiceSchema: "@/lib/seo/schemas" },
    schema: `buildServiceSchema({ name: t("metaTitle"), description: t("metaDescription"), url: \`https://paradigmjp.com/\${locale}/lp/meo\`, locale, serviceType: "Local SEO" })`,
    after: "      <RichCtaBand",
  },
  {
    file: "src/app/[locale]/lp/seo/page.tsx",
    imports: { buildServiceSchema: "@/lib/seo/schemas" },
    schema: `buildServiceSchema({ name: t("metaTitle"), description: t("metaDescription"), url: \`https://paradigmjp.com/\${locale}/lp/seo\`, locale, serviceType: "SEO/GEO" })`,
    after: "      <RichCtaBand",
  },
  {
    file: "src/app/[locale]/lp/ai/page.tsx",
    imports: { buildServiceSchema: "@/lib/seo/schemas" },
    schema: `buildServiceSchema({ name: t("metaTitle"), description: t("metaDescription"), url: \`https://paradigmjp.com/\${locale}/lp/ai\`, locale, serviceType: "AI Integration" })`,
    after: "      <RichCtaBand",
  },
]

let done = 0
for (const page of pages) {
  const fp = path.join(root, page.file)
  if (!fs.existsSync(fp)) {
    console.log(`SKIP missing: ${page.file}`)
    continue
  }

  let content = fs.readFileSync(fp, "utf8")

  // Skip if already has schema
  if (content.includes("application/ld+json")) {
    console.log(`SKIP already has schema: ${page.file}`)
    continue
  }

  // Add import
  for (const [name, source] of Object.entries(page.imports)) {
    const importLine = `import { ${name} } from "${source}"`
    if (!content.includes(importLine)) {
      // Add after the last import from the same source directory or after the last existing import
      const lastImportMatch = content.match(/import .* from "[^"]+"/g)
      if (lastImportMatch) {
        const lastImport = lastImportMatch[lastImportMatch.length - 1]
        content = content.replace(lastImport, `${lastImport}\n${importLine}`)
      }
    }
  }

  // Add schema script tag - for RichCtaBand-based pages, insert BEFORE RichCtaBand
  // For others, insert AFTER the last section
  if (page.after.includes("RichCtaBand")) {
    const schemaBlock = `      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(${page.schema}) }} />\n\n`
    content = content.replace(page.after, `${schemaBlock}${page.after}`)
  } else {
    const schemaBlock = `\n      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(${page.schema}) }} />`
    // Find the last occurrence of the after marker and add schema after it
    const lastIdx = content.lastIndexOf(page.after)
    if (lastIdx !== -1) {
      const endOfSection = lastIdx + page.after.length
      content = content.slice(0, endOfSection) + schemaBlock + content.slice(endOfSection)
    } else {
      console.log(`WARN: could not find anchor in ${page.file}`)
      continue
    }
  }

  fs.writeFileSync(fp, content, "utf8")
  done++
  console.log(`OK: ${page.file}`)
}

console.log(`\nDone. Pages updated: ${done}`)
