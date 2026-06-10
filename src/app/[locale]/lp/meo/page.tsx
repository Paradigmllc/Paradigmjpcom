/**
 * /[locale]/lp/meo — MEO 対策専用 LP
 *
 * 役割:   MEO 対策専用 LP
 * 入力:   params.locale
 * 出力:   Stats → BestFit → CTA Band
 *
 * AE-PHP-2 準拠: 全 visible text を messages/{locale}.json:lpMeo 経由に統一。
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "lpMeo" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: pageAlternates(locale, "/lp/meo"),
  }
}

type Stat = { num: string; label: string; desc: string; gradient: string }
type ProcessStep = { step: string; title: string; desc: string }
type Plan = { name: string; price: string; period: string; desc: string; features: string[] }

export default async function MeoLP({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "lpMeo" })
  const stats = t.raw("stats") as Stat[]
  const targets = t.raw("targets") as string[]
  const STEPS = t.raw("process") as ProcessStep[]
  const PLANS = t.raw("plans") as Plan[]

  return (
    <>
      <PageHero
        badge={t("heroBadge")}
        title={t("heroTitle")}
        highlight={t("heroHighlight")}
        desc={t("heroDesc")}
      />

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-10 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("outcomesEyebrow")}</p>
            <h2 className="font-display text-[26px] md:text-[40px] leading-[1.1] tracking-[-0.025em] text-paradigm-ink">
              <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
                {t("outcomesHeading")}
              </span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {stats.map((s, i) => (
              <FadeIn key={s.label} delay={i * 0.1}>
                <div className="paradigm-glass rounded-2xl p-6 paradigm-glow-sm hover:paradigm-glow-lg hover:-translate-y-1 transition-all duration-500 h-full">
                  <p className="font-display text-[28px] md:text-[36px] leading-[1.05] mb-3">
                    <span className={`bg-gradient-to-br ${s.gradient} bg-clip-text text-transparent`}>{s.num}</span>
                  </p>
                  <p className="paradigm-eyebrow text-paradigm-accent mb-2">{s.label}</p>
                  <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft leading-[1.7]">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-50" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-8 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("bestFitEyebrow")}</p>
            <h2 className="font-display text-[26px] md:text-[36px] leading-[1.15] tracking-[-0.025em] text-paradigm-ink">
              {t("bestFitHeading")}
            </h2>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
            {targets.map((item, idx) => (
              <FadeIn key={item} delay={idx * 0.04}>
                <div className="paradigm-glass rounded-xl px-4 py-5 text-center text-[13px] md:text-[14px] text-paradigm-ink leading-[1.5] paradigm-glow-sm hover:paradigm-glow-md hover:-translate-y-0.5 transition-all duration-500">{item}</div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-8 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("processEyebrow")}</p>
            <h2 className="font-display text-[24px] md:text-[36px] leading-[1.15] tracking-[-0.02em] text-paradigm-ink">
              <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
                {t("processHeading")}
              </span>
            </h2>
          </FadeIn>
          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <FadeIn key={s.step} delay={i * 0.08}>
                <li className="paradigm-glass rounded-xl p-5 grid grid-cols-1 md:grid-cols-[60px_1fr] gap-3 paradigm-glow-sm hover:paradigm-glow-md hover:-translate-y-0.5 transition-all duration-500">
                  <span className="font-display text-[24px] md:text-[28px] leading-none bg-gradient-to-br from-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">{s.step}</span>
                  <div>
                    <h3 className="font-display text-[16px] md:text-[18px] leading-[1.2] text-paradigm-ink mb-1 tracking-[-0.01em]">{s.title}</h3>
                    <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft leading-[1.7]">{s.desc}</p>
                  </div>
                </li>
              </FadeIn>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-50" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-8 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">Pricing</p>
            <h2 className="font-display text-[26px] md:text-[36px] leading-[1.15] tracking-[-0.025em] text-paradigm-ink">
              {t("plansTitle")}
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {PLANS.map((p, idx) => (
              <FadeIn key={p.name} delay={idx * 0.08}>
                <div className={`paradigm-glass rounded-2xl p-6 paradigm-glow-sm hover:paradigm-glow-lg hover:-translate-y-1 transition-all duration-500 flex flex-col h-full ${idx === 1 ? "border border-paradigm-accent/40" : ""}`}>
                  <h3 className="font-display text-[20px] text-paradigm-ink mb-1">{p.name}</h3>
                  <p className="text-[12px] text-paradigm-ink-soft mb-4">{p.desc}</p>
                  <p className="font-display text-[28px] text-paradigm-ink mb-1">
                    ¥{p.price}<span className="text-[12px] font-sans text-paradigm-ink-soft ml-1">{p.period}</span>
                  </p>
                  <ul className="border-t border-paradigm-line/60 mt-4 mb-5 flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="border-b border-paradigm-line/60 py-2 text-[12px] text-paradigm-ink-soft">{f}</li>
                    ))}
                  </ul>
                  <Link href="/contact" className="inline-flex w-full justify-center items-center gap-2 bg-paradigm-ink text-paradigm-paper rounded-xl py-2.5 text-[11px] tracking-wider uppercase font-semibold hover:bg-paradigm-accent transition-colors">
                    お問い合わせ
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <RichCtaBand
        eyebrow={t("ctaEyebrow")}
        title={t("ctaTitle")}
        highlight={t("ctaHighlight")}
        desc={t("ctaDesc")}
        buttonLabel={t("ctaButton")}
      />
    </>
  )
}
