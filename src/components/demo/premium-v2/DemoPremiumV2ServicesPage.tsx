"use client"

import { ArrowUpRight, Check } from "lucide-react"
import type { DemoMultiPageData } from "@/lib/sales/demo-site-types"
import { PremiumV2Media, PremiumV2MediaCarousel, PremiumV2PageHero, PremiumV2Reveal } from "./PremiumV2Primitives"

export function DemoPremiumV2ServicesPage({ data }: { data: DemoMultiPageData }) {
  const premium = data.premium!
  const services = data.pages.services
  const media = premium.gallery.length > 0 ? premium.gallery : premium.heroMedia
  const hero = media[1] ?? media[0] ?? premium.heroMedia[0]
  const ctaHref = services.ctaHref ?? `/${data.slug}/contact`
  const isExternalCta = /^https?:\/\//u.test(ctaHref)

  return (
    <div className="overflow-hidden bg-[#f4f1e9] text-[#171713]">
      <PremiumV2PageHero title={services.title} subtitle={services.subtitle} eyebrow="SELECTION" media={hero} />

      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-36">
        <div className="mx-auto max-w-7xl">
          <PremiumV2Reveal className="mb-14 grid gap-7 border-b border-black/20 pb-10 lg:grid-cols-[1fr_.55fr] lg:items-end">
            <div><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-accent)]">{data.presentation?.servicesEyebrow ?? "SERVICES"}</p><h2 className="mt-5 font-premium-serif text-4xl tracking-[-.045em] sm:text-6xl">{data.presentation?.servicesHeading ?? services.title}</h2></div>
            <p className="text-sm leading-7 text-black/55">{services.subtitle}</p>
          </PremiumV2Reveal>
          <div className="space-y-16 sm:space-y-24">
            {services.services.map((service, index) => {
              const itemMedia = media[index % media.length] ?? hero
              return (
                <PremiumV2Reveal key={service.title} className={`grid gap-8 lg:grid-cols-2 lg:items-stretch ${index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}>
                  <div className="group relative min-h-[380px] overflow-hidden bg-black/10 sm:min-h-[520px]"><PremiumV2Media media={itemMedia} className="absolute inset-0" sizes="(max-width: 1024px) 100vw, 50vw" /><div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" /><span className="absolute bottom-6 left-6 font-premium-serif text-5xl italic text-white/80">0{index + 1}</span></div>
                  <div className="flex flex-col justify-center border-y border-black/15 py-9 lg:px-12">
                    {service.priceNote && <p className="text-[10px] font-bold uppercase tracking-[.28em] text-[var(--demo-accent)]">{service.priceNote}</p>}
                    <h3 className="mt-5 font-premium-serif text-4xl tracking-[-.04em] sm:text-5xl">{service.title}</h3>
                    <p className="mt-6 text-base leading-8 text-black/62">{service.description}</p>
                    <ul className="mt-8 border-t border-black/15">
                      {service.features.map((feature) => <li key={feature} className="flex items-center gap-4 border-b border-black/15 py-4 text-sm"><span className="grid h-7 w-7 place-items-center rounded-full bg-black text-white"><Check className="h-3.5 w-3.5" /></span>{feature}</li>)}
                    </ul>
                  </div>
                </PremiumV2Reveal>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#171713] px-5 py-20 text-white sm:px-10 sm:py-28 lg:px-16 lg:py-36">
        <div className="mx-auto max-w-7xl">
          <PremiumV2Reveal className="mb-12"><p className="text-xs font-bold uppercase tracking-[.3em] text-white/40">{services.processEyebrow ?? "FLOW"}</p><h2 className="mt-5 font-premium-serif text-4xl tracking-[-.045em] sm:text-6xl">{services.processTitle ?? "ご利用の流れ。"}</h2></PremiumV2Reveal>
          <div className="grid gap-px bg-white/15 lg:grid-cols-3">
            {services.process.map((step, index) => <PremiumV2Reveal key={step.step} delay={index * 0.06} className="min-h-72 bg-[#171713] p-7 sm:p-9"><span className="font-premium-serif text-5xl italic text-white/20">0{step.step}</span><h3 className="mt-12 font-premium-serif text-3xl">{step.title}</h3><p className="mt-5 text-sm leading-7 text-white/55">{step.description}</p></PremiumV2Reveal>)}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-36">
        <div className="mx-auto max-w-7xl">
          <PremiumV2Reveal className="mb-10"><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-accent)]">Gallery</p><h2 className="mt-5 font-premium-serif text-4xl tracking-[-.045em] sm:text-6xl">{data.companyName}のサービスイメージ。</h2></PremiumV2Reveal>
          <PremiumV2MediaCarousel media={media} label={`${data.companyName}のサービスイメージスライダー`} />
        </div>
      </section>

      <section className="bg-[var(--demo-accent)] px-5 py-20 text-white sm:px-10 sm:py-24 lg:px-16">
        <PremiumV2Reveal className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[.3em] text-white/55">Latest lineup</p><h2 className="mt-5 font-premium-serif text-4xl leading-tight tracking-[-.04em] sm:text-6xl">{services.ctaTitle}</h2><p className="mt-5 max-w-xl text-base leading-8 text-white/70">{services.ctaSubtitle}</p></div>
          <a href={ctaHref} {...(isExternalCta ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="inline-flex min-h-13 items-center justify-center gap-3 bg-white px-8 text-sm font-bold text-black">{services.ctaText ?? data.meta.primaryCtaLabel ?? "お問い合わせ"}<ArrowUpRight className="h-4 w-4" /></a>
        </PremiumV2Reveal>
      </section>
    </div>
  )
}
