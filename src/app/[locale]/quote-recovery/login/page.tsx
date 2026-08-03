"use client"

import { use } from "react"
import QuoteRecoveryLogin from "@/components/quote-recovery/QuoteRecoveryLogin"
import { QuoteRecoveryShell } from "@/components/quote-recovery/QuoteRecoveryShell"

type Props = {
  searchParams: Promise<{ mode?: string; invite?: string; email?: string }>
}

export default function QuoteRecoveryLoginPage({ searchParams }: Props) {
  const query = use(searchParams)
  return (
    <QuoteRecoveryShell compact>
      <main className="min-h-[calc(100dvh-65px)] bg-slate-50 px-5 py-16 sm:px-8 sm:py-20">
        <QuoteRecoveryLogin
          initialMode={query.mode === "signup" ? "signup" : "login"}
          inviteToken={query.invite}
          initialEmail={query.email}
        />
      </main>
    </QuoteRecoveryShell>
  )
}
