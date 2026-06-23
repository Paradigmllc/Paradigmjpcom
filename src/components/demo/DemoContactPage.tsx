"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import type { DemoContactPage as DemoContactPageData } from "@/lib/sales/demo-site-types"
import type { DemoTemplate, ContactSectionId } from "@/lib/sales/demo-templates/registry"
import { headingSizeClass } from "@/lib/sales/demo-templates/registry"
import { ContactInfoCard, BookingEmbed } from "./contact/ContactVariants"

interface Props {
  contact: DemoContactPageData
  companyName: string
  locale: string
  template?: DemoTemplate
}

interface FormState {
  status: "idle" | "loading" | "success" | "error"
  error?: string
}

export function DemoContactPage({ contact, companyName, locale, template }: Props) {
  const isJa = locale === "ja"
  const accent = contact.accentColor || "#2563eb"
  const layout = template?.layout.contact

  const renderSection = (sectionId: ContactSectionId) => {
    switch (sectionId) {
      case "info":
        return <ContactInfoCard contact={contact} isJa={isJa} accent={accent} />
      case "form":
        return <ContactFormSection isJa={isJa} accent={accent} companyName={companyName} contact={contact} />
      case "booking":
        return <BookingEmbed contact={contact} isJa={isJa} accent={accent} />
      case "map":
        return <MapPlaceholder isJa={isJa} accent={accent} />
      case "faq":
        return <ContactFaq isJa={isJa} accent={accent} contact={contact} />
      default:
        return null
    }
  }

  return (
    <div className="[--page-accent:var(--cta-accent)]" style={{ "--cta-accent": accent } as React.CSSProperties}>
      {/* Hero */}
      <ContactHero contact={contact} isJa={isJa} accent={accent} template={template?.designTokens} />

      {/* Sections in template order */}
      {(layout?.sections ?? defaultContactSections).map((sectionId) => (
        <div key={sectionId}>
          {renderSection(sectionId)}
        </div>
      ))}
    </div>
  )
}

const defaultContactSections: ContactSectionId[] = ["info", "form", "booking"]

/* ──────────── Contact Hero ──────────── */

function ContactHero({
  contact, isJa: _isJa, template,
}: { contact: DemoContactPageData; isJa: boolean; accent: string; template?: DemoTemplate["designTokens"] }) {
  const size = headingSizeClass(template?.typography.scale ?? "normal")
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50/50 px-4 pb-16 pt-20 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <motion.div className="relative mx-auto max-w-4xl text-center"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className={`font-display ${size.h1} ${template?.typography.headingWeight ?? "font-extrabold"} tracking-tight text-gray-900`}>
          {contact.title}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-500 sm:text-xl">{contact.subtitle}</p>
      </motion.div>
    </section>
  )
}

/* ──────────── Contact Form Section ──────────── */

function ContactFormSection({
  isJa, accent, companyName, contact,
}: { isJa: boolean; accent: string; companyName: string; contact: DemoContactPageData }) {
  const [formState, setFormState] = useState<FormState>({ status: "idle" })
  const [formData, setFormData] = useState({ name: "", email: "", company: "", message: "" })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormState({ status: "loading" })

    try {
      if (!formData.email.trim() || !formData.message.trim()) {
        setFormState({ status: "error", error: isJa ? "メールアドレスとメッセージは必須です。" : "Email and message are required." })
        return
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email.trim())) {
        setFormState({ status: "error", error: isJa ? "有効なメールアドレスを入力してください。" : "Please enter a valid email address." })
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
      if (!res.ok || !json.ok) throw new Error(json.error || "Submission failed")

      setFormState({ status: "success" })
      setFormData({ name: "", email: "", company: "", message: "" })
    } catch (err) {
      console.error("[DemoContact] form submission error:", err)
      setFormState({ status: "error", error: err instanceof Error ? err.message : "Unknown error" })
    }
  }

  if (formState.status === "success") {
    return (
      <section className="bg-gray-50/80 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg text-center">
          <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-2xl" style={{ background: "#10b98115" }}>
            <svg className="h-8 w-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-gray-900">{isJa ? "お問い合わせありがとうございます！" : "Thank you for reaching out!"}</p>
          <p className="mt-2 text-sm text-gray-500">{isJa ? "担当者より24時間以内にご連絡いたします。" : "We'll get back to you within 24 hours."}</p>
          <button type="button" onClick={() => setFormState({ status: "idle" })}
            className="mt-4 text-sm font-medium underline transition-colors hover:opacity-80" style={{ color: accent }}>
            {isJa ? "別のお問い合わせを送る" : "Send another message"}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-6 font-display text-xl font-bold text-gray-900">{isJa ? "お問い合わせフォーム" : "Contact Form"}</h3>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-gray-700">{isJa ? "お名前" : "Name"}</label>
              <input type="text" id="contact-name" name="name" value={formData.name} onChange={handleChange}
                disabled={formState.status === "loading"}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--cta-accent,#2563eb)]/30 disabled:opacity-50"
                placeholder={isJa ? "山田 太郎" : "John Doe"} />
            </div>
            <div>
              <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-gray-700">{isJa ? "メールアドレス" : "Email"} <span className="text-red-500">*</span></label>
              <input type="email" id="contact-email" name="email" value={formData.email} onChange={handleChange}
                required disabled={formState.status === "loading"}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--cta-accent,#2563eb)]/30 disabled:opacity-50"
                placeholder="email@example.com" />
            </div>
            <div>
              <label htmlFor="contact-company" className="mb-1.5 block text-sm font-medium text-gray-700">{isJa ? "会社名（任意）" : "Company (optional)"}</label>
              <input type="text" id="contact-company" name="company" value={formData.company} onChange={handleChange}
                disabled={formState.status === "loading"}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--cta-accent,#2563eb)]/30 disabled:opacity-50"
                placeholder={companyName} />
            </div>
            <div>
              <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-gray-700">{isJa ? "メッセージ" : "Message"} <span className="text-red-500">*</span></label>
              <textarea id="contact-message" name="message" value={formData.message} onChange={handleChange}
                required rows={4} disabled={formState.status === "loading"}
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--cta-accent,#2563eb)]/30 disabled:opacity-50"
                placeholder={isJa ? "お問い合わせ内容をご記入ください" : "Please describe your inquiry"} />
            </div>
            {formState.status === "error" && formState.error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-sm text-red-700">{formState.error}</p>
              </div>
            )}
            <button type="submit" disabled={formState.status === "loading"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: accent }}>
              {formState.status === "loading" ? (
                <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>{isJa ? "送信中..." : "Sending..."}</>
              ) : (
                <>{isJa ? "送信する" : "Send Message"}<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg></>
              )}
            </button>
          </form>

          {/* Email fallback */}
          {contact.email && (
            <div className="mt-4 text-center text-sm text-gray-500">
              {isJa ? "または " : "Or "}
              <a href={`mailto:${contact.email}`} className="font-semibold underline transition-colors hover:opacity-80" style={{ color: accent }}>
                {contact.email}
              </a>
              {isJa ? " まで直接ご連絡ください。" : " directly."}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ──────────── Placeholder sections ──────────── */

function MapPlaceholder({ isJa }: { isJa: boolean; accent: string }) {
  return (
    <section className="bg-gray-50/80 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex h-64 items-center justify-center rounded-2xl border border-gray-200 bg-white">
          <p className="text-sm text-gray-400">{isJa ? "地図プレースホルダー" : "Map placeholder"}</p>
        </div>
      </div>
    </section>
  )
}

function ContactFaq({ isJa, accent, contact }: { isJa: boolean; accent: string; contact: DemoContactPageData }) {
  return (
    <section className="bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <h3 className="mb-6 font-display text-center text-xl font-bold text-gray-900">{isJa ? "よくある質問" : "FAQ"}</h3>
        <div className="space-y-3 text-sm">
          <div className="rounded-xl border border-gray-100 p-4">
            <p className="font-semibold text-gray-900">{isJa ? "無料相談は本当に無料ですか？" : "Is the consultation really free?"}</p>
            <p className="mt-1 text-gray-500">{isJa ? "はい、15分のオンライン相談は完全無料です。お気軽にご予約ください。" : "Yes, the 15-minute online consultation is completely free."}</p>
          </div>
          <div className="rounded-xl border border-gray-100 p-4">
            <p className="font-semibold text-gray-900">{isJa ? "メールでの問い合わせも可能ですか？" : "Can I reach out by email?"}</p>
            <p className="mt-1 text-gray-500">{isJa ? `はい、` : `Yes, please email `}<a href={`mailto:${contact.email}`} className="underline" style={{ color: accent }}>{contact.email}</a>{isJa ? " までご連絡ください。" : "."}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
