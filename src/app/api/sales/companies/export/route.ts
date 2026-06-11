import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { z } from "zod"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ExportQuery = z.object({
  status: z.string().optional(),
  industry: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(2000).optional().default(500),
})

function csvRow(fields: string[]): string {
  return fields.map((f) => `"${(f ?? "").replace(/"/g, '""')}"`).join(",")
}

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 })

  const params = Object.fromEntries(req.nextUrl.searchParams)
  const parsed = ExportQuery.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid parameters", details: parsed.error.flatten() }, { status: 400 })
  }

  let query = sb.from(DB_TABLES.SALES_COMPANIES).select("company_name, domain, industry, prefecture, pipeline_status, deal_stage, pagespeed_mobile, report_url, assigned_to, source, updated_at, created_at")
  if (parsed.data.status) query = query.eq("pipeline_status", parsed.data.status)
  if (parsed.data.industry) query = query.eq("industry", parsed.data.industry)
  if (parsed.data.search) query = query.or(`company_name.ilike.%${parsed.data.search}%,domain.ilike.%${parsed.data.search}%`)
  const { data, error } = await query.order("created_at", { ascending: false }).limit(parsed.data.limit)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const headers = ["企業名", "ドメイン", "業種", "都道府県", "パイプライン状態", "商談", "PageSpeed", "レポートURL", "担当", "ソース", "更新日", "作成日"]
  const rows = (data ?? []).map((c) => csvRow([
    c.company_name, c.domain, c.industry ?? "", c.prefecture ?? "",
    c.pipeline_status, c.deal_stage ?? "",
    c.pagespeed_mobile != null ? String(c.pagespeed_mobile) : "",
    c.report_url ?? "", c.assigned_to ?? "", c.source ?? "",
    c.updated_at ?? "", c.created_at ?? "",
  ]))

  const csv = [headers.join(","), ...rows].join("\n")
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="revenue-os-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
