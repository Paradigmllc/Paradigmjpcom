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
    snapshot: ja ? "経営インパクト" : "Business impact",
    title: ja ? "放置すると、機会損失は静かに積み上がります" : "If unchanged, opportunity loss keeps compounding quietly",
    body: ja
      ? "この金額は断定ではなく、公開データと取得済みシグナルから見える経営判断用の仮説です。重要なのはIT項目の点検ではなく、どの摩擦が売上・信頼・問い合わせ数を止めているかです。"
      : "This is not a financial claim. It is an operating hypothesis from public evidence, used to decide which friction is blocking revenue, trust, or inquiries first.",
    evidenceTitle: ja ? "判断材料を経営言語へ変換" : "Evidence translated into business language",
    evidenceBody: ja
      ? "速度、検索表示、SNS表示、決済、信頼材料などを、専門用語ではなく意思決定に使える論点へ変換します。"
      : "Speed, search visibility, social previews, payments, and trust proof are translated into management questions.",
    hiddenCostTitle: ja ? "見えにくい固定費" : "Hidden cost of delay",
    hiddenCostBody: ja
      ? "採用、広告、制作待ち、問い合わせ離脱は別々に見ると小さく見えますが、遅れそのものが固定費になります。"
      : "Hiring, ads, production delay, and inquiry friction look small alone. Together, delay becomes a fixed cost.",
    solutionTitle: ja ? "小さく始める改善ライン" : "A lightweight improvement line",
    solutionBody: ja
      ? "大規模な作り直しではなく、診断、改善デモ、1分動画、問い合わせ導線を順番につなぎ、既存サイトを壊さず成果が出る箇所から直します。"
      : "This is not a full rebuild. We connect assessment, demo, video, and outreach in phases, improving the highest-return path first.",
    ctaDemo: ja ? "改善デモを見る" : "View demo",
    ctaVideo: ja ? "1分動画を見る" : "Watch video",
    ctaDiscuss: ja ? "相談する" : "Discuss",
    sourceConfidence: ja ? "根拠信頼度" : "Evidence confidence",
    collected: ja ? "確認済み" : "Confirmed",
    missing: ja ? "未確認" : "Unconfirmed",
    currentDrag: ja ? "現在の摩擦" : "Current drag",
    internalCost: ja ? "自社対応の固定費" : "Internal fixed cost",
    automationLine: ja ? "改善ライン" : "Improvement line",
    proof: ja ? "判断根拠" : "Proof",
    plan: ja ? "初期プラン" : "Starting plan",
    planValue: ja ? "月額 $3,000 から" : "From $3,000/mo",
    planNote: ja
      ? "診断、改善デモ、動画、フォーム営業を段階的に運用します。"
      : "Assessment, demo, video, and form outreach are rolled out in phases.",
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
  const color = tone === "red" ? "bg-rose-500" : tone === "blue" ? "bg-sky-500" : "bg-zinc-950"
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-zinc-700">{label}</span>
        <span className="tabular-nums text-zinc-500">{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function ImpactTile({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return (
    <div className={`rounded-lg border p-4 transition duration-300 hover:-translate-y-1 hover:shadow-md ${tone}`}>
      <div className="text-xs font-semibold text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-zinc-950">{value}</div>
      <p className="mt-2 text-xs leading-5 text-zinc-600">{detail}</p>
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
  const categoryCoverage = coverageByCategory(data).slice(0, 6)
  const topSignals = data.intelligence.signals.slice(0, 6)

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">{copy.snapshot}</p>
            <h2 className="mt-3 text-2xl font-semibold leading-tight text-zinc-950 sm:text-3xl">{copy.title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">{copy.body}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <ImpactTile label={copy.sourceConfidence} value={`${confidence}/100`} detail={data.content_template.quality_bar} tone="border-emerald-200 bg-emerald-50/70" />
              <ImpactTile label={copy.collected} value={`${data.source_coverage.collected}`} detail={copy.evidenceBody} tone="border-sky-200 bg-sky-50/70" />
              <ImpactTile label={copy.missing} value={`${data.source_coverage.missing}`} detail={copy.hiddenCostBody} tone="border-amber-200 bg-amber-50/70" />
            </div>
          </div>
          <div className="relative flex min-h-[260px] flex-col justify-between bg-zinc-950 p-6 text-white">
            <div className="absolute right-5 top-5 h-20 w-20 rounded-full border border-white/15 animate-pulse" />
            <div>
              <div className="text-xs font-semibold text-white/60">{copy.currentDrag}</div>
              <div className="mt-3 text-4xl font-semibold tabular-nums">{formatMoney(loss, lang)}</div>
              <p className="mt-3 text-sm leading-6 text-white/65">{copy.hiddenCostBody}</p>
            </div>
            <div className="rounded-md border border-white/15 bg-white/5 p-3 text-sm leading-6 text-white/75">
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
              <div key={signal.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 transition duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold text-zinc-950">{signal.label}</span>
                  <span className="rounded border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-600">{signal.value}</span>
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
              <ImpactTile label={copy.proof} value={`${data.source_coverage.score}%`} detail={data.content_template.quality_bar} tone="border-zinc-200 bg-zinc-50" />
              <ImpactTile label={copy.plan} value={copy.planValue} detail={copy.planNote} tone="border-sky-200 bg-sky-50/70" />
              <ImpactTile label="Template" value={data.template_variant} detail={data.content_template.title} tone="border-emerald-200 bg-emerald-50/70" />
            </div>
          </div>
          <div className="flex flex-col justify-center gap-3">
            {data.demo_url && (
              <a href={data.demo_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white">
                {copy.ctaDemo}
              </a>
            )}
            {videoHref && (
              <a href={videoHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950">
                {copy.ctaVideo}
              </a>
            )}
            <a href={`mailto:info@paradigmjp.com?subject=${encodeURIComponent(data.company_name)}&body=${encodeURIComponent(data.report_url)}`} className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950">
              {copy.ctaDiscuss}
            </a>
          </div>
        </div>
      </section>
    </section>
  )
}
