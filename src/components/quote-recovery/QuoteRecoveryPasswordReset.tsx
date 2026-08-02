"use client"

import { useState } from "react"
import Link from "next/link"
import { KeyRound, Mail } from "lucide-react"
import { toast, Toaster } from "sonner"

function message(value: unknown): string { return value && typeof value === "object" && "error" in value && typeof value.error === "string" ? value.error : "処理に失敗しました" }

export function QuoteRecoveryPasswordReset({ token }: { token?: string }) {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setLoading(true)
    try {
      const response = await fetch(token ? "/api/quote-recovery/auth/reset-password" : "/api/quote-recovery/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token ? { token, password: form.get("password") } : { email: form.get("email") }),
      })
      const body: unknown = await response.json()
      if (!response.ok) throw new Error(message(body))
      if (token) {
        toast.success("パスワードを更新しました")
        window.setTimeout(() => window.location.assign("/ja/quote-recovery/login"), 800)
      } else setSent(true)
    } catch (error) {
      console.error("[quote-recovery/reset-ui] failed:", error)
      toast.error(error instanceof Error ? error.message : "処理に失敗しました")
    } finally { setLoading(false) }
  }
  return <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10"><Toaster richColors position="top-center" /><div className="flex size-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">{token ? <KeyRound /> : <Mail />}</div><h1 className="mt-6 text-2xl font-bold">{token ? "新しいパスワードを設定" : "パスワードを再設定"}</h1><p className="mt-3 text-sm leading-6 text-slate-600">{sent ? "登録済みの場合、1時間有効な再設定メールを送信しました。" : token ? "12文字以上、英大文字・英小文字・数字を含むパスワードを設定してください。" : "登録した業務用メールアドレスを入力してください。"}</p>{!sent && <form onSubmit={submit} className="mt-6">{token ? <input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" className="h-12 w-full rounded-xl border border-slate-300 px-4" /> : <input name="email" type="email" required autoComplete="email" className="h-12 w-full rounded-xl border border-slate-300 px-4" />}<button type="submit" disabled={loading} className="mt-4 min-h-12 w-full rounded-xl bg-violet-600 px-5 text-sm font-bold text-white disabled:opacity-60">{loading ? "処理中…" : token ? "パスワードを更新" : "再設定メールを送る"}</button></form>}<Link href="/ja/quote-recovery/login" className="mt-6 inline-block text-sm font-semibold text-violet-700 hover:underline">ログインへ戻る</Link></div>
}
