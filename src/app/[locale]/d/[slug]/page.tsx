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

const SAMPLE_DEMO_CASES: Record<string, {
  variant: string
  templateVariant: FullSiteDemoCompany["template_variant"]
  industry: FullSiteDemoCompany["industry"]
  companyNameJa: string
  companyNameEn: string
  prefectureJa: string
}> = {
  website_diagnostic: {
    variant: "website_diagnostic",
    templateVariant: "website_diagnostic",
    industry: "consulting",
    companyNameJa: "株式会社サンプル",
    companyNameEn: "Sample Company",
    prefectureJa: "東京都渋谷区",
  },
  premium_corporate_hp: {
    variant: "website_diagnostic",
    templateVariant: "website_diagnostic",
    industry: "consulting",
    companyNameJa: "株式会社サンプル",
    companyNameEn: "Sample Company",
    prefectureJa: "東京都渋谷区",
  },
  local_booking_site: {
    variant: "meo",
    templateVariant: "website_diagnostic",
    industry: "beauty_salon",
    companyNameJa: "美容サロン サンプル",
    companyNameEn: "Sample Beauty Salon",
    prefectureJa: "東京都目黒区",
  },
  commerce_storefront: {
    variant: "website_diagnostic",
    templateVariant: "website_diagnostic",
    industry: "retail",
    companyNameJa: "サンプルストア",
    companyNameEn: "Sample Store",
    prefectureJa: "大阪府大阪市",
  },
  japan_entry: {
    variant: "japan_entry",
    templateVariant: "japan_entry",
    industry: "retail",
    companyNameJa: "Sample Global Japan",
    companyNameEn: "Sample Global Japan",
    prefectureJa: "東京都港区",
  },
  japan_entry_commerce: {
    variant: "japan_entry",
    templateVariant: "japan_entry",
    industry: "retail",
    companyNameJa: "Sample Global Japan",
    companyNameEn: "Sample Global Japan",
    prefectureJa: "東京都港区",
  },
  dx_ai_package: {
    variant: "dx_ai_package",
    templateVariant: "dx_ai_package",
    industry: "consulting",
    companyNameJa: "サンプルDX株式会社",
    companyNameEn: "Sample DX Inc.",
    prefectureJa: "東京都千代田区",
  },
  dx_ai_business_site: {
    variant: "dx_ai_package",
    templateVariant: "dx_ai_package",
    industry: "consulting",
    companyNameJa: "サンプルDX株式会社",
    companyNameEn: "Sample DX Inc.",
    prefectureJa: "東京都千代田区",
  },
  meo: {
    variant: "meo",
    templateVariant: "website_diagnostic",
    industry: "restaurant",
    companyNameJa: "サンプルダイニング",
    companyNameEn: "Sample Dining",
    prefectureJa: "東京都新宿区",
  },
  security: {
    variant: "security",
    templateVariant: "website_diagnostic",
    industry: "dental",
    companyNameJa: "サンプル歯科クリニック",
    companyNameEn: "Sample Dental Clinic",
    prefectureJa: "神奈川県横浜市",
  },
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
  const sample = SAMPLE_DEMO_CASES[variantSlug]
  if (!sample) {
    return {
      id: `sample-${variantSlug}`,
      report_locale: locale === "ja" ? "ja" : "en",
      target_country: locale === "ja" ? "JP" : "US",
      template_variant: "website_diagnostic",
      domain: "example.com",
      company_name: locale === "ja" ? "株式会社サンプル" : "Sample Company",
      industry: "consulting",
      prefecture: locale === "ja" ? "東京都渋谷区" : "Tokyo",
      meta: {},
    }
  }
  return {
    id: `sample-${variantSlug}`,
    report_locale: locale === "ja" ? "ja" : "en",
    target_country: locale === "ja" ? "JP" : "US",
    template_variant: sample.templateVariant,
    domain: "example.com",
    company_name: locale === "ja" ? sample.companyNameJa : sample.companyNameEn,
    industry: sample.industry,
    prefecture: locale === "ja" ? sample.prefectureJa : "Tokyo",
    meta: {},
  }
}

function fallbackFullSiteHtml(slug: string, locale: string): string | null {
  const variant = slug.replace(/-demo$/, "")
  const sample = SAMPLE_DEMO_CASES[variant]
  if (!sample) return null
  const report = buildDemoData(sample.variant, locale === "ja" ? "ja" : "en")
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
