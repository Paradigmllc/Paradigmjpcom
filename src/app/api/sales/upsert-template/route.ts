/**
 * POST /api/sales/upsert-template — Workflow 03 から呼ばれる endpoint (Sprint 9-A)
 *
 * 役割: Notion 📝 テンプレ DB のページを 1 件ずつ受け取り sales_templates に upsert.
 *       Cron (1h) が全件 split して call.
 *
 * 認証: X-Webhook-Secret header 必須
 * Body:  { notion_page_id: string, properties: Record<string, unknown> }
 * 出力:  { ok, error? }
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { upsertTemplateFromNotion } from "@/lib/sales/templates"
import { extractProperty } from "@/lib/notion"
import {
  normalizeReportLocale,
  normalizeTargetCountry,
  normalizeTemplateVariant,
} from "@/lib/sales/routing"
import {
  isValidIndustry,
  isValidIssueCode,
  type Industry,
  type IssueCode,
  type Severity,
} from "@/lib/sales/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const authErr = verifyWebhookSecret(req)
  if (authErr) return authErr

  try {
    const body = (await req.json()) as {
      notion_page_id?: string
      properties?: Record<string, unknown>
    }
    if (!body?.notion_page_id || typeof body.notion_page_id !== "string") {
      return NextResponse.json(
        { ok: false, error: "notion_page_id is required" },
        { status: 400 },
      )
    }
    if (!body.properties) {
      return NextResponse.json(
        { ok: false, error: "properties is required" },
        { status: 400 },
      )
    }

    // Notion API の page.properties から各 field を抽出
    const props = body.properties
    const templateName = extractProperty(props, "テンプレ名")
    const industryRaw = extractProperty(props, "業種")
    const issueCodeRaw = extractProperty(props, "課題コード")
    const templateVariant = normalizeTemplateVariant(
      extractProperty(props, "テンプレ種別") || extractProperty(props, "Template Variant"),
    )
    const reportLocale = normalizeReportLocale(
      extractProperty(props, "表示言語") || extractProperty(props, "Report Locale"),
      "jp",
    )
    const targetCountry = normalizeTargetCountry(
      extractProperty(props, "対象国") || extractProperty(props, "Target Country"),
      reportLocale,
    )
    const severityRaw = extractProperty(props, "重要度")
    const headline = extractProperty(props, "headline")
    const pain = extractProperty(props, "pain")
    const fear = extractProperty(props, "fear")
    const loss = extractProperty(props, "loss")
    const ctaText = extractProperty(props, "cta_text")
    const isActive = extractProperty(props, "有効")

    if (typeof templateName !== "string" || !templateName) {
      return NextResponse.json(
        { ok: false, error: "テンプレ名 is required" },
        { status: 400 },
      )
    }
    if (typeof industryRaw !== "string" || !isValidIndustry(industryRaw)) {
      return NextResponse.json(
        { ok: false, error: `Invalid industry: ${industryRaw}` },
        { status: 400 },
      )
    }
    if (typeof issueCodeRaw !== "string" || !isValidIssueCode(issueCodeRaw)) {
      return NextResponse.json(
        { ok: false, error: `Invalid issue_code: ${issueCodeRaw}` },
        { status: 400 },
      )
    }
    const severity: Severity =
      typeof severityRaw === "string" && ["critical", "warning", "info"].includes(severityRaw)
        ? (severityRaw as Severity)
        : "warning"

    const result = await upsertTemplateFromNotion({
      notion_page_id: body.notion_page_id,
      template_variant: templateVariant,
      report_locale: reportLocale,
      target_country: targetCountry,
      template_name: templateName,
      industry: industryRaw as Industry,
      issue_code: issueCodeRaw as IssueCode,
      severity,
      headline: typeof headline === "string" ? headline : null,
      pain: typeof pain === "string" ? pain : null,
      fear: typeof fear === "string" ? fear : null,
      loss: typeof loss === "string" ? loss : null,
      cta_text: typeof ctaText === "string" ? ctaText : null,
      is_active: typeof isActive === "boolean" ? isActive : true,
    })

    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (e) {
    console.error("[upsert-template] failed:", e)
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
