import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getQuoteRecoveryIdentity } from "@/lib/quote-recovery/auth"
import { QuoteRecoveryLogin } from "@/components/quote-recovery/QuoteRecoveryLogin"

export const metadata: Metadata = {
  title: "ログイン | Quote Recovery",
  description: "Quote Recoveryへのログインと新規契約",
  robots: { index: false, follow: false },
}

type Props = {
  searchParams: Promise<{ mode?: string; invite?: string; email?: string }>
}

export default async function QuoteRecoveryLoginPage({ searchParams }: Props) {
  const identity = await getQuoteRecoveryIdentity()
  if (identity) redirect("/ja/quote-recovery/app")
  const query = await searchParams
  return (
    <main className="min-h-dvh bg-slate-50 px-5 pb-20 pt-32 sm:px-8">
      <QuoteRecoveryLogin
        initialMode={query.mode === "signup" ? "signup" : "login"}
        inviteToken={query.invite}
        initialEmail={query.email}
      />
    </main>
  )
}
