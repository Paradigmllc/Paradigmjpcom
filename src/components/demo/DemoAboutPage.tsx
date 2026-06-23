"use client"

import type { DemoAboutPage as DemoAboutPageData } from "@/lib/sales/demo-site-types"

interface Props {
  about: DemoAboutPageData
  companyName: string
  locale: string
}

export function DemoAboutPage({ about, companyName, locale }: Props) {
  const isJa = locale === "ja"
  const accent = about.accentColor || "#2563eb"

  return (
    <div className="[--page-accent:var(--about-accent)]" style={{ "--about-accent": accent } as React.CSSProperties}>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50/50 px-4 pb-16 pt-20 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            {about.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-500 sm:text-xl">
            {about.subtitle}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3 text-sm text-gray-400">
            <span className="font-semibold text-gray-700">{about.companyName}</span>
            <span className="text-gray-300">•</span>
            <span>{about.industryLabel}</span>
            <span className="text-gray-300">•</span>
            <span>{about.locationLabel}</span>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>
              {isJa ? "私たちのストーリー" : "Our Story"}
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold text-gray-900 sm:text-3xl">
              {isJa ? `${about.companyName}の歩み` : `The ${about.companyName} journey`}
            </h2>
          </div>
          <div className="prose prose-gray max-w-none">
            <p className="text-lg leading-relaxed text-gray-600">{about.story}</p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="border-y border-gray-100 bg-gray-50/80 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>
            {isJa ? "ミッション" : "Mission"}
          </span>
          <h2 className="mt-2 font-display text-2xl font-bold text-gray-900 sm:text-3xl">
            {isJa ? "私たちの使命" : "Our Mission"}
          </h2>
          <div
            className="relative mx-auto mt-8 max-w-2xl rounded-2xl border-l-4 p-8 text-left"
            style={{ borderColor: accent, background: `${accent}08` }}
          >
            <p className="text-lg font-medium leading-relaxed text-gray-700 italic">"{about.mission}"</p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>
              {isJa ? "バリュー" : "Values"}
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold text-gray-900 sm:text-3xl">
              {isJa ? "大切にしていること" : "What We Stand For"}
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {about.values.map((v, i) => (
              <div
                key={i}
                className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ background: `${accent}10` }}
                >
                  <ValueIcon name={v.icon} accent={accent} />
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold text-gray-900">{v.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Note */}
      <section className="border-t border-gray-100 bg-gray-50/80 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-lg leading-relaxed text-gray-600">{about.teamNote}</p>
        </div>
      </section>
    </div>
  )
}

function ValueIcon({ name, accent }: { name: string; accent: string }) {
  const icons: Record<string, React.ReactNode> = {
    star: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
    lightbulb: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><path d="M9 18h6M10 22h4M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 019 14" /></svg>,
    users: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>,
    globe: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>,
  }
  return icons[name] ?? <ValueIcon name="star" accent={accent} />
}
