import type { Metadata } from "next"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { buildDemoData } from "@/lib/sales/demo-data"
import { buildFullSiteDemoHtml, type FullSiteDemoCompany } from "@/lib/sales/fullsite-demo-templates"
import DemoClient from "./DemoClient"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}

interface WebDemoRow {
  id: string
  slug: string
  name: string | null
  html_content: string | null
  html: string | null
  is_published: boolean | null
}

function notFoundHtml(slug: string): string {
  const safeSlug = slug.replace(/[<>&"]/g, "")
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Demo not found</title><style>body{margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f8fafc;color:#0f172a}.wrap{min-height:100vh;display:grid;place-items:center;padding:24px}.card{max-width:560px;border:1px solid #e2e8f0;background:white;border-radius:18px;padding:28px;box-shadow:0 24px 70px rgba(15,23,42,.08)}h1{margin:0 0 12px;font-size:24px}p{color:#64748b;line-height:1.8}</style></head><body><main class="wrap"><section class="card"><h1>デモサイトがまだ生成されていません</h1><p>slug: ${safeSlug}</p><p>RevenueOSで対象企業の診断・フルサイトデモ生成を実行してください。</p></section></main></body></html>`
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

async function resolveDemoHtml(row: WebDemoRow): Promise<string | null> {
  const content = row.html_content ?? row.html
  if (!content) return null
  if (!isHttpUrl(content)) return content

  try {
    const res = await fetch(content, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) {
      console.error("[demo-page] R2 demo fetch failed:", { slug: row.slug, status: res.status })
      return null
    }
    return await res.text()
  } catch (error) {
    console.error("[demo-page] R2 demo fetch error:", error)
    return null
  }
}

function sampleCompanyForDemo(slug: string, locale: string): FullSiteDemoCompany {
  const variantSlug = slug.replace(/-demo$/, "")
  return {
    id: `sample-${variantSlug}`,
    report_locale: locale === "ja" ? "ja" : "en",
    target_country: locale === "ja" ? "JP" : "US",
    template_variant: variantSlug === "japan_entry" || variantSlug === "dx_ai_package" ? variantSlug : "website_diagnostic",
    domain: "example.com",
    company_name: locale === "ja" ? "株式会社サンプル" : "Sample Company",
    industry: variantSlug === "meo" ? "restaurant" : variantSlug === "security" ? "dental" : "consulting",
    prefecture: locale === "ja" ? "東京都渋谷区" : "Tokyo",
    meta: {},
  }
}

function fallbackFullSiteHtml(slug: string, locale: string): string | null {
  const variant = slug.replace(/-demo$/, "")
  if (!["website_diagnostic", "meo", "security", "japan_entry", "dx_ai_package"].includes(variant)) return null
  const report = buildDemoData(variant, locale === "ja" ? "ja" : "en")
  return buildFullSiteDemoHtml(sampleCompanyForDemo(slug, locale), report, "RevenueOS full-site demo")
}

export default async function DemoPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const sb = getServiceSalesSupabase()

  if (!sb) {
    const fallbackHtml = fallbackFullSiteHtml(slug, locale) ?? notFoundHtml(slug)
    return <DemoClient demoId={`fallback-${slug}`} slug={slug} name={slug} html={fallbackHtml} />
  }

  const { data, error } = await sb
    .from("web_demos")
    .select("id, slug, name, html_content, html, is_published")
    .eq("slug", slug)
    .maybeSingle()

  if (error) console.error("[demo-page] web_demos lookup failed:", error.message)

  if (error || !data || data.is_published === false) {
    const fallbackHtml = fallbackFullSiteHtml(slug, locale) ?? notFoundHtml(slug)
    return <DemoClient demoId={`fallback-${slug}`} slug={slug} name={slug} html={fallbackHtml} />
  }

  const row = data as WebDemoRow
  const html = await resolveDemoHtml(row)
  return (
    <DemoClient
      demoId={row.id}
      slug={slug}
      name={row.name ?? slug}
      html={html ?? fallbackFullSiteHtml(slug, locale) ?? notFoundHtml(slug)}
    />
  )
}
