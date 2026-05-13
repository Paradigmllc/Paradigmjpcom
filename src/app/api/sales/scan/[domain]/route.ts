/**
 * POST /api/sales/scan/[domain] — Sprint 11
 *
 * 役割: domain の PageSpeed Insights + HTML inspect を実行し,
 *       sales_companies の pagespeed_* / detected_issues に書込.
 *
 * 認証: X-Webhook-Secret header 必須
 * 出力: { ok, mobile, desktop, issues, error? }
 *
 * scan ロジック本体は lib/sales/sources/scanner.ts に分離 (enrich pipeline と共有).
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { upsertCompanyByDomain, setPipelineStatus, findCompanyByDomain } from "@/lib/sales/companies"
import { scanDomain } from "@/lib/sales/sources/scanner"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ domain: string }> },
) {
  const authErr = verifyWebhookSecret(req)
  if (authErr) return authErr

  const { domain } = await ctx.params
  if (!domain) {
    return NextResponse.json({ ok: false, error: "domain required" }, { status: 400 })
  }

  // company 存在チェック (なければ create)
  const existing = await findCompanyByDomain(domain)
  if (!existing) {
    await upsertCompanyByDomain({
      domain,
      company_name: domain,
      pipeline_status: "scanning",
    })
  } else {
    await setPipelineStatus(existing.id, "scanning")
  }

  // 共通 scanner で並列実行
  const scan = await scanDomain(domain)

  // 結果を Supabase に書込
  await upsertCompanyByDomain({
    domain,
    company_name: existing?.company_name ?? scan.html.title ?? domain,
    pagespeed_mobile: scan.mobile.performance,
    pagespeed_desktop: scan.desktop.performance,
    detected_issues: scan.issues,
    pipeline_status: "report_ready",
  })

  return NextResponse.json({
    ok: true,
    domain,
    mobile: scan.mobile.performance,
    desktop: scan.desktop.performance,
    issues: scan.issues,
    // Sprint 13: /report/[slug] が正式 URL. scan は domain ベース呼出のため slug は別途設定要.
    //   ここでは scan 結果としての domain-based URL ではなく "未設定" を返し、報告 URL は別所で生成.
    report_url: existing?.slug ? `https://paradigmjp.com/ja/report/${existing.slug}` : null,
  })
}
