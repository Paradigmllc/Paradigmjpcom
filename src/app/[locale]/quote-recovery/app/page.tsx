import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getQuoteRecoveryIdentity, quoteRecoveryHasPaidAccess } from "@/lib/quote-recovery/auth"
import { loadQuoteRecoveryDashboard } from "@/lib/quote-recovery/dashboard"
import { QuoteRecoveryApp, quoteRecoveryTab } from "@/components/quote-recovery/QuoteRecoveryApp"
import { QuoteRecoveryUnpaidApp } from "@/components/quote-recovery/QuoteRecoveryUnpaidApp"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "ダッシュボード | Quote Recovery",
  robots: { index: false, follow: false },
}

type Props = { searchParams: Promise<{ tab?: string; checkout?: string }> }

export default async function QuoteRecoveryAppPage({ searchParams }: Props) {
  const identity = await getQuoteRecoveryIdentity()
  if (!identity) redirect("/ja/quote-recovery/login")
  const query = await searchParams
  if (!quoteRecoveryHasPaidAccess(identity)) {
    return <QuoteRecoveryUnpaidApp identity={identity} checkoutResult={query.checkout} />
  }
  const data = await loadQuoteRecoveryDashboard(identity)
  return <QuoteRecoveryApp identity={identity} data={data} initialTab={quoteRecoveryTab(query.tab)} />
}
