"use client"

import { useEffect } from "react"
import { toast } from "sonner"

export default function ContentApiError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[content-api-page] render failed:", error)
    toast.error("Content APIページを読み込めませんでした。")
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center bg-paradigm-paper px-6">
      <div className="max-w-lg rounded-3xl border border-red-300/60 bg-red-50 p-8 text-center">
        <h1 className="font-display text-3xl font-semibold text-paradigm-ink">Content API is temporarily unavailable</h1>
        <p className="mt-4 text-sm leading-7 text-paradigm-ink-soft">The error has been surfaced to the operator. You can retry this page now.</p>
        <button type="button" onClick={reset} className="mt-7 min-h-11 rounded-xl bg-paradigm-ink px-6 text-sm font-semibold text-paradigm-paper" aria-label="Retry Content API page">Retry</button>
      </div>
    </main>
  )
}
