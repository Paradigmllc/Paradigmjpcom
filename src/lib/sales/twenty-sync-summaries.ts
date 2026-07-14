import type { CompanyKarteSnapshot } from "@/lib/sales/company-karte";
import type { SourceCoverageItem } from "@/lib/sales/source-coverage";
import type { TwentyCustomerHandoffInput } from "./twenty-sync-utils";
import { PIPELINE_LABELS } from "./twenty-sync-utils";
import {
  firstSourceError,
  outreachGateSummary,
  sourceCategoryBreakdown,
  sourceCoveragePanelLink,
  sourceDataCounts,
  sourceDataStatus,
} from "@/lib/sales/twenty-sync-karte-fields";

export function karteScore(karte: CompanyKarteSnapshot): number {
  const topFit = karte.recommendedProducts[0]?.fitScore ?? 70;
  return Math.max(
    0,
    Math.min(100, Math.round((karte.sourceScore + topFit) / 2)),
  );
}

export function salesStatusLabel(karte: CompanyKarteSnapshot): string {
  const pipeline =
    PIPELINE_LABELS[karte.pipelineStatus] ?? karte.pipelineStatus;
  return `${pipeline} / ${karte.dealStage}`;
}

export function countrySelectValue(
  countryCode: string | null | undefined,
): string | null {
  const code =
    typeof countryCode === "string" ? countryCode.trim().toUpperCase() : "";
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
    IT: "イタリア",
    NL: "オランダ",
    BE: "ベルギー",
    CH: "スイス",
    AT: "オーストリア",
    IE: "アイルランド",
    DK: "デンマーク",
    FI: "フィンランド",
    NO: "ノルウェー",
    SE: "スウェーデン",
    PT: "ポルトガル",
    RU: "ロシア",
    AE: "UAE",
    VN: "ベトナム",
    ID: "インドネシア",
  };
  return labels[code] ?? null;
}

const TWENTY_INDUSTRY_VALUES = new Set([
  "美容サロン",
  "歯科医院",
  "飲食店",
  "建設・工務店",
  "会計事務所",
  "小売・店舗",
  "清掃・メンテナンス",
  "コンサルティング",
]);

export function industrySelectValue(
  industry: string | null | undefined,
): string | null {
  const value = typeof industry === "string" ? industry.trim() : "";
  if (!value) return null;
  if (TWENTY_INDUSTRY_VALUES.has(value)) return value;

  const normalized = value.toLowerCase().replace(/[\s_-]+/g, " ");
  if (/beauty|salon|cosmetic|spa/.test(normalized)) return "美容サロン";
  if (/dental|dentist|orthodont/.test(normalized)) return "歯科医院";
  if (/restaurant|cafe|food|hospitality/.test(normalized)) return "飲食店";
  if (/construction|builder|architect|contractor/.test(normalized)) {
    return "建設・工務店";
  }
  if (/account|bookkeep|tax/.test(normalized)) return "会計事務所";
  if (
    /ecommerce|e commerce|retail|d2c|consumer goods|shop|store/.test(normalized)
  ) {
    return "小売・店舗";
  }
  if (/cleaning|maintenance|facility/.test(normalized)) {
    return "清掃・メンテナンス";
  }
  if (
    /saas|software|technology|consult|professional service|\bservice\b/.test(
      normalized,
    )
  ) {
    return "コンサルティング";
  }
  return null;
}

const TWENTY_SOURCE_VALUES = new Set([
  "apollo",
  "fumadata",
  "bizmap",
  "gbizinfo",
  "jgrants",
  "nta_corporate_number",
  "apify",
  "outscraper",
  "manual_csv",
  "codex_verification",
  "codex_e2e",
]);

export function sourceSelectValue(
  source: string | null | undefined,
): string | null {
  const value = typeof source === "string" ? source.trim().toLowerCase() : "";
  return TWENTY_SOURCE_VALUES.has(value) ? value : null;
}

function sourceCoverageSummary(items: SourceCoverageItem[]): {
  collected: string;
  configured: string;
  missing: string;
  evidence: string;
  nextSteps: string;
} {
  const byStatus = (status: SourceCoverageItem["status"], limit: number) =>
    items
      .filter((item) => item.status === status)
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
      .slice(0, limit)
      .map((item) => item.label)
      .join(" / ");

  const evidence = items
    .filter((item) => item.status === "collected")
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, 8)
    .map((item) => `- ${item.label}: ${item.detail}`)
    .join("\n");

  const nextSteps = items
    .filter(
      (item) =>
        item.status === "configured" ||
        item.status === "missing" ||
        item.status === "error",
    )
    .sort((a, b) => {
      const priority = { error: 0, configured: 1, missing: 2 } as const;
      const aPriority = priority[a.status as keyof typeof priority] ?? 3;
      const bPriority = priority[b.status as keyof typeof priority] ?? 3;
      return aPriority - bPriority || a.label.localeCompare(b.label);
    })
    .slice(0, 6)
    .map((item) => `- ${item.label}: ${item.nextStep}`)
    .join("\n");

  return {
    collected: byStatus("collected", 12),
    configured: byStatus("configured", 8),
    missing: byStatus("missing", 8),
    evidence,
    nextSteps,
  };
}

export function karteHomeSummary(karte: CompanyKarteSnapshot): string {
  const products = karte.recommendedProducts
    .slice(0, 3)
    .map((product) => `${product.displayName}(${product.fitScore})`)
    .join(" / ");
  const sourceSummary = sourceCoverageSummary(karte.sourceItems);
  const outreachGate = outreachGateSummary(karte);
  const formMessageEvidence = karte.formMessageEvidence;
  const verifiedMetrics = formMessageEvidence?.metrics?.length
    ? formMessageEvidence.metrics
        .map(
          (metric) =>
            `${metric.label}: ${metric.value} ${metric.unit} [${metric.source}]`,
        )
        .join(" / ")
    : null;
  const japanEntry = karte.japanEntry;
  const japanEntryQuality = japanEntry
    ? `quality=${japanEntry.qualityScore ?? "未評価"} / safety=${japanEntry.safetyScore ?? "未評価"} / model=${japanEntry.model ?? "未記録"}`
    : null;
  const japanEntryTokenUsage =
    japanEntry?.promptTokens !== null && japanEntry?.promptTokens !== undefined
      ? `input=${japanEntry.promptTokens.toLocaleString("en-US")} / output=${(japanEntry.completionTokens ?? 0).toLocaleString("en-US")} / cache=${Math.round((japanEntry.cacheHitRatio ?? 0) * 100)}% (${(japanEntry.cacheHitTokens ?? 0).toLocaleString("en-US")} hit / ${(japanEntry.cacheMissTokens ?? 0).toLocaleString("en-US")} miss)`
      : null;
  const japanEntryHorizons = japanEntry?.horizons.length
    ? japanEntry.horizons
        .map(
          (horizon) =>
            `${horizon.month}ヶ月 ROI ${horizon.roiPercent}% / 累積純便益 $${horizon.cumulativeNetBenefitUsd.toLocaleString("en-US")}`,
        )
        .join(" / ")
    : null;

  return [
    `無料API/OSS取得データ(50+): ${sourceDataCounts(karte)}`,
    `カテゴリ別取得結果: ${sourceCategoryBreakdown(karte)}`,
    `全ソース詳細(50+): ${sourceCoveragePanelLink(karte)}`,
    `Outreach quality gate: ${outreachGate.label} - ${outreachGate.detail}`,
    `Next action: ${outreachGate.nextAction}`,
    `対象: ${karte.targetCountry} / ${karte.reportLocale} / ${karte.templateVariant}`,
    `取得状況: ${karte.sourceScore}% (${karte.collectedCount} collected, ${karte.configuredCount} configured, ${karte.missingCount} missing)`,
    `生成エンジン: report=${karte.reportEngine ?? "未生成"} / diagnosis=${karte.diagnosisEngine ?? "未実行"} / template=${karte.templateVariant}`,
    sourceSummary.collected
      ? `取得済みソース: ${sourceSummary.collected}`
      : null,
    sourceSummary.configured
      ? `次に取得可能: ${sourceSummary.configured}`
      : null,
    sourceSummary.missing ? `不足ソース: ${sourceSummary.missing}` : null,
    `主な痛み: ${karte.diagnosisSummary ?? "Dify診断待ち"}`,
    `推奨提案: ${karte.recommendedOffer ?? (products || "商材判定待ち")}`,
    `推奨商材: ${products || "未判定"}`,
    sourceSummary.evidence ? `主要証跡:\n${sourceSummary.evidence}` : null,
    sourceSummary.nextSteps
      ? `次アクション:\n${sourceSummary.nextSteps}`
      : null,
    karte.personalizedHook
      ? `パーソナライズHook: ${karte.personalizedHook}`
      : null,
    karte.personalizedCTA ? `CTA: ${karte.personalizedCTA}` : null,
    karte.reportUrl ? `Report URL: ${karte.reportUrl}` : null,
    karte.opportunityBriefUrl
      ? `Japan Entry Opportunity Brief URL: ${karte.opportunityBriefUrl}`
      : null,
    karte.formUrl ? `Form URL: ${karte.formUrl}` : null,
    karte.salesMaterialUrl
      ? `Sales material URL: ${karte.salesMaterialUrl}`
      : null,
    karte.demoUrl ? `Demo URL: ${karte.demoUrl}` : null,
    verifiedMetrics
      ? `文面生成に使用した検証済み数値: ${verifiedMetrics}`
      : null,
    formMessageEvidence?.unknowns?.length
      ? `文面生成時の未知項目: ${formMessageEvidence.unknowns.join(" / ")}`
      : null,
    japanEntry ? "--- Japan Entry Package 初回フォーム文面 ---" : null,
    japanEntry ? `運用状態: 未送信・要レビュー (${japanEntry.state})` : null,
    japanEntry
      ? `数値区分: ${japanEntry.classification}（実測アクセス・実売上ではなく公開シグナルに基づく推定）`
      : null,
    japanEntry?.estimatedJapanMonthlyVisits !== null &&
    japanEntry?.estimatedJapanMonthlyVisits !== undefined
      ? `推定日本月間アクセス: ${japanEntry.estimatedJapanMonthlyVisits.toLocaleString("en-US")}`
      : null,
    japanEntry?.monthlyOpportunityGapUsd !== null &&
    japanEntry?.monthlyOpportunityGapUsd !== undefined
      ? `推定月間機会損失: $${japanEntry.monthlyOpportunityGapUsd.toLocaleString("en-US")}`
      : null,
    japanEntryQuality ? `文面品質: ${japanEntryQuality}` : null,
    japanEntryTokenUsage ? `LLMトークン効率: ${japanEntryTokenUsage}` : null,
    japanEntryHorizons ? `6/12/24ヶ月モデル: ${japanEntryHorizons}` : null,
    japanEntry ? `初回送信文面（URL・資料なし）:\n${japanEntry.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function customerHandoffSummary(
  input: TwentyCustomerHandoffInput,
): string {
  return [
    `成約後ハンドオフ: ${input.companyName}`,
    `顧客ポータル: ${input.customerPortalUrl ?? "未設定"}`,
    `契約: ${input.contractName ?? "未設定"} / ${input.contractStatus ?? "unknown"}`,
    `契約金額: ${input.contractAmountYen === null ? "未設定" : `JPY ${input.contractAmountYen.toLocaleString("ja-JP")}`}`,
    `Docuseal: ${input.docusealUrl ?? "未設定"}`,
    `Cal.com: ${input.calComUrl ?? "未設定"}`,
  ].join("\n");
}

export function twentyCompanyHomePayload(
  karte: CompanyKarteSnapshot,
): Record<string, unknown> {
  const primaryReportUrl = karte.opportunityBriefUrl ?? karte.reportUrl;
  const primaryReportLabel = karte.opportunityBriefUrl
    ? "Japan Entry Opportunity Brief"
    : "診断レポート";
  return {
    name: karte.companyName,
    paradigmReportUrl: {
      primaryLinkLabel: primaryReportUrl ? primaryReportLabel : "",
      primaryLinkUrl: primaryReportUrl ?? "",
    },
    paradigmFormUrl: {
      primaryLinkLabel: karte.formUrl ? "フォームURL" : "",
      primaryLinkUrl: karte.formUrl ?? "",
    },
    paradigmDemoUrl: {
      primaryLinkLabel: karte.demoUrl ? "デモURL" : "",
      primaryLinkUrl: karte.demoUrl ?? "",
    },
    paradigmCountryName: countrySelectValue(karte.targetCountry),
    paradigmRegionName: karte.regionName,
    paradigmIndustryName: industrySelectValue(karte.industry),
    paradigmSourceName: sourceSelectValue(karte.sourceName),
    paradigmSalesStatus: salesStatusLabel(karte),
    paradigmKarteScore: karteScore(karte),
    paradigmSourceCoverage: String(karte.sourceScore),
    paradigmDataStatus: sourceDataStatus(karte),
    paradigmDataSources: sourceDataCounts(karte),
    paradigmDataBreakdown: sourceCategoryBreakdown(karte),
    paradigmSourceDetailsUrl: {
      primaryLinkLabel: "50+ API/OSS詳細",
      primaryLinkUrl: sourceCoveragePanelLink(karte),
    },
    paradigmNextAction:
      karte.japanEntry?.state === "needs_review"
        ? "Japan Entry初回フォーム文面を確認（未送信）"
        : outreachGateSummary(karte).nextAction,
    paradigmLastError: firstSourceError(karte),
    paradigmKarteSummary: { markdown: karteHomeSummary(karte) },
  };
}
