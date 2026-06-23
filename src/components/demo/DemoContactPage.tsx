"use client"

import type { DemoContactPage as DemoContactPageData } from "@/lib/sales/demo-site-types"

interface Props {
  contact: DemoContactPageData
  companyName: string
  locale: string
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

            {/* Cal.com Booking */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
                {contact.calBookingUrl ? (
                  <div className="relative h-[600px] overflow-hidden rounded-xl">
                    <iframe
                      src={contact.calBookingUrl}
                      className="h-full w-full border-0"
                      title={isJa ? "予約カレンダー" : "Booking Calendar"}
                      allow="camera; microphone; fullscreen"
                    />
                  </div>
                ) : (
                  <div className="flex h-[400px] flex-col items-center justify-center rounded-xl bg-gray-50 p-8 text-center">
                    <div
                      className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                      style={{ background: `${accent}10` }}
                    >
                      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      {isJa ? "お問い合わせはメールにて" : "Contact us via email"}
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      {isJa
                        ? "まずはメールでご連絡ください。折り返し担当者よりご連絡いたします。"
                        : "Please reach out via email and our team will get back to you promptly."}
                    </p>
                    <a
                      href={`mailto:${contact.email}`}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
                      style={{ background: accent }}
                    >
                      {isJa ? "メールを送る" : "Send Email"}
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
