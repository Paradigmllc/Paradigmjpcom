import type { DiagnosticReportData } from "@/lib/sales/diagnostic"
import type { ReportLang } from "./report-copy"

function numericValue(value: string): number {
  return Number.parseInt(value.replace(/[^0-9]/g, ""), 10) || 0
}

function formatMoney(amount: number, lang: ReportLang): string {
  return new Intl.NumberFormat(lang === "ja" ? "ja-JP" : "en-US", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount)
}

function copyFor(lang: ReportLang) {
  const ja = lang === "ja"
  return {
    shockEyebrow: ja ? "Executive Loss Snapshot" : "Executive Loss Snapshot",
    shockTitle: ja ? "現状維持で漏れている可能性がある売上" : "Revenue that may be leaking under the status quo",
    shockBody: ja
      ? "この数字は断定ではなく、公開データ・OSS診断・テンプレ判定を束ねた営業判断用の仮説です。重要なのは金額そのものではなく、どの構造が損失を生み、どこから止めるべきかです。"
      : "This is not a legal or financial assertion. It is an operating hypothesis built from public data, OSS diagnostics, and template logic so the next commercial move is clear.",
    evidenceTitle: ja ? "Data Evidence" : "Data Evidence",
    evidenceBody: ja
      ? "取得済みソースと未取得ソースを分け、数字が何を意味するかを営業文脈へ翻訳します。"
      : "Collected and missing signals are separated so each metric becomes business context, not a loose number.",
    hiddenCostTitle: ja ? "The Hidden Cost" : "The Hidden Cost",
    hiddenCostBody: ja
      ? "自社採用・制作待ち・広告摩耗・フォーム離脱を別々に見ると小さく見えますが、同時に積み上がると意思決定の遅れそのものがコストになります。"
      : "Hiring, production delay, ad fatigue, and form friction look small in isolation. Together, they turn delay itself into cost.",
    solutionTitle: ja ? "Frictionless Solution" : "Frictionless Solution",
    solutionBody: ja
      ? "最初の提案は大規模リプレイスではなく、既存スタックを壊さずに診断・デモ・動画・フォーム営業を接続する小さな制作ラインです。"
      : "The offer is not a large replacement project. It is a lightweight production line that connects diagnosis, demo, video, and outreach without breaking the existing stack.",
    ctaDemo: ja ? "デモを見る" : "View demo",
    ctaVideo: ja ? "動画を見る" : "Watch video",
    ctaDiscuss: ja ? "15分で相談する" : "Discuss in 15 minutes",
    sourceConfidence: ja ? "証拠カバレッジ" : "Evidence coverage",
    collected: ja ? "取得済み" : "Collected",
    configured: ja ? "設定済み" : "Configured",
    missing: ja ? "未取得" : "Missing",
    currentDrag: ja ? "現在の摩擦" : "Current drag",
    internalCost: ja ? "自社採用の固定費" : "Internal fixed cost",
    automationLine: ja ? "自動制作ライン" : "Automation line",
    proof: ja ? "客観証拠" : "Objective proof",
    plan: ja ? "初期プラン" : "Starting plan",
    planValue: ja ? "月額 $3,000 相当から" : "From $3,000/mo",
    planNote: ja
      ? "Dify文面、Astroデモ、HyperFrames/Remotion動画、フォーム営業を段階導入"
      : "Dify copy, Astro demo, HyperFrames/Remotion video, and form outreach in phases",
  }
}

function coverageByCategory(data: DiagnosticReportData) {
  const categories = new Map<string, { collected: number; total: number }>()
  for (const item of data.source_coverage.items) {
    const current = categories.get(item.category) ?? { collected: 0, total: 0 }
    current.total += 1
    if (item.status === "collected") current.collected += 1
    categories.set(item.category, current)
  }
  return Array.from(categories.entries()).map(([category, value]) => ({
    category,
    ...value,
    rate: value.total > 0 ? Math.round((value.collected / value.total) * 100) : 0,
  }))
}

function Bar({ label, value, max, tone }: { label: string; value: string; max: number; tone: "dark" | "red" | "blue" }) {
  const width = Math.max(8, Math.min(max, 100))
  const color = tone === "red" ? "bg-rose-500" : tone === "blue" ? "bg-blue-500" : "bg-zinc-950"
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-zinc-700">{label}</span>
        <span className="tabular-nums text-zinc-500">{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
        <div className={`h-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

export function AuditConversionSections({
  data,
  lang,
  confidence,
  videoHref,
}: {
  data: DiagnosticReportData
  lang: ReportLang
  confidence: number
  videoHref: string | null
}) {
  const copy = copyFor(lang)
  const loss = numericValue(data.total_loss)
  const annualLoss = loss * 12
  const categoryCoverage = coverageByCategory(data)
  const topSignals = data.intelligence.signals.slice(0, 6)

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">{copy.shockEyebrow}</p>
            <h2 className="mt-3 text-2xl font-semibold leading-tight text-zinc-950">{copy.shockTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600">{copy.shockBody}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-zinc-50 p-4">
                <div className="text-xs text-zinc-500">{copy.sourceConfidence}</div>
                <div className="mt-2 text-2xl font-semibold tabular-nums">{confidence}/100</div>
              </div>
              <div className="rounded-lg bg-zinc-50 p-4">
                <div className="text-xs text-zinc-500">{copy.collected}</div>
                <div className="mt-2 text-2xl font-semibold tabular-nums">{data.source_coverage.collected}</div>
              </div>
              <div className="rounded-lg bg-zinc-50 p-4">
                <div className="text-xs text-zinc-500">{copy.missing}</div>
                <div className="mt-2 text-2xl font-semibold tabular-nums">{data.source_coverage.missing}</div>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-zinc-950 p-5 text-white">
            <div className="text-xs font-semibold text-white/60">{copy.currentDrag}</div>
            <div className="mt-3 text-4xl font-semibold tabular-nums">{formatMoney(loss, lang)}</div>
            <div className="mt-5 rounded-md border border-white/15 p-3 text-sm leading-6 text-white/70">
              12mo: {formatMoney(annualLoss, lang)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-950">{copy.evidenceTitle}</h2>
          <p className="mt-2 text-sm leading-7 text-zinc-600">{copy.evidenceBody}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {topSignals.map((signal) => (
              <div key={signal.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold text-zinc-950">{signal.label}</span>
                  <span className="rounded border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-600">{signal.source}</span>
                </div>
                <p className="mt-2 text-xs leading-6 text-zinc-600">{signal.whyItMatters}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {categoryCoverage.map((item) => (
              <Bar key={item.category} label={item.category} value={`${item.collected}/${item.total}`} max={item.rate} tone="dark" />
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-950">{copy.hiddenCostTitle}</h2>
          <p className="mt-2 text-sm leading-7 text-zinc-600">{copy.hiddenCostBody}</p>
          <div className="mt-6 space-y-5">
            <Bar label={copy.currentDrag} value={formatMoney(loss, lang)} max={70} tone="red" />
            <Bar label={copy.internalCost} value="$8,500/mo" max={92} tone="red" />
            <Bar label={copy.automationLine} value="$3,000/mo" max={34} tone="blue" />
          </div>
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
            {data.intelligence.painPoints[0]?.implication ?? data.cta_text}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <h2 className="text-xl font-semibold text-zinc-950">{copy.solutionTitle}</h2>
            <p className="mt-2 text-sm leading-7 text-zinc-600">{copy.solutionBody}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-200 p-4">
                <div className="text-xs font-semibold text-zinc-500">{copy.proof}</div>
                <p className="mt-2 text-sm leading-6 text-zinc-700">{data.content_template.quality_bar}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 p-4">
                <div className="text-xs font-semibold text-zinc-500">{copy.plan}</div>
                <p className="mt-2 text-lg font-semibold text-zinc-950">{copy.planValue}</p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{copy.planNote}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 p-4">
                <div className="text-xs font-semibold text-zinc-500">Template</div>
                <p className="mt-2 text-sm leading-6 text-zinc-700">{data.content_template.title}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-3">
            {data.demo_url && (
              <a
                href={data.demo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white"
              >
                {copy.ctaDemo}
              </a>
            )}
            {videoHref && (
              <a
                href={videoHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950"
              >
                {copy.ctaVideo}
              </a>
            )}
            <a
              href={`mailto:info@paradigmjp.com?subject=${encodeURIComponent(data.company_name)}&body=${encodeURIComponent(data.report_url)}`}
              className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950"
            >
              {copy.ctaDiscuss}
            </a>
          </div>
        </div>
      </section>
    </section>
  )
}
