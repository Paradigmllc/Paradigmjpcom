import { ArrowUpRight, MapPin } from "lucide-react"
import { Link } from "@/i18n/routing"
import type { InvestorBriefSummary } from "@/lib/investor-briefs/repository"

export function InvestorBriefCard({ brief }: { brief: InvestorBriefSummary }) {
  return (
    <article className="group flex h-full flex-col rounded-3xl border border-paradigm-line bg-paradigm-paper-card/80 p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-paradigm-accent/50 hover:shadow-xl md:p-7">
      <div className="flex flex-wrap items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-paradigm-ink-soft">
        <span className="rounded-full bg-paradigm-accent/10 px-3 py-1 text-paradigm-accent">{brief.preview.category}</span>
        <span className="inline-flex items-center gap-1"><MapPin size={12} aria-hidden="true" />{brief.preview.region}</span>
      </div>
      <h2 className="mt-5 font-display text-2xl font-semibold leading-tight tracking-[-0.025em] text-paradigm-ink">
        {brief.title}
      </h2>
      <p className="mt-4 flex-1 text-sm leading-7 text-paradigm-ink-soft">{brief.summary}</p>
      <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-paradigm-line pt-5 text-xs">
        <div>
          <dt className="text-paradigm-ink-soft">Asset / theme</dt>
          <dd className="mt-1 font-semibold text-paradigm-ink">{brief.preview.assetClass}</dd>
        </div>
        <div>
          <dt className="text-paradigm-ink-soft">Evidence</dt>
          <dd className="mt-1 font-semibold text-paradigm-ink">{brief.preview.sourceCount} official sources</dd>
        </div>
      </dl>
      <Link
        href={`/japan-opportunities/invest/${brief.slug}`}
        className="mt-6 inline-flex min-h-11 items-center justify-between rounded-xl bg-paradigm-ink px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-paradigm-paper transition group-hover:bg-paradigm-accent"
        aria-label={`Read ${brief.title}`}
      >
        Read the decision brief
        <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </article>
  )
}
