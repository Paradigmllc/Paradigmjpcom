"use client"

import { ArrowRight, Zap } from "lucide-react"
import { Link } from "@/i18n/routing"

export type JapanMarketUrgencyCopy = {
  eyebrow: string
  title: string
  highlight: string
  body: string
  ctaLabel: string
  ctaHref: string
  proof: string
}

export default function JapanMarketUrgencyBar({ copy }: { copy: JapanMarketUrgencyCopy }) {
  return (
    <section
      className="relative overflow-hidden border-y border-paradigm-line bg-paradigm-paper-deep px-5 py-5 text-paradigm-ink sm:px-8 sm:py-6 lg:px-12 lg:py-7"
      aria-labelledby="japan-market-urgency-title"
      data-testid="japan-market-urgency"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_20%,rgba(37,99,235,0.14),transparent_34%),radial-gradient(circle_at_84%_72%,rgba(16,185,129,0.1),transparent_30%)]" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        <div className="max-w-4xl">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-paradigm-accent sm:text-xs">
            <Zap className="h-4 w-4" aria-hidden />
            {copy.eyebrow}
          </p>
          <h2 id="japan-market-urgency-title" className="mt-2 max-w-4xl font-display text-[22px] leading-[1.12] tracking-tight sm:text-[30px] lg:text-[40px]">
            {copy.title} <span className="text-paradigm-accent">{copy.highlight}</span>
          </h2>
          <p className="mt-3 max-w-3xl text-[12px] leading-[1.6] text-paradigm-ink-soft sm:text-[13px]">{copy.body}</p>
          <p className="mt-2 text-[10px] leading-5 text-paradigm-ink-mute sm:text-[11px]">{copy.proof}</p>
        </div>
        <Link
          href={copy.ctaHref}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-paradigm-ink px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-paradigm-paper transition-transform hover:-translate-y-0.5 sm:px-5 sm:py-3"
        >
          {copy.ctaLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  )
}
