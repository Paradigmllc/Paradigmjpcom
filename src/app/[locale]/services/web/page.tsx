/**
 * /[locale]/services/web — Web 制作サービス詳細
 *
 * 役割:   Web 制作サービス詳細
 * 入力:   params.locale
 * 出力:   ServiceDetailLayout + middleBand sections (process / use cases / pricing)
 *
 * AE-PHP-2 (P18-D 2026-05-08): 全 visible text を messages/{locale}.json:serviceDetail.web 経由に統一.
 *   service 共通 keys (breadcrumb / cta) は serviceDetail 直下、service 固有は serviceDetail.web 配下.
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import PageHero from "@/components/PageHero"
import ServiceDetailLayout from "@/components/aesop/ServiceDetailLayout"
import { getServiceByKey, getPricingFor } from "@/lib/data"
import { buildServiceSchema, buildBreadcrumbSchema } from "@/lib/seo/schemas"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "serviceDetail" })
  return {
    title: t("web.metaTitle"),
    description: t("web.metaDescription"),
  }
}

export default async function WebServicePage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "serviceDetail" })
  const service = getServiceByKey(locale, "web")
  const pricing = getPricingFor(locale, "web")

  const serviceSchema = buildServiceSchema({
    name: service.title,
    description: service.desc,
    url: `https://paradigmjp.com/${locale}/services/web`,
    locale,
    serviceType: "Web Development",
  })
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: t("breadcrumbHome"), url: `https://paradigmjp.com/${locale}` },
    { name: t("breadcrumbServices"), url: `https://paradigmjp.com/${locale}/services` },
    { name: service.title, url: `https://paradigmjp.com/${locale}/services/web` },
  ])

  return (
    <>
      <PageHero
        badge={t("web.heroBadge")}
        title={service.title}
        desc={service.tagline}
      />
      <ServiceDetailLayout
        badge={t("web.heroBadge")}
        title={service.title}
        desc={service.desc}
        features={service.features}
        results={service.results}
        plans={pricing.plans}
        pricingFootnote={pricing.monthly}
        iconBg="from-pink-400 via-paradigm-accent to-paradigm-tech"
        beamFrom="rgb(244 114 182)"
        beamTo="rgb(14 165 233)"
        ctaTitle={t("web.ctaTitle")}
        ctaHighlight={t("ctaHighlight")}
        ctaDesc={t("ctaDesc")}
        ctaLabel={t("ctaLabel")}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  )
}
