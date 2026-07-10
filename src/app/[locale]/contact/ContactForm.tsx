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
import { useSearchParams } from "next/navigation"
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

const EMPTY_FORM = {
  name: "",
  company: "",
  email: "",
  phone: "",
  message: "",
  budget: "",
  companyWebsite: "",
  companyCountry: "",
  decisionAuthority: "",
  approvalTimeline: "",
  desiredLaunch: "",
  setupFeeAcknowledged: false,
}

export function ContactForm() {
  const t = useTranslations("contactForm")
  const locale = useLocale()
  const searchParams = useSearchParams()
  const isJapanEntry = searchParams.get("intent") === "japan-entry"

  const servicesList = t.raw("servicesList") as string[]
  const budgetOptions = t.raw("budgetOptions") as BudgetOption[]

  const [form, setForm] = useState({ ...EMPTY_FORM })
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
        body: JSON.stringify({
          ...form,
          intent: isJapanEntry ? "japan-entry" : "general",
          services: isJapanEntry ? ["Japan Entry Package"] : services,
          locale,
          turnstileToken,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus("success")
        setMsg(data.message || t("successDefault"))
        setForm({ ...EMPTY_FORM })
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
      {isJapanEntry && (
        <div className="rounded-2xl border border-paradigm-accent/30 bg-paradigm-accent/5 p-5 sm:p-6">
          <p className="paradigm-eyebrow text-paradigm-accent mb-2">Japan Entry Application</p>
          <p className="font-display text-[22px] leading-tight text-paradigm-ink mb-2">$12,000 fixed setup</p>
          <p className="text-[13px] leading-[1.7] text-paradigm-ink-soft">
            $0/month for the first six months, then $995/month. Apply only if your company can make a final decision within seven days and assign one launch owner.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block paradigm-eyebrow text-paradigm-ink-soft mb-2">
            {t("name")} <span className="text-pink-500">{t("required")}</span>
          </label>
          <input type="text" required autoComplete="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={FIELD_BASE} placeholder={t("namePh")} />
        </div>
        <div>
          <label className="block paradigm-eyebrow text-paradigm-ink-soft mb-2">
            {t("company")} {isJapanEntry && <span className="text-pink-500">{t("required")}</span>}
          </label>
          <input type="text" required={isJapanEntry} autoComplete="organization" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} className={FIELD_BASE} placeholder={t("companyPh")} />
        </div>
      </div>

      {isJapanEntry && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="companyWebsite" className="block paradigm-eyebrow text-paradigm-ink-soft mb-2">
              Company website <span className="text-pink-500">*</span>
            </label>
            <input id="companyWebsite" type="url" required autoComplete="url" inputMode="url" value={form.companyWebsite} onChange={(e) => setForm((f) => ({ ...f, companyWebsite: e.target.value }))} className={FIELD_BASE} placeholder="https://example.com" />
          </div>
          <div>
            <label htmlFor="companyCountry" className="block paradigm-eyebrow text-paradigm-ink-soft mb-2">
              Headquarters country <span className="text-pink-500">*</span>
            </label>
            <input id="companyCountry" type="text" required autoComplete="country-name" value={form.companyCountry} onChange={(e) => setForm((f) => ({ ...f, companyCountry: e.target.value }))} className={FIELD_BASE} placeholder="United States, United Kingdom, Australia..." />
          </div>
        </div>
      )}

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

      {!isJapanEntry && (
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
      )}

      {isJapanEntry && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="decisionAuthority" className="block paradigm-eyebrow text-paradigm-ink-soft mb-2">
              Final decision authority <span className="text-pink-500">*</span>
            </label>
            <select id="decisionAuthority" required value={form.decisionAuthority} onChange={(e) => setForm((f) => ({ ...f, decisionAuthority: e.target.value }))} className={FIELD_BASE}>
              <option value="">Select one</option>
              <option value="final-decision-maker">I am the final decision-maker</option>
              <option value="direct-access">I can secure final approval directly</option>
              <option value="not-final">I need several internal approvals</option>
            </select>
          </div>
          <div>
            <label htmlFor="approvalTimeline" className="block paradigm-eyebrow text-paradigm-ink-soft mb-2">
              $12,000 approval timeline <span className="text-pink-500">*</span>
            </label>
            <select id="approvalTimeline" required value={form.approvalTimeline} onChange={(e) => setForm((f) => ({ ...f, approvalTimeline: e.target.value }))} className={FIELD_BASE}>
              <option value="">Select one</option>
              <option value="within-7-days">Within seven days</option>
              <option value="within-30-days">Within 30 days</option>
              <option value="procurement-required">Procurement or board approval required</option>
              <option value="not-ready">Not ready to approve</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="desiredLaunch" className="block paradigm-eyebrow text-paradigm-ink-soft mb-2">
              Desired Japan launch <span className="text-pink-500">*</span>
            </label>
            <select id="desiredLaunch" required value={form.desiredLaunch} onChange={(e) => setForm((f) => ({ ...f, desiredLaunch: e.target.value }))} className={FIELD_BASE}>
              <option value="">Select one</option>
              <option value="this-month">Start this month</option>
              <option value="within-30-days">Start within 30 days</option>
              <option value="within-60-days">Start within 60 days</option>
              <option value="later">Later or exploratory</option>
            </select>
          </div>
        </div>
      )}

      <div>
        <label className="block paradigm-eyebrow text-paradigm-ink-soft mb-2">
          {isJapanEntry ? "What are you launching in Japan?" : t("message")} <span className="text-pink-500">{t("required")}</span>
        </label>
        <textarea required rows={5} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className={`${FIELD_BASE} resize-none`} placeholder={isJapanEntry ? "Product, current markets, Japanese demand signals, and why the launch matters now" : t("messagePh")} />
      </div>

      {!isJapanEntry && (
        <div>
          <label className="block paradigm-eyebrow text-paradigm-ink-soft mb-2">{t("budget")}</label>
          <select value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} className={FIELD_BASE}>
            {budgetOptions.map((o) => (
              <option key={o.v} value={o.v}>{o.l}</option>
            ))}
          </select>
        </div>
      )}

      {isJapanEntry && (
        <label className="flex items-start gap-3 rounded-xl border border-paradigm-line p-4 text-[13px] leading-[1.65] text-paradigm-ink-soft cursor-pointer">
          <input
            type="checkbox"
            required
            checked={form.setupFeeAcknowledged}
            onChange={(e) => setForm((f) => ({ ...f, setupFeeAcknowledged: e.target.checked }))}
            className="mt-1 accent-paradigm-accent"
          />
          <span>I understand that the Japan Entry setup fee is fixed at $12,000 and is paid before the 21-business-day launch sequence begins.</span>
        </label>
      )}

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
        <span className="relative z-10">{status === "loading" ? t("submitting") : isJapanEntry ? "Submit Japan Entry Application" : t("submit")}</span>
      </button>

      <p className="text-[11px] text-paradigm-ink-mute text-center leading-[1.6]">
        {t("privacy")}
        <Link href="/privacy" className="underline hover:text-paradigm-accent ml-1">{t("privacyLink")}</Link>
        {t("privacySuffix")}
      </p>
    </form>
  )
}
