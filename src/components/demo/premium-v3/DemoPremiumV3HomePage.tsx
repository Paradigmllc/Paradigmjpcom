"use client"

import { ArrowRight, ArrowUpRight, MapPin, Newspaper } from "lucide-react"
import { FaInstagram } from "react-icons/fa6"
import type { DemoMultiPageData } from "@/lib/sales/demo-site-types"
import { PremiumV3KineticRail, PremiumV3Magnetic, PremiumV3Media, PremiumV3MediaCarousel, PremiumV3Parallax, PremiumV3Reveal, PremiumV3ScrollCue, PremiumV3Stagger, PremiumV3StaggerItem, PremiumV3TextLines } from "./PremiumV3Primitives"
import { DemoPremiumV3BeautyHome } from "./DemoPremiumV3BeautyHome"
import { BeautyMediaMosaic } from "./BeautyMediaMosaic"
import { demoHeadlineClass, demoHeadlineText, resolveDemoArtDirection } from "@/lib/sales/demo-art-direction"
import { DemoPremiumV3Narrative } from "./DemoPremiumV3Narrative"

export function DemoPremiumV3HomePage({ data }: { data: DemoMultiPageData }) {
  const direction = resolveDemoArtDirection(data)
  const profile = data.presentation?.industryProfile ?? data.industry
  if (profile === "beauty_salon" && direction.hero === "mosaic") return <DemoPremiumV3BeautyHome data={data} />

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
  const isRestaurant = profile === "restaurant"
  const splitHero = direction.hero !== "cinematic"
  const editorialSplit = direction.hero === "editorial-split"
  const aboutLabel = data.meta.navLabels?.about ?? (isRestaurant ? "お店について" : "私たちについて")
  const newsItems = data.pages.news?.sections.slice(0, 3) ?? []

  return (
    <div className="overflow-hidden bg-[var(--demo-surface)] text-[var(--demo-ink)]">
      {splitHero ? <section className={`relative grid min-h-[660px] bg-[var(--demo-surface)] ${editorialSplit ? "lg:grid-cols-[.72fr_1.28fr]" : "lg:grid-cols-[.92fr_1.08fr]"}`}>
        <div className={`flex px-5 pb-14 pt-28 sm:px-10 sm:pb-20 lg:px-16 lg:pb-24 ${editorialSplit ? "items-center" : "items-end"}`}>
          <PremiumV3Reveal motionStyle={motionStyle}>
            <p className="mb-7 text-[10px] font-bold uppercase tracking-[.34em] text-[var(--demo-accent)] sm:text-xs">{home.hero.tagline}</p>
            <h1 className={`max-w-4xl font-[var(--demo-heading-weight)] text-balance [font-family:var(--demo-font-display)] ${demoHeadlineClass(home.hero.title, "hero")}`}><PremiumV3TextLines text={demoHeadlineText(home.hero.title)} /></h1>
            <p className="mt-8 max-w-2xl border-l border-[var(--demo-line)] pl-5 text-base leading-8 text-[var(--demo-muted)] sm:text-lg">{home.hero.subtitle}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <PremiumV3Magnetic className="sm:inline-block"><a href={home.hero.primaryCta.href} {...(isExternalPrimary ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="inline-flex min-h-12 items-center justify-center gap-3 bg-[var(--demo-ink)] px-7 text-sm font-bold text-white transition-colors hover:bg-[var(--demo-accent)]">{home.hero.primaryCta.text}<ArrowUpRight className="h-4 w-4" /></a></PremiumV3Magnetic>
              <a href={`${basePath}/about`} className="inline-flex min-h-12 items-center justify-center border border-[var(--demo-line)] px-7 text-sm font-bold">{aboutLabel}</a>
            </div>
          </PremiumV3Reveal>
        </div>
        {direction.hero === "mosaic"
          ? <BeautyMediaMosaic media={[...premium.heroMedia, ...premium.gallery]} priority label={`${data.companyName}の写真`} height="home" />
          : <div className="group relative min-h-[520px] overflow-hidden lg:min-h-[660px]"><PremiumV3Parallax className="absolute -inset-y-16 inset-x-0"><PremiumV3Media media={hero} priority className="absolute inset-0" sizes="(max-width:1024px) 100vw, 54vw" /></PremiumV3Parallax><div className="absolute inset-0 bg-gradient-to-t from-black/36 via-transparent to-transparent" /><div className="absolute bottom-7 left-7 border-l border-white/55 pl-4 text-xs uppercase tracking-[.26em] text-white/80">{home.hero.locationLabel}</div></div>}
        <PremiumV3ScrollCue />
      </section> : <section className="relative min-h-[620px] lg:min-h-[calc(100svh-4.9rem)]">
        <PremiumV3Parallax className="absolute -inset-y-16 inset-x-0"><PremiumV3Media media={hero} priority className="absolute inset-0" sizes="100vw" /></PremiumV3Parallax>
        <div className="absolute inset-0 bg-gradient-to-r from-black/76 via-black/34 to-black/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/48 via-transparent to-black/12" />
        <div className="relative mx-auto flex min-h-[620px] max-w-[1500px] flex-col justify-end px-5 pb-14 pt-28 text-white sm:px-10 sm:pb-18 lg:min-h-[calc(100svh-4.9rem)] lg:px-16 lg:pb-20">
          <PremiumV3Reveal motionStyle={motionStyle}>
            <p className="mb-6 text-[10px] font-bold uppercase tracking-[.34em] text-white/68 sm:text-xs">{home.hero.tagline}</p>
            <h1 className={`max-w-4xl font-[var(--demo-heading-weight)] text-balance [font-family:var(--demo-font-display)] ${demoHeadlineClass(home.hero.title, "hero")}`}><PremiumV3TextLines text={demoHeadlineText(home.hero.title)} /></h1>
            <div className="mt-8 grid max-w-5xl gap-7 border-t border-white/32 pt-7 md:grid-cols-[1fr_auto] md:items-end">
              <p className="max-w-2xl text-base leading-8 text-white/82 sm:text-lg">{home.hero.subtitle}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <PremiumV3Magnetic><a href={home.hero.primaryCta.href} {...(isExternalPrimary ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="inline-flex min-h-12 items-center justify-center gap-3 bg-white px-7 text-sm font-bold text-black transition-colors hover:bg-white/90">{home.hero.primaryCta.text}<ArrowUpRight className="h-4 w-4" /></a></PremiumV3Magnetic>
                <a href={`${basePath}/about`} className="inline-flex min-h-12 items-center justify-center border border-white/45 px-7 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/10">{aboutLabel}</a>
              </div>
            </div>
          </PremiumV3Reveal>
        </div>
        <PremiumV3ScrollCue dark />
      </section>}

      <section className="border-b border-[var(--demo-line)]">
        <div className="mx-auto grid max-w-[1500px] divide-y divide-[var(--demo-line)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[{ label: "Category", value: home.hero.industryLabel }, { label: "Place", value: home.hero.locationLabel }, { label: "Information", value: instagram ? "Official Instagram" : "Official information" }].map((item) => <div key={item.label} className="px-5 py-7 sm:px-8"><p className="text-[9px] font-bold uppercase tracking-[.28em] text-[var(--demo-muted)]">{item.label}</p><p className="mt-2 text-sm font-semibold">{item.value}</p></div>)}
        </div>
      </section>
      <PremiumV3KineticRail text={`${data.companyName} · ${home.hero.industryLabel} · ${home.hero.locationLabel}`} />

      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.78fr_1.22fr] lg:gap-20">
          <PremiumV3Reveal motionStyle={motionStyle}><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-accent)]">{premium.intro.eyebrow}</p><p className="mt-6 text-sm leading-8 text-[var(--demo-muted)]">{premium.intro.note}</p></PremiumV3Reveal>
          <PremiumV3Reveal motionStyle={motionStyle} delay={0.08}><h2 className={`max-w-4xl whitespace-pre-line font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)] ${demoHeadlineClass(premium.intro.title)}`}>{premium.intro.title}</h2><p className="mt-8 max-w-3xl whitespace-pre-line text-base leading-9 text-[var(--demo-muted)] sm:text-lg">{premium.intro.body}</p><a href={`${basePath}/about`} className="group mt-9 inline-flex items-center gap-4 text-sm font-bold">{aboutLabel}詳しく見る<span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--demo-ink)] text-white transition group-hover:translate-x-1"><ArrowRight className="h-4 w-4" /></span></a></PremiumV3Reveal>
        </div>
      </section>

      <DemoPremiumV3Narrative
        modules={home.narrativeModules ?? []}
        label="EDITORIAL NOTES"
        title={`${data.companyName}らしさを、3つの視点から。`}
        introduction="サービス名だけでは見えにくい考え方や体験の違いを、確認できる情報を軸に読み解きます。"
        motionStyle={motionStyle}
        variant="index"
      />

      {newsItems.length > 0 && <section className="border-y border-[var(--demo-line)] bg-[var(--demo-surface-alt)] px-5 py-20 sm:px-10 sm:py-28 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <PremiumV3Reveal motionStyle={motionStyle} className="grid gap-7 border-b border-[var(--demo-line)] pb-9 md:grid-cols-[1fr_.55fr] md:items-end">
            <div><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-accent)]">JOURNAL / UPDATE</p><h2 className={`mt-5 [font-family:var(--demo-font-display)] ${demoHeadlineClass(isRestaurant ? "お店からのお知らせ。" : "最新のご案内。")}`}>{isRestaurant ? "お店からのお知らせ。" : "最新のご案内。"}</h2></div>
            <p className="text-sm leading-8 text-[var(--demo-muted)]">{isRestaurant ? "営業情報、季節のご案内、メニューに関する情報をまとめています。" : "サービスや営業に関する確認済みの情報を、読みやすくまとめています。"}</p>
          </PremiumV3Reveal>
          <PremiumV3Stagger className="grid gap-px bg-[var(--demo-line)] md:grid-cols-3">
            {newsItems.map((item, index) => <PremiumV3StaggerItem key={item.id} className="group bg-[var(--demo-surface)] p-7 transition-colors hover:bg-white sm:p-9"><div className="flex items-center justify-between text-[var(--demo-muted)]"><Newspaper className="h-4 w-4" aria-hidden="true" /><span className="text-[10px] font-bold tracking-[.24em]">0{index + 1}</span></div><h3 className="mt-10 text-2xl leading-tight [font-family:var(--demo-font-display)]">{item.heading}</h3><p className="mt-5 text-sm leading-8 text-[var(--demo-muted)]">{item.body}</p><a href={`${basePath}/news`} className="mt-7 inline-flex items-center gap-2 border-b border-[var(--demo-line)] pb-2 text-xs font-bold">詳しく読む<ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></a></PremiumV3StaggerItem>)}
          </PremiumV3Stagger>
        </div>
      </section>}

      <section className="bg-[var(--demo-surface-alt)] px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <PremiumV3Reveal motionStyle={motionStyle} className="grid gap-7 border-b border-[var(--demo-line)] pb-9 md:grid-cols-[1fr_.55fr] md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-muted)]">{presentation?.servicesEyebrow ?? "SELECTION"}</p><h2 className={`mt-5 whitespace-pre-line [font-family:var(--demo-font-display)] ${demoHeadlineClass(presentation?.servicesHeading ?? data.pages.services.title)}`}>{presentation?.servicesHeading ?? data.pages.services.title}</h2></div><p className="text-sm leading-8 text-[var(--demo-muted)]">{data.pages.services.subtitle}</p></PremiumV3Reveal>
          <PremiumV3Stagger className="divide-y divide-[var(--demo-line)]">
            {serviceHighlights.map((item, index) => <PremiumV3StaggerItem key={item.title} className="group grid gap-5 py-9 transition-colors hover:bg-white/45 md:grid-cols-[100px_.55fr_1fr] md:items-start"><span className="text-sm text-[var(--demo-muted)] transition-transform duration-500 group-hover:translate-x-2">0{index + 1}</span><h3 className="text-3xl tracking-[-.025em] [font-family:var(--demo-font-display)]">{item.title}</h3><div><p className="text-sm leading-8 text-[var(--demo-muted)]">{item.description}</p><p className="mt-4 text-xs leading-6 text-[var(--demo-muted)]">{item.features.join(" ／ ")}</p></div></PremiumV3StaggerItem>)}
          </PremiumV3Stagger>
          <a href={`${basePath}/services`} className="mt-6 inline-flex items-center gap-3 border-b border-[var(--demo-ink)] pb-2 text-sm font-bold">{data.meta.navLabels?.services ?? "商品・サービス"}をすべて見る<ArrowUpRight className="h-4 w-4" /></a>
        </div>
      </section>

      <section className="grid bg-[var(--demo-ink)] text-white lg:grid-cols-2">
        <div className="group relative min-h-[520px] overflow-hidden lg:min-h-[720px]"><PremiumV3Parallax className="absolute -inset-y-16 inset-x-0"><PremiumV3Media media={secondary} className="absolute inset-0" sizes="(max-width:1024px) 100vw, 50vw" /></PremiumV3Parallax><div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" /><p className="absolute bottom-8 left-8 max-w-sm text-xl leading-8 text-white/88 [font-family:var(--demo-font-display)]">{secondary.caption}</p></div>
        <div className="flex items-center px-5 py-20 sm:px-10 sm:py-28 lg:px-16">
          <PremiumV3Reveal motionStyle={motionStyle}><p className="text-xs font-bold uppercase tracking-[.3em] text-white/45">Story & values</p><h2 className={`mt-7 [font-family:var(--demo-font-display)] ${demoHeadlineClass(data.pages.about.mission)}`}>{data.pages.about.mission}</h2><p className="mt-8 max-w-xl text-base leading-9 text-white/62">{data.pages.about.story}</p><a href={`${basePath}/about`} className="mt-9 inline-flex items-center gap-3 border-b border-white/55 pb-2 text-sm font-bold">大切にしていること<ArrowRight className="h-4 w-4" /></a></PremiumV3Reveal>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-32"><div className="mx-auto max-w-7xl"><PremiumV3Reveal motionStyle={motionStyle} className="mb-10"><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-accent)]">{presentation?.galleryEyebrow ?? "GALLERY"}</p><h2 className={`mt-5 [font-family:var(--demo-font-display)] ${demoHeadlineClass(presentation?.galleryHeading ?? `${data.companyName}の景色。`)}`}>{presentation?.galleryHeading ?? `${data.companyName}の景色。`}</h2></PremiumV3Reveal><PremiumV3MediaCarousel media={premium.gallery} label={`${data.companyName}のイメージスライダー`} /></div></section>

      {faq.length > 0 && <section className="border-y border-[var(--demo-line)] bg-white/35 px-5 py-20 sm:px-10 sm:py-24 lg:px-16"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.6fr_1.4fr]"><PremiumV3Reveal motionStyle={motionStyle}><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-accent)]">FAQ</p><h2 className={`mt-5 [font-family:var(--demo-font-display)] ${demoHeadlineClass(isRestaurant ? "ご来店・ご利用の前に。" : "ご相談・ご利用の前に。")}`}>{isRestaurant ? "ご来店・ご利用の前に。" : "ご相談・ご利用の前に。"}</h2></PremiumV3Reveal><div className="border-t border-[var(--demo-line)]">{faq.map((item) => <details key={item.id} className="group border-b border-[var(--demo-line)]"><summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-lg font-semibold marker:hidden"><span>{item.heading}</span><span className="text-2xl font-light transition group-open:rotate-45">＋</span></summary><p className="max-w-3xl pb-7 text-sm leading-8 text-[var(--demo-muted)]">{item.body}</p></details>)}</div></div></section>}

      <section className="bg-[var(--demo-accent)] px-5 py-20 text-white sm:px-10 sm:py-24 lg:px-16"><PremiumV3Reveal motionStyle={motionStyle} className="mx-auto grid max-w-6xl gap-9 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.3em] text-white/60">{isRestaurant ? "Visit & follow" : "Contact & information"}</p><h2 className={`mt-5 whitespace-pre-line [font-family:var(--demo-font-display)] ${demoHeadlineClass(home.cta.title)}`}>{home.cta.title}</h2><p className="mt-6 max-w-xl text-base leading-8 text-white/74">{home.cta.subtitle}</p></div><div className="flex flex-col gap-3 sm:flex-row lg:flex-col">{instagram && <a href={instagram} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-3 bg-white px-8 text-sm font-bold text-black"><FaInstagram />Instagram</a>}<a href={mapHref} {...(isExternalMap ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="inline-flex min-h-12 items-center justify-center gap-3 border border-white/45 px-8 text-sm font-bold"><MapPin className="h-4 w-4" />{isRestaurant ? "アクセス" : "所在地・アクセス"}</a></div></PremiumV3Reveal></section>
    </div>
  )
}
