"use client"

import { ArrowUpRight, Check, Scissors } from "lucide-react"
import type { DemoMultiPageData } from "@/lib/sales/demo-site-types"
import { demoHeadlineClass, resolveDemoArtDirection } from "@/lib/sales/demo-art-direction"
import { PremiumV3Media, PremiumV3MediaCarousel, PremiumV3PageHero, PremiumV3Reveal, PremiumV3Stagger, PremiumV3StaggerItem } from "./PremiumV3Primitives"

export function shouldSpanOddServiceRow(index: number, count: number): boolean {
  return count % 2 === 1 && index === count - 1
}

export function DemoPremiumV3BeautyServices({ data }: { data: DemoMultiPageData }) {
  const premium = data.premium!
  const services = data.pages.services
  const media = premium.gallery.length > 0 ? premium.gallery : premium.heroMedia
  const hero = media[1] ?? media[0] ?? premium.heroMedia[0]
  const direction = resolveDemoArtDirection(data)
  const motionStyle = data.designRecipe?.motionVariant
  const ctaHref = services.ctaHref ?? `/${data.slug}/contact`
  const isExternalCta = /^https?:\/\//u.test(ctaHref)

  return (
    <div className="overflow-hidden bg-[var(--demo-surface)] text-[var(--demo-ink)] [font-feature-settings:'palt']">
      <PremiumV3PageHero title={services.title} subtitle={services.subtitle} eyebrow="サロンメニュー" media={hero} mediaGallery={media} recipe={data.designRecipe} variant={direction.hero} />

      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-36">
        <div className="mx-auto max-w-7xl">
          <PremiumV3Reveal motionStyle={motionStyle} className="mb-12 grid gap-8 border-b border-[var(--demo-line)] pb-10 lg:grid-cols-[1fr_.62fr] lg:items-end">
            <div><p className="flex items-center gap-3 text-xs font-bold tracking-[.22em] text-[var(--demo-accent)]"><Scissors className="h-4 w-4" />メニューのご案内</p><h2 className={`${demoHeadlineClass(data.presentation?.servicesHeading ?? services.title)} mt-6 whitespace-pre-line font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{data.presentation?.servicesHeading ?? services.title}</h2></div>
            <p className="text-sm leading-8 text-[var(--demo-muted)]">{services.subtitle} ご希望や髪の状態に合わせた正式な内容は、ご予約時にご確認ください。</p>
          </PremiumV3Reveal>
          <div className="grid gap-px bg-[var(--demo-line)] md:grid-cols-2">
            {services.services.map((service, index) => {
              const itemMedia = media[index % media.length] ?? hero
              const spansFullRow = shouldSpanOddServiceRow(index, services.services.length)
              return <PremiumV3Reveal key={service.title} motionStyle={motionStyle} delay={index * 0.04} className={`group grid bg-[var(--demo-surface)] sm:grid-cols-[180px_1fr] ${spansFullRow ? "md:col-span-2 md:grid-cols-[minmax(260px,0.72fr)_1.28fr]" : ""}`}><div className="relative aspect-square overflow-hidden sm:aspect-auto sm:min-h-72"><PremiumV3Media media={itemMedia} className="absolute inset-0" sizes={spansFullRow ? "(max-width:640px) 100vw, (max-width:1280px) 36vw, 360px" : "(max-width:640px) 100vw, 180px"} /><div className="absolute inset-0 bg-gradient-to-t from-black/46 via-transparent to-transparent" /><span className="absolute bottom-4 left-4 text-[10px] font-bold tracking-[.22em] text-white/78">MENU {String(index + 1).padStart(2, "0")}</span></div><div className="p-7 sm:p-8"><h3 className={`${demoHeadlineClass(service.title, "card")} font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{service.title}</h3><p className="mt-5 text-sm leading-8 text-[var(--demo-muted)]">{service.description}</p><ul className="mt-7 grid gap-3 border-t border-[var(--demo-line)] pt-5">{service.features.map((feature) => <li key={feature} className="flex items-start gap-3 text-xs leading-6"><Check className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--demo-accent)]" />{feature}</li>)}</ul></div></PremiumV3Reveal>
            })}
          </div>
        </div>
      </section>

      <section className="bg-[var(--demo-ink)] px-5 py-20 text-white sm:px-10 sm:py-28 lg:px-16"><div className="mx-auto max-w-7xl"><PremiumV3Reveal motionStyle={motionStyle} className="grid gap-8 border-b border-white/15 pb-10 lg:grid-cols-[1fr_.62fr] lg:items-end"><div><p className="text-xs font-bold tracking-[.22em] text-white/48">ご利用の流れ</p><h2 className={`${demoHeadlineClass(services.processTitle ?? "ご予約からご来店まで")} mt-5 font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{services.processTitle ?? "ご予約からご来店まで。"}</h2></div><p className="text-sm leading-8 text-white/58">初めての方にも流れが分かるよう、確認できる手順をまとめています。</p></PremiumV3Reveal><PremiumV3Stagger className="grid md:grid-cols-2 lg:grid-cols-4">{services.process.map((step, index) => <PremiumV3StaggerItem key={step.step} className="border-b border-white/15 py-8 md:border-r md:px-7"><span className="text-xs text-white/35">0{index + 1}</span><h3 className="mt-8 text-xl font-medium [font-family:var(--demo-font-display)]">{step.title}</h3><p className="mt-4 text-sm leading-7 text-white/58">{step.description}</p></PremiumV3StaggerItem>)}</PremiumV3Stagger></div></section>

      <section className="bg-[var(--demo-surface-alt)] px-5 py-20 sm:px-10 sm:py-28 lg:px-16"><div className="mx-auto max-w-7xl"><PremiumV3Reveal motionStyle={motionStyle} className="mb-10"><p className="text-xs font-bold tracking-[.22em] text-[var(--demo-accent)]">スタイルとサロンの空気</p><h2 className={`${demoHeadlineClass(`${data.companyName}のスタイル`)} mt-5 font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{data.companyName}のスタイル。</h2></PremiumV3Reveal><PremiumV3MediaCarousel media={media} label={`${data.companyName}のスタイルスライダー`} variant="compact" /></div></section>

      <section className="px-5 py-20 sm:px-10 sm:py-24 lg:px-16"><PremiumV3Reveal motionStyle={motionStyle} className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-xs font-bold tracking-[.22em] text-[var(--demo-accent)]">ご予約・最新情報</p><h2 className={`${demoHeadlineClass(services.ctaTitle ?? "最新のご案内")} mt-5 font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{services.ctaTitle ?? "最新のご案内"}</h2><p className="mt-5 max-w-xl text-base leading-8 text-[var(--demo-muted)]">{services.ctaSubtitle}</p></div><a href={ctaHref} {...(isExternalCta ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="inline-flex min-h-12 items-center justify-center gap-3 bg-[var(--demo-ink)] px-8 text-sm font-bold text-white">{services.ctaText ?? data.meta.primaryCtaLabel ?? "ご予約・お問い合わせ"}<ArrowUpRight className="h-4 w-4" /></a></PremiumV3Reveal></section>
    </div>
  )
}
