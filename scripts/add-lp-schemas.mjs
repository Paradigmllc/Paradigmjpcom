import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const base = path.resolve(__dirname, "..", "src", "app", "[locale]")

const items = [
  { f: "lp/meo/page.tsx", p: "/lp/meo", t: "Local SEO" },
  { f: "lp/seo/page.tsx", p: "/lp/seo", t: "SEO/GEO" },
  { f: "lp/ai/page.tsx", p: "/lp/ai", t: "AI Integration" },
  { f: "agency/page.tsx", p: "/agency", t: "Agency White-Label" },
]

for (const item of items) {
  const fp = path.join(base, item.f)
  let content = fs.readFileSync(fp, "utf8")
  if (content.includes("application/ld+json")) {
    console.log("SKIP already has schema:", item.f)
    continue
  }

  const schemaBlock = `      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildServiceSchema({ name: t("metaTitle"), description: t("metaDescription"), url: \`https://paradigmjp.com/\${locale}${item.p}\`, locale, serviceType: "${item.t}" })) }} />
    </>`

  content = content.replace("    </>", schemaBlock)
  fs.writeFileSync(fp, content, "utf8")
  console.log("OK:", item.f)
}

console.log("Done")
