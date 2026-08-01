import { BarChart3, Check, FlaskConical, ShieldCheck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  MANUAL_MESSAGE_ANGLE_LABELS,
  MANUAL_MESSAGE_ANGLES,
  type ManualAngleMetric,
  type ManualMessageAngleSelection,
} from "@/lib/sales/manual-japan-entry-angle"
import {
  MANUAL_MESSAGE_VARIANT_LABELS,
  MANUAL_MESSAGE_VARIANTS,
  type ManualExperimentMetric,
  type ManualMessageVariantSelection,
} from "@/lib/sales/manual-japan-entry-experiment"

function rate(count: number, denominator: number): string {
  return denominator > 0 ? `${Math.round((count / denominator) * 100)}%` : "—"
}

function SelectionButton({ active, disabled, label, note, onClick }: { active: boolean; disabled: boolean; label: string; note: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={`h-auto min-h-14 w-full justify-start whitespace-normal rounded-xl border px-3 py-2.5 text-left ${active ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800 hover:text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"}`}
    >
      <span className={`grid size-5 shrink-0 place-items-center rounded-full ${active ? "bg-emerald-400 text-slate-950" : "border border-slate-300"}`}>{active && <Check className="size-3" />}</span>
      <span><span className="block text-xs font-semibold">{label}</span><span className={`mt-0.5 block text-[10px] font-normal leading-4 ${active ? "text-slate-300" : "text-slate-600"}`}>{note}</span></span>
    </Button>
  )
}

function MetricTable({ title, rows }: { title: string; rows: Array<{ key: string; label: string; assigned: number; manuallySent: number; replies: number; founderForwards: number; meetings: number }> }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-600"><tr><th scope="col" className="px-4 py-2.5">条件</th><th scope="col" className="px-3 py-2.5">割付</th><th scope="col" className="px-3 py-2.5">送信</th><th scope="col" className="px-3 py-2.5">返信</th><th scope="col" className="px-3 py-2.5">転送</th><th scope="col" className="px-3 py-2.5">商談</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.key} className="border-b border-slate-100 last:border-0"><td className="px-4 py-3 font-semibold text-slate-700">{row.label}</td><td className="px-3 py-3 text-slate-600">{row.assigned}</td><td className="px-3 py-3 text-slate-600">{row.manuallySent}</td><td className="px-3 py-3 text-slate-600">{rate(row.replies, row.manuallySent)}</td><td className="px-3 py-3 text-slate-600">{rate(row.founderForwards, row.manuallySent)}</td><td className="px-3 py-3 font-semibold text-slate-700">{rate(row.meetings, row.manuallySent)}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}

export function ManualWorkExperimentControls({
  variant,
  angle,
  running,
  metrics,
  angleMetrics,
  onVariantChange,
  onAngleChange,
}: {
  variant: ManualMessageVariantSelection
  angle: ManualMessageAngleSelection
  running: boolean
  metrics: ManualExperimentMetric[]
  angleMetrics: ManualAngleMetric[]
  onVariantChange: (value: ManualMessageVariantSelection) => void
  onAngleChange: (value: ManualMessageAngleSelection) => void
}) {
  return (
    <section id="strategy" aria-labelledby="strategy-heading" className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.45)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><FlaskConical className="size-5" /></span>
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Experiment setup</p><h2 id="strategy-heading" className="mt-1 font-display text-xl font-semibold text-slate-950">生成条件</h2></div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700"><ShieldCheck className="size-3.5" />Fail-closed</span>
        </div>

        <div className="mt-6 space-y-6">
          <fieldset>
            <legend className="flex items-center gap-2 text-sm font-semibold text-slate-800"><span className="grid size-6 place-items-center rounded-md bg-slate-100 font-mono text-[10px] text-slate-700">01</span>初回文面のテストセル</legend>
            <p className="mt-1.5 text-xs leading-5 text-slate-600">推定根拠不足時は、価格条件を維持して「推定なし」へ戻します。</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <SelectionButton active={variant === "auto"} disabled={running} label="標準（推定あり・価格なし）" note="公開根拠がなければ安全に推定なし" onClick={() => onVariantChange("auto")} />
              {MANUAL_MESSAGE_VARIANTS.map((value) => <SelectionButton key={value} active={variant === value} disabled={running} label={MANUAL_MESSAGE_VARIANT_LABELS[value]} note={value.includes("estimate_on") ? "公開rank根拠が必要" : "推定値を使わない"} onClick={() => onVariantChange(value)} />)}
            </div>
          </fieldset>

          <div className="h-px bg-slate-100" />

          <fieldset>
            <legend className="flex items-center gap-2 text-sm font-semibold text-slate-800"><span className="grid size-6 place-items-center rounded-md bg-slate-100 font-mono text-[10px] text-slate-700">02</span>訴求角度</legend>
            <p className="mt-1.5 text-xs leading-5 text-slate-600">実証拠のない競合・機会・モックアップは問題提起型へ変更します。</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <SelectionButton active={angle === "auto"} disabled={running} label="自動安定割付" note="根拠に合う角度を選択" onClick={() => onAngleChange("auto")} />
              {MANUAL_MESSAGE_ANGLES.map((value) => <SelectionButton key={value} active={angle === value} disabled={running} label={MANUAL_MESSAGE_ANGLE_LABELS[value]} note={value === "problem" ? "公開事実から課題を提示" : value === "competitor" ? "HTTPS競合根拠が必要" : value === "opportunity" ? "公開rank根拠が必要" : "保存済み案が必要"} onClick={() => onAngleChange(value)} />)}
            </div>
          </fieldset>
        </div>
      </div>

      <details className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_60px_-42px_rgba(15,23,42,0.4)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 marker:hidden sm:p-6">
          <span className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-blue-100 text-blue-700"><BarChart3 className="size-5" /></span><span><span className="block text-sm font-semibold text-slate-900">テスト評価</span><span className="mt-0.5 block text-xs text-slate-600">手動送信を分母に返信・転送・商談化を比較</span></span></span>
          <Sparkles className="size-4 text-slate-400 transition-transform group-open:rotate-45" />
        </summary>
        <div className="grid gap-4 border-t border-slate-200 bg-slate-50/70 p-4 sm:p-6">
          <MetricTable title="文面セル別" rows={metrics.map((metric) => ({ key: metric.variant, label: MANUAL_MESSAGE_VARIANT_LABELS[metric.variant], ...metric }))} />
          <MetricTable title="訴求角度別" rows={angleMetrics.map((metric) => ({ key: metric.angle, label: MANUAL_MESSAGE_ANGLE_LABELS[metric.angle], ...metric }))} />
        </div>
      </details>
    </section>
  )
}
