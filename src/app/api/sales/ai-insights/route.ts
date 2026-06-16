import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { callDeepSeek } from "@/lib/deepseek"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 45

async function generateInsight(company: { company_name: string; industry: string | null; pagespeed_mobile: number | null; detected_issues: string[] | null; meta: unknown }): Promise<string | null> {
  if (!process.env.DEEPSEEK_API_KEY) return null

  const meta = (company.meta ?? {}) as Record<string, unknown>
  const tech = (meta.tech as Record<string, unknown>)
  const stack = Array.isArray(tech?.stack) ? (tech.stack as string[]).slice(0, 8).join(", ") : "unknown"
  const issues = (company.detected_issues ?? []).join(", ")
  const speed = company.pagespeed_mobile ? `${company.pagespeed_mobile}/100` : "未測定"
  const industry = company.industry ?? "不明"

  const prompt = `あなたはWeb制作提案の営業AIです。以下の企業データに基づき、最も効果的な提案文を1-2文（日本語）で生成してください。

企業名: ${company.company_name}
業種: ${industry}
モバイル速度: ${speed}
検出課題: ${issues || "特になし"}
使用技術: ${stack}

提案は具体的で、数値や技術名を含めてください。「です・ます」調で。`

  try {
    const res = await callDeepSeek([{ role: "user", content: prompt }], { maxTokens: 300 })
    return res.ok && res.text ? res.text.trim() : null
  } catch (e) {
    console.error("[ai-insights] DeepSeek generation failed:", e)
    return null
  }
}

export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 })

  try {
    let body: { companyId?: string; limit?: number } = {}
    try {
      body = (await req.json()) as { companyId?: string; limit?: number }
    } catch (e) {
      console.error("[ai-insights] JSON parse failed:", e)
    }
    const limit = Math.min(body.limit ?? 5, 20)

    let companies: Array<{ id: string; company_name: string; industry: string | null; pagespeed_mobile: number | null; detected_issues: string[] | null; meta: unknown }>

    if (body.companyId) {
      const { data } = await sb
        .from(DB_TABLES.SALES_COMPANIES)
        .select("id, company_name, industry, pagespeed_mobile, detected_issues, meta")
        .eq("id", body.companyId)
        .single()
      companies = data ? [data] : []
    } else {
      // Pick companies that are report_ready but haven't been enriched with insights yet
      const { data } = await sb
        .from(DB_TABLES.SALES_COMPANIES)
        .select("id, company_name, industry, pagespeed_mobile, detected_issues, meta")
        .eq("pipeline_status", "report_ready")
        .order("updated_at", { ascending: false })
        .limit(limit)
      companies = data ?? []
    }

    const insights = await Promise.all(
      companies.map(async (c) => {
        const insight = await generateInsight(c)

        // Save to meta
        if (insight) {
          sb.from(DB_TABLES.SALES_COMPANIES).update({
            meta: { ...(c.meta as Record<string, unknown> ?? {}), sales_os: { ...((c.meta as Record<string, unknown>)?.sales_os as Record<string, unknown> ?? {}), ai_insight: insight, ai_insight_at: new Date().toISOString() } }
          }).eq("id", c.id).then(
            () => {},
            (updateErr) => { console.error("[ai-insights] meta update failed:", c.id, updateErr) }
          )
        }

        return { companyId: c.id, companyName: c.company_name, insight }
      }),
    )

    return NextResponse.json({ ok: true, insights })
  } catch (e) {
    console.error("[ai-insights] failed:", e)
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "AI insight generation failed" }, { status: 500 })
  }
}
