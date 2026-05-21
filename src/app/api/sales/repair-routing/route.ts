/**
 * POST /api/sales/repair-routing
 *
 * 役割: 既存リードの slug / report_url / country / locale / template_variant を自己修復する。
 * Notion に行を追加したがレポート URL が生えない、旧データに slug が無い、という状態を
 * Supabase SSOT 側で一括補正し、次の Supabase→Notion 同期で GUI に反映させる。
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { getServiceSupabase } from "@/lib/supabase"
import { upsertCompanyByDomain } from "@/lib/sales/companies"
import {
  inferVariant,
  getRoutingMeta,
  normalizeReportLocale,
  normalizeTargetCountry,
} from "@/lib/sales/routing"
import type { SalesCompany } from "@/lib/sales/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

export async function POST(req: NextRequest) {
  const authErr = verifyWebhookSecret(req)
  if (authErr) return authErr

  const body = (await req.json().catch((e) => {
    console.error("[repair-routing] invalid JSON, using defaults:", e)
    return {}
  })) as { limit?: number; all?: boolean }

  const sb = getServiceSupabase()
  if (!sb) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 })
  }

  const limit = Math.min(Math.max(body.limit ?? 100, 1), 500)
  let query = sb
    .from("sales_companies")
    .select("*")
    .order("updated_at", { ascending: true })
    .limit(limit)

  if (!body.all) {
    query = query.or("slug.is.null,report_url.is.null")
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const rows = (data as SalesCompany[]) ?? []
  const failures: Array<{ id: string; domain: string; reason: string }> = []
  let repaired = 0

  for (const company of rows) {
    const routing = getRoutingMeta(company.meta)
    const reportLocale = normalizeReportLocale(
      company.report_locale ?? routing.report_locale,
      company.region,
    )
    const targetCountry = normalizeTargetCountry(
      company.target_country ?? routing.target_country,
      reportLocale,
    )
    const templateVariant = inferVariant({
      templateVariant: company.template_variant ?? routing.template_variant,
      reportLocale,
      targetCountry,
      issues: company.detected_issues,
      meta: company.meta,
    })
    const result = await upsertCompanyByDomain({
      domain: company.domain,
      company_name: company.company_name,
      region: company.region,
      report_locale: reportLocale,
      target_country: targetCountry,
      template_variant: templateVariant,
      industry: company.industry,
      prefecture: company.prefecture,
      pipeline_status: company.pipeline_status,
      deal_stage: company.deal_stage,
      pagespeed_mobile: company.pagespeed_mobile,
      pagespeed_desktop: company.pagespeed_desktop,
      detected_issues: company.detected_issues,
      source: company.source,
      meta: company.meta,
    })
    if (result.ok) {
      repaired++
    } else {
      failures.push({
        id: company.id,
        domain: company.domain,
        reason: result.error ?? "repair failed",
      })
    }
  }

  return NextResponse.json({
    ok: failures.length === 0,
    scanned: rows.length,
    repaired,
    failures_count: failures.length,
    failures: failures.slice(0, 20),
  })
}
