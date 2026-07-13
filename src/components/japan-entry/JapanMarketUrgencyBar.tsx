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
      className="relative overflow-hidden border-b border-paradigm-line bg-paradigm-ink px-5 py-7 text-paradigm-paper sm:px-8 sm:py-9 lg:px-12"
      aria-labelledby="japan-market-urgency-title"
      data-testid="japan-market-urgency"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_20%,rgba(37,99,235,0.35),transparent_34%),radial-gradient(circle_at_84%_72%,rgba(16,185,129,0.22),transparent_30%)]" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
        <div className="max-w-4xl">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300 sm:text-xs">
            <Zap className="h-4 w-4" aria-hidden />
            {copy.eyebrow}
          </p>
          <h2 id="japan-market-urgency-title" className="mt-3 max-w-4xl font-display text-[26px] leading-[1.08] tracking-tight sm:text-[38px] lg:text-[48px]">
            {copy.title} <span className="text-emerald-300">{copy.highlight}</span>
          </h2>
          <p className="mt-4 max-w-3xl text-[13px] leading-[1.75] text-paradigm-paper/75 sm:text-[14px]">{copy.body}</p>
          <p className="mt-3 text-[10px] leading-5 text-paradigm-paper/50 sm:text-[11px]">{copy.proof}</p>
        </div>
        <Link
          href={copy.ctaHref}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-paradigm-paper px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-paradigm-ink transition-transform hover:-translate-y-0.5 sm:px-6 sm:py-3.5"
        >
          {copy.ctaLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  )
}
