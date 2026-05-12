/**
 * /[locale]/lp/seo — SEO/GEO 対策専用 LP
 *
 * 役割:   SEO/GEO 対策専用 LP
 * 入力:   params.locale
 * 出力:   Comparison (SEO vs GEO) → CTA Band
 *
 * AE-PHP-2 準拠: 全 visible text を messages/{locale}.json:lpSeo 経由に統一。
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"
import { BorderBeam } from "@/components/magicui/border-beam"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "lpSeo" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: pageAlternates(locale, "/lp/seo"),
  }
}

export default async function SeoLP({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "lpSeo" })

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
          <FadeIn className="mb-8 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("comparisonEyebrow")}</p>
            <h2 className="font-display text-[24px] md:text-[36px] leading-[1.15] tracking-[-0.02em] text-paradigm-ink">
              <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
                {t("comparisonHeading")}
              </span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <FadeIn>
              <div className="paradigm-glass rounded-2xl p-6 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500 h-full">
                <p className="paradigm-eyebrow text-paradigm-ink-mute mb-3">{t("conventionalLabel")}</p>
                <h3 className="font-display text-[20px] md:text-[24px] leading-[1.15] text-paradigm-ink mb-3 tracking-[-0.015em]">
                  {t("conventionalTitle")}
                </h3>
                <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft mb-4 leading-[1.7]">
                  {t("conventionalDesc")}
                </p>
                <p className="font-display text-[28px] text-paradigm-ink mb-1 tracking-[-0.02em]">
                  {t("conventionalStat")}
                </p>
                <p className="paradigm-eyebrow text-paradigm-ink-mute text-[10px]">
                  {t("conventionalStatLabel")}
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="relative paradigm-glass rounded-2xl p-6 paradigm-glow-md hover:paradigm-glow-lg transition-all duration-500 h-full border border-paradigm-accent/30">
                <BorderBeam size={200} duration={9} colorFrom="rgb(165 180 252)" colorTo="rgb(14 165 233)" borderWidth={1.5} />
                <p className="paradigm-eyebrow text-paradigm-accent mb-3 relative z-10">{t("newLabel")}</p>
                <h3 className="font-display text-[20px] md:text-[24px] leading-[1.15] text-paradigm-ink mb-3 tracking-[-0.015em] relative z-10">
                  <span className="bg-gradient-to-br from-paradigm-tech via-paradigm-glow to-paradigm-accent bg-clip-text text-transparent">
                    {t("newTitle")}
                  </span>
                </h3>
                <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft mb-4 leading-[1.7] relative z-10">
                  {t("newDesc")}
                </p>
                <p className="font-display text-[28px] mb-1 tracking-[-0.02em] relative z-10">
                  <span className="bg-gradient-to-br from-paradigm-accent to-paradigm-tech bg-clip-text text-transparent">
                    {t("newStat")}
                  </span>
                </p>
                <p className="paradigm-eyebrow text-paradigm-accent text-[10px] relative z-10">
                  {t("newStatLabel")}
                </p>
              </div>
            </FadeIn>
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
