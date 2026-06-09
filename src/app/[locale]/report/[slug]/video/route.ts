import { type NextRequest } from "next/server"
import { localeToRegion } from "@/lib/sales/types"
import { buildDemoData } from "@/lib/sales/demo-data"
import { fetchDiagnosticReport, type DiagnosticReportData } from "@/lib/sales/diagnostic"
import { buildVariantVideoHtml } from "@/lib/sales/video-templates"

export const dynamic = "force-dynamic"
export const revalidate = 300

type NarrationScript = {
  hook: string
  pain: string
  fear: string
  hope: string
  cta: string
}

function reportVideoScript(data: DiagnosticReportData): NarrationScript {
  return {
    hook: data.hook || `${data.company_name} diagnostic summary`,
    pain: data.acts[0]?.headline || "Public signals show the first conversion bottleneck.",
    fear: data.acts[1]?.headline || "Left unresolved, the friction becomes recurring opportunity loss.",
    hope: data.intelligence.nextActions[0] || "A clearer first view and proof path can reduce drop-off.",
    cta: data.cta_text || "Review the report and confirm the next priority.",
  }
}

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
    const script = reportVideoScript(data)
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

  const script = reportVideoScript(data)
  const html = buildVariantVideoHtml(data, script)
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=30, s-maxage=60",
    },
  })
}
