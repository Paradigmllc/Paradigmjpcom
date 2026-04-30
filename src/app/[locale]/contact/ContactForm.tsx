"use client"

/**
 * ContactForm — bilingual (P18-D-11). Receives `locale` prop, switches all
 * labels / placeholders / messages between JA and EN.
 */

import { useState } from "react"
import { Link } from "@/i18n/routing"

const FIELD_BASE =
  "w-full px-0 py-3 bg-transparent border-b border-paradigm-line focus:border-paradigm-accent outline-none transition-colors text-[15px] text-paradigm-ink placeholder:text-paradigm-ink-mute"

interface Props { locale?: "ja" | "en" | string }

export function ContactForm({ locale = "ja" }: Props) {
  const isJa = locale === "ja"
  const T = isJa
    ? {
        name: "お名前", namePh: "山田 太郎",
        company: "会社名", companyPh: "株式会社○○",
        email: "メールアドレス", emailPh: "info@example.com",
        phone: "電話番号", phonePh: "090-1234-5678",
        services: "ご興味のあるサービス",
        servicesList: ["Web制作", "MEO対策", "SEO/GEO対策", "AI導入支援"],
        message: "ご相談内容", messagePh: "御社の課題やご要望をお聞かせください。",
        budget: "ご予算",
        budgetOptions: [
          { v: "", l: "選択してください" },
          { v: "~30万円", l: "~30万円" },
          { v: "30~50万円", l: "30~50万円" },
          { v: "50~100万円", l: "50~100万円" },
          { v: "100万円以上", l: "100万円以上" },
          { v: "未定", l: "未定・相談したい" },
        ],
        submit: "送信する", submitting: "送信中…",
        success: "送信完了", successDefault: "ご連絡ありがとうございます。1営業日以内にご返信いたします。",
        errorDefault: "送信に失敗しました", errorNetwork: "ネットワークエラーが発生しました",
        privacy: "送信いただいた内容は",
        privacyLink: "プライバシーポリシー",
        privacySuffix: "に基づき適切に管理いたします。",
        required: "*",
      }
    : {
        name: "Your name", namePh: "Jane Smith",
        company: "Company", companyPh: "Acme Inc.",
        email: "Email", emailPh: "you@example.com",
        phone: "Phone", phonePh: "+1 555 123 4567",
        services: "Services you're interested in",
        servicesList: ["Web Development", "MEO (Local SEO)", "SEO / GEO", "AI Integration"],
        message: "Message", messagePh: "Tell us about your challenges and goals.",
        budget: "Budget",
        budgetOptions: [
          { v: "", l: "Please select" },
          { v: "~$2K", l: "Up to $2K" },
          { v: "$2-5K", l: "$2K – $5K" },
          { v: "$5-10K", l: "$5K – $10K" },
          { v: "$10K+", l: "$10K+" },
          { v: "未定", l: "Not sure / want to discuss" },
        ],
        submit: "Send", submitting: "Sending…",
        success: "Sent", successDefault: "Thanks for reaching out. We'll reply within one business day.",
        errorDefault: "Failed to send", errorNetwork: "A network error occurred",
        privacy: "Submissions are handled in accordance with our",
        privacyLink: "privacy policy",
        privacySuffix: ".",
        required: "*",
      }

  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", message: "", budget: "" })
  const [services, setServices] = useState<string[]>([])
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [msg, setMsg] = useState("")

  const toggleService = (s: string) =>
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, services, locale }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus("success")
        setMsg(data.message || T.successDefault)
        setForm({ name: "", company: "", email: "", phone: "", message: "", budget: "" })
        setServices([])
      } else {
        setStatus("error")
        setMsg(data.error || T.errorDefault)
      }
    } catch {
      setStatus("error")
      setMsg(T.errorNetwork)
    }
  }

  if (status === "success") {
    return (
      <div className="text-center py-12 paradigm-glass rounded-2xl p-8 paradigm-glow-md">
        <div className="font-display text-[40px] text-paradigm-accent mb-4">✓</div>
        <h3 className="font-display text-[22px] md:text-[26px] leading-[1.2] text-paradigm-ink mb-3 tracking-[-0.015em]">
          {T.success}
        </h3>
        <p className="text-[14px] text-paradigm-ink-soft leading-[1.7]">{msg}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block paradigm-eyebrow text-paradigm-ink-soft mb-2">
            {T.name} <span className="text-pink-500">{T.required}</span>
          </label>
          <input type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={FIELD_BASE} placeholder={T.namePh} />
        </div>
        <div>
          <label className="block paradigm-eyebrow text-paradigm-ink-soft mb-2">{T.company}</label>
          <input type="text" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} className={FIELD_BASE} placeholder={T.companyPh} />
        </div>
      </div>

      <div>
        <label className="block paradigm-eyebrow text-paradigm-ink-soft mb-2">
          {T.email} <span className="text-pink-500">{T.required}</span>
        </label>
        <input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={FIELD_BASE} placeholder={T.emailPh} />
      </div>

      <div>
        <label className="block paradigm-eyebrow text-paradigm-ink-soft mb-2">{T.phone}</label>
        <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={FIELD_BASE} placeholder={T.phonePh} />
      </div>

      <div>
        <label className="block paradigm-eyebrow text-paradigm-ink-soft mb-3">{T.services}</label>
        <div className="grid grid-cols-2 gap-2">
          {T.servicesList.map((s) => (
            <label
              key={s}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-[12px] ${services.includes(s) ? "border-paradigm-accent bg-paradigm-accent/8 text-paradigm-ink" : "border-paradigm-line text-paradigm-ink-soft hover:border-paradigm-ink"}`}
            >
              <input type="checkbox" checked={services.includes(s)} onChange={() => toggleService(s)} className="accent-paradigm-accent" />
              <span>{s}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block paradigm-eyebrow text-paradigm-ink-soft mb-2">
          {T.message} <span className="text-pink-500">{T.required}</span>
        </label>
        <textarea required rows={5} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className={`${FIELD_BASE} resize-none`} placeholder={T.messagePh} />
      </div>

      <div>
        <label className="block paradigm-eyebrow text-paradigm-ink-soft mb-2">{T.budget}</label>
        <select value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} className={FIELD_BASE}>
          {T.budgetOptions.map((o) => (
            <option key={o.v} value={o.v}>{o.l}</option>
          ))}
        </select>
      </div>

      {status === "error" && (
        <div className="paradigm-glass rounded-xl p-4 border border-pink-500/40 paradigm-glow-sm">
          <p className="text-[13px] text-pink-500">{msg}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="group relative w-full inline-flex items-center justify-center gap-2 bg-paradigm-ink text-paradigm-paper py-3.5 rounded-xl text-[12px] tracking-[0.14em] uppercase font-semibold paradigm-glow-md hover:paradigm-glow-lg disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden transition-all"
      >
        <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-pink-300/0 via-paradigm-glow/40 to-paradigm-tech/0 bg-[length:200%_100%] animate-[gradientShift_2.5s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="relative z-10">{status === "loading" ? T.submitting : T.submit}</span>
      </button>

      <p className="text-[11px] text-paradigm-ink-mute text-center leading-[1.6]">
        {T.privacy}
        <Link href="/privacy" className="underline hover:text-paradigm-accent ml-1">{T.privacyLink}</Link>
        {T.privacySuffix}
      </p>
    </form>
  )
}
