/**
 * astro-demo build pipeline — Keystatic content → demo data registry
 *
 * Reads Keystatic demo-sites content from the parent repo and generates
 * a TypeScript registry file used by the Astro demo site at build time.
 *
 * Usage: node scripts/build-demo-data.mjs (run before `astro build`)
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const KEYSTATIC_DIR = resolve(ROOT, "..", "content", "keystatic", "demo-sites")
const OUTPUT_FILE = resolve(ROOT, "src", "keystatic", "demo-data.ts")

// Simple YAML frontmatter parser (no dependency needed)
function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return null
  const fm = {}
  const lines = match[1].split("\n")
  let currentKey = null
  let currentArray = null
  let currentArrayItem = null

  for (const line of lines) {
    // Array item: "  - key: value"
    const arrItemMatch = line.match(/^  - (\w+):\s*(.*)/)
    if (arrItemMatch && currentArray) {
      if (currentArrayItem && currentArray.length > 0 && !line.startsWith("    ")) {
        currentArray.push(currentArrayItem)
        currentArrayItem = null
      }
      const itemKey = arrItemMatch[1]
      const itemVal = arrItemMatch[2].replace(/^"(.*)"$/, "$1")
      currentArrayItem = currentArrayItem || {}
      currentArrayItem[itemKey] = itemVal
      continue
    }

    // Nested array item property: "    key: value"
    const nestedMatch = line.match(/^    (\w+):\s*(.*)/)
    if (nestedMatch && currentArrayItem) {
      currentArrayItem[nestedMatch[1]] = nestedMatch[2].replace(/^"(.*)"$/, "$1")
      continue
    }

    // Flush pending array item
    if (currentArrayItem && currentArray.length >= 0) {
      currentArray.push(currentArrayItem)
      currentArrayItem = null
    }

    // Key: value
    const kvMatch = line.match(/^(\w+):\s*(.*)/)
    if (kvMatch) {
      const key = kvMatch[1]
      const val = kvMatch[2].replace(/^"(.*)"$/, "$1").trim()
      if (val === "") {
        currentKey = key
        currentArray = []
        fm[key] = currentArray
        currentArrayItem = null
      } else {
        fm[key] = val
        currentKey = null
        currentArray = null
        currentArrayItem = null
      }
    }
  }

  // Flush last array item
  if (currentArrayItem && currentArray) {
    currentArray.push(currentArrayItem)
  }

  return fm
}

function build() {
  const demos = []

  if (existsSync(KEYSTATIC_DIR)) {
    const files = readdirSync(KEYSTATIC_DIR).filter(f => f.endsWith(".mdoc"))
    for (const file of files) {
      const raw = readFileSync(resolve(KEYSTATIC_DIR, file), "utf8")
      const fm = parseFrontmatter(raw)
      if (fm && fm.title && fm.status !== "draft") {
        demos.push({
          title: fm.title || file.replace(".mdoc", ""),
          customerName: fm.customerName || fm.title,
          companyId: fm.companyId || "",
          domain: fm.domain || "",
          industry: fm.industry || "consulting",
          accentColor: fm.accentColor || "#7c3aed",
          accentColorDark: fm.accentColorDark || "#5b21b6",
          status: fm.status || "ready",
          heroHeadline: fm.heroHeadline || "",
          heroSubtitle: fm.heroSubtitle || "",
          serviceTitle: fm.serviceTitle || "提供サービス",
          services: Array.isArray(fm.services) ? fm.services : [],
          caseTitle: fm.caseTitle || "導入実績",
          caseDescription: fm.caseDescription || "",
          caseMetrics: Array.isArray(fm.caseMetrics) ? fm.caseMetrics : [],
          ctaTitle: fm.ctaTitle || "無料相談",
          ctaBody: fm.ctaBody || "",
          calBookingUrl: fm.calBookingUrl || "",
        })
      }
    }
  }

  const registryEntries = demos.map(d =>
    `  "${d.title}": ${JSON.stringify(d, null, 4)}`
  ).join(",\n") || '  "default-demo": DEFAULT_DEMO'

  const output = `export interface DemoData {
  title: string
  customerName: string
  companyId?: string
  domain?: string
  industry: string
  accentColor: string
  accentColorDark: string
  status: "draft" | "review" | "ready"
  heroHeadline: string
  heroSubtitle: string
  serviceTitle: string
  services: { title: string; description: string; icon: string }[]
  caseTitle: string
  caseDescription: string
  caseMetrics: { label: string; value: string; suffix: string }[]
  ctaTitle: string
  ctaBody: string
  calBookingUrl: string
}

export const DEFAULT_DEMO: DemoData = ${JSON.stringify(demos[0] || {
    title: "default-demo",
    customerName: "株式会社サンプル",
    industry: "consulting",
    accentColor: "#7c3aed",
    accentColorDark: "#5b21b6",
    status: "ready",
    heroHeadline: "デジタルマーケティングを次のステージへ",
    heroSubtitle: "診断データに基づくパーソナライズド・リニューアル提案",
    serviceTitle: "提供サービス",
    services: [
      { title: "Webサイト制作", description: "最新技術でコンバージョン最適化", icon: "Globe" },
      { title: "SEO/MEO対策", description: "検索上位表示で新規顧客獲得", icon: "Search" },
      { title: "動画マーケティング", description: "視覚的訴求でエンゲージメント向上", icon: "Play" },
    ],
    caseTitle: "導入実績",
    caseDescription: "同業種での改善実績とKPIデータ",
    caseMetrics: [
      { label: "CVR改善", value: "2.4", suffix: "x" },
      { label: "問合せ増加", value: "156", suffix: "%" },
      { label: "表示速度", value: "92", suffix: "点" },
    ],
    ctaTitle: "まずは無料相談から",
    ctaBody: "15分のオンライン診断で、改善の余地を可視化します。お気軽にご予約ください。",
    calBookingUrl: "https://cal.com/paradigm-jp/15min",
  }, null, 2)}

// Demo registry — generated by scripts/build-demo-data.mjs
export const DEMO_REGISTRY: Record<string, DemoData> = {
${registryEntries}
}

export function getDemoData(slug: string): DemoData {
  return DEMO_REGISTRY[slug] ?? DEFAULT_DEMO
}
`

  writeFileSync(OUTPUT_FILE, output, "utf8")
  console.log(`[build-demo-data] Generated ${demos.length} demo sites → ${OUTPUT_FILE}`)
}

build()
