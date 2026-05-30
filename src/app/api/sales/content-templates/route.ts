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
