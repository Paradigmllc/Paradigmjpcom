"use client"

import { useState } from "react"
import type { DemoContactPage as DemoContactPageData } from "@/lib/sales/demo-site-types"

interface Props {
  contact: DemoContactPageData
  companyName: string
  locale: string
}

interface FormState {
  status: "idle" | "loading" | "success" | "error"
  error?: string
}

export function DemoContactPage({ contact, companyName, locale }: Props) {
  const isJa = locale === "ja"
  const accent = contact.accentColor || "#2563eb"

  return (
    <div className="[--page-accent:var(--cta-accent)]" style={{ "--cta-accent": accent } as React.CSSProperties}>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50/50 px-4 pb-16 pt-20 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            {contact.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-500 sm:text-xl">
            {contact.subtitle}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-12 lg:grid-cols-5">
            {/* Contact Info */}
            <div className="lg:col-span-2">
              <h2 className="mb-6 font-display text-2xl font-bold text-gray-900">
                {isJa ? "連絡先" : "Contact Information"}
              </h2>

              <div className="space-y-5">
                {/* Company */}
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `${accent}10` }}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">{isJa ? "会社名" : "Company"}</p>
                    <p className="text-base font-semibold text-gray-900">{contact.companyName}</p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `${accent}10` }}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Email</p>
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-base font-semibold transition-colors hover:underline"
                      style={{ color: accent }}
                    >
                      {contact.email}
                    </a>
                  </div>
                </div>

                {/* Phone */}
                {contact.phone && (
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `${accent}10` }}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-400">{isJa ? "電話番号" : "Phone"}</p>
                      <p className="text-base font-semibold text-gray-900">{contact.phone}</p>
                    </div>
                  </div>
                )}

                {/* Address */}
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `${accent}10` }}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">{isJa ? "所在地" : "Address"}</p>
                    <p className="text-base font-semibold text-gray-900">{contact.address}</p>
                  </div>
                </div>
              </div>

              {/* Form note */}
              {contact.formNote && (
                <div
                  className="mt-8 rounded-2xl p-5"
                  style={{ background: `${accent}05`, border: `1px solid ${accent}20` }}
                >
                  <p className="text-sm leading-relaxed text-gray-500">{contact.formNote}</p>
                </div>
              )}
            </div>

            {/* Contact Form (Primary) + Cal.com (Secondary) */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-6 font-display text-xl font-bold text-gray-900">
                  {isJa ? "お問い合わせフォーム" : "Contact Form"}
                </h3>
                <DemoContactForm
                  isJa={isJa}
                  accent={accent}
                  companyName={companyName}
                />

                {/* Divider */}
                <div className="my-8 flex items-center gap-4">
                  <hr className="flex-1 border-gray-200" />
                  <span className="text-xs font-medium text-gray-400">
                    {isJa ? "または" : "or"}
                  </span>
                  <hr className="flex-1 border-gray-200" />
                </div>

                {/* Cal.com Booking (Secondary) */}
                <h3 className="mb-4 font-display text-lg font-bold text-gray-900">
                  {isJa ? "オンライン相談を予約" : "Book a Consultation"}
                </h3>
                {contact.calBookingUrl ? (
                  <div className="overflow-hidden rounded-xl border border-gray-100">
                    <div className="relative h-[500px] overflow-hidden rounded-xl">
                      <iframe
                        src={contact.calBookingUrl}
                        className="h-full w-full border-0"
                        title={isJa ? "予約カレンダー" : "Booking Calendar"}
                        allow="camera; microphone; fullscreen"
                        onError={(e) => {
                          console.error("[DemoContact] Cal.com iframe error:", e)
                        }}
                      />
                    </div>
                  </div>
                ) : null}

                {/* Fallback: Direct Cal.com link */}
                {contact.calDirectUrl && (
                  <div className="mt-4 text-center">
                    <a
                      href={contact.calDirectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
                      style={{ background: accent }}
                    >
                      {isJa ? "カレンダーを別ウィンドウで開く" : "Open Calendar in New Window"}
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </div>
                )}

                {/* Email fallback */}
                <div className="mt-4 text-center text-sm text-gray-500">
                  {isJa
                    ? "フォームやカレンダーがご利用いただけない場合は、"
                    : "If the form or calendar is not working, please "}
                  <a
                    href={`mailto:${contact.email}`}
                    className="font-semibold underline transition-colors hover:opacity-80"
                    style={{ color: accent }}
                  >
                    {contact.email}
                  </a>
                  {isJa ? " まで直接メールでご連絡ください。" : " directly."}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ─── Contact Form ─── */

function DemoContactForm({
  isJa,
  accent,
  companyName,
}: {
  isJa: boolean
  accent: string
  companyName: string
}) {
  const [formState, setFormState] = useState<FormState>({ status: "idle" })
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormState({ status: "loading" })

    try {
      // Validate
      if (!formData.email.trim() || !formData.message.trim()) {
        setFormState({
          status: "error",
          error: isJa
            ? "メールアドレスとメッセージは必須です。"
            : "Email and message are required.",
        })
        return
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email.trim())) {
        setFormState({
          status: "error",
          error: isJa
            ? "有効なメールアドレスを入力してください。"
            : "Please enter a valid email address.",
        })
        return
      }

      const res = await fetch("/api/demo-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          company: formData.company.trim() || companyName,
          message: formData.message.trim(),
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Submission failed")
      }

      setFormState({ status: "success" })
      setFormData({ name: "", email: "", company: "", message: "" })
    } catch (err) {
      console.error("[DemoContact] form submission error:", err)
      setFormState({
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  // Success state
  if (formState.status === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: "#10b98115" }}
        >
          <svg className="h-8 w-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-gray-900">
          {isJa ? "お問い合わせありがとうございます！" : "Thank you for reaching out!"}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          {isJa
            ? "担当者より24時間以内にご連絡いたします。"
            : "We'll get back to you within 24 hours."}
        </p>
        <button
          type="button"
          onClick={() => setFormState({ status: "idle" })}
          className="mt-4 text-sm font-medium underline transition-colors hover:opacity-80"
          style={{ color: accent }}
        >
          {isJa ? "別のお問い合わせを送る" : "Send another message"}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Name */}
      <div>
        <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-gray-700">
          {isJa ? "お名前" : "Name"}
        </label>
        <input
          type="text"
          id="contact-name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          disabled={formState.status === "loading"}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--cta-accent,#2563eb)]/30 disabled:opacity-50"
          placeholder={isJa ? "山田 太郎" : "John Doe"}
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-gray-700">
          {isJa ? "メールアドレス" : "Email"} <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="contact-email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          disabled={formState.status === "loading"}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--cta-accent,#2563eb)]/30 disabled:opacity-50"
          placeholder="email@example.com"
        />
      </div>

      {/* Company */}
      <div>
        <label htmlFor="contact-company" className="mb-1.5 block text-sm font-medium text-gray-700">
          {isJa ? "会社名（任意）" : "Company (optional)"}
        </label>
        <input
          type="text"
          id="contact-company"
          name="company"
          value={formData.company}
          onChange={handleChange}
          disabled={formState.status === "loading"}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--cta-accent,#2563eb)]/30 disabled:opacity-50"
          placeholder={companyName}
        />
      </div>

      {/* Message */}
      <div>
        <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-gray-700">
          {isJa ? "メッセージ" : "Message"} <span className="text-red-500">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
          rows={4}
          disabled={formState.status === "loading"}
          className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--cta-accent,#2563eb)]/30 disabled:opacity-50"
          placeholder={isJa
            ? "お問い合わせ内容をご記入ください"
            : "Please describe your inquiry"
          }
        />
      </div>

      {/* Error state */}
      {formState.status === "error" && formState.error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm text-red-700">{formState.error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={formState.status === "loading"}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ background: accent }}
      >
        {formState.status === "loading" ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {isJa ? "送信中..." : "Sending..."}
          </>
        ) : (
          <>
            {isJa ? "送信する" : "Send Message"}
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </>
        )}
      </button>
    </form>
  )
}
