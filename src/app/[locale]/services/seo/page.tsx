/**
 * /[locale]/services/seo — SEO/GEO 対策サービス詳細
 *
 * 役割:   SEO/GEO 対策サービス詳細
 * 入力:   params.locale
 * 出力:   ServiceDetailLayout + ComparisonBand (SEO vs GEO 2-col)
 *
 * AE-PHP-2 (P18-D 2026-05-08): 全 visible text を messages/{locale}.json:serviceDetail.seo 経由に統一.
 *   SEO_FEATURES / GEO_FEATURES 配列も serviceDetail.seo.{seoFeatures,geoFeatures} で構造化.
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import PageHero from "@/components/PageHero"
import ServiceDetailLayout from "@/components/aesop/ServiceDetailLayout"
import FadeIn from "@/components/aesop/FadeIn"
import { BorderBeam } from "@/components/magicui/border-beam"
import { getServiceByKey, getPricingFor } from "@/lib/data"
import { buildServiceSchema, buildBreadcrumbSchema } from "@/lib/seo/schemas"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "serviceDetail" })
  return {
    title: t("seo.metaTitle"),
    description: t("seo.metaDescription"),
    alternates: pageAlternates(locale, "/services/seo"),
  }
}

async function ComparisonBand({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "serviceDetail" })
  const seoFeatures = t.raw("seo.seoFeatures") as string[]
  const geoFeatures = t.raw("seo.geoFeatures") as string[]
  return (
    <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-40" />
      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
        <FadeIn className="mb-8 max-w-2xl">
          <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("seo.comparisonEyebrow")}</p>
          <h2 className="font-display text-[24px] md:text-[36px] leading-[1.15] tracking-[-0.02em] text-paradigm-ink">
            <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
              {t("seo.comparisonTitle")}
            </span>
          </h2>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <FadeIn>
            <div className="paradigm-glass rounded-2xl p-6 md:p-7 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500 h-full">
              <p className="paradigm-eyebrow text-paradigm-ink-mute mb-3">{t("seo.seoColEyebrow")}</p>
              <h3 className="font-display text-[18px] md:text-[22px] leading-[1.2] text-paradigm-ink mb-3 tracking-[-0.015em]">
                {t("seo.seoColTitle")}
              </h3>
              <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft mb-4 leading-[1.7]">
                {t("seo.seoColDesc")}
              </p>
              <ul className="space-y-1.5">
                {seoFeatures.map((f) => (
                  <li key={f} className="text-[12px] text-paradigm-ink-soft leading-[1.6] flex gap-2 items-start">
                    <span className="inline-block w-1 h-1 rounded-full bg-paradigm-ink-mute mt-1.5 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="relative paradigm-glass rounded-2xl p-6 md:p-7 paradigm-glow-md hover:paradigm-glow-lg transition-all duration-500 h-full border border-paradigm-accent/30">
              <BorderBeam size={200} duration={9} colorFrom="rgb(165 180 252)" colorTo="rgb(14 165 233)" borderWidth={1.5} />
              <p className="paradigm-eyebrow text-paradigm-accent mb-3 relative z-10">{t("seo.geoColEyebrow")}</p>
              <h3 className="font-display text-[18px] md:text-[22px] leading-[1.2] text-paradigm-ink mb-3 tracking-[-0.015em] relative z-10">
                <span className="bg-gradient-to-br from-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
                  {t("seo.geoColTitle")}
                </span>
              </h3>
              <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft mb-4 leading-[1.7] relative z-10">
                {t("seo.geoColDesc")}
              </p>
              <ul className="space-y-1.5 relative z-10">
                {geoFeatures.map((f) => (
                  <li key={f} className="text-[12px] text-paradigm-ink-soft leading-[1.6] flex gap-2 items-start">
                    <span className="inline-block w-1 h-1 rounded-full bg-gradient-to-br from-paradigm-accent to-paradigm-tech mt-1.5 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <p className="mt-5 paradigm-eyebrow text-paradigm-accent relative z-10">{t("seo.geoBadge")}</p>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

export default async function SeoServicePage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "serviceDetail" })
  const service = getServiceByKey(locale, "seo")
  const pricing = getPricingFor(locale, "seo")
  const serviceSchema = buildServiceSchema({
    name: service.title,
    description: service.desc,
    url: `https://paradigmjp.com/${locale}/services/seo`,
    locale,
    serviceType: "Search Engine Optimization",
  })
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: t("breadcrumbHome"), url: `https://paradigmjp.com/${locale}` },
    { name: t("breadcrumbServices"), url: `https://paradigmjp.com/${locale}/services` },
    { name: service.title, url: `https://paradigmjp.com/${locale}/services/seo` },
  ])
  return (
    <>
      <PageHero badge={t("seo.heroBadge")} title={service.title} desc={service.tagline} />
      <ServiceDetailLayout
        badge={t("seo.heroBadgeShort")}
        title={service.title}
        desc={service.desc}
        features={service.features}
        results={service.results}
        plans={pricing.plans}
        pricingFootnote={pricing.monthly}
        iconBg="from-paradigm-glow via-violet-400 to-paradigm-accent"
        beamFrom="rgb(165 180 252)"
        beamTo="rgb(79 70 229)"
        middleBand={<ComparisonBand locale={locale} />}
        ctaTitle={t("seo.ctaTitle")}
        ctaHighlight={t("seo.ctaHighlight")}
        ctaDesc={t("seo.ctaDesc")}
        ctaLabel={t("seo.ctaLabel")}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  )
}
