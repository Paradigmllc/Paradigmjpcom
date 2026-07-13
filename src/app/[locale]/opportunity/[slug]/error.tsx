"use client"

import { useEffect } from "react"

export default function OpportunityError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[opportunity-page] render failed:", error)
  }, [error])

  return (
    <main className="flex min-h-dvh items-center justify-center bg-zinc-50 px-5">
      <div className="max-w-lg rounded-xl border border-red-200 bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold">This opportunity brief is temporarily unavailable.</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">The error has been recorded. Please retry, or contact Paradigm if it continues.</p>
        <button type="button" onClick={reset} className="mt-6 rounded-lg bg-zinc-950 px-5 py-3 text-sm font-semibold text-white">Retry</button>
      </div>
    </main>
  )
}
