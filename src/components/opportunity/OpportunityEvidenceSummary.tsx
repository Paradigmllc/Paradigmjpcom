import type { OpportunityBriefData } from "@/lib/sales/opportunity-brief";

function auditPageCount(meta: Record<string, unknown> | undefined): number {
  const audit = meta?.japan_market_audit;
  if (!audit || typeof audit !== "object" || Array.isArray(audit)) return 0;
  const pages = (audit as Record<string, unknown>).pages_checked;
  return Array.isArray(pages)
    ? pages.filter((page) => typeof page === "string").length
    : 0;
}

export function OpportunityEvidenceSummary({
  data,
  locale,
}: {
  data: OpportunityBriefData;
  locale: string;
}) {
  const isJa = locale === "ja";
  const { projection, competition, report } = data;
  const observed = projection.evidence.filter(
    (item) => item.classification === "observed",
  ).length;
  const assumed = projection.evidence.filter(
    (item) => item.classification === "assumed",
  ).length;
  const linked =
    projection.evidence.filter((item) => item.sourceUrl).length +
    competition.competitors.reduce(
      (count, competitor) => count + competitor.evidence.length,
      0,
    );
  const confidence = Math.round(
    (projection.evidence.reduce((sum, item) => sum + item.confidence, 0) /
      Math.max(1, projection.evidence.length)) *
      100,
  );
  const pages = auditPageCount(report.meta);

  return (
    <section
      className="bg-white px-5 py-14"
      aria-labelledby="evidence-quality-title"
    >
      <div className="mx-auto max-w-6xl rounded-2xl border border-zinc-200 bg-zinc-50 p-6 sm:p-8">
        <div className="grid gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">
              Evidence quality
            </p>
            <h2
              id="evidence-quality-title"
              className="mt-3 text-2xl font-semibold tracking-tight"
            >
              {isJa
                ? "どこまで事実で、どこから仮定か"
                : "What is observed—and what is assumed"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600">
              {isJa
                ? "推定値を実測値のように見せません。出典、確度、制約を分離し、意思決定前に置換すべき数値を明示しています。"
                : "Modeled values are not presented as measurements. Sources, confidence and limitations stay explicit so first-party inputs can replace assumptions."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <EvidenceMetric
              label={isJa ? "公開証拠" : "Observed"}
              value={String(observed)}
            />
            <EvidenceMetric
              label={isJa ? "モデル仮定" : "Assumptions"}
              value={String(assumed)}
            />
            <EvidenceMetric
              label={isJa ? "確認ページ" : "Pages checked"}
              value={String(pages)}
            />
            <EvidenceMetric
              label={isJa ? "根拠URL" : "Source URLs"}
              value={String(linked)}
            />
            <EvidenceMetric
              label={isJa ? "証拠確度平均" : "Evidence confidence"}
              value={`${confidence}%`}
            />
          </div>
        </div>
        <div
          className="mt-6 h-2 overflow-hidden rounded-full bg-zinc-200"
          aria-label={`${isJa ? "証拠確度平均" : "Average evidence confidence"} ${confidence}%`}
        >
          <div
            className="h-full rounded-full bg-red-700"
            style={{ width: `${confidence}%` }}
          />
        </div>
        <p className="mt-3 text-xs leading-5 text-zinc-500">
          {isJa
            ? "この確度は各証拠項目に付与したモデル内評価の平均であり、統計的信頼区間ではありません。"
            : "This is the mean internal confidence assigned to evidence items, not a statistical confidence interval."}
        </p>
      </div>
    </section>
  );
}

function EvidenceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-[11px] leading-4 text-zinc-500">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}
