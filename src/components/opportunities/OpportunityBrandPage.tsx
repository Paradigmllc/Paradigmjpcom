import { ArrowDown, ArrowLeft, Check, ShieldCheck } from "lucide-react"
import FadeIn from "@/components/aesop/FadeIn"
import { Link } from "@/i18n/routing"
import type { OpportunityBrand } from "@/lib/opportunities/brands"
import { OpportunityInquiryForm } from "./OpportunityInquiryForm"

const ACCENT = {
  amber: { glow: "bg-amber-400/20", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/25" },
  violet: { glow: "bg-violet-500/20", text: "text-violet-700 dark:text-violet-300", border: "border-violet-500/25" },
  emerald: { glow: "bg-emerald-500/20", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/25" },
} as const

const COPY = {
  en: { back: "All Japan desks", audience: "Built for", capabilities: "What this desk delivers", offers: "Start with a defined scope", offersDesc: "Clear deliverables and USD pricing make the first decision small, measurable and fast.", inquire: "Discuss your requirement" },
  ja: { back: "3つの専門デスクへ戻る", audience: "対象", capabilities: "提供する判断材料と実行支援", offers: "明確なスコープから開始", offersDesc: "成果物と米ドル価格を明確にし、最初の意思決定を小さく、測定可能に、速くします。", inquire: "要件を相談する" },
} as const

export function OpportunityBrandPage({ brand, locale }: { brand: OpportunityBrand; locale: string }) {
  const language = locale === "ja" ? "ja" : "en"
  const copy = COPY[language]
  const accent = ACCENT[brand.accent]

  return (
    <main className="overflow-hidden bg-paradigm-paper">
      <section className="relative min-h-[78vh] border-b border-paradigm-line px-6 pb-20 pt-32 md:px-10 md:pt-40">
        <div className={`absolute -right-28 top-10 h-80 w-80 rounded-full blur-3xl ${accent.glow}`} />
        <div className="absolute inset-0 paradigm-grid opacity-40" />
        <div className="relative mx-auto max-w-6xl">
          <Link href="/japan-opportunities" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-paradigm-ink-mute transition hover:text-paradigm-ink">
            <ArrowLeft size={15} />{copy.back}
          </Link>
          <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_280px] lg:items-end">
            <div>
              <p className={`text-xs font-bold uppercase tracking-[0.2em] ${accent.text}`}>{brand.eyebrow}</p>
              <h1 className="mt-5 max-w-4xl font-display text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-paradigm-ink sm:text-6xl lg:text-7xl">{brand.name}</h1>
              <p className="mt-7 max-w-3xl font-display text-2xl leading-tight tracking-[-0.02em] text-paradigm-ink-soft md:text-3xl">{brand.tagline}</p>
              <p className="mt-6 max-w-2xl text-sm leading-7 text-paradigm-ink-soft md:text-base">{brand.description}</p>
            </div>
            <div className={`rounded-3xl border bg-paradigm-paper-card/70 p-6 ${accent.border}`}>
              <p className={`font-display text-5xl font-semibold ${accent.text}`}>{brand.metric.value}</p>
              <p className="mt-3 text-xs leading-5 text-paradigm-ink-mute">{brand.metric.label}</p>
              <a href="#inquiry" className="mt-7 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-paradigm-ink">
                {copy.inquire}<ArrowDown size={15} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="paradigm-section px-6 md:px-10">
        <div className="mx-auto max-w-6xl">
          <p className="paradigm-eyebrow text-paradigm-accent">{copy.audience}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {brand.audience.map((item) => <span key={item} className="rounded-full border border-paradigm-line bg-paradigm-paper-card px-4 py-2 text-xs text-paradigm-ink-soft">{item}</span>)}
          </div>

          <h2 className="mt-20 max-w-3xl font-display text-4xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-5xl">{copy.capabilities}</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {brand.pillars.map((pillar, index) => (
              <FadeIn key={pillar.title} delay={index * 0.08} className="rounded-3xl border border-paradigm-line bg-paradigm-paper-card/60 p-7">
                <span className={`text-xs font-bold ${accent.text}`}>0{index + 1}</span>
                <h3 className="mt-8 font-display text-2xl font-semibold text-paradigm-ink">{pillar.title}</h3>
                <p className="mt-4 text-sm leading-7 text-paradigm-ink-soft">{pillar.description}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-paradigm-line bg-paradigm-paper-deep/50 px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="paradigm-eyebrow text-paradigm-accent">USD / PRODUCTIZED</p>
              <h2 className="mt-4 font-display text-4xl font-semibold tracking-[-0.03em] text-paradigm-ink md:text-5xl">{copy.offers}</h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-paradigm-ink-soft">{copy.offersDesc}</p>
            </div>
            <div className="divide-y divide-paradigm-line rounded-3xl border border-paradigm-line bg-paradigm-paper-card/70">
              {brand.offers.map((offer) => (
                <div key={offer.name} className="grid gap-3 p-6 sm:grid-cols-[1fr_auto] sm:items-center md:p-8">
                  <div>
                    <h3 className="font-display text-xl font-semibold text-paradigm-ink">{offer.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-paradigm-ink-soft">{offer.description}</p>
                  </div>
                  <p className={`text-sm font-bold ${accent.text}`}>{offer.price}</p>
                </div>
              ))}
            </div>
          </div>
          {brand.disclaimer && (
            <div className="mt-8 flex gap-3 rounded-2xl border border-paradigm-line bg-paradigm-paper-card/60 p-5 text-xs leading-6 text-paradigm-ink-mute">
              <ShieldCheck className="mt-0.5 shrink-0 text-paradigm-accent" size={18} /><p>{brand.disclaimer}</p>
            </div>
          )}
        </div>
      </section>

      <section className="paradigm-section px-6 md:px-10">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.65fr_1.35fr] lg:items-start">
          <div className="lg:sticky lg:top-32">
            <p className="paradigm-eyebrow text-paradigm-accent">{brand.code}</p>
            <ul className="mt-6 space-y-4">
              {brand.inquiryTypes.map((item) => <li key={item} className="flex items-start gap-3 text-sm leading-6 text-paradigm-ink-soft"><Check className={`mt-1 shrink-0 ${accent.text}`} size={16} />{item}</li>)}
            </ul>
          </div>
          <OpportunityInquiryForm brand={brand.slug} brandName={brand.name} inquiryTypes={brand.inquiryTypes} locale={locale} />
        </div>
      </section>
    </main>
  )
}
