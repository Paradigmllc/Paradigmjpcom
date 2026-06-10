import { type NextRequest } from "next/server"
import { buildDemoData } from "@/lib/sales/demo-data"
import { buildVariantVideoHtml } from "@/lib/sales/video-templates"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic"

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
  { params }: { params: Promise<{ locale: string; variant: string }> },
) {
  const { locale, variant } = await params
  const format = _request.nextUrl.searchParams.get("mobile") === "1" ? "portrait" : "landscape"
  const data = buildDemoData(variant, locale)
  const script = reportVideoScript(data)
  const html = buildVariantVideoHtml(data, script, { format })
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=120",
    },
  })
}
