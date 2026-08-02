"use client"

import { useEffect } from "react"
import { toast, Toaster } from "sonner"

export default function QuoteRecoveryAppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[quote-recovery/app-page] render failed:", error)
    toast.error("ダッシュボードを読み込めませんでした")
  }, [error])
  return <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-5"><Toaster richColors position="top-center" /><div className="max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center"><h1 className="text-xl font-bold">ダッシュボードを読み込めませんでした</h1><p className="mt-3 text-sm text-slate-600">通信状態を確認して、もう一度お試しください。</p><button type="button" onClick={reset} className="mt-6 min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white">再読み込み</button></div></main>
}
