import Image from "next/image";
import Link from "next/link";
import { JapanEntryProjectionSection } from "@/components/diagnostic/JapanEntryProjectionSection";
import { OpportunityActionPlan } from "@/components/opportunity/OpportunityActionPlan";
import { OpportunityEvidenceSummary } from "@/components/opportunity/OpportunityEvidenceSummary";
import { OpportunityOfferPanel } from "@/components/opportunity/OpportunityOfferPanel";
import { OpportunitySensitivityModel } from "@/components/opportunity/OpportunitySensitivityModel";
import { OpportunityPressureSummary } from "@/components/opportunity/OpportunityPressureSummary";
import type {
  OpportunityBriefData,
  OpportunityFinding,
} from "@/lib/sales/opportunity-brief";

function usd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function compact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function findingTone(status: OpportunityFinding["status"]): string {
  if (status === "observed")
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "gap") return "border-amber-200 bg-amber-50 text-amber-950";
  return "border-zinc-200 bg-zinc-50 text-zinc-800";
}

function safeImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch (error) {
    console.error("[opportunity-brief] invalid evidence image URL:", error);
    return null;
  }
}

export function OpportunityBrief({
  data,
  locale,
  trackingSlug,
}: {
  data: OpportunityBriefData;
  locale: string;
  trackingSlug: string;
}) {
  const isJa = locale === "ja";
  const { report, projection, competition, findings } = data;
  const base = projection.scenarios.find(
    (scenario) => scenario.scenario === "base",
  );
  const month12 = base?.horizons.find((row) => row.horizon === 12);
  const auditPages = Array.isArray(report.meta?.japan_market_audit)
    ? []
    : (() => {
        const audit = report.meta?.japan_market_audit;
        if (!audit || typeof audit !== "object" || Array.isArray(audit))
          return [];
        const pages = (audit as Record<string, unknown>).pages_checked;
        return Array.isArray(pages)
          ? pages.filter((page): page is string => typeof page === "string")
          : [];
      })();
  const contactHref = `/${locale}/contact?intent=japan-entry&company=${encodeURIComponent(report.company_name)}`;
  const callHref = `https://cal.com/paradigm-jp/15min?name=${encodeURIComponent(report.company_name)}`;
  const evidenceImage = safeImageUrl(
    report.evidence_screenshot_url ?? report.screenshot_url,
  );
  const reportId = `${projection.modelVersion}-${trackingSlug}`.toUpperCase();

  return (
    <main className="min-h-dvh bg-zinc-50 text-zinc-950 print:bg-white">
      <header className="border-b border-zinc-200 bg-white px-5 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link
            href={`/${locale}`}
            className="text-sm font-semibold tracking-tight"
            aria-label="Paradigm home"
          >
            PARADIGM
          </Link>
          <p className="text-right text-xs text-zinc-500">
            {isJa
              ? "返信企業向け・非公開意思決定資料"
              : "Private decision brief for invited companies"}
          </p>
        </div>
      </header>

      <section className="relative overflow-hidden bg-zinc-950 px-5 py-16 text-white sm:py-24">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-red-700/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300">
                Japan Entry Opportunity Brief
              </p>
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-[10px] uppercase tracking-wider text-zinc-400">
                Private · modeled
              </span>
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">
              {report.company_name}
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300 sm:text-lg">
              {isJa
                ? "公開情報から、日本市場へのアクセス機会、収益化の前提、参入準備上のギャップを意思決定用に整理しました。"
                : "A decision-ready view of Japan market access, modeled commercial upside and launch-readiness gaps, built from public evidence."}
            </p>
            <p className="mt-8 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              Document {reportId} ·{" "}
              {new Date(data.generatedAt).toLocaleDateString(
                isJa ? "ja-JP" : "en-US",
              )}
            </p>
          </div>
          <div className="relative min-h-64 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            {evidenceImage ? (
              <Image
                src={evidenceImage}
                alt={`${report.company_name} public website evidence`}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover opacity-70 grayscale"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_top_right,#7f1d1d,transparent_48%)]">
                <span className="text-7xl font-semibold text-zinc-700">
                  {report.company_name.slice(0, 1).toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
            <p className="absolute bottom-4 left-4 text-xs text-zinc-300">
              {isJa
                ? "公開サイト監査スナップショット"
                : "Public-site audit snapshot"}
            </p>
          </div>
        </div>
        <div className="relative mx-auto mt-10 grid max-w-6xl gap-4 sm:grid-cols-3">
          <HeroMetric
            label={
              isJa ? "推定日本月間アクセス" : "Estimated Japan visits / month"
            }
            value={compact(
              projection.markets.find((market) => market.code === "JP")
                ?.estimatedMonthlyVisits ?? 0,
            )}
          />
          <HeroMetric
            label={
              isJa ? "推定月間機会ギャップ" : "Modeled monthly opportunity gap"
            }
            value={usd(projection.monthlyOpportunityGapUsd)}
          />
          <HeroMetric
            label={isJa ? "12か月 基準ROI" : "12-month base ROI"}
            value={month12 ? `${month12.roiPercent}%` : "—"}
          />
        </div>
        <p className="relative mx-auto mt-5 max-w-6xl text-xs leading-5 text-zinc-500">
          {isJa
            ? "すべて公開シグナルに基づくモデル値であり、実測アクセス・確定売上・成果保証ではありません。"
            : "All commercial figures are modeled estimates based on public signals—not first-party analytics, confirmed revenue or a guarantee."}
        </p>
      </section>

      <OpportunityEvidenceSummary data={data} locale={locale} />

      <OpportunityPressureSummary data={data} locale={locale} />

      <section
        className="px-5 py-14 sm:py-20"
        aria-labelledby="decision-summary-title"
      >
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">
              Executive decision
            </p>
            <h2
              id="decision-summary-title"
              className="mt-3 text-3xl font-semibold tracking-tight"
            >
              {isJa ? "今、判断できること" : "What the evidence supports now"}
            </h2>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-base leading-8 text-zinc-700">
              {isJa
                ? `公開シグナル上、日本市場の余地を検証する合理性があります。初期費用は$12,000の一括前払い、最初の6か月は追加月額なし。基準シナリオでは${projection.paybackMonth ? `${projection.paybackMonth}か月目` : "24か月以降"}の回収を試算しています。`
                : `Public signals support a structured Japan validation. The fixed setup is $12,000 paid upfront, with no additional monthly fee for the first six months. The base model reaches payback ${projection.paybackMonth ? `in month ${projection.paybackMonth}` : "after month 24"}.`}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={callHref}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800"
              >
                {isJa ? "15分面談を予約" : "Book the 15-minute review"}
              </a>
              <Link
                href={contactHref}
                className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
              >
                {isJa ? "申込（フォーム）" : "Apply via the form"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <JapanEntryProjectionSection data={report} lang={locale} />

      <OpportunitySensitivityModel projection={projection} locale={locale} />

      <section
        className="border-y border-zinc-200 bg-zinc-100 px-5 py-16"
        aria-labelledby="readiness-title"
      >
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">
            Launch readiness
          </p>
          <h2
            id="readiness-title"
            className="mt-3 text-3xl font-semibold tracking-tight"
          >
            {isJa ? "日本市場への準備状況" : "Japan-market readiness findings"}
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {findings.map((finding) => (
              <article
                key={finding.id}
                className={`rounded-xl border p-5 ${findingTone(finding.status)}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide">
                  {finding.status}
                </p>
                <h3 className="mt-2 font-semibold">{finding.title}</h3>
                <p className="mt-3 text-sm leading-6 opacity-80">
                  {finding.detail}
                </p>
                {finding.evidence.length > 0 && (
                  <p className="mt-3 text-xs opacity-70">
                    Observed: {finding.evidence.slice(0, 4).join(" / ")}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="bg-white px-5 py-16"
        aria-labelledby="competition-title"
      >
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">
            Competitive landscape
          </p>
          <h2
            id="competition-title"
            className="mt-3 text-3xl font-semibold tracking-tight"
          >
            {isJa ? "競合環境" : "Verified competitive context"}
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-600">
            {competition.methodology}
          </p>
          {competition.status === "verified" ? (
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {competition.competitors.map((competitor) => (
                <article
                  key={`${competitor.domain}-${competitor.category}`}
                  className="rounded-xl border border-zinc-200 p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">{competitor.name}</h3>
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                      {competitor.category}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-600">
                    {competitor.summary}
                  </p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <FactList
                      title="Observed strengths"
                      items={competitor.strengths}
                    />
                    <FactList title="Observed gaps" items={competitor.gaps} />
                  </div>
                  <div className="mt-5 border-t border-zinc-100 pt-4 text-xs text-zinc-500">
                    {competitor.evidence.map((item) => (
                      <a
                        key={item.sourceUrl}
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mr-4 underline hover:text-zinc-900"
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8">
              <h3 className="font-semibold">
                {isJa
                  ? "競合企業セットは未検証です"
                  : "The named competitor set is not yet verified"}
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
                {isJa
                  ? "カテゴリ類似だけで競合を断定しません。15分面談で対象顧客・価格帯・代替手段を確認後、公開根拠URL付きで比較対象を確定します。"
                  : "We do not label companies as competitors from category similarity alone. After confirming buyer, price point and substitutes, the comparison set is published with source URLs."}
              </p>
            </div>
          )}
        </div>
      </section>

      <OpportunityActionPlan findings={findings} locale={locale} />

      <OpportunityOfferPanel
        callHref={callHref}
        contactHref={contactHref}
        isJa={isJa}
      />

      <section
        className="bg-white px-5 py-10 text-xs text-zinc-500"
        aria-label="Evidence register"
      >
        <div className="mx-auto max-w-6xl">
          <p>
            Model version: {projection.modelVersion} · Generated:{" "}
            {new Date(data.generatedAt).toLocaleDateString(
              isJa ? "ja-JP" : "en-US",
            )}
          </p>
          <p className="mt-2">
            {isJa ? "監査対象公開ページ" : "Public pages reviewed"}:{" "}
            {auditPages.length > 0 ? auditPages.length : "not available"}
          </p>
          <p className="mt-2">{projection.limitations.join(" ")}</p>
        </div>
      </section>

      <Image
        src={`/api/sales/track-view?slug=${encodeURIComponent(trackingSlug)}`}
        width={1}
        height={1}
        alt=""
        aria-hidden
        unoptimized
        className="absolute h-px w-px opacity-0"
      />
    </main>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function FactList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </p>
      <ul className="mt-2 space-y-2 text-sm text-zinc-700">
        {items.length > 0 ? (
          items.map((item) => <li key={item}>• {item}</li>)
        ) : (
          <li>Not yet verified</li>
        )}
      </ul>
    </div>
  );
}
