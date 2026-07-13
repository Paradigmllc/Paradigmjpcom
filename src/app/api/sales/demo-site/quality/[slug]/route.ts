import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!(await isSalesApiAuthorized(request))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { slug } = await params
  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase unavailable" }, { status: 503 })

  const { data, error } = await sb
    .from(DB_TABLES.THEME_DEMO_PAGES)
    .select("slug, company_id, theme, quality_score, quality_report, rights_manifest, design_recipe, generation_candidates, publication_status, reviewed_at, updated_at")
    .eq("slug", slug)
    .maybeSingle()

  if (error) {
    console.error(`[demo-quality/${slug}] fetch failed:`, error.message)
    return NextResponse.json({ ok: false, error: "Quality report unavailable" }, { status: 503 })
  }
  if (!data) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })

  return NextResponse.json({ ok: true, ...data }, { headers: { "Cache-Control": "private, no-store" } })
}
