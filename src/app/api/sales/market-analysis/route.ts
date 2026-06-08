import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface IndustryStats {
  industry: string
  count: number
  avgPagespeedMobile: number | null
  avgPagespeedDesktop: number | null
  reportReady: number
  hasContactForm: number
  commonTech: { name: string; count: number }[]
  commonIssues: { issue: string; count: number }[]
}

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 })

  try {
    const industry = req.nextUrl.searchParams.get("industry")

    // Fetch companies with enough data for analysis
    let query = sb.from("sales_companies").select("id, company_name, industry, pagespeed_mobile, pagespeed_desktop, detected_issues, pipeline_status, meta")
    if (industry) query = query.eq("industry", industry)
    const { data: companies, error } = await query.limit(500)

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    if (!companies || companies.length === 0) return NextResponse.json({ ok: true, industries: [], total: 0 })

    // Group by industry
    const byIndustry = new Map<string, typeof companies>()
    for (const c of companies) {
      const key = c.industry ?? "unknown"
      if (!byIndustry.has(key)) byIndustry.set(key, [])
      byIndustry.get(key)!.push(c)
    }

    const industries: IndustryStats[] = []
    for (const [ind, list] of byIndustry) {
      const withSpeed = list.filter((c) => c.pagespeed_mobile != null)
      const avgMobile = withSpeed.length > 0 ? Math.round(withSpeed.reduce((s, c) => s + c.pagespeed_mobile!, 0) / withSpeed.length) : null
      const withDesktop = list.filter((c) => c.pagespeed_desktop != null)
      const avgDesktop = withDesktop.length > 0 ? Math.round(withDesktop.reduce((s, c) => s + c.pagespeed_desktop!, 0) / withDesktop.length) : null

      // Common tech
      const techCounts = new Map<string, number>()
      for (const c of list) {
        const meta = (c.meta ?? {}) as Record<string, unknown>
        const stack = (meta.tech as Record<string, unknown>)?.stack
        if (Array.isArray(stack)) {
          for (const t of stack) techCounts.set(String(t), (techCounts.get(String(t)) ?? 0) + 1)
        }
      }
      const commonTech = [...techCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }))

      // Common issues
      const issueCounts = new Map<string, number>()
      for (const c of list) {
        for (const issue of c.detected_issues ?? []) {
          issueCounts.set(issue, (issueCounts.get(issue) ?? 0) + 1)
        }
      }
      const commonIssues = [...issueCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([issue, count]) => ({ issue, count }))

      industries.push({
        industry: ind,
        count: list.length,
        avgPagespeedMobile: avgMobile,
        avgPagespeedDesktop: avgDesktop,
        reportReady: list.filter((c) => c.pipeline_status === "report_ready").length,
        hasContactForm: list.filter((c) => {
          const meta = (c.meta ?? {}) as Record<string, unknown>
          return !!meta.contact_form_url
        }).length,
        commonTech,
        commonIssues,
      })
    }

    industries.sort((a, b) => b.count - a.count)

    return NextResponse.json({ ok: true, industries, total: companies.length })
  } catch (e) {
    console.error("[market-analysis] failed:", e)
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Market analysis failed" }, { status: 500 })
  }
}
