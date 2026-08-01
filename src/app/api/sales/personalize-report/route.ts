/**
 * POST /api/sales/personalize-report — Sprint 15 DeepSeek パーソナライズ文面生成
 *
 * 役割: slug ベースで sales_companies + 30+ enrich data を取得し、
 *       DeepSeek V4 PRO (Context Cache hit) でパーソナライズ文面を生成.
 *       結果を sales_companies.meta.personalized_copy に保存.
 *
 * 認証: X-Webhook-Secret 必須 (webhook or 手動 trigger)
 *
 * Body: { slug: string } または { company_id: string }
 *
 * 出力: { ok, copy?, cache_hit_ratio?, error? }
 *
 * 経済性: System prompt 固定 (約 3KB) → Cache hit ratio 95%+
 *         入力 $0.014/1M (90% OFF) + 出力 $0.28/1M
 *         1 reports あたり 推定 $0.0008 ≈ ¥0.12
 *         月 1 万 reports でも $8 ≈ ¥1,200
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import {
  findCompanyById,
  findCompanyBySlug,
  upsertCompanyByDomain,
} from "@/lib/sales/companies"
import { fetchDiagnosticReport } from "@/lib/sales/diagnostic"
import { personalizeReport } from "@/lib/sales/personalize"
import { normalizeReportLocale } from "@/lib/sales/routing"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const authErr = verifyWebhookSecret(req)
  if (authErr) return authErr

  let body: { slug?: string; company_id?: string; report_locale?: string; target_country?: string; template_variant?: string }
  try {
    body = (await req.json()) as {
      slug?: string
      company_id?: string
      report_locale?: string
      target_country?: string
      template_variant?: string
    }
  } catch (e) {
    console.error("[personalize-report] invalid json body:", e)
    return NextResponse.json({ ok: false, error: "invalid json body" }, { status: 400 })
  }

  // company 取得
  const company = body.slug
    ? await findCompanyBySlug(body.slug)
    : body.company_id
      ? await findCompanyById(body.company_id)
      : null
  if (!company) {
    return NextResponse.json({ ok: false, error: "company not found" }, { status: 404 })
  }

  // 診断データ取得 (5 段階フレームベース)
  const reportLocale = normalizeReportLocale(body.report_locale ?? company.report_locale, company.region)
  const data = await fetchDiagnosticReport({
    slug: company.slug ?? undefined,
    companyId: company.id,
    region: company.region,
    reportLocale,
    targetCountry: body.target_country ?? company.target_country ?? undefined,
    templateVariant: body.template_variant ?? company.template_variant ?? undefined,
  })
  if (!data) {
    return NextResponse.json({ ok: false, error: "diagnostic data unavailable" }, { status: 404 })
  }

  // DeepSeek personalize (Cache hit 最大化)
  const result = await personalizeReport(company, data)
  if (!result.ok || !result.copy) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "personalize failed" },
      { status: 500 },
    )
  }

  // sales_companies.meta.personalized_copy に保存
  await upsertCompanyByDomain({
    domain: company.domain,
    company_name: company.company_name,
    region: company.region,
    report_locale: reportLocale,
    target_country: data.target_country,
    template_variant: data.template_variant,
    meta: {
      ...(company.meta as Record<string, unknown>),
      personalized_copy: {
        ...result.copy,
        generated_at: new Date().toISOString(),
        cache_hit_ratio: result.cache_hit_ratio,
      },
    },
  })

  return NextResponse.json({
    ok: true,
    copy: result.copy,
    cache_hit_ratio: result.cache_hit_ratio,
  })
}
