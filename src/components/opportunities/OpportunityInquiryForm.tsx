"use client"

import Script from "next/script"
import { useEffect, useRef, useState } from "react"
import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react"
import { Toaster, toast } from "sonner"
import { Link } from "@/i18n/routing"
import type { OpportunityBrandSlug } from "@/lib/opportunities/brands"

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""
const FIELD_CLASS =
  "w-full rounded-xl border border-paradigm-line bg-paradigm-paper-card/70 px-4 py-3 text-[14px] text-paradigm-ink outline-none transition focus:border-paradigm-accent focus:ring-2 focus:ring-paradigm-accent/15"

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      callback: (token: string) => void
      "error-callback": () => void
      "expired-callback": () => void
      theme: "light" | "dark" | "auto"
    },
  ) => string
  reset: (widgetId?: string) => void
}

interface FormCopy {
  eyebrow: string
  title: string
  description: string
  name: string
  email: string
  company: string
  country: string
  website: string
  inquiryType: string
  budget: string
  timeline: string
  requirements: string
  submit: string
  submitting: string
  privacyPrefix: string
  privacyLink: string
  successTitle: string
  successMessage: string
  errorMessage: string
}

const FORM_COPY: Record<"ja" | "en", FormCopy> = {
  en: {
    eyebrow: "START WITH A DECISION",
    title: "Tell us what you need to complete in Japan",
    description: "We review fit, missing information and the right first paid scope. You receive a concrete next step within one business day.",
    name: "Your name",
    email: "Work email",
    company: "Company",
    country: "Country / region",
    website: "Company website (optional)",
    inquiryType: "What do you need?",
    budget: "Working budget",
    timeline: "Target timing",
    requirements: "Requirements, constraints and desired outcome",
    submit: "Request a scoped next step",
    submitting: "Sending securely…",
    privacyPrefix: "By submitting, you agree to our",
    privacyLink: "privacy policy",
    successTitle: "Your Japan opportunity is in the review queue.",
    successMessage: "We will reply within one business day with the most useful next step.",
    errorMessage: "We could not send your inquiry. Please review the fields and try again.",
  },
  ja: {
    eyebrow: "意思決定から始める",
    title: "日本で実現したい取引を教えてください",
    description: "適合性、不足情報、最初に切り出すべき有料スコープを確認し、1営業日以内に具体的な次の行動をご案内します。",
    name: "お名前",
    email: "業務用メール",
    company: "会社名",
    country: "国・地域",
    website: "会社Webサイト（任意）",
    inquiryType: "必要な支援",
    budget: "想定予算",
    timeline: "希望時期",
    requirements: "要件・制約・実現したい成果",
    submit: "具体的な次の進め方を相談する",
    submitting: "安全に送信中…",
    privacyPrefix: "送信により",
    privacyLink: "プライバシーポリシー",
    successTitle: "日本案件の確認キューに登録しました。",
    successMessage: "1営業日以内に、最も有用な次の進め方をご連絡します。",
    errorMessage: "送信できませんでした。入力内容を確認して、もう一度お試しください。",
  },
}

const SELECT_COPY = {
  en: {
    budget: [
      ["under-5k", "Under $5,000"],
      ["5k-15k", "$5,000–15,000"],
      ["15k-50k", "$15,000–50,000"],
      ["50k-plus", "$50,000+"],
      ["not-sure", "Not sure yet"],
    ],
    timeline: [["now", "Immediately"], ["30-days", "Within 30 days"], ["90-days", "Within 90 days"], ["researching", "Researching options"]],
  },
  ja: {
    budget: [["under-5k", "$5,000未満"], ["5k-15k", "$5,000〜15,000"], ["15k-50k", "$15,000〜50,000"], ["50k-plus", "$50,000以上"], ["not-sure", "未定"]],
    timeline: [["now", "すぐに"], ["30-days", "30日以内"], ["90-days", "90日以内"], ["researching", "情報収集中"]],
  },
} as const

function responseError(data: unknown, fallback: string): string {
  if (typeof data !== "object" || data === null || !("error" in data)) return fallback
  return typeof data.error === "string" ? data.error : fallback
}

export function OpportunityInquiryForm({
  brand,
  brandName,
  inquiryTypes,
  locale,
}: {
  brand: OpportunityBrandSlug
  brandName: string
  inquiryTypes: string[]
  locale: string
}) {
  const language = locale === "ja" ? "ja" : "en"
  const copy = FORM_COPY[language]
  const selects = SELECT_COPY[language]
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileContainerRef = useRef<HTMLDivElement>(null)
  const turnstileWidgetRef = useRef<string | null>(null)

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !turnstileContainerRef.current) return
    let mounted = true
    const renderWidget = () => {
      if (!mounted || turnstileWidgetRef.current || !turnstileContainerRef.current) return
      const api = (window as Window & { turnstile?: TurnstileApi }).turnstile
      if (!api) {
        window.setTimeout(renderWidget, 200)
        return
      }
      turnstileWidgetRef.current = api.render(turnstileContainerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: setTurnstileToken,
        "error-callback": () => setTurnstileToken(null),
        "expired-callback": () => setTurnstileToken(null),
        theme: "auto",
      })
    }
    renderWidget()
    return () => {
      mounted = false
    }
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    setStatus("loading")
    const form = new FormData(formElement)
    const payload = {
      brand,
      inquiryType: form.get("inquiryType"),
      name: form.get("name"),
      email: form.get("email"),
      company: form.get("company"),
      country: form.get("country"),
      website: form.get("website"),
      budget: form.get("budget"),
      timeline: form.get("timeline"),
      message: form.get("message"),
      websiteConfirmation: form.get("websiteConfirmation"),
      locale,
      turnstileToken,
    }

    try {
      const response = await fetch("/api/opportunity-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data: unknown = await response.json()
      if (!response.ok) throw new Error(responseError(data, copy.errorMessage))
      setStatus("success")
      toast.success(copy.successTitle)
      formElement.reset()
    } catch (error) {
      console.error("[OpportunityInquiryForm] submission failed:", error)
      setStatus("error")
      toast.error(error instanceof Error ? error.message : copy.errorMessage)
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-3xl border border-emerald-500/25 bg-emerald-500/5 p-8 text-center md:p-12">
        <CheckCircle2 className="mx-auto mb-5 text-emerald-500" size={42} strokeWidth={1.5} />
        <h2 className="font-display text-2xl font-semibold text-paradigm-ink md:text-3xl">{copy.successTitle}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-paradigm-ink-soft">{copy.successMessage}</p>
      </div>
    )
  }

  return (
    <div id="inquiry" className="scroll-mt-28 rounded-3xl border border-paradigm-line bg-paradigm-paper-card/80 p-6 shadow-2xl shadow-paradigm-accent/5 md:p-10">
      <Toaster richColors position="top-center" />
      {TURNSTILE_SITE_KEY && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />}
      <p className="paradigm-eyebrow text-paradigm-accent">{copy.eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.025em] text-paradigm-ink md:text-4xl">{copy.title}</h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-paradigm-ink-soft">{copy.description}</p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={copy.name}><input className={FIELD_CLASS} name="name" autoComplete="name" required /></Field>
          <Field label={copy.email}><input className={FIELD_CLASS} name="email" type="email" autoComplete="email" required /></Field>
          <Field label={copy.company}><input className={FIELD_CLASS} name="company" autoComplete="organization" required /></Field>
          <Field label={copy.country}><input className={FIELD_CLASS} name="country" autoComplete="country-name" required /></Field>
          <Field label={copy.website}><input className={FIELD_CLASS} name="website" type="url" inputMode="url" placeholder="https://" /></Field>
          <Field label={copy.inquiryType}>
            <select className={FIELD_CLASS} name="inquiryType" defaultValue={inquiryTypes[0]} required>
              {inquiryTypes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label={copy.budget}>
            <select className={FIELD_CLASS} name="budget" defaultValue="5k-15k" required>
              {selects.budget.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label={copy.timeline}>
            <select className={FIELD_CLASS} name="timeline" defaultValue="30-days" required>
              {selects.timeline.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
        </div>
        <Field label={copy.requirements}>
          <textarea className={`${FIELD_CLASS} min-h-36 resize-y`} name="message" minLength={20} maxLength={3000} required />
        </Field>
        <div className="sr-only" aria-hidden="true">
          <label>Website confirmation<input name="websiteConfirmation" tabIndex={-1} autoComplete="off" /></label>
        </div>
        {TURNSTILE_SITE_KEY && <div ref={turnstileContainerRef} />}
        {status === "error" && <p role="alert" className="text-sm text-red-600">{copy.errorMessage}</p>}
        <div className="flex flex-col gap-4 border-t border-paradigm-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-paradigm-ink-mute">
            {copy.privacyPrefix}{" "}<Link className="underline underline-offset-4 hover:text-paradigm-ink" href="/privacy">{copy.privacyLink}</Link>.
          </p>
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-paradigm-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-paper transition hover:bg-paradigm-accent disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={status === "loading"}
            aria-label={`${copy.submit}: ${brandName}`}
          >
            {status === "loading" ? <LoaderCircle className="animate-spin" size={17} /> : <ArrowRight size={17} />}
            {status === "loading" ? copy.submitting : copy.submit}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-ink-soft">{label}</span>
      {children}
    </label>
  )
}
