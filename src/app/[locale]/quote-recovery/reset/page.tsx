import type { Metadata } from "next"
import { QuoteRecoveryPasswordReset } from "@/components/quote-recovery/QuoteRecoveryPasswordReset"

export const metadata: Metadata = { title: "パスワード再設定 | Quote Recovery", robots: { index: false, follow: false } }

export default async function QuoteRecoveryResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  return <main className="min-h-dvh bg-slate-50 px-5 pb-20 pt-32 sm:px-8"><QuoteRecoveryPasswordReset token={token} /></main>
}
