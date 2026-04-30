import type { Metadata } from "next"
import PageHero from "@/components/PageHero"
import ServiceDetailLayout from "@/components/aesop/ServiceDetailLayout"
import { SERVICES, PRICING } from "@/lib/data"

export const metadata: Metadata = {
  title: "Web制作",
  description: "Next.js/WordPressによる高速・SEO最適化されたWebサイト制作。デザインからコーディング、公開後の運用まで一貫してサポートします。",
}

export default function WebServicePage() {
  const service = SERVICES.find((s) => s.id === "web")!
  const pricing = PRICING.web

  return (
    <>
      <PageHero
        badge="Web 制作"
        title={service.title}
        highlight={service.title.includes("制作") ? "制作" : undefined}
        desc={service.tagline}
      />
      <ServiceDetailLayout
        badge="Web 制作"
        title={service.title}
        desc={service.desc}
        features={service.features}
        results={service.results}
        plans={pricing.plans}
        pricingFootnote={pricing.monthly}
        iconBg="from-pink-400 via-paradigm-accent to-paradigm-tech"
        beamFrom="rgb(244 114 182)"
        beamTo="rgb(14 165 233)"
        ctaTitle="Web 制作のご相談はこちら"
        ctaHighlight="ご相談"
        ctaDesc="初回30分の無料オンライン相談を受け付けています。"
        ctaLabel="無料相談を予約する"
      />
    </>
  )
}
