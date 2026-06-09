"use client"

import { useParams } from "next/navigation"
import DiagnosticReport from "@/components/diagnostic/DiagnosticReport"
import { buildDemoData } from "@/lib/sales/demo-data"

export default function DemoReportPage() {
  const params = useParams()
  const variant = (params?.variant as string) || "website_diagnostic"
  const locale = (params?.locale as string) || "ja"

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
      <DiagnosticReport data={data} trackingSlug={slug} locale={locale} />
    </>
  )
}
