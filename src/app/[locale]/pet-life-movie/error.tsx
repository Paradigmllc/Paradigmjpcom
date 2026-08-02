"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function PetLifeMovieError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[pet-life-movie] page error", error) }, [error])
  return <main className="grid min-h-[70vh] place-items-center bg-paradigm-paper px-5"><div className="max-w-md text-center"><h1 className="font-display text-3xl">Something went wrong</h1><p className="my-5 text-sm text-paradigm-ink-soft">Your photos have not been deleted or published. Please retry this step.</p><Button onClick={reset}>Try again</Button></div></main>
}

