import { getServiceSalesSupabase } from "@/lib/supabase"
import { findCompanyByDomain, findCompanyById, findCompanyBySlug } from "./companies"
import { matchContentTemplate, type ContentAssetType } from "./content-templates"
import { fetchDiagnosticReport, type DiagnosticReportData } from "./diagnostic"

export interface SalesAssetResult {
  ok: boolean
  asset_type: ContentAssetType
  company_name?: string
  content?: string
  content_template?: {
    title: string
    quality_bar: string
    dify_selection_rule: string
  }
  delivery_id?: string
  error?: string
}

const isUuid = (s: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

function deliveryTypeFor(assetType: ContentAssetType): string {
  if (assetType === "sales_video") return "動画(HyperFrames)"
  if (assetType === "astro_demo_site") return "Web制作"
  if (assetType === "sales_deck") return "提案資料"
  return "MEOレポート"
}

function deckMarkdown(report: DiagnosticReportData, templateTitle: string): string {
  const actions = report.intelligence.nextActions.map((action) => `- ${action}`).join("\n")
  const signals = report.intelligence.signals
    .slice(0, 6)
    .map((signal) => `- ${signal.label}: ${signal.value} (${signal.source})`)
    .join("\n")
  const pains = report.acts.map((act) => `- ${act.headline}: ${act.body}`).join("\n")

  return `---
theme: default
title: ${report.company_name} Proposal
---

# ${report.company_name}

${templateTitle}

---

# Why now

${report.hook}

---

# Evidence

${signals}

---

# Pain points

${pains}

---

# Proposal

${report.cta_text}

---

# Demo and report

- Report: ${report.report_url}
- Demo: ${report.demo_url ?? "Not generated yet"}
- Data coverage: ${report.source_coverage.score}%

---

# Next actions

${actions}
`
}

function videoBrief(report: DiagnosticReportData, templateTitle: string): string {
  const acts = report.acts
    .map((act, index) => `${index + 1}. ${act.headline} / ${act.metric_label}: ${act.metric_value}${act.metric_unit}`)
    .join("\n")
  return JSON.stringify(
    {
      title: `${report.company_name} diagnostic sales video`,
      template: templateTitle,
      duration_sec: 60,
      toolchain: ["ComfyUI", "HyperFrames", "Remotion", "Faster Whisper", "Cloudflare R2"],
      scenes: [
        { id: "hook", seconds: 8, instruction: report.hook },
        { id: "evidence", seconds: 18, instruction: acts },
        { id: "solution", seconds: 22, instruction: report.cta_text },
        { id: "cta", seconds: 12, instruction: report.report_url },
      ],
    },
    null,
    2,
  )
}

function reportJson(report: DiagnosticReportData): string {
  return JSON.stringify(
    {
      company_name: report.company_name,
      locale: report.report_locale,
      template: report.content_template,
      hook: report.hook,
      acts: report.acts,
      source_coverage: report.source_coverage,
      intelligence: report.intelligence,
      report_url: report.report_url,
      demo_url: report.demo_url,
    },
    null,
    2,
  )
}

function astroBrief(report: DiagnosticReportData, templateTitle: string): string {
  return JSON.stringify(
    {
      title: `${report.company_name} Astro replacement demo`,
      template: templateTitle,
      sections: ["hero", "proof_bar", "service_cards", "case_preview", "booking_cta"],
      copy_inputs: {
        hook: report.hook,
        cta: report.cta_text,
        pains: report.acts.map((act) => act.headline),
        report_url: report.report_url,
      },
    },
    null,
    2,
  )
}

async function saveDelivery(input: {
  companyId: string
  companyName: string
  assetType: ContentAssetType
  content: string
  templateTitle: string
}): Promise<string | undefined> {
  const sb = getServiceSalesSupabase()
  if (!sb) return undefined

  const { data, error } = await sb
    .from("sales_deliveries")
    .insert({
      delivery_name: `${input.companyName} ${input.templateTitle}`,
      delivery_type: deliveryTypeFor(input.assetType),
      status: "レビュー待ち",
      created_by: "sales-os",
      meta: {
        company_id: input.companyId,
        asset_type: input.assetType,
        generated_content: input.content,
        template_title: input.templateTitle,
      },
    })
    .select("id")
    .single()

  if (error) {
    console.error("[sales-assets] delivery insert failed:", error.message)
    return undefined
  }
  return typeof data?.id === "string" ? data.id : undefined
}

export async function generateSalesAsset(input: {
  companyIdOrSlugOrDomain: string
  assetType: ContentAssetType
}): Promise<SalesAssetResult> {
  const company = isUuid(input.companyIdOrSlugOrDomain)
    ? await findCompanyById(input.companyIdOrSlugOrDomain)
    : input.companyIdOrSlugOrDomain.includes(".")
      ? await findCompanyByDomain(input.companyIdOrSlugOrDomain)
      : await findCompanyBySlug(input.companyIdOrSlugOrDomain)

  if (!company) return { ok: false, asset_type: input.assetType, error: "company not found" }

  const report = await fetchDiagnosticReport({ companyId: company.id, reportLocale: company.report_locale ?? undefined })
  if (!report) return { ok: false, asset_type: input.assetType, error: "diagnostic report unavailable" }

  const contentTemplate = await matchContentTemplate({
    reportLocale: report.report_locale,
    targetCountry: report.target_country,
    industry: report.industry,
    assetType: input.assetType,
    templateVariant: report.template_variant,
  })

  const content =
    input.assetType === "sales_deck"
      ? deckMarkdown(report, contentTemplate.title)
      : input.assetType === "sales_video"
        ? videoBrief(report, contentTemplate.title)
        : input.assetType === "astro_demo_site"
          ? astroBrief(report, contentTemplate.title)
          : reportJson(report)

  const deliveryId = await saveDelivery({
    companyId: company.id,
    companyName: company.company_name,
    assetType: input.assetType,
    content,
    templateTitle: contentTemplate.title,
  })

  return {
    ok: true,
    asset_type: input.assetType,
    company_name: company.company_name,
    content,
    delivery_id: deliveryId,
    content_template: {
      title: contentTemplate.title,
      quality_bar: contentTemplate.quality_bar,
      dify_selection_rule: contentTemplate.dify_selection_rule,
    },
  }
}
