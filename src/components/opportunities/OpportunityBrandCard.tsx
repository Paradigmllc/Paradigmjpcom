import { ArrowUpRight } from "lucide-react"
import FadeIn from "@/components/aesop/FadeIn"
import { Link } from "@/i18n/routing"
import type { OpportunityBrand } from "@/lib/opportunities/brands"

const ACCENT_STYLES = {
  amber: "from-amber-400/20 via-orange-300/10 to-transparent border-amber-500/20 text-amber-700 dark:text-amber-300",
  violet: "from-violet-500/20 via-fuchsia-400/10 to-transparent border-violet-500/20 text-violet-700 dark:text-violet-300",
  emerald: "from-emerald-500/20 via-cyan-400/10 to-transparent border-emerald-500/20 text-emerald-700 dark:text-emerald-300",
} as const

export function OpportunityBrandCard({ brand, cta, index }: { brand: OpportunityBrand; cta: string; index: number }) {
  return (
    <FadeIn as="article" delay={index * 0.08} className={`group flex h-full flex-col rounded-3xl border bg-gradient-to-br p-6 transition duration-500 hover:-translate-y-1 hover:shadow-2xl md:p-8 ${ACCENT_STYLES[brand.accent]}`}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em]">{brand.code}</p>
        <ArrowUpRight className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" size={20} />
      </div>
      <h3 className="mt-12 font-display text-3xl font-semibold tracking-[-0.03em] text-paradigm-ink">{brand.name}</h3>
      <p className="mt-4 text-sm leading-7 text-paradigm-ink-soft">{brand.tagline}</p>
      <div className="mt-8 border-t border-current/15 pt-5">
        <p className="font-display text-3xl font-semibold text-paradigm-ink">{brand.metric.value}</p>
        <p className="mt-1 text-xs leading-5 text-paradigm-ink-mute">{brand.metric.label}</p>
      </div>
      <Link href={`/japan-opportunities/${brand.slug}`} className="mt-7 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-paradigm-ink">
        {cta}<ArrowUpRight size={15} />
      </Link>
    </FadeIn>
  )
}
