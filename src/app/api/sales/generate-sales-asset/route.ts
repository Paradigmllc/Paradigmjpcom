import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { CONTENT_ASSET_TYPES, type ContentAssetType } from "@/lib/sales/content-templates"
import { generateSalesAsset } from "@/lib/sales/sales-assets"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

function isAssetType(value: unknown): value is ContentAssetType {
  return typeof value === "string" && (CONTENT_ASSET_TYPES as readonly string[]).includes(value)
}

export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await req.json()) as { company_id?: unknown; slug?: unknown; domain?: unknown; asset_type?: unknown }
    const companyIdOrSlugOrDomain =
      typeof body.company_id === "string"
        ? body.company_id
        : typeof body.slug === "string"
          ? body.slug
          : typeof body.domain === "string"
            ? body.domain
            : null

    if (!companyIdOrSlugOrDomain) {
      return NextResponse.json({ ok: false, error: "company_id, slug, or domain is required" }, { status: 400 })
    }
    if (!isAssetType(body.asset_type)) {
      return NextResponse.json({ ok: false, error: "asset_type is invalid" }, { status: 400 })
    }

    const result = await generateSalesAsset({
      companyIdOrSlugOrDomain,
      assetType: body.asset_type,
    })
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (e) {
    console.error("[sales-generate-sales-asset] failed:", e)
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown sales asset error" },
      { status: 500 },
    )
  }
}
