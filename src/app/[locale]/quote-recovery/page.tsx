import type { Metadata } from "next"
import { ArrowDown, Check, Clock3, DatabaseZap, Gauge, ShieldCheck } from "lucide-react"
import { QuoteRecoveryDiagnostic } from "@/components/quote-recovery/QuoteRecoveryDiagnostic"
import { QuoteRecoveryCommercialSections, QuoteRecoveryProductPreview } from "@/components/quote-recovery/QuoteRecoveryLandingSections"
import { QuoteRecoveryShell } from "@/components/quote-recovery/QuoteRecoveryShell"
import { QuoteRecoveryContractLink } from "@/components/quote-recovery/QuoteRecoveryContractLink"
import { pageAlternates } from "@/lib/page-metadata"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: "Quote Recovery | 製造業の見積フォロー・放置案件管理",
    description: "製造業・機械商社向け。既存の見積CSVから放置金額、回収優先順位、次に連絡すべき案件を可視化する月額SaaSです。",
    alternates: pageAlternates(locale, "/quote-recovery"),
    openGraph: {
      title: "Quote Recovery | 見積を出した後の『そのまま』をなくす",
      description: "既存CSVから、放置金額・回収優先順位・次回アクションを可視化。",
      type: "website",
    },
  }
}

export default function QuoteRecoveryPage() {
  return (
    <QuoteRecoveryShell>
      <main className="overflow-hidden bg-white text-slate-950">
        <section className="relative border-b border-slate-200 px-5 pb-20 pt-20 sm:px-8 lg:pb-28 lg:pt-28">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_20%,rgba(139,92,246,0.14),transparent_35%),linear-gradient(to_bottom,#ffffff,#f8fafc)]" />
          <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700"><Gauge className="size-4" aria-hidden="true" />製造業・機械商社の見積フォロー特化</div>
              <h1 className="mt-7 max-w-4xl text-4xl font-bold leading-[1.05] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl">見積を出した後の<br /><span className="text-violet-600">「そのまま」</span>をなくす。</h1>
              <p className="mt-7 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">Excelや基幹システムはそのまま。見積CSVから、放置金額・回収優先順位・次に連絡すべき案件だけを可視化します。</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href="#diagnostic" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/30">無料でCSV診断する<ArrowDown className="size-4" aria-hidden="true" /></a>
                <QuoteRecoveryContractLink className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-violet-300 hover:text-violet-700">料金を確認して契約</QuoteRecoveryContractLink>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500"><span><Check className="mr-1.5 inline size-4 text-emerald-600" />初期費用0円</span><span><Check className="mr-1.5 inline size-4 text-emerald-600" />月単位契約</span><span><ShieldCheck className="mr-1.5 inline size-4 text-emerald-600" />組織別データ分離</span></div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.4)] sm:p-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5"><div><p className="text-xs font-semibold text-slate-500">今月の放置見積</p><p className="mt-2 text-3xl font-bold tracking-tight">¥18,420,000</p></div><span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">要対応 8件</span></div>
              <div className="mt-5 space-y-3">
                {[["北陸パーツ工業", "¥8,200,000", "154日"], ["東都精機株式会社", "¥4,800,000", "84日"], ["中央オートメーション", "¥3,100,000", "154日"]].map(([company, amount, age], index) => <div key={company} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl bg-slate-50 p-4"><span className={`flex size-8 items-center justify-center rounded-lg text-xs font-bold ${index === 0 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{index + 1}</span><div className="min-w-0"><p className="truncate text-sm font-bold">{company}</p><p className="mt-1 text-xs text-slate-500">次回アクション未設定</p></div><div className="text-right"><p className="text-sm font-bold">{amount}</p><p className="mt-1 text-xs text-slate-500">{age}</p></div></div>)}
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-14 sm:px-8"><div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-3">{[
          [DatabaseZap, "置き換え不要", "既存のExcel・kintone・基幹システムからCSVを出すだけ。"],
          [Clock3, "60秒で診断", "見積日と最終接触日から、経過期間を自動で分類。"],
          [Check, "理由が見える", "AIのブラックボックスではなく、金額・日数・未設定項目で判定。"],
        ].map(([Icon, title, description]) => { const FeatureIcon = Icon as typeof DatabaseZap; return <div key={String(title)} className="rounded-2xl border border-slate-200 p-6"><FeatureIcon className="size-6 text-violet-600" aria-hidden="true" /><h2 className="mt-5 text-lg font-bold">{String(title)}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{String(description)}</p></div> })}</div></section>

        <QuoteRecoveryProductPreview />
        <QuoteRecoveryDiagnostic />
        <QuoteRecoveryCommercialSections />
      </main>
    </QuoteRecoveryShell>
  )
}
