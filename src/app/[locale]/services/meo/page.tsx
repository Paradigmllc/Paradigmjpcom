/**
 * /[locale]/services/meo — MEO 対策サービス詳細
 *
 * 役割:   MEO 対策サービス詳細
 * 入力:   params.locale
 * 出力:   ServiceDetailLayout + middleBand sections
 *
 * AE-PHP-2 (P18-D 2026-05-08): 全 visible text を messages/{locale}.json:serviceDetail.meo 経由に統一.
 *   PROCESS 配列も serviceDetail.meo.process[] で構造化 (12 locale で個別翻訳可能).
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import PageHero from "@/components/PageHero"
import ServiceDetailLayout from "@/components/aesop/ServiceDetailLayout"
import FadeIn from "@/components/aesop/FadeIn"
import { getServiceByKey, getPricingFor } from "@/lib/data"
import { buildServiceSchema, buildBreadcrumbSchema } from "@/lib/seo/schemas"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "serviceDetail" })
  return {
    title: t("meo.metaTitle"),
    description: t("meo.metaDescription"),
    alternates: pageAlternates(locale, "/services/meo"),
  }
}

interface ProcessStep { step: string; title: string; desc: string }

async function ProcessBand({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "serviceDetail" })
  const STEPS = t.raw("meo.process") as ProcessStep[]
  return (
    <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-40" />
      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-8">
        <FadeIn className="mb-8 max-w-2xl">
          <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("meo.processEyebrow")}</p>
          <h2 className="font-display text-[24px] md:text-[36px] leading-[1.15] tracking-[-0.02em] text-paradigm-ink">
            <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
              {t("meo.processTitle")}
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
  )
}

export default async function MeoServicePage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "serviceDetail" })
  const service = getServiceByKey(locale, "meo")
  const pricing = getPricingFor(locale, "meo")
  const serviceSchema = buildServiceSchema({
    name: service.title,
    description: service.desc,
    url: `https://paradigmjp.com/${locale}/services/meo`,
    locale,
    serviceType: "Local SEO",
  })
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: t("breadcrumbHome"), url: `https://paradigmjp.com/${locale}` },
    { name: t("breadcrumbServices"), url: `https://paradigmjp.com/${locale}/services` },
    { name: service.title, url: `https://paradigmjp.com/${locale}/services/meo` },
  ])

  return (
    <>
      <PageHero badge={t("meo.heroBadge")} title={service.title} desc={service.tagline} />
      <ServiceDetailLayout
        badge={t("meo.heroBadgeShort")}
        title={service.title}
        desc={service.desc}
        features={service.features}
        results={service.results}
        plans={pricing.plans}
        pricingFootnote={pricing.monthly}
        iconBg="from-paradigm-tech via-paradigm-glow to-violet-400"
        beamFrom="rgb(14 165 233)"
        beamTo="rgb(165 180 252)"
        middleBand={<ProcessBand locale={locale} />}
        ctaTitle={t("meo.ctaTitle")}
        ctaHighlight={t("meo.ctaHighlight")}
        ctaDesc={t("meo.ctaDesc")}
        ctaLabel={t("meo.ctaLabel")}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  )
}
