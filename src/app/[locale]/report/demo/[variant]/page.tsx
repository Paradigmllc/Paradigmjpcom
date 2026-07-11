"use client"

import { useParams } from "next/navigation"
import DiagnosticReport from "@/components/diagnostic/DiagnosticReport"
import { buildDemoData } from "@/lib/sales/demo-data"

export default function DemoReportPage() {
  const params = useParams()
  const variant = (params?.variant as string) || "website_diagnostic"
  const locale = (params?.locale as string) || "ja"

  if (variant !== "japan_entry") {
    return (
        <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold">This demo is archived</h1>
        <p className="text-sm text-zinc-600">Only the verified Japan Entry example is available publicly.</p>
        <a className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white" href="/en/contact?intent=japan-entry">Apply for Japan Entry — $12K</a>
      </main>
    )
  }

  const data = buildDemoData(variant, locale)
  const slug = `demo-${variant}`

  return (
    <>
      <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-zinc-900 px-4 py-2 text-white">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold">🔍 デモプレビュー</span>
          <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono">{variant}</span>
          <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono">{locale}</span>
        </div>
        <div className="flex items-center gap-2">
          <a href="/ja/report/template-preview" className="text-[10px] text-zinc-400 hover:text-white underline">← テンプレート一覧に戻る</a>
        </div>
      </div>
      <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-xs leading-5 text-amber-950">
        {locale === "ja"
          ? "説明用の架空シナリオです。社名・数値・診断内容は実績や成果保証を示すものではありません。"
          : "Illustrative fictional scenario. Names, figures, and findings are not client results or an outcome guarantee."}
      </div>
      <DiagnosticReport data={data} trackingSlug={slug} locale={locale} />
    </>
  )
}
