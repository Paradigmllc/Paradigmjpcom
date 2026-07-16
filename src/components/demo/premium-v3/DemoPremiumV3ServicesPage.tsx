"use client"

import { ArrowUpRight, Check } from "lucide-react"
import type { DemoMultiPageData } from "@/lib/sales/demo-site-types"
import { demoHeadlineClass, resolveDemoArtDirection } from "@/lib/sales/demo-art-direction"
import { PremiumV3Media, PremiumV3MediaCarousel, PremiumV3PageHero, PremiumV3Reveal } from "./PremiumV3Primitives"
import { DemoPremiumV3BeautyServices } from "./DemoPremiumV3BeautyServices"
import { DemoPremiumV3Narrative } from "./DemoPremiumV3Narrative"

export function DemoPremiumV3ServicesPage({ data }: { data: DemoMultiPageData }) {
  const direction = resolveDemoArtDirection(data)
  if (data.industry === "beauty_salon" && direction.serviceLayout === "salon-catalogue") return <DemoPremiumV3BeautyServices data={data} />

  const premium = data.premium!
  const services = data.pages.services
  const media = premium.gallery.length > 0 ? premium.gallery : premium.heroMedia
  const hero = media[1] ?? media[0] ?? premium.heroMedia[0]
  const ctaHref = services.ctaHref ?? `/${data.slug}/contact`
  const isExternalCta = /^https?:\/\//u.test(ctaHref)
  const motionStyle = data.designRecipe?.motionVariant
  const faq = data.pages.faq?.sections.slice(0, 4) ?? []
  const isRestaurant = data.presentation?.industryProfile === "restaurant" || data.industry === "restaurant"

  return (
    <div className="overflow-hidden bg-[var(--demo-surface)] text-[var(--demo-ink)]">
      <PremiumV3PageHero title={services.title} subtitle={services.subtitle} eyebrow={data.presentation?.servicesEyebrow ?? "サービス"} media={hero} mediaGallery={direction.hero === "mosaic" ? media : undefined} recipe={data.designRecipe} variant={direction.hero} mosaicLayout="strip" />
      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <PremiumV3Reveal motionStyle={motionStyle} className="grid gap-8 border-b border-[var(--demo-line)] pb-10 lg:grid-cols-[1fr_.62fr] lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-accent)]">{isRestaurant ? "MENU" : "LINEUP"}</p><h2 className={`mt-5 [font-family:var(--demo-font-display)] ${demoHeadlineClass(data.presentation?.servicesHeading ?? services.title)}`}>{data.presentation?.servicesHeading ?? services.title}</h2></div><p className="text-sm leading-8 text-[var(--demo-muted)]">{services.subtitle} 掲載されていない内容や現在の提供状況は、公式情報をご確認ください。</p></PremiumV3Reveal>
          {direction.serviceLayout === "precision-grid" ? <div className="mt-14 grid gap-px bg-[var(--demo-line)] md:grid-cols-3">
            {services.services.map((service, index) => {
              const itemMedia = media[index % media.length] ?? hero
              return <PremiumV3Reveal key={service.title} motionStyle={motionStyle} delay={index * 0.05} className="group bg-[var(--demo-surface)]"><div className="relative aspect-[4/3] overflow-hidden"><PremiumV3Media media={itemMedia} className="absolute inset-0" sizes="(max-width:768px) 100vw, 33vw" /><span className="absolute left-4 top-4 bg-[var(--demo-ink)] px-3 py-2 text-[10px] font-bold tracking-[.24em] text-white">0{index + 1}</span></div><div className="p-7 sm:p-8"><h3 className="text-3xl tracking-[-.03em] [font-family:var(--demo-font-display)]">{service.title}</h3><p className="mt-5 text-sm leading-8 text-[var(--demo-muted)]">{service.description}</p><ul className="mt-7 border-t border-[var(--demo-line)] pt-5">{service.features.map((feature) => <li key={feature} className="flex items-start gap-3 py-2 text-xs leading-6"><Check className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--demo-accent)]" />{feature}</li>)}</ul></div></PremiumV3Reveal>
            })}
          </div> : direction.serviceLayout === "salon-catalogue" ? <div className="mt-14 grid gap-5 md:grid-cols-2">
            {services.services.map((service, index) => {
              const itemMedia = media[index % media.length] ?? hero
              return <PremiumV3Reveal key={service.title} motionStyle={motionStyle} delay={index * 0.05} className={`group relative min-h-[520px] overflow-hidden ${index === 2 ? "md:col-span-2" : ""}`}><PremiumV3Media media={itemMedia} className="absolute inset-0" sizes={index === 2 ? "100vw" : "(max-width:768px) 100vw, 50vw"} /><div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/15 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-7 text-white sm:p-9"><p className="text-[10px] font-bold tracking-[.26em] text-white/55">COLLECTION 0{index + 1}</p><h3 className="mt-4 text-4xl tracking-[-.03em] [font-family:var(--demo-font-display)]">{service.title}</h3><p className="mt-4 max-w-2xl text-sm leading-7 text-white/72">{service.description}</p><p className="mt-5 text-xs leading-6 text-white/55">{service.features.join(" ／ ")}</p></div></PremiumV3Reveal>
            })}
          </div> : <div className="mt-14 space-y-20 sm:mt-20 sm:space-y-28">
            {services.services.map((service, index) => {
              const itemMedia = media[index % media.length] ?? hero
              return <PremiumV3Reveal key={service.title} motionStyle={motionStyle} className={`grid gap-9 lg:grid-cols-[1.05fr_.95fr] lg:items-stretch ${index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}><div className="group relative min-h-[380px] overflow-hidden bg-black/10 sm:min-h-[500px]"><PremiumV3Media media={itemMedia} className="absolute inset-0" sizes="(max-width:1024px) 100vw, 52vw" /><div className="absolute inset-0 bg-gradient-to-t from-black/58 via-transparent to-transparent" /><span className="absolute bottom-6 left-6 text-5xl italic text-white/82 [font-family:var(--demo-font-display)]">0{index + 1}</span></div><div className="flex flex-col justify-center border-y border-[var(--demo-line)] py-9 lg:px-10"><p className="text-[10px] font-bold uppercase tracking-[.28em] text-[var(--demo-accent)]">{data.meta.navLabels?.services ?? "Service"} 0{index + 1}</p><h3 className="mt-5 text-4xl tracking-[-.03em] sm:text-5xl [font-family:var(--demo-font-display)]">{service.title}</h3><p className="mt-6 text-base leading-9 text-[var(--demo-muted)]">{service.description}</p><ul className="mt-8 border-t border-[var(--demo-line)]">{service.features.map((feature) => <li key={feature} className="flex items-center gap-4 border-b border-[var(--demo-line)] py-4 text-sm"><span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--demo-ink)] text-white"><Check className="h-3.5 w-3.5" /></span>{feature}</li>)}</ul></div></PremiumV3Reveal>
            })}
          </div>}
        </div>
      </section>

      <DemoPremiumV3Narrative
        modules={services.guidance ?? []}
        label="SERVICE GUIDE"
        title={isRestaurant ? "選ぶ前に、知っておきたいこと。" : "利用前に、知っておきたいこと。"}
        introduction={isRestaurant ? "メニューの違いだけでなく、店内で過ごす時間やご来店前の確認事項を整理しました。" : "提供内容の違いだけでなく、相談から利用後までを具体的に想像できる情報を整理しました。"}
        motionStyle={motionStyle}
        variant="editorial"
      />

      <section className="bg-[var(--demo-ink)] px-5 py-20 text-white sm:px-10 sm:py-28 lg:px-16 lg:py-32"><div className="mx-auto max-w-7xl"><PremiumV3Reveal motionStyle={motionStyle} className="mb-10 grid gap-6 md:grid-cols-[1fr_.55fr] md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.3em] text-white/42">{services.processEyebrow ?? "FLOW"}</p><h2 className="mt-5 text-4xl tracking-[-.035em] sm:text-6xl [font-family:var(--demo-font-display)]">{services.processTitle ?? "ご利用の流れ。"}</h2></div><p className="text-sm leading-8 text-white/55">ご利用方法は商品・サービスによって異なります。ここでは確認済みの案内をもとに、基本的な流れを紹介します。</p></PremiumV3Reveal><div className="grid border-t border-white/15 md:grid-cols-2">{services.process.map((step, index) => <PremiumV3Reveal key={step.step} motionStyle={motionStyle} delay={index * 0.05} className="grid min-h-64 grid-cols-[70px_1fr] gap-4 border-b border-white/15 py-8 md:border-r md:px-8"><span className="text-sm text-white/32">0{step.step}</span><div><h3 className="text-3xl [font-family:var(--demo-font-display)]">{step.title}</h3><p className="mt-5 text-sm leading-8 text-white/56">{step.description}</p></div></PremiumV3Reveal>)}</div></div></section>

      <section className="bg-[var(--demo-surface-alt)] px-5 py-20 sm:px-10 sm:py-28 lg:px-16"><div className="mx-auto max-w-7xl"><PremiumV3Reveal motionStyle={motionStyle} className="mb-10"><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-muted)]">Gallery</p><h2 className="mt-5 text-4xl tracking-[-.035em] sm:text-6xl [font-family:var(--demo-font-display)]">{data.companyName}の{data.meta.navLabels?.services ?? "サービス"}。</h2></PremiumV3Reveal><PremiumV3MediaCarousel media={media} label={`${data.companyName}のサービスイメージスライダー`} /></div></section>

      {faq.length > 0 && <section className="px-5 py-20 sm:px-10 sm:py-24 lg:px-16"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.55fr_1.45fr]"><PremiumV3Reveal motionStyle={motionStyle}><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-accent)]">{isRestaurant ? "Before you visit" : "Before you inquire"}</p><h2 className="mt-5 text-4xl tracking-[-.03em] sm:text-5xl [font-family:var(--demo-font-display)]">よくあるご質問。</h2></PremiumV3Reveal><div className="border-t border-[var(--demo-line)]">{faq.map((item) => <details key={item.id} className="border-b border-[var(--demo-line)]"><summary className="cursor-pointer list-none py-6 text-lg font-semibold marker:hidden">{item.heading}</summary><p className="max-w-3xl pb-7 text-sm leading-8 text-[var(--demo-muted)]">{item.body}</p></details>)}</div></div></section>}

      <section className="bg-[var(--demo-accent)] px-5 py-20 text-white sm:px-10 sm:py-24 lg:px-16"><PremiumV3Reveal motionStyle={motionStyle} className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.3em] text-white/55">Latest information</p><h2 className="mt-5 text-4xl leading-tight tracking-[-.035em] sm:text-6xl [font-family:var(--demo-font-display)]">{services.ctaTitle}</h2><p className="mt-5 max-w-xl text-base leading-8 text-white/74">{services.ctaSubtitle}</p></div><a href={ctaHref} {...(isExternalCta ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="inline-flex min-h-13 items-center justify-center gap-3 bg-white px-8 text-sm font-bold text-black">{services.ctaText ?? data.meta.primaryCtaLabel ?? "お問い合わせ"}<ArrowUpRight className="h-4 w-4" /></a></PremiumV3Reveal></section>
    </div>
  )
}
