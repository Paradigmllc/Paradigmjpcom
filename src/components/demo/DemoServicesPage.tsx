"use client"

import type { DemoServicesPage as DemoServicesPageData } from "@/lib/sales/demo-site-types"

interface Props {
  services: DemoServicesPageData
  companyName: string
  locale: string
}

export function DemoServicesPage({ services, companyName, locale }: Props) {
  const isJa = locale === "ja"
  const accent = services.accentColor || "#2563eb"

  return (
    <div className="[--page-accent:var(--svc-accent)]" style={{ "--svc-accent": accent } as React.CSSProperties}>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50/50 px-4 pb-16 pt-20 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            {services.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-500 sm:text-xl">
            {services.subtitle}
          </p>
        </div>
      </section>

      {/* Service Cards */}
      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 lg:grid-cols-3">
            {services.services.map((svc, i) => (
              <div
                key={i}
                className="group relative flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
              >
                {/* Icon */}
                <div
                  className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: `${accent}10` }}
                >
                  <ServiceIcon name={svc.icon} accent={accent} />
                </div>

                {/* Title */}
                <h3 className="mb-3 font-display text-xl font-bold text-gray-900">{svc.title}</h3>

                {/* Description */}
                <p className="mb-5 flex-1 text-sm leading-relaxed text-gray-500">{svc.description}</p>

                {/* Features */}
                <ul className="mb-5 space-y-2.5 border-t border-gray-100 pt-5">
                  {svc.features.map((feat, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>

                {/* Price note */}
                {svc.priceNote && (
                  <div
                    className="rounded-xl px-4 py-2.5 text-center text-sm font-semibold"
                    style={{ background: `${accent}08`, color: accent }}
                  >
                    {svc.priceNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="border-t border-gray-100 bg-gray-50/80 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>
              {isJa ? "プロセス" : "Process"}
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold text-gray-900 sm:text-3xl">
              {isJa ? "ご依頼から実装までの流れ" : "From Inquiry to Implementation"}
            </h2>
          </div>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 h-full w-0.5 bg-gray-200 md:left-1/2 md:-translate-x-px" />

            <div className="space-y-12">
              {services.process.map((step, i) => (
                <div key={step.step} className={`relative flex gap-8 md:gap-0 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                  {/* Step number */}
                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-white shadow-sm md:absolute md:left-1/2 md:-translate-x-1/2"
                    style={{ background: accent }}>
                    <span className="font-display text-lg font-bold text-white">{step.step}</span>
                  </div>

                  {/* Content */}
                  <div className={`flex-1 ${i % 2 === 0 ? "md:pr-16 md:text-right" : "md:pl-16"}`}>
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                      <h3 className="mb-2 font-display text-lg font-semibold text-gray-900">{step.title}</h3>
                      <p className="text-sm leading-relaxed text-gray-500">{step.description}</p>
                    </div>
                  </div>

                  {/* Spacer for alternating layout */}
                  <div className="hidden flex-1 md:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function ServiceIcon({ name, accent }: { name: string; accent: string }) {
  const icons: Record<string, React.ReactNode> = {
    globe: <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>,
    search: <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
    cpu: <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></svg>,
  }
  return icons[name] ?? <ServiceIcon name="globe" accent={accent} />
}
