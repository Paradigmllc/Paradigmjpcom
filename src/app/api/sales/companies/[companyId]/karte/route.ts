import { NextRequest, NextResponse } from "next/server"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { fetchCompanyKarte } from "@/lib/sales/company-karte"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ companyId: string }> },
) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { companyId } = await ctx.params
  if (!companyId) {
    return NextResponse.json({ ok: false, error: "companyId required" }, { status: 400 })
  }

  const sb = getServiceSalesSupabase()
  if (!sb) {
    console.error("[company-karte-api] Supabase service role is not configured")
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 })
  }

  const result = await fetchCompanyKarte(sb, companyId)
  if (!result.ok) {
    const status = result.error === "company not found" ? 404 : 500
    console.error("[company-karte-api] failed:", result.error)
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, karte: result.karte })
}
