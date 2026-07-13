"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import type { DemoPremiumMedia, DemoServicesPage as DemoServicesPageData } from "@/lib/sales/demo-site-types"
import type { DemoTemplate, ServiceSectionId, ServiceCardStyle } from "@/lib/sales/demo-templates/registry"
import { headingSizeClass } from "@/lib/sales/demo-templates/registry"
import { JAPAN_ENTRY_CTA_EN, JAPAN_ENTRY_CTA_JA } from "@/lib/japan-entry-public-copy"
import {
  ServiceCardsDetailed,
  ServiceCardsMinimal,
  ServiceCardsIconLed,
  ServiceCardsImageLed,
  ProcessTimeline,
  PricingSection,
} from "./services/ServiceVariants"

interface Props {
  services: DemoServicesPageData
  companyName: string
  locale: string
  template?: DemoTemplate
  media?: DemoPremiumMedia
}

export function DemoServicesPage({ services, companyName: _companyName, locale, template, media }: Props) {
  const isJa = locale === "ja"
  const accent = services.accentColor || "#2563eb"
  const layout = template?.layout.services

  const renderSection = (sectionId: ServiceSectionId) => {
    switch (sectionId) {
      case "hero":
        return <ServicesHero services={services} isJa={isJa} accent={accent} template={template?.designTokens} media={media} />
      case "cards":
        return renderServiceCards(layout?.cardStyle ?? "detailed")
      case "process":
        return <ProcessTimeline services={services} isJa={isJa} accent={accent} template={template?.designTokens} />
      case "pricing":
        return <PricingSection isJa={isJa} accent={accent} template={template?.designTokens} />
      case "cta":
        return <ServicesCta isJa={isJa} accent={accent} services={services} />
      default:
        return null
    }
  }

  function renderServiceCards(style: ServiceCardStyle) {
    switch (style) {
      case "minimal": return <ServiceCardsMinimal services={services} isJa={isJa} accent={accent} template={template?.designTokens} />
      case "icon-led": return <ServiceCardsIconLed services={services} isJa={isJa} accent={accent} template={template?.designTokens} />
      case "image-led": return <ServiceCardsImageLed services={services} isJa={isJa} accent={accent} template={template?.designTokens} />
      default: return <ServiceCardsDetailed services={services} isJa={isJa} accent={accent} template={template?.designTokens} />
    }
  }

  return (
    <div className="[--page-accent:var(--svc-accent)]" style={{ "--svc-accent": accent } as React.CSSProperties}>
      {(layout?.sections ?? defaultServiceSections).map((sectionId) => (
        <div key={sectionId}>
          {renderSection(sectionId)}
        </div>
      ))}
    </div>
  )
}

const defaultServiceSections: ServiceSectionId[] = ["hero", "cards", "process"]

function ServicesHero({
  services, isJa, template, media,
}: { services: DemoServicesPageData; isJa: boolean; accent: string; template?: DemoTemplate["designTokens"]; media?: DemoPremiumMedia }) {
  const size = headingSizeClass(template?.typography.scale ?? "normal")
  return (
    <section className={`relative overflow-hidden px-4 pb-20 pt-24 sm:px-6 sm:pb-24 sm:pt-28 lg:px-8 ${media ? "min-h-[520px] bg-[#251914]" : "bg-gradient-to-br from-gray-50 via-white to-blue-50/50"}`}>
      {media?.kind === "image" && <Image src={media.src} alt={media.alt} fill priority sizes="100vw" className="object-cover" style={{ objectPosition: media.objectPosition ?? "center" }} />}
      {media?.kind === "video" && <video src={media.src} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" aria-label={media.alt} />}
      {media && <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/15" />}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <motion.div className={`relative mx-auto max-w-5xl ${media ? "pt-20 text-left sm:pt-28" : "text-center"}`}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className={`font-premium-serif ${size.h1} ${template?.typography.headingWeight ?? "font-extrabold"} tracking-tight ${media ? "max-w-3xl text-white" : "text-gray-900"}`}>
          {services.title}
        </h1>
        <p className={`${media ? "mr-auto text-white/75" : "mx-auto text-gray-500"} mt-6 max-w-2xl text-lg leading-relaxed sm:text-xl`}>{services.subtitle}</p>
      </motion.div>
    </section>
  )
}

function ServicesCta({ isJa, accent, services }: { isJa: boolean; accent: string; services: DemoServicesPageData }) {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8"
      style={{ background: `linear-gradient(135deg, ${accent}DD 0%, ${accent} 100%)` }}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.15)_0%,transparent_70%)]" />
      <motion.div className="relative mx-auto max-w-3xl text-center"
        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
        <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
          {services.ctaTitle ?? (isJa ? JAPAN_ENTRY_CTA_JA : JAPAN_ENTRY_CTA_EN)}
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-white/80">
          {services.ctaSubtitle ?? (isJa ? "お客様の課題に合わせた最適なプランをご提案します" : "We'll propose the optimal plan for your needs")}
        </p>
        <div className="mt-8">
          <a href={services.ctaHref ?? "https://cal.com/paradigm-jp/15min"} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl"
            style={{ color: accent }}>
            {services.ctaText ?? (isJa ? JAPAN_ENTRY_CTA_JA : JAPAN_ENTRY_CTA_EN)}
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </a>
        </div>
      </motion.div>
    </section>
  )
}
