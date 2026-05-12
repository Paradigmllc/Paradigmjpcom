/**
 * /[locale]/lp/ai — AI 導入支援専用 LP
 *
 * 役割:   AI 導入支援専用 LP
 * 入力:   params.locale
 * 出力:   Stats → FAQ → CTA Band
 *
 * AE-PHP-2 準拠: 全 visible text を messages/{locale}.json:lpAi 経由に統一。
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "lpAi" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: pageAlternates(locale, "/lp/ai"),
  }
}

type Stat = { num: string; label: string; desc: string; gradient: string }
type Faq = { q: string; a: string }

export default async function AiLP({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "lpAi" })
  const stats = t.raw("stats") as Stat[]
  const faqs = t.raw("faqs") as Faq[]

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
              <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-pink-400 bg-clip-text text-transparent">
                {t("outcomesHeading")}
              </span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {stats.map((s, i) => (
              <FadeIn key={s.label} delay={i * 0.1}>
                <div className="paradigm-glass rounded-2xl p-6 paradigm-glow-sm hover:paradigm-glow-lg hover:-translate-y-1 transition-all duration-500 h-full">
                  <p className="font-display text-[40px] md:text-[56px] leading-[0.95] tracking-[-0.03em] mb-3">
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
        <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-8 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("faqEyebrow")}</p>
            <h2 className="font-display text-[24px] md:text-[36px] leading-[1.15] tracking-[-0.02em] text-paradigm-ink">
              {t("faqHeading")}
            </h2>
          </FadeIn>
          <ul className="space-y-3">
            {faqs.map((f, i) => (
              <FadeIn key={f.q} delay={i * 0.08}>
                <li className="paradigm-glass rounded-2xl p-5 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500">
                  <p className="font-display text-[16px] md:text-[18px] leading-[1.3] text-paradigm-ink mb-2 tracking-[-0.01em]">{f.q}</p>
                  <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft leading-[1.75]">{f.a}</p>
                </li>
              </FadeIn>
            ))}
          </ul>
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
