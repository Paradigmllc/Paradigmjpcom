import type { CompanyKarteSnapshot } from "@/lib/sales/company-karte"
import type { SourceCoverageItem } from "@/lib/sales/source-coverage"
import type { TwentyCustomerHandoffInput } from "./twenty-sync-utils"
import { PIPELINE_LABELS } from "./twenty-sync-utils"
import {
  firstSourceError,
  outreachGateSummary,
  sourceCategoryBreakdown,
  sourceCoveragePanelLink,
  sourceDataCounts,
  sourceDataStatus,
} from "@/lib/sales/twenty-sync-karte-fields"

export function karteScore(karte: CompanyKarteSnapshot): number {
  const topFit = karte.recommendedProducts[0]?.fitScore ?? 70
  return Math.max(0, Math.min(100, Math.round((karte.sourceScore + topFit) / 2)))
}

export function salesStatusLabel(karte: CompanyKarteSnapshot): string {
  const pipeline = PIPELINE_LABELS[karte.pipelineStatus] ?? karte.pipelineStatus
  return `${pipeline} / ${karte.dealStage}`
}

export function countrySelectValue(countryCode: string | null | undefined): string | null {
  const code = typeof countryCode === "string" ? countryCode.trim().toUpperCase() : ""
  const labels: Record<string, string> = {
    JP: "日本",
    US: "米国",
    ZA: "南アフリカ",
    GB: "英国",
    CA: "カナダ",
    AU: "オーストラリア",
    IN: "インド",
    SG: "シンガポール",
    KR: "韓国",
    CN: "中国",
    TW: "台湾",
    DE: "ドイツ",
    FR: "フランス",
    ES: "スペイン",
    PT: "ポルトガル",
    BR: "ブラジル",
    RU: "ロシア",
    AE: "UAE",
    VN: "ベトナム",
    ID: "インドネシア",
  }
  return labels[code] ?? (code.length === 2 ? code : null)
}

function sourceCoverageSummary(items: SourceCoverageItem[]): {
  collected: string
  configured: string
  missing: string
  evidence: string
  nextSteps: string
} {
  const byStatus = (status: SourceCoverageItem["status"], limit: number) =>
    items
      .filter((item) => item.status === status)
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
      .slice(0, limit)
      .map((item) => item.label)
      .join(" / ")

  const evidence = items
    .filter((item) => item.status === "collected")
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, 8)
    .map((item) => `- ${item.label}: ${item.detail}`)
    .join("\n")

  const nextSteps = items
    .filter((item) => item.status === "configured" || item.status === "missing" || item.status === "error")
    .sort((a, b) => {
      const priority = { error: 0, configured: 1, missing: 2 } as const
      const aPriority = priority[a.status as keyof typeof priority] ?? 3
      const bPriority = priority[b.status as keyof typeof priority] ?? 3
      return aPriority - bPriority || a.label.localeCompare(b.label)
    })
    .slice(0, 6)
    .map((item) => `- ${item.label}: ${item.nextStep}`)
    .join("\n")

  return {
    collected: byStatus("collected", 12),
    configured: byStatus("configured", 8),
    missing: byStatus("missing", 8),
    evidence,
    nextSteps,
  }
}

export function karteHomeSummary(karte: CompanyKarteSnapshot): string {
  const products = karte.recommendedProducts
    .slice(0, 3)
    .map((product) => `${product.displayName}(${product.fitScore})`)
    .join(" / ")
  const sourceSummary = sourceCoverageSummary(karte.sourceItems)
  const outreachGate = outreachGateSummary(karte)

  return [
    `Outreach quality gate: ${outreachGate.label} - ${outreachGate.detail}`,
    `Next action: ${outreachGate.nextAction}`,
    `対象: ${karte.targetCountry} / ${karte.reportLocale} / ${karte.templateVariant}`,
    `取得状況: ${karte.sourceScore}% (${karte.collectedCount} collected, ${karte.configuredCount} configured, ${karte.missingCount} missing)`,
    `カテゴリ別: ${sourceCategoryBreakdown(karte)}`,
    `全ソース詳細(50+): ${sourceCoveragePanelLink(karte)}`,
    `生成エンジン: report=${karte.reportEngine ?? "未生成"} / diagnosis=${karte.diagnosisEngine ?? "未実行"} / template=${karte.templateVariant}`,
    sourceSummary.collected ? `取得済みソース: ${sourceSummary.collected}` : null,
    sourceSummary.configured ? `次に取得可能: ${sourceSummary.configured}` : null,
    sourceSummary.missing ? `不足ソース: ${sourceSummary.missing}` : null,
    `主な痛み: ${karte.diagnosisSummary ?? "Dify診断待ち"}`,
    `推奨提案: ${karte.recommendedOffer ?? (products || "商材判定待ち")}`,
    `推奨商材: ${products || "未判定"}`,
    sourceSummary.evidence ? `主要証跡:\n${sourceSummary.evidence}` : null,
    sourceSummary.nextSteps ? `次アクション:\n${sourceSummary.nextSteps}` : null,
    karte.personalizedHook ? `パーソナライズHook: ${karte.personalizedHook}` : null,
    karte.personalizedCTA ? `CTA: ${karte.personalizedCTA}` : null,
    karte.reportUrl ? `Report URL: ${karte.reportUrl}` : null,
    karte.formUrl ? `Form URL: ${karte.formUrl}` : null,
    karte.salesMaterialUrl ? `Sales material URL: ${karte.salesMaterialUrl}` : null,
    karte.demoUrl ? `Demo URL: ${karte.demoUrl}` : null,
  ].filter(Boolean).join("\n")
}

export function customerHandoffSummary(input: TwentyCustomerHandoffInput): string {
  return [
    `成約後ハンドオフ: ${input.companyName}`,
    `顧客共有Notion: ${input.customerPortalUrl ?? "作成待ち"}`,
    `契約: ${input.contractName ?? "未設定"} / ${input.contractStatus ?? "unknown"}`,
    `契約金額: ${input.contractAmountYen === null ? "未設定" : `JPY ${input.contractAmountYen.toLocaleString("ja-JP")}`}`,
    `Docuseal: ${input.docusealUrl ?? "未設定"}`,
    `Cal.com: ${input.calComUrl ?? "未設定"}`,
  ].join("\n")
}

export function twentyCompanyHomePayload(karte: CompanyKarteSnapshot): Record<string, unknown> {
  return {
    name: karte.companyName,
    xLink: { primaryLinkLabel: karte.reportUrl ? "診断レポート" : "", primaryLinkUrl: karte.reportUrl ?? "" },
    linkedinLink: { primaryLinkLabel: karte.formUrl ? "お問い合わせ" : "", primaryLinkUrl: karte.formUrl ?? "" },
    employees: karteScore(karte),
    annualRecurringRevenue: { amountMicros: karte.sourceScore * 1000000, currencyCode: "USD" },
    address: { addressCity: karteHomeSummary(karte).split("\n")[0]?.slice(0, 50) ?? "" },
    paradigmReportUrl: { primaryLinkLabel: karte.reportUrl ? "診断レポートURL" : "", primaryLinkUrl: karte.reportUrl ?? "" },
    paradigmFormUrl: { primaryLinkLabel: karte.formUrl ? "フォームURL" : "", primaryLinkUrl: karte.formUrl ?? "" },
    paradigmDemoUrl: { primaryLinkLabel: karte.demoUrl ? "デモURL" : "", primaryLinkUrl: karte.demoUrl ?? "" },
    paradigmCountryName: countrySelectValue(karte.targetCountry),
    paradigmRegionName: karte.regionName,
    paradigmIndustryName: karte.industry,
    paradigmSourceName: karte.sourceName,
    paradigmSalesStatus: salesStatusLabel(karte),
    paradigmKarteScore: karteScore(karte),
    paradigmSourceCoverage: `${karte.sourceScore}%`,
    paradigmDataStatus: sourceDataStatus(karte),
    paradigmDataSources: sourceDataCounts(karte),
    paradigmDataBreakdown: sourceCategoryBreakdown(karte),
    paradigmNextAction: outreachGateSummary(karte).nextAction,
    paradigmLastError: firstSourceError(karte),
    paradigmKarteSummary: { markdown: karteHomeSummary(karte) },
  }
}
