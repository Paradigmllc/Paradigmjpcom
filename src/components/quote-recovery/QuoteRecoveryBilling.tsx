"use client"

import { useState } from "react"
import { ArrowRight, Check, CreditCard, Download, LoaderCircle } from "lucide-react"
import { toast } from "sonner"
import { QUOTE_RECOVERY_PLANS, type QuoteRecoveryPlanCode } from "@/lib/quote-recovery/plans"

function formatYen(value: number): string {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(value)
}

function errorMessage(value: unknown): string {
  return value && typeof value === "object" && "error" in value && typeof value.error === "string" ? value.error : "決済処理を開始できませんでした"
}

export function QuoteRecoveryBillingGate({ status }: { status: string }) {
  const [loadingPlan, setLoadingPlan] = useState<QuoteRecoveryPlanCode | null>(null)

  async function checkout(plan: QuoteRecoveryPlanCode) {
    setLoadingPlan(plan)
    try {
      const response = await fetch("/api/quote-recovery/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const body: unknown = await response.json()
      if (!response.ok || !body || typeof body !== "object" || !("url" in body) || typeof body.url !== "string") throw new Error(errorMessage(body))
      window.location.assign(body.url)
    } catch (error) {
      console.error("[quote-recovery/billing-ui] checkout failed:", error)
      toast.error(error instanceof Error ? error.message : "決済処理に失敗しました")
      setLoadingPlan(null)
    }
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-bold">契約ステータス: {status === "past_due" ? "お支払いの確認が必要" : status === "canceled" ? "解約済み" : "未契約"}</p>
        <p className="mt-1 leading-6">業務データの保存・チーム運用を開始するには月額プランをご契約ください。無料トライアルや自動課金前の猶予期間はありません。</p>
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {Object.values(QUOTE_RECOVERY_PLANS).map((plan) => (
          <article key={plan.code} className={`rounded-3xl border bg-white p-7 shadow-sm ${plan.code === "team" ? "border-violet-400 ring-4 ring-violet-100" : "border-slate-200"}`}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-violet-600">{plan.name}</p><p className="mt-3 text-4xl font-bold tracking-tight text-slate-950">{formatYen(plan.monthlyPriceYen)}<span className="text-sm font-medium text-slate-500"> / 月</span></p></div>{plan.code === "team" && <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">推奨</span>}</div>
            <ul className="mt-7 space-y-3 text-sm text-slate-700">
              <li className="flex gap-2"><Check className="size-5 text-emerald-600" />月間見積 {plan.monthlyQuoteLimit.toLocaleString("ja-JP")}件</li>
              <li className="flex gap-2"><Check className="size-5 text-emerald-600" />最大 {plan.seatLimit}名</li>
              <li className="flex gap-2"><Check className="size-5 text-emerald-600" />CSV履歴・活動履歴・優先順位</li>
              <li className="flex gap-2"><Check className="size-5 text-emerald-600" />Stripe請求書・カード決済</li>
            </ul>
            <button type="button" onClick={() => void checkout(plan.code)} disabled={Boolean(loadingPlan)} className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-60">
              {loadingPlan === plan.code ? <LoaderCircle className="size-4 animate-spin" /> : <CreditCard className="size-4" />}{loadingPlan === plan.code ? "Stripeへ接続中…" : `${plan.name}を契約`}<ArrowRight className="size-4" />
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}

export function QuoteRecoveryBillingPanel({ plan, status, currentPeriodEnd, cancelAtPeriodEnd }: { plan: string; status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean }) {
  const [loading, setLoading] = useState(false)
  async function portal() {
    setLoading(true)
    try {
      const response = await fetch("/api/quote-recovery/billing/portal", { method: "POST" })
      const body: unknown = await response.json()
      if (!response.ok || !body || typeof body !== "object" || !("url" in body) || typeof body.url !== "string") throw new Error(errorMessage(body))
      window.location.assign(body.url)
    } catch (error) {
      console.error("[quote-recovery/billing-ui] portal failed:", error)
      toast.error(error instanceof Error ? error.message : "請求ポータルを開けませんでした")
      setLoading(false)
    }
  }
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">BILLING</p><h2 className="mt-2 text-2xl font-bold">{plan === "team" ? "Team" : "Starter"}</h2><p className="mt-2 text-sm text-slate-600">状態: {status} {currentPeriodEnd ? `／次回更新 ${new Date(currentPeriodEnd).toLocaleDateString("ja-JP")}` : ""}{cancelAtPeriodEnd ? "／期間終了時に解約" : ""}</p></div>
        <div className="flex flex-col gap-2 sm:flex-row"><a href="/api/quote-recovery/app/export" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-bold hover:border-violet-400 hover:text-violet-700"><Download className="size-4" />全データをCSV出力</a><button type="button" onClick={() => void portal()} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-bold hover:border-violet-400 hover:text-violet-700 disabled:opacity-60"><CreditCard className="size-4" />{loading ? "接続中…" : "請求・プランを管理"}</button></div>
      </div>
    </section>
  )
}
