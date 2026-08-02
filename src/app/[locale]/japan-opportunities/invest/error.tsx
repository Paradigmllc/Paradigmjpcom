"use client"

import { useEffect } from "react"
import { toast } from "sonner"

export default function InvestorBriefError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[investor-briefs] page render failed:", error)
    toast.error("Investor briefs could not be loaded. Please try again.")
  }, [error])

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-paradigm-paper px-6 py-32">
      <div className="max-w-lg rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
        <h1 className="font-display text-3xl font-semibold text-paradigm-ink">Investor briefs are temporarily unavailable</h1>
        <p className="mt-4 text-sm leading-7 text-paradigm-ink-soft">The evidence catalog could not be loaded. No partial or stale investment content is being shown.</p>
        <button type="button" onClick={reset} className="mt-7 min-h-11 rounded-xl bg-paradigm-ink px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-paper hover:bg-paradigm-accent" aria-label="Retry loading investor briefs">Try again</button>
      </div>
    </main>
  )
}
