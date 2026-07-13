"use client"

import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react"
import { FaInstagram } from "react-icons/fa6"
import type { DemoMultiPageData } from "@/lib/sales/demo-site-types"
import { PremiumV3Media, PremiumV3MediaCarousel, PremiumV3Reveal } from "./PremiumV3Primitives"

export function DemoPremiumV3HomePage({ data }: { data: DemoMultiPageData }) {
  const premium = data.premium!
  const home = data.pages.home
  const basePath = `/${data.slug}`
  const hero = premium.heroMedia[0]
  const secondary = premium.heroMedia[1] ?? premium.gallery[0] ?? hero
  const mapHref = data.pages.contact.mapUrl ?? `${basePath}/contact`
  const instagram = premium.social.find((item) => item.network === "instagram")?.href
  const serviceHighlights = data.pages.services.services.slice(0, 3)
  const faq = data.pages.faq?.sections.slice(0, 3) ?? []
  const presentation = data.presentation
  const isExternalPrimary = /^https?:\/\//u.test(home.hero.primaryCta.href)
  const isExternalMap = /^https?:\/\//u.test(mapHref)
  const motionStyle = data.designRecipe?.motionVariant
  const isRestaurant = data.industry === "restaurant"
  const precisionHero = data.brandSystem?.heroTone === "precision"
  const aboutLabel = data.meta.navLabels?.about ?? (isRestaurant ? "お店について" : "私たちについて")

  return (
    <div className="overflow-hidden bg-[var(--demo-surface)] text-[var(--demo-ink)]">
      {precisionHero ? <section className="grid min-h-[660px] bg-[var(--demo-surface)] lg:grid-cols-[.92fr_1.08fr]">
        <div className="flex items-end px-5 pb-14 pt-28 sm:px-10 sm:pb-20 lg:px-16 lg:pb-24">
          <PremiumV3Reveal motionStyle={motionStyle}>
            <p className="mb-7 text-[10px] font-bold uppercase tracking-[.34em] text-[var(--demo-accent)] sm:text-xs">{home.hero.tagline}</p>
            <h1 className="max-w-4xl text-[clamp(2.8rem,5vw,5.6rem)] font-[var(--demo-heading-weight)] leading-[.98] tracking-[-.045em] text-balance [font-family:var(--demo-font-display)]">{home.hero.title}</h1>
            <p className="mt-8 max-w-2xl border-l border-[var(--demo-line)] pl-5 text-base leading-8 text-[var(--demo-muted)] sm:text-lg">{home.hero.subtitle}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href={home.hero.primaryCta.href} {...(isExternalPrimary ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="inline-flex min-h-12 items-center justify-center gap-3 bg-[var(--demo-ink)] px-7 text-sm font-bold text-white transition hover:-translate-y-1">{home.hero.primaryCta.text}<ArrowUpRight className="h-4 w-4" /></a>
              <a href={`${basePath}/about`} className="inline-flex min-h-12 items-center justify-center border border-[var(--demo-line)] px-7 text-sm font-bold">{aboutLabel}</a>
            </div>
          </PremiumV3Reveal>
        </div>
        <div className="group relative min-h-[520px] overflow-hidden lg:min-h-[660px]"><PremiumV3Media media={hero} priority className="absolute inset-0" sizes="(max-width:1024px) 100vw, 54vw" /><div className="absolute inset-0 bg-gradient-to-t from-black/36 via-transparent to-transparent" /><div className="absolute bottom-7 left-7 border-l border-white/55 pl-4 text-xs uppercase tracking-[.26em] text-white/80">{home.hero.locationLabel}</div></div>
      </section> : <section className="relative min-h-[620px] lg:min-h-[calc(100svh-4.9rem)]">
        <PremiumV3Media media={hero} priority className="absolute inset-0" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/76 via-black/34 to-black/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/48 via-transparent to-black/12" />
        <div className="relative mx-auto flex min-h-[620px] max-w-[1500px] flex-col justify-end px-5 pb-14 pt-28 text-white sm:px-10 sm:pb-18 lg:min-h-[calc(100svh-4.9rem)] lg:px-16 lg:pb-20">
          <PremiumV3Reveal motionStyle={motionStyle}>
            <p className="mb-6 text-[10px] font-bold uppercase tracking-[.34em] text-white/68 sm:text-xs">{home.hero.tagline}</p>
            <h1 className="max-w-4xl text-[clamp(2.7rem,5.2vw,5.3rem)] font-[var(--demo-heading-weight)] leading-[1.01] tracking-[-.035em] text-balance [font-family:var(--demo-font-display)]">{home.hero.title}</h1>
            <div className="mt-8 grid max-w-5xl gap-7 border-t border-white/32 pt-7 md:grid-cols-[1fr_auto] md:items-end">
              <p className="max-w-2xl text-base leading-8 text-white/82 sm:text-lg">{home.hero.subtitle}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a href={home.hero.primaryCta.href} {...(isExternalPrimary ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="inline-flex min-h-12 items-center justify-center gap-3 bg-white px-7 text-sm font-bold text-black transition hover:-translate-y-1">{home.hero.primaryCta.text}<ArrowUpRight className="h-4 w-4" /></a>
                <a href={`${basePath}/about`} className="inline-flex min-h-12 items-center justify-center border border-white/45 px-7 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/10">{aboutLabel}</a>
              </div>
            </div>
          </PremiumV3Reveal>
        </div>
      </section>}

      <section className="border-b border-[var(--demo-line)]">
        <div className="mx-auto grid max-w-[1500px] divide-y divide-[var(--demo-line)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[{ label: "Category", value: home.hero.industryLabel }, { label: "Place", value: home.hero.locationLabel }, { label: "Information", value: instagram ? "Official Instagram" : "Official information" }].map((item) => <div key={item.label} className="px-5 py-7 sm:px-8"><p className="text-[9px] font-bold uppercase tracking-[.28em] text-[var(--demo-muted)]">{item.label}</p><p className="mt-2 text-sm font-semibold">{item.value}</p></div>)}
        </div>
      </section>

      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.78fr_1.22fr] lg:gap-20">
          <PremiumV3Reveal motionStyle={motionStyle}><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-accent)]">{premium.intro.eyebrow}</p><p className="mt-6 text-sm leading-8 text-[var(--demo-muted)]">{premium.intro.note}</p></PremiumV3Reveal>
          <PremiumV3Reveal motionStyle={motionStyle} delay={0.08}><h2 className="max-w-4xl whitespace-pre-line text-4xl font-[var(--demo-heading-weight)] leading-[1.12] tracking-[-.035em] sm:text-6xl [font-family:var(--demo-font-display)]">{premium.intro.title}</h2><p className="mt-8 max-w-3xl whitespace-pre-line text-base leading-9 text-[var(--demo-muted)] sm:text-lg">{premium.intro.body}</p><a href={`${basePath}/about`} className="group mt-9 inline-flex items-center gap-4 text-sm font-bold">{aboutLabel}詳しく見る<span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--demo-ink)] text-white transition group-hover:translate-x-1"><ArrowRight className="h-4 w-4" /></span></a></PremiumV3Reveal>
        </div>
      </section>

      <section className="bg-[var(--demo-surface-alt)] px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <PremiumV3Reveal motionStyle={motionStyle} className="grid gap-7 border-b border-[var(--demo-line)] pb-9 md:grid-cols-[1fr_.55fr] md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-muted)]">{presentation?.servicesEyebrow ?? "SELECTION"}</p><h2 className="mt-5 whitespace-pre-line text-4xl tracking-[-.035em] sm:text-6xl [font-family:var(--demo-font-display)]">{presentation?.servicesHeading ?? data.pages.services.title}</h2></div><p className="text-sm leading-8 text-[var(--demo-muted)]">{data.pages.services.subtitle}</p></PremiumV3Reveal>
          <div className="divide-y divide-[var(--demo-line)]">
            {serviceHighlights.map((item, index) => <PremiumV3Reveal key={item.title} motionStyle={motionStyle} delay={index * 0.05} className="grid gap-5 py-9 md:grid-cols-[100px_.55fr_1fr] md:items-start"><span className="text-sm text-[var(--demo-muted)]">0{index + 1}</span><h3 className="text-3xl tracking-[-.025em] [font-family:var(--demo-font-display)]">{item.title}</h3><div><p className="text-sm leading-8 text-[var(--demo-muted)]">{item.description}</p><p className="mt-4 text-xs leading-6 text-[var(--demo-muted)]">{item.features.join(" ／ ")}</p></div></PremiumV3Reveal>)}
          </div>
          <a href={`${basePath}/services`} className="mt-6 inline-flex items-center gap-3 border-b border-[var(--demo-ink)] pb-2 text-sm font-bold">{data.meta.navLabels?.services ?? "商品・サービス"}をすべて見る<ArrowUpRight className="h-4 w-4" /></a>
        </div>
      </section>

      <section className="grid bg-[var(--demo-ink)] text-white lg:grid-cols-2">
        <div className="group relative min-h-[520px] lg:min-h-[720px]"><PremiumV3Media media={secondary} className="absolute inset-0" sizes="(max-width:1024px) 100vw, 50vw" /><div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" /><p className="absolute bottom-8 left-8 max-w-sm text-xl leading-8 text-white/88 [font-family:var(--demo-font-display)]">{secondary.caption}</p></div>
        <div className="flex items-center px-5 py-20 sm:px-10 sm:py-28 lg:px-16">
          <PremiumV3Reveal motionStyle={motionStyle}><p className="text-xs font-bold uppercase tracking-[.3em] text-white/45">Story & values</p><h2 className="mt-7 text-4xl leading-[1.12] tracking-[-.035em] sm:text-6xl [font-family:var(--demo-font-display)]">{data.pages.about.mission}</h2><p className="mt-8 max-w-xl text-base leading-9 text-white/62">{data.pages.about.story}</p><a href={`${basePath}/about`} className="mt-9 inline-flex items-center gap-3 border-b border-white/55 pb-2 text-sm font-bold">大切にしていること<ArrowRight className="h-4 w-4" /></a></PremiumV3Reveal>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-32"><div className="mx-auto max-w-7xl"><PremiumV3Reveal motionStyle={motionStyle} className="mb-10"><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-accent)]">{presentation?.galleryEyebrow ?? "GALLERY"}</p><h2 className="mt-5 text-4xl tracking-[-.035em] sm:text-6xl [font-family:var(--demo-font-display)]">{presentation?.galleryHeading ?? `${data.companyName}の景色。`}</h2></PremiumV3Reveal><PremiumV3MediaCarousel media={premium.gallery} label={`${data.companyName}のイメージスライダー`} /></div></section>

      {faq.length > 0 && <section className="border-y border-[var(--demo-line)] bg-white/35 px-5 py-20 sm:px-10 sm:py-24 lg:px-16"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.6fr_1.4fr]"><PremiumV3Reveal motionStyle={motionStyle}><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-accent)]">FAQ</p><h2 className="mt-5 text-4xl tracking-[-.035em] sm:text-5xl [font-family:var(--demo-font-display)]">{isRestaurant ? "ご来店・ご利用の前に。" : "ご相談・ご利用の前に。"}</h2></PremiumV3Reveal><div className="border-t border-[var(--demo-line)]">{faq.map((item) => <details key={item.id} className="group border-b border-[var(--demo-line)]"><summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-lg font-semibold marker:hidden"><span>{item.heading}</span><span className="text-2xl font-light transition group-open:rotate-45">＋</span></summary><p className="max-w-3xl pb-7 text-sm leading-8 text-[var(--demo-muted)]">{item.body}</p></details>)}</div></div></section>}

      <section className="bg-[var(--demo-accent)] px-5 py-20 text-white sm:px-10 sm:py-24 lg:px-16"><PremiumV3Reveal motionStyle={motionStyle} className="mx-auto grid max-w-6xl gap-9 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.3em] text-white/60">{isRestaurant ? "Visit & follow" : "Contact & information"}</p><h2 className="mt-5 whitespace-pre-line text-4xl leading-tight tracking-[-.035em] sm:text-6xl [font-family:var(--demo-font-display)]">{home.cta.title}</h2><p className="mt-6 max-w-xl text-base leading-8 text-white/74">{home.cta.subtitle}</p></div><div className="flex flex-col gap-3 sm:flex-row lg:flex-col">{instagram && <a href={instagram} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-3 bg-white px-8 text-sm font-bold text-black"><FaInstagram />Instagram</a>}<a href={mapHref} {...(isExternalMap ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="inline-flex min-h-12 items-center justify-center gap-3 border border-white/45 px-8 text-sm font-bold"><MapPin className="h-4 w-4" />{isRestaurant ? "アクセス" : "所在地・アクセス"}</a></div></PremiumV3Reveal></section>
    </div>
  )
}
