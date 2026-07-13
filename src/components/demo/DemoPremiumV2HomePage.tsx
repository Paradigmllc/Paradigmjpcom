"use client"

import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react"
import { FaInstagram } from "react-icons/fa6"
import type { DemoMultiPageData } from "@/lib/sales/demo-site-types"
import { PremiumV2Media, PremiumV2MediaCarousel, PremiumV2Reveal } from "./premium-v2/PremiumV2Primitives"

export function DemoPremiumV2HomePage({ data }: { data: DemoMultiPageData }) {
  const premium = data.premium!
  const home = data.pages.home
  const basePath = `/${data.slug}`
  const hero = premium.heroMedia[0]
  const secondary = premium.heroMedia[1] ?? premium.gallery[0]
  const mapHref = data.pages.contact.mapUrl ?? `${basePath}/contact`
  const instagram = premium.social.find((item) => item.network === "instagram")?.href ?? home.cta.buttonHref
  const serviceHighlights = data.pages.services.services.slice(0, 3)

  return (
    <div className="overflow-hidden bg-[#f4f1e9] text-[#171713]" style={{ "--v2-accent": data.meta.accentColor } as React.CSSProperties}>
      <section className="relative min-h-[720px] lg:min-h-[calc(100svh-5.5rem)]">
        <PremiumMedia media={hero} priority className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/36 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15" />
        <div className="relative mx-auto flex min-h-[720px] max-w-[1500px] flex-col justify-end px-5 pb-14 pt-28 text-white sm:px-10 sm:pb-20 lg:min-h-[calc(100svh-5.5rem)] lg:px-16 lg:pb-24">
          <Reveal>
            <div className="mb-7 text-[10px] font-bold uppercase tracking-[.3em] text-white/70 sm:text-xs">{home.hero.tagline}</div>
            <h1 className="max-w-5xl whitespace-pre-line font-premium-serif text-[clamp(2.75rem,5.6vw,6rem)] leading-[.96] tracking-[-.05em] text-balance">{home.hero.title}</h1>
            <div className="mt-10 grid max-w-5xl gap-7 border-t border-white/35 pt-8 md:grid-cols-[1fr_auto] md:items-end">
              <p className="max-w-2xl text-base leading-8 text-white/82 sm:text-lg">{home.hero.subtitle}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a href={home.hero.primaryCta.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-3 bg-white px-7 text-sm font-bold text-black transition hover:-translate-y-1">{home.hero.primaryCta.text}<ArrowUpRight className="h-4 w-4" /></a>
                <a href={`${basePath}/about`} className="inline-flex min-h-12 items-center justify-center border border-white/45 px-7 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/10">物語を読む</a>
              </div>
            </div>
          </Reveal>
        </div>
        <p className="absolute right-5 top-8 text-[9px] font-bold uppercase tracking-[.3em] text-white/65 sm:right-10">{hero.caption ?? data.companyName}</p>
      </section>

      <section className="grid border-y border-black/10 lg:grid-cols-[.42fr_1.58fr]">
        <div className="flex min-h-40 items-center bg-[#171713] px-6 py-10 text-white sm:px-12 lg:min-h-[500px] lg:items-end">
          <p className="max-w-xs text-xs font-semibold uppercase leading-6 tracking-[.28em] text-white/55">{home.hero.industryLabel}<br />{home.hero.locationLabel}<br />{data.companyName}</p>
        </div>
        <div className="px-5 py-20 sm:px-10 sm:py-28 lg:px-20 lg:py-36">
          <Reveal className="mx-auto max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--v2-accent)]">{premium.intro.eyebrow}</p>
            <h2 className="mt-7 whitespace-pre-line font-premium-serif text-4xl leading-[1.05] tracking-[-.045em] sm:text-6xl lg:text-7xl">{premium.intro.title}</h2>
            <div className="mt-10 grid gap-8 md:grid-cols-2 md:gap-16"><p className="whitespace-pre-line text-base leading-8 text-black/68 sm:text-lg sm:leading-9">{premium.intro.body}</p><div className="border-l border-black/15 pl-7"><p className="text-sm leading-7 text-black/55">{premium.intro.note}</p><a href={`${basePath}/services`} className="group mt-8 inline-flex items-center gap-4 text-sm font-bold">サービスを見る<span className="grid h-11 w-11 place-items-center rounded-full bg-black text-white transition group-hover:translate-x-1"><ArrowRight className="h-4 w-4" /></span></a></div></div>
          </Reveal>
        </div>
      </section>

      <section className="bg-[#d9d2c2] px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-36">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-14 flex flex-col justify-between gap-7 border-b border-black/20 pb-9 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.3em] text-black/50">Highlights</p><h2 className="mt-5 font-premium-serif text-4xl tracking-[-.045em] sm:text-6xl">選ばれる理由を、<br />ひとつずつ。</h2></div><p className="max-w-sm text-sm leading-7 text-black/55">{home.featureSubtitle ?? data.pages.services.subtitle}</p></Reveal>
          <div className="grid gap-px bg-black/15 md:grid-cols-3">
            {home.features.slice(0, 3).map((feature, index) => <Reveal key={feature.title} delay={index * .07} className="bg-[#d9d2c2] p-7 sm:p-9"><span className="font-premium-serif text-5xl italic text-black/25">0{index + 1}</span><h3 className="mt-12 font-premium-serif text-3xl">{feature.title}</h3><p className="mt-5 text-sm leading-7 text-black/60">{feature.description}</p></Reveal>)}
          </div>
        </div>
      </section>

      <section className="grid bg-[#161612] text-white lg:grid-cols-2">
        <div className="relative min-h-[620px] lg:min-h-[820px]"><PremiumMedia media={secondary} className="absolute inset-0" /><div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" /><p className="absolute bottom-8 left-8 max-w-sm font-premium-serif text-2xl italic text-white/90">{secondary.caption}</p></div>
        <div className="flex items-center px-5 py-20 sm:px-10 sm:py-28 lg:px-20">
          <Reveal><p className="text-xs font-bold uppercase tracking-[.3em] text-white/45">Our services</p><h2 className="mt-7 font-premium-serif text-4xl leading-tight tracking-[-.04em] sm:text-6xl">提供しているもの。</h2><p className="mt-8 max-w-xl text-base leading-8 text-white/60">{data.pages.services.subtitle}</p><div className="mt-12 space-y-0 border-y border-white/15">{serviceHighlights.map((item, index) => <div key={item.title} className="flex gap-5 border-b border-white/15 py-5 last:border-0"><span className="text-white/30">0{index + 1}</span><div><p className="font-semibold">{item.title}</p><p className="mt-2 text-sm leading-7 text-white/50">{item.description}</p></div></div>)}</div></Reveal>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-36">
        <div className="mx-auto max-w-7xl"><Reveal className="mb-10"><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--v2-accent)]">Selected scenes</p><h2 className="mt-5 font-premium-serif text-4xl tracking-[-.045em] sm:text-6xl">{data.companyName}の景色。</h2></Reveal><PremiumV2MediaCarousel media={premium.gallery} label={`${data.companyName}のイメージスライダー`} /></div>
      </section>

      <section className="bg-[var(--v2-accent)] px-5 py-20 text-white sm:px-10 sm:py-28 lg:px-16"><Reveal className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.3em] text-white/60">Visit & follow</p><h2 className="mt-5 whitespace-pre-line font-premium-serif text-4xl leading-tight tracking-[-.04em] sm:text-6xl">{home.cta.title}</h2><p className="mt-6 max-w-xl text-base leading-8 text-white/70">{home.cta.subtitle}</p></div><div className="flex flex-col gap-3 sm:flex-row lg:flex-col"><a href={instagram} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-3 bg-white px-8 text-sm font-bold text-black"><FaInstagram />Instagram</a><a href={mapHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-3 border border-white/40 px-8 text-sm font-bold"><MapPin className="h-4 w-4" />アクセス</a></div></Reveal></section>
    </div>
  )
}

const PremiumMedia = PremiumV2Media
const Reveal = PremiumV2Reveal
