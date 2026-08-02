import { AlertTriangle, CheckCircle2, Clock3, LockKeyhole, PlayCircle, ShieldCheck } from "lucide-react"
import type { ShopifyLaunchControlStatus } from "@/lib/shopify-ops/types"

type Action = (formData: FormData) => Promise<void>

function dateTime(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value))
}

export function ShopifyLaunchControlPanel({
  control,
  locale,
  submit,
}: {
  control: ShopifyLaunchControlStatus
  locale: string
  submit: Action
}) {
  const ready = control.status === "ready"
  return (
    <div className="space-y-6">
      <section className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${ready ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-600">Commercial launch control</p>
            <div className="mt-2 flex items-center gap-3">
              {ready ? <ShieldCheck className="h-7 w-7 text-emerald-600" /> : <LockKeyhole className="h-7 w-7 text-amber-600" />}
              <h2 className="text-xl font-black text-zinc-950">{ready ? "世界向け販売を開始できます" : "一般公開は安全停止中です"}</h2>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-700">
              {ready
                ? "実商品、在庫、決済、配送、SNS、自動運転の証跡が揃っています。"
                : `現在は${control.readyGateCount}/${control.totalGateCount}項目を通過。未確認の事実を補完せず、パスワード保護と公開停止を維持します。`}
            </p>
          </div>
          <form action={submit}>
            <input type="hidden" name="pageLocale" value={locale} />
            <button type="submit" className="inline-flex min-w-fit items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800">
              <PlayCircle className="h-4 w-4" /> 今すぐ再監査
            </button>
          </form>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white/80 p-4"><p className="text-xs text-zinc-500">Shopify実商品</p><p className="mt-1 text-2xl font-black text-zinc-950">{control.catalogProductCount}</p></div>
          <div className="rounded-xl bg-white/80 p-4"><p className="text-xs text-zinc-500">公開ゲート通過商品</p><p className="mt-1 text-2xl font-black text-zinc-950">{control.eligibleProductCount}</p></div>
          <div className="rounded-xl bg-white/80 p-4"><p className="text-xs text-zinc-500">ストア保護</p><p className="mt-1 text-sm font-black text-zinc-950">{control.storefrontPasswordProtected ? "パスワード有効" : "公開状態"}</p></div>
          <div className="rounded-xl bg-white/80 p-4"><p className="text-xs text-zinc-500">定期監査</p><p className="mt-1 text-sm font-black text-zinc-950">{control.auditIntervalHours}時間ごと</p></div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Evidence gates</p><h2 className="mt-2 text-xl font-bold text-zinc-950">公開条件</h2></div>
          {control.safetyLockActive && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">公開ロック正常</span>}
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {control.gates.map((gate) => (
            <article key={gate.key} className={`rounded-xl border p-4 ${gate.status === "ready" ? "border-emerald-100 bg-emerald-50/60" : "border-amber-100 bg-amber-50/60"}`}>
              <div className="flex items-start gap-3">
                {gate.status === "ready" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}
                <div><p className="text-sm font-bold text-zinc-900">{gate.label}</p><p className="mt-1 text-xs leading-relaxed text-zinc-600">{gate.detail}</p></div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-violet-600" /><h2 className="text-lg font-bold text-zinc-950">監査履歴</h2></div>
        {control.recentAudits.length === 0 ? (
          <p className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">最初の監査結果を保存しています。</p>
        ) : (
          <div className="mt-4 space-y-2">
            {control.recentAudits.map((audit) => (
              <div key={audit.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3 text-xs">
                <span className="font-semibold text-zinc-700">{dateTime(audit.completedAt)} · {audit.triggerSource === "scheduled" ? "自動" : "手動"}</span>
                <span className={`rounded-full px-2.5 py-1 font-bold ${audit.status === "ready" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{audit.readyGateCount}/{audit.totalGateCount} · {audit.status === "ready" ? "公開可能" : "安全停止"}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
