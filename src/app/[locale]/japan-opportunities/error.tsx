"use client"

import { useEffect } from "react"
import { RefreshCw } from "lucide-react"
import { Toaster, toast } from "sonner"

export default function JapanOpportunitiesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[japan-opportunities] render failed:", error)
    toast.error("Japan opportunities could not be loaded.")
  }, [error])

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-paradigm-paper px-6 pt-24">
      <Toaster richColors position="top-center" />
      <div className="max-w-lg rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center md:p-12">
        <p className="paradigm-eyebrow text-red-600">LOAD ERROR</p>
        <h1 className="mt-4 font-display text-3xl font-semibold text-paradigm-ink">We could not load this Japan desk.</h1>
        <p className="mt-3 text-sm leading-7 text-paradigm-ink-soft">The error is visible to our team. You can retry without losing any submitted information.</p>
        <button type="button" onClick={reset} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-paradigm-ink px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-paper">
          <RefreshCw size={16} />Retry
        </button>
      </div>
    </main>
  )
}
