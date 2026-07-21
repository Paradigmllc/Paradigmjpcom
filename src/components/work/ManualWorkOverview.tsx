import { ArrowUpRight, Building2, CircleAlert, FileCheck2, Send, Target } from "lucide-react"
import { summarizeManualWorkDashboard } from "@/lib/sales/manual-work-dashboard"
import type { ManualJapanEntryWorkRow } from "@/lib/sales/manual-japan-entry-types"

const statDefinitions = [
  { key: "total", label: "解析履歴", note: "専用DBに永続保存", icon: Building2 },
  { key: "actionRequired", label: "要確認", note: "人の判断が必要", icon: CircleAlert },
  { key: "formReady", label: "フォーム発見", note: "送信先候補あり", icon: FileCheck2 },
  { key: "completed", label: "Twenty保存", note: "解析データ・未送信", icon: ArrowUpRight },
  { key: "manuallySent", label: "手動送信", note: "operator記録", icon: Send },
  { key: "meetings", label: "商談化", note: "成果イベント", icon: Target },
] as const

export function ManualWorkOverview({ items }: { items: ManualJapanEntryWorkRow[] }) {
  const summary = summarizeManualWorkDashboard(items)
  return (
    <section aria-labelledby="work-overview-heading" className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-[0_16px_50px_-32px_rgba(15,23,42,0.38)] sm:grid-cols-3 xl:grid-cols-6">
      <h2 id="work-overview-heading" className="sr-only">業務サマリー</h2>
      {statDefinitions.map(({ key, label, note, icon: Icon }) => (
        <div key={key} className="group bg-white px-4 py-4 transition-colors hover:bg-slate-50 sm:px-5 sm:py-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500">{label}</span>
            <span className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-slate-900 group-hover:text-white">
              <Icon className="size-4" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{summary[key]}</p>
          <p className="mt-1 truncate text-[11px] text-slate-600">{note}</p>
        </div>
      ))}
    </section>
  )
}
