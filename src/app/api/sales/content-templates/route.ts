import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { listContentTemplates, updateContentTemplate } from "@/lib/sales/content-templates"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const input = {
      reportLocale: req.nextUrl.searchParams.get("report_locale"),
      industry: req.nextUrl.searchParams.get("industry"),
      assetType: req.nextUrl.searchParams.get("asset_type"),
      appealAngle: req.nextUrl.searchParams.get("appeal_angle"),
      q: req.nextUrl.searchParams.get("q"),
      limit: Number(req.nextUrl.searchParams.get("limit") ?? 300),
    }
    const result = await listContentTemplates(input)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("[sales-content-templates-list] failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Template list failed" },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await req.json()) as Record<string, unknown>
    if (typeof body.id !== "string" || body.id.length === 0) {
      return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 })
    }

    const template = await updateContentTemplate({
      id: body.id,
      report_locale: typeof body.report_locale === "string" ? body.report_locale : undefined,
      target_country: typeof body.target_country === "string" ? body.target_country : undefined,
      industry: typeof body.industry === "string" ? body.industry : undefined,
      offer_code: typeof body.offer_code === "string" ? body.offer_code : undefined,
      asset_type: typeof body.asset_type === "string" ? body.asset_type : undefined,
      appeal_angle: typeof body.appeal_angle === "string" ? body.appeal_angle : undefined,
      template_variant: typeof body.template_variant === "string" ? body.template_variant : undefined,
      title: typeof body.title === "string" ? body.title : undefined,
      purpose: typeof body.purpose === "string" ? body.purpose : undefined,
      quality_bar: typeof body.quality_bar === "string" ? body.quality_bar : undefined,
      dify_selection_rule: typeof body.dify_selection_rule === "string" ? body.dify_selection_rule : undefined,
      prompt_template: typeof body.prompt_template === "string" ? body.prompt_template : undefined,
      sample_copy: typeof body.sample_copy === "string" ? body.sample_copy : undefined,
      is_active: typeof body.is_active === "boolean" ? body.is_active : undefined,
    })
    return NextResponse.json({ ok: true, template })
  } catch (error) {
    console.error("[sales-content-templates-update] failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Template update failed" },
      { status: 500 },
    )
  }
}
