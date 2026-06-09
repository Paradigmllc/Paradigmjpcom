"use client"

/**
 * ContactForm — 12-locale i18n対応 (AE-PHP-2).
 *
 * 旧実装: isJa ? JA_T : EN_T の二択ハードコード → ja/en の2言語しか対応不可。
 * 新実装: useTranslations("contactForm") + useLocale() で12言語全てに対応。
 *   - UI文字列は messages/{locale}.json:contactForm から取得
 *   - servicesList / budgetOptions は t.raw() で配列取得
 *   - locale は useLocale() で取得し form submit payload に添付
 *
 * 2026-05-01 audit: Cloudflare Turnstile invisible widget 統合。
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY が設定されている時のみ widget 表示。
 *   未設定時は完全にスキップ (CAPTCHA なしで送信可)。
 */

import { useEffect, useRef, useState } from "react"
import Script from "next/script"
import { Link } from "@/i18n/routing"
import { useLocale, useTranslations } from "next-intl"

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          "error-callback"?: () => void
          "expired-callback"?: () => void
          theme?: "light" | "dark" | "auto"
          size?: "normal" | "compact" | "invisible"
        },
      ) => string
      reset: (widgetId?: string) => void
    }
  }
}

const FIELD_BASE =
  "w-full px-0 py-3 bg-transparent border-b border-paradigm-line focus:border-paradigm-accent outline-none transition-colors text-[15px] text-paradigm-ink placeholder:text-paradigm-ink-mute"

interface BudgetOption { v: string; l: string }

export function ContactForm() {
  const t = useTranslations("contactForm")
  const locale = useLocale()

  const servicesList = t.raw("servicesList") as string[]
  const budgetOptions = t.raw("budgetOptions") as BudgetOption[]

  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", message: "", budget: "" })
  const [services, setServices] = useState<string[]>([])
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [msg, setMsg] = useState("")
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<HTMLDivElement>(null)
  const turnstileWidgetIdRef = useRef<string | null>(null)

  // Turnstile widget 描画 (TURNSTILE_SITE_KEY 設定時のみ)
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return
    if (!turnstileRef.current) return
    let mounted = true
    const tryRender = () => {
      if (!mounted) return
      const ts = window.turnstile
      if (!ts || !turnstileRef.current) {
        setTimeout(tryRender, 200)
        return
      }
      if (turnstileWidgetIdRef.current) return
      turnstileWidgetIdRef.current = ts.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(null),
        "error-callback": () => setTurnstileToken(null),
        theme: "light",
        size: "normal",
      })
    }
    tryRender()
    return () => {
      mounted = false
    }
  }, [])

  const toggleService = (s: string) =>
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, services, locale, turnstileToken }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus("success")
        setMsg(data.message || t("successDefault"))
        setForm({ name: "", company: "", email: "", phone: "", message: "", budget: "" })
        setServices([])
      } else {
        setStatus("error")
        setMsg(data.error || t("errorDefault"))
      }
    } catch (e) {
      console.error("[ContactForm] form submission failed:", e)
      setStatus("error")
      setMsg(t("errorNetwork"))
    }
  }

  if (status === "success") {
    return (
      <div className="text-center py-12 paradigm-glass rounded-2xl p-8 paradigm-glow-md">
        <div className="font-display text-[40px] text-paradigm-accent mb-4">✓</div>
        <h3 className="font-display text-[22px] md:text-[26px] leading-[1.2] text-paradigm-ink mb-3 tracking-[-0.015em]">
          {t("success")}
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
            {t("name")} <span className="text-pink-500">{t("required")}</span>
          </label>
          <input type="text" required autoComplete="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={FIELD_BASE} placeholder={t("namePh")} />
        </div>
        <div>
          <label className="block paradigm-eyebrow text-paradigm-ink-soft mb-2">{t("company")}</label>
          <input type="text" autoComplete="organization" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} className={FIELD_BASE} placeholder={t("companyPh")} />
        </div>
      </div>

      <div>
        <label className="block paradigm-eyebrow text-paradigm-ink-soft mb-2">
          {t("email")} <span className="text-pink-500">{t("required")}</span>
        </label>
        <input type="email" required autoComplete="email" inputMode="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={FIELD_BASE} placeholder={t("emailPh")} />
      </div>

      <div>
        <label className="block paradigm-eyebrow text-paradigm-ink-soft mb-2">{t("phone")}</label>
        <input type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={FIELD_BASE} placeholder={t("phonePh")} />
      </div>

      <div>
        <label className="block paradigm-eyebrow text-paradigm-ink-soft mb-3">{t("services")}</label>
        <div className="grid grid-cols-2 gap-2">
          {servicesList.map((s) => (
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
          {t("message")} <span className="text-pink-500">{t("required")}</span>
        </label>
        <textarea required rows={5} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className={`${FIELD_BASE} resize-none`} placeholder={t("messagePh")} />
      </div>

      <div>
        <label className="block paradigm-eyebrow text-paradigm-ink-soft mb-2">{t("budget")}</label>
        <select value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} className={FIELD_BASE}>
          {budgetOptions.map((o) => (
            <option key={o.v} value={o.v}>{o.l}</option>
          ))}
        </select>
      </div>

      {/* Cloudflare Turnstile (TURNSTILE_SITE_KEY 設定時のみ表示) */}
      {TURNSTILE_SITE_KEY && (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="afterInteractive"
            async
            defer
          />
          <div ref={turnstileRef} className="flex justify-center" aria-label="CAPTCHA" />
        </>
      )}

      {status === "error" && (
        <div className="paradigm-glass rounded-xl p-4 border border-pink-500/40 paradigm-glow-sm">
          <p className="text-[13px] text-pink-500">{msg}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={status === "loading" || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)}
        className="group relative w-full inline-flex items-center justify-center gap-2 bg-paradigm-ink text-paradigm-paper py-3.5 rounded-xl text-[12px] tracking-[0.14em] uppercase font-semibold paradigm-glow-md hover:paradigm-glow-lg disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden transition-all"
      >
        <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-pink-300/0 via-paradigm-glow/40 to-paradigm-tech/0 bg-[length:200%_100%] animate-[gradientShift_2.5s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="relative z-10">{status === "loading" ? t("submitting") : t("submit")}</span>
      </button>

      <p className="text-[11px] text-paradigm-ink-mute text-center leading-[1.6]">
        {t("privacy")}
        <Link href="/privacy" className="underline hover:text-paradigm-accent ml-1">{t("privacyLink")}</Link>
        {t("privacySuffix")}
      </p>
    </form>
  )
}
