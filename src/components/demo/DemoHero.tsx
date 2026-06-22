"use client"

import type { DemoHeroProps } from "@/lib/sales/demo-site-types"

export function DemoHero(props: DemoHeroProps & { isJa: boolean }) {
  const {
    title,
    subtitle,
    tagline,
    primaryCta,
    secondaryCta,
    accentColor,
    accentColorDark,
  } = props

  return (
    <section className="relative px-6 pb-16 pt-24">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-zinc-400">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          {tagline}
        </div>

        <h1
          className="mb-6 text-5xl font-black leading-[1.05] md:text-7xl"
          style={{
            background: `linear-gradient(135deg, #fff 0%, ${accentColor} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {title}
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-zinc-500 md:text-xl">
          {subtitle}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href={primaryCta.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-lg font-bold text-white shadow-lg transition-all"
            style={{
              background: `linear-gradient(to right, ${accentColor}, ${accentColorDark})`,
            }}
          >
            {primaryCta.text}
            <ArrowIcon />
          </a>
          <a
            href={secondaryCta.href}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-8 py-4 text-lg font-bold text-white transition-all hover:bg-white/20"
          >
            {secondaryCta.text}
          </a>
        </div>
      </div>
    </section>
  )
}

function ArrowIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12h14M12 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
