import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  if (!(await isSalesApiAuthorized(_request))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { companyId } = await params
  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 })

  const { data, error } = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .select("id, company_name, domain, meta")
    .eq("id", companyId)
    .single()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Company not found" }, { status: 404 })
  }

  const meta = (data.meta ?? {}) as Record<string, unknown>
  return NextResponse.json({
    ok: true,
    company: { id: data.id, name: data.company_name, domain: data.domain },
    form_message: typeof meta.form_message === "string" ? meta.form_message : null,
    form_message_engine: typeof meta.form_message_engine === "string" ? meta.form_message_engine : null,
    form_message_generated_at: typeof meta.form_message_generated_at === "string" ? meta.form_message_generated_at : null,
    form_message_history: Array.isArray(meta.form_message_history) ? meta.form_message_history : [],
  })
}
