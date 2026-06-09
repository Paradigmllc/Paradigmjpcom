import { type NextRequest } from "next/server"
import { fallbackScript, type NarrationScript } from "@/lib/sales/video-generator"
import { localeToRegion } from "@/lib/sales/types"
import { buildDemoData } from "@/lib/sales/demo-data"
import { fetchDiagnosticReport } from "@/lib/sales/diagnostic"
import { buildVariantVideoHtml } from "@/lib/sales/video-templates"

export const dynamic = "force-dynamic"
export const revalidate = 300

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ locale: string; slug: string }> },
) {
  const { locale, slug } = await params
  const region = localeToRegion(locale)

  // Demo slugs: use local demo data without DB
  if (slug.startsWith("demo-")) {
    const variant = slug.replace("demo-", "")
    const data = buildDemoData(variant, locale)
    const script: NarrationScript = fallbackScript(data)
    const html = buildVariantVideoHtml(data, script)
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60, s-maxage=120",
      },
    })
  }

  const data = await fetchDiagnosticReport({ slug, region, reportLocale: locale })
  if (!data) {
    return new Response("Not Found", { status: 404, headers: { "Content-Type": "text/plain" } })
  }

  const script: NarrationScript = fallbackScript(data)
  const html = buildVariantVideoHtml(data, script)
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=30, s-maxage=60",
    },
  })
}
