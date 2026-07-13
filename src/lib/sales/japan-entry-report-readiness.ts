import type { BusinessModel } from "./japan-entry-projection";

type JsonRecord = Record<string, unknown>;

export interface JapanEntryReportCandidate {
  id: string;
  company_name: string;
  domain: string;
  slug: string | null;
  industry?: string | null;
  meta: JsonRecord | null;
}

export interface JapanEntryReportReadiness {
  ready: boolean;
  score: number;
  reasons: string[];
  businessModel: BusinessModel;
  evidence: {
    marketVisibility: boolean;
    productContext: boolean;
    japanAudit: boolean;
    verifiedCompetitors: number;
  };
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function hasProductContext(meta: JsonRecord): boolean {
  const scan = asRecord(meta.scan);
  const assets = asRecord(meta.website_assets);
  return [
    scan?.html_description,
    meta.html_description,
    assets?.description,
    assets?.summary,
  ].some((value) => typeof value === "string" && value.trim().length >= 12);
}

function verifiedCompetitorCount(meta: JsonRecord): number {
  const analysis = asRecord(meta.japan_entry_competitor_analysis);
  if (!Array.isArray(analysis?.competitors)) return 0;
  return analysis.competitors.filter((value) => {
    const row = asRecord(value);
    if (!row || !Array.isArray(row.evidence)) return false;
    return row.evidence.some((item) => {
      const evidence = asRecord(item);
      return (
        typeof evidence?.source_url === "string" &&
        evidence.source_url.startsWith("https://")
      );
    });
  }).length;
}

function businessModelFrom(
  candidate: JapanEntryReportCandidate,
  meta: JsonRecord,
): BusinessModel {
  const explicit =
    meta.business_model ?? asRecord(meta.smb_signals)?.businessModel;
  if (explicit === "ecommerce" || explicit === "saas" || explicit === "service")
    return explicit;
  const text =
    `${candidate.industry ?? ""} ${meta.html_description ?? ""}`.toLowerCase();
  if (/software|saas|platform|subscription/.test(text)) return "saas";
  if (/shop|store|commerce|retail|product|cookware|beauty|fashion/.test(text))
    return "ecommerce";
  return "service";
}

export function assessJapanEntryReportReadiness(
  candidate: JapanEntryReportCandidate,
  options: { requireCompetitors?: boolean } = {},
): JapanEntryReportReadiness {
  const meta = candidate.meta ?? {};
  const visibility =
    asRecord(asRecord(meta.smb_signals)?.marketVisibility) ??
    asRecord(meta.market_visibility);
  const marketVisibility =
    visibility?.version === "public-signals-v1" &&
    Array.isArray(visibility.evidence);
  const productContext = hasProductContext(meta);
  const audit = asRecord(meta.japan_market_audit);
  const japanAudit = Boolean(
    asRecord(audit?.status) &&
    Array.isArray(audit?.pages_checked) &&
    audit.pages_checked.length > 0,
  );
  const verifiedCompetitors = verifiedCompetitorCount(meta);
  const reasons: string[] = [];
  if (!candidate.slug) reasons.push("公開レポートslugがありません");
  if (!marketVisibility)
    reasons.push("public-signals-v1市場可視性がありません");
  if (!productContext) reasons.push("根拠付き商品説明がありません");
  if (!japanAudit) reasons.push("公開ページのJapan readiness監査がありません");
  if (options.requireCompetitors !== false && verifiedCompetitors === 0)
    reasons.push("根拠URL付き競合分析がありません");
  const score = Math.round(
    (candidate.slug ? 15 : 0) +
      (marketVisibility ? 25 : 0) +
      (productContext ? 20 : 0) +
      (japanAudit ? 25 : 0) +
      (verifiedCompetitors > 0 ? 15 : 0),
  );
  return {
    ready: reasons.length === 0,
    score,
    reasons,
    businessModel: businessModelFrom(candidate, meta),
    evidence: {
      marketVisibility,
      productContext,
      japanAudit,
      verifiedCompetitors,
    },
  };
}
