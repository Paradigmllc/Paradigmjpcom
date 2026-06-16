import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { matchContentTemplate } from "@/lib/sales/content-templates"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await req.json()) as Record<string, unknown>
    const template = await matchContentTemplate({
      reportLocale: typeof body.report_locale === "string" ? body.report_locale : null,
      targetCountry: typeof body.target_country === "string" ? body.target_country : null,
      industry: typeof body.industry === "string" ? body.industry : null,
      offerCode: typeof body.offer_code === "string" ? body.offer_code : null,
      assetType: typeof body.asset_type === "string" ? body.asset_type : null,
      appealAngle: typeof body.appeal_angle === "string" ? body.appeal_angle : null,
      templateVariant: typeof body.template_variant === "string" ? body.template_variant : null,
    })
    return NextResponse.json({ ok: true, template })
  } catch (e) {
    console.error("[sales-content-template-match] failed:", e)
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown content template error" },
      { status: 500 },
    )
  }
}
