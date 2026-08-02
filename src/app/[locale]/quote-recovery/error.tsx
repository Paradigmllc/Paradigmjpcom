"use client"

import { useEffect } from "react"
import { toast, Toaster } from "sonner"

export default function QuoteRecoveryError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[quote-recovery/page] render failed:", error)
    toast.error("ページを読み込めませんでした")
  }, [error])
  return <main className="flex min-h-[70vh] items-center justify-center bg-white px-5"><Toaster richColors position="top-center" /><div className="max-w-md text-center"><h1 className="text-2xl font-bold text-slate-950">読み込みに失敗しました</h1><p className="mt-4 text-sm leading-6 text-slate-600">通信状況を確認して、もう一度お試しください。</p><button type="button" onClick={reset} className="mt-7 min-h-11 rounded-xl bg-violet-600 px-5 py-2 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/30">再読み込み</button></div></main>
}
