/**
 * /[locale]/services/web — Web 制作サービス詳細
 *
 * 役割:   Web 制作サービス詳細
 * 入力:   params.locale
 * 出力:   ServiceDetailLayout + middleBand sections (process / use cases / pricing)
 *
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import PageHero from "@/components/PageHero"
import ServiceDetailLayout from "@/components/aesop/ServiceDetailLayout"
import { getServiceByKey, getPricingFor } from "@/lib/data"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isJa = locale === "ja"
  return {
    title: isJa ? "Web制作" : "Web Development",
    description: isJa
      ? "Next.js/WordPressによる高速・SEO最適化されたWebサイト制作。デザインからコーディング、公開後の運用まで一貫してサポート。"
      : "High-performance, SEO-optimised Next.js / WordPress sites — design through post-launch operations.",
  }
}

export default async function WebServicePage({ params }: Props) {
  const { locale } = await params
  const isJa = locale === "ja"
  const service = getServiceByKey(locale, "web")
  const pricing = getPricingFor(locale, "web")

  return (
    <>
      <PageHero
        badge={isJa ? "Web 制作" : "Web Development"}
        title={service.title}
        desc={service.tagline}
      />
      <ServiceDetailLayout
        badge={isJa ? "Web 制作" : "Web Development"}
        title={service.title}
        desc={service.desc}
        features={service.features}
        results={service.results}
        plans={pricing.plans}
        pricingFootnote={pricing.monthly}
        locale={locale}
        iconBg="from-pink-400 via-paradigm-accent to-paradigm-tech"
        beamFrom="rgb(244 114 182)"
        beamTo="rgb(14 165 233)"
        ctaTitle={isJa ? "Web 制作のご相談はこちら" : "Talk to us about web development"}
        ctaHighlight={isJa ? "ご相談" : "Talk to us"}
        ctaDesc={isJa ? "初回30分の無料オンライン相談を受け付けています。" : "First 30-minute consultation is on us."}
        ctaLabel={isJa ? "無料相談を予約する" : "Book a free consultation"}
      />
    </>
  )
}
