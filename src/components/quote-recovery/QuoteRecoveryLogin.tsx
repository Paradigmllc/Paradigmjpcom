"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react"
import { toast, Toaster } from "sonner"

type Mode = "login" | "signup"

type Props = {
  initialMode: Mode
  inviteToken?: string
  initialEmail?: string
}

function apiError(value: unknown): string {
  if (value && typeof value === "object" && "error" in value && typeof value.error === "string") return value.error
  return "処理を完了できませんでした"
}

const fieldClass = "mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"

export default function QuoteRecoveryLogin({ initialMode, inviteToken, initialEmail }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const body = mode === "login"
      ? { email: form.get("email"), password: form.get("password") }
      : {
          email: form.get("email"),
          password: form.get("password"),
          displayName: form.get("displayName"),
          organizationName: form.get("organizationName") || undefined,
          inviteToken,
        }
    setLoading(true)
    try {
      const response = await fetch(`/api/quote-recovery/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const result: unknown = await response.json()
      if (!response.ok || !result || typeof result !== "object" || !("ok" in result) || result.ok !== true) throw new Error(apiError(result))
      const redirect = "redirect" in result && typeof result.redirect === "string" ? result.redirect : "/ja/quote-recovery/app"
      toast.success(mode === "signup" ? "アカウントを作成しました" : "ログインしました")
      window.location.assign(redirect)
    } catch (error) {
      console.error("[quote-recovery/login-ui] submit failed:", error)
      toast.error(error instanceof Error ? error.message : "認証に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_100px_-45px_rgba(15,23,42,0.35)] lg:grid-cols-[0.9fr_1.1fr]">
      <Toaster richColors position="top-center" />
      <section className="bg-slate-950 p-8 text-white sm:p-12">
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/15 px-3 py-1.5 text-xs font-bold text-violet-300">
          <ShieldCheck className="size-4" aria-hidden="true" /> 業務データを組織単位で保護
        </div>
        <h1 className="mt-8 text-3xl font-bold tracking-tight sm:text-4xl">見積提出後の<br />回収漏れをなくす。</h1>
        <p className="mt-5 text-sm leading-7 text-slate-300">見積CSVの継続取込、案件履歴、担当者管理、優先順位、請求管理まで一つのワークスペースで運用できます。</p>
        <ul className="mt-8 space-y-4 text-sm text-slate-200">
          {["30日・60日・90日の放置を自動判定", "活動履歴と次回アクションを保存", "Stripe請求ポータルで契約管理"].map((item) => (
            <li key={item} className="flex gap-3"><span className="mt-1 flex size-5 items-center justify-center rounded-full bg-emerald-400/15 text-xs text-emerald-300">✓</span>{item}</li>
          ))}
        </ul>
      </section>
      <section className="p-7 sm:p-12">
        <div className="flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="認証方法">
          {(["login", "signup"] as const).map((item) => (
            <button key={item} type="button" role="tab" aria-selected={mode === item} onClick={() => setMode(item)} className={`min-h-11 flex-1 rounded-lg px-4 text-sm font-bold transition ${mode === item ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>
              {item === "login" ? "ログイン" : "新規登録"}
            </button>
          ))}
        </div>
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-slate-950">{mode === "login" ? "ワークスペースにログイン" : inviteToken ? "チームへの参加" : "契約アカウントを作成"}</h2>
          <p className="mt-2 text-sm text-slate-500">{mode === "login" ? "登録済みの認証情報を入力してください。" : inviteToken ? "招待先と同じメールアドレスで登録してください。" : "登録後、StarterまたはTeamを契約します。無料トライアルはありません。"}</p>
        </div>
        <form className="mt-7 space-y-5" onSubmit={submit}>
          {mode === "signup" && (
            <>
              <label className="block text-sm font-semibold text-slate-700">お名前<input className={fieldClass} name="displayName" required maxLength={100} autoComplete="name" /></label>
              {!inviteToken && <label className="block text-sm font-semibold text-slate-700">会社名<input className={fieldClass} name="organizationName" required maxLength={200} autoComplete="organization" /></label>}
            </>
          )}
          <label className="block text-sm font-semibold text-slate-700">業務用メール<input className={fieldClass} name="email" type="email" required maxLength={254} autoComplete="email" defaultValue={initialEmail} readOnly={Boolean(inviteToken && initialEmail)} /></label>
          <label className="block text-sm font-semibold text-slate-700">パスワード
            <span className="relative mt-2 block">
              <input className={`${fieldClass} mt-0 pr-12`} name="password" type={showPassword ? "text" : "password"} required minLength={mode === "signup" ? 12 : 1} maxLength={128} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
            </span>
          </label>
          {mode === "login" && <div className="text-right"><Link className="text-xs font-semibold text-violet-700 hover:underline" href="/ja/quote-recovery/reset">パスワードを忘れた方</Link></div>}
          {mode === "signup" && <p className="text-xs leading-5 text-slate-500">12文字以上、英大文字・英小文字・数字を含めてください。</p>}
          <button type="submit" disabled={loading} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60">
            {loading ? <LockKeyhole className="size-4 animate-pulse" /> : <ArrowRight className="size-4" />}{loading ? "処理中…" : mode === "login" ? "ログイン" : "アカウントを作成"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs leading-5 text-slate-500">登録により<Link className="underline" href="/ja/terms">利用規約</Link>と<Link className="underline" href="/ja/privacy">プライバシーポリシー</Link>に同意したものとみなします。</p>
      </section>
    </div>
  )
}
