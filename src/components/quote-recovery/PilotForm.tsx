"use client"

import { useState } from "react"
import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react"
import { toast } from "sonner"
import type { QuoteRecoveryDiagnosis } from "@/lib/quote-recovery/types"

const FIELD_CLASS = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"

function getResponseError(value: unknown): string {
  if (value && typeof value === "object" && "error" in value && typeof value.error === "string") return value.error
  return "送信に失敗しました。時間をおいてお試しください。"
}

export function PilotForm({ diagnosis }: { diagnosis: QuoteRecoveryDiagnosis | null }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle")

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setStatus("loading")
    try {
      const response = await fetch("/api/quote-recovery/pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.get("companyName"),
          name: form.get("name"),
          email: form.get("email"),
          monthlyQuotes: form.get("monthlyQuotes"),
          currentTool: form.get("currentTool"),
          openAmount: diagnosis?.openAmount ?? 0,
          staleAmount: diagnosis?.staleAmount ?? 0,
          staleQuotes: diagnosis?.staleQuotes ?? 0,
        }),
      })
      const body: unknown = await response.json()
      if (!response.ok) throw new Error(getResponseError(body))
      setStatus("success")
      formElement.reset()
      toast.success("パイロットのお申し込みを受け付けました")
    } catch (error) {
      console.error("[quote-recovery/pilot] submit failed:", error)
      setStatus("idle")
      toast.error(error instanceof Error ? error.message : "送信に失敗しました")
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6" role="status">
        <CheckCircle2 className="text-emerald-600" aria-hidden="true" />
        <h3 className="mt-4 text-lg font-bold text-slate-950">受付が完了しました</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">1営業日以内に、データ移行方法とパイロット条件をご連絡します。</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4" aria-label="14日間パイロット申込">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">会社名
          <input className={FIELD_CLASS} name="companyName" required maxLength={200} autoComplete="organization" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">お名前
          <input className={FIELD_CLASS} name="name" required maxLength={120} autoComplete="name" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">業務用メール
        <input className={FIELD_CLASS} type="email" name="email" required maxLength={254} autoComplete="email" inputMode="email" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">月間の見積件数
          <select className={FIELD_CLASS} name="monthlyQuotes" required defaultValue="">
            <option value="" disabled>選択してください</option>
            <option value="1-20">1〜20件</option>
            <option value="21-50">21〜50件</option>
            <option value="51-100">51〜100件</option>
            <option value="101+">101件以上</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">現在の管理方法（任意）
          <input className={FIELD_CLASS} name="currentTool" maxLength={120} placeholder="Excel、kintone、基幹システムなど" />
        </label>
      </div>
      <button type="submit" disabled={status === "loading"} className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/30 disabled:cursor-wait disabled:opacity-60">
        {status === "loading" ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
        {status === "loading" ? "送信中…" : "14日間パイロットを相談する"}
      </button>
      <p className="text-xs leading-5 text-slate-500">送信によりプライバシーポリシーに同意したものとみなします。自動契約や自動課金は行いません。</p>
    </form>
  )
}
