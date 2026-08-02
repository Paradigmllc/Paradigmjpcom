"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Toaster, toast } from "sonner"
import type { QuoteRecoveryIdentity } from "@/lib/quote-recovery/auth"
import { QuoteRecoveryBillingGate } from "./QuoteRecoveryBilling"

export function QuoteRecoveryUnpaidApp({ identity, checkoutResult }: { identity: QuoteRecoveryIdentity; checkoutResult?: string }) {
  const router = useRouter()
  useEffect(() => {
    if (checkoutResult !== "success") return
    toast.success("決済を受け付けました。契約状態を確認しています。")
    const timer = window.setTimeout(() => router.refresh(), 2500)
    return () => window.clearTimeout(timer)
  }, [checkoutResult, router])

  async function logout() {
    await fetch("/api/quote-recovery/auth/logout", { method: "POST" })
    window.location.assign("/ja/quote-recovery/login")
  }

  return <main className="min-h-dvh bg-slate-50 px-5 pb-20 pt-28 sm:px-8"><Toaster richColors position="top-center" /><div className="mx-auto mb-7 flex max-w-5xl items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4"><div><p className="text-xs font-semibold text-slate-500">Quote Recovery</p><p className="font-bold">{identity.organization.name}</p></div><button type="button" onClick={() => void logout()} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"><LogOut className="size-4" />ログアウト</button></div><QuoteRecoveryBillingGate status={identity.organization.subscriptionStatus} /></main>
}
