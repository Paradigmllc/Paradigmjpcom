import type { Metadata } from "next"
import { QuoteRecoveryPasswordReset } from "@/components/quote-recovery/QuoteRecoveryPasswordReset"
import { QuoteRecoveryShell } from "@/components/quote-recovery/QuoteRecoveryShell"

export const metadata: Metadata = { title: "パスワード再設定 | Quote Recovery", robots: { index: false, follow: false } }

export default async function QuoteRecoveryResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  return <QuoteRecoveryShell compact><main className="min-h-[calc(100dvh-65px)] bg-slate-50 px-5 py-16 sm:px-8 sm:py-20"><QuoteRecoveryPasswordReset token={token} /></main></QuoteRecoveryShell>
}
