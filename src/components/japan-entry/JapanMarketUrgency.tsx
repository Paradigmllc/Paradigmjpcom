import Link from "next/link"
import { ArrowUpRight, CircleAlert, Scale, TrendingUp } from "lucide-react"
import { JAPAN_ENTRY_MARKET_EVIDENCE } from "@/lib/japan-entry-market-evidence"

const MARKET_STATS = [
  JAPAN_ENTRY_MARKET_EVIDENCE.population,
  JAPAN_ENTRY_MARKET_EVIDENCE.ecommerce,
  JAPAN_ENTRY_MARKET_EVIDENCE.fx,
] as const

export function JapanMarketUrgency({ compact = false, source = "market-urgency" }: { compact?: boolean; source?: string }) {
  return (
    <section className="relative overflow-hidden border-y border-red-900/50 bg-zinc-950 px-5 py-14 text-white sm:px-8 sm:py-20 lg:px-12" aria-labelledby={`japan-market-urgency-${source}`}>
      <div className="pointer-events-none absolute -right-28 -top-40 h-96 w-96 rounded-full bg-red-700/20 blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        <div className={`grid gap-10 ${compact ? "lg:grid-cols-[1fr_0.9fr]" : "lg:grid-cols-[1.1fr_0.9fr]"}`}>
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-red-300">
              <TrendingUp size={15} aria-hidden /> The cost of waiting
            </p>
            <h2 id={`japan-market-urgency-${source}`} className="mt-5 max-w-4xl font-display text-[32px] leading-[1.03] sm:text-[46px] lg:text-[58px]">
              Japan is too large to ignore—and too regulated to improvise.
            </h2>
            <p className="mt-6 max-w-3xl text-[15px] leading-8 text-zinc-300 sm:text-[17px]">
              Delay leaves local demand, competitor positioning and your Japanese customer path untested. Rushing in without scoped compliance creates a different risk. The decision is not whether to guess faster; it is whether to build evidence before the gap widens.
            </p>
          </div>

          <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-5 sm:p-7">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-300">
              <CircleAlert size={16} aria-hidden /> Regulatory pressure
            </p>
            <p className="mt-4 text-[18px] font-semibold leading-7">“Build once and forget” is not a compliance strategy.</p>
            <p className="mt-3 text-sm leading-7 text-zinc-300">{JAPAN_ENTRY_MARKET_EVIDENCE.commerceEnforcement.detail}</p>
            <p className="mt-3 text-sm leading-7 text-zinc-300">{JAPAN_ENTRY_MARKET_EVIDENCE.privacyReview.detail}</p>
            <p className="mt-4 text-xs leading-5 text-zinc-500">This is not a finding that your company is in breach, and it is not legal advice.</p>
          </div>
        </div>

        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-800 sm:grid-cols-3">
          {MARKET_STATS.map((item) => (
            <article key={item.label} className="bg-zinc-950 p-5 sm:p-6">
              <p className="font-display text-[30px] text-white sm:text-[38px]">{item.value}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-red-300">{item.label}</p>
              <p className="mt-3 text-xs leading-5 text-zinc-500">{item.detail}</p>
              <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-[11px] text-zinc-400 underline decoration-zinc-700 underline-offset-4 hover:text-white">
                {item.sourceLabel} <ArrowUpRight size={12} aria-hidden />
              </a>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-5 border-t border-zinc-800 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex max-w-3xl items-start gap-3 text-sm leading-6 text-zinc-300">
            <Scale className="mt-0.5 shrink-0 text-red-300" size={18} aria-hidden />
            Opportunity pressure and regulatory pressure must be evaluated together. We verify the public evidence, name the assumptions, and scope the Japan-ready path before launch.
          </p>
          <Link href="/contact?intent=japan-entry" data-umami-event="japan-entry-apply" data-umami-event-source={source} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-red-700 px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-red-600">
            Assess the decision <ArrowUpRight size={15} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  )
}
