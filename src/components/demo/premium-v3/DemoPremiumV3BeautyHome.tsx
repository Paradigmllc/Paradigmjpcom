"use client"

import { ArrowRight, ArrowUpRight, MapPin, Scissors } from "lucide-react"
import { FaInstagram } from "react-icons/fa6"
import type { DemoMultiPageData } from "@/lib/sales/demo-site-types"
import { demoHeadlineClass, demoHeadlineText, resolveDemoArtDirection } from "@/lib/sales/demo-art-direction"
import {
  PremiumV3MediaCarousel,
  PremiumV3Reveal,
  PremiumV3Stagger,
  PremiumV3StaggerItem,
  PremiumV3TextLines,
} from "./PremiumV3Primitives"
import { BeautyMediaMosaic } from "./BeautyMediaMosaic"
import { DemoPremiumV3Narrative } from "./DemoPremiumV3Narrative"
import { canonicalDemoMediaSrc } from "@/lib/sales/demo-public-surface"

export function DemoPremiumV3BeautyHome({ data }: { data: DemoMultiPageData }) {
  const premium = data.premium!
  const home = data.pages.home
  const direction = resolveDemoArtDirection(data)
  const basePath = `/${data.slug}`
  const visualSet = [...premium.heroMedia, ...premium.gallery]
    .filter((item, index, items) => items.findIndex((candidate) => canonicalDemoMediaSrc(candidate.src) === canonicalDemoMediaSrc(item.src)) === index)
    .slice(0, 6)
  const instagram = premium.social.find((item) => item.network === "instagram")?.href
  const mapHref = data.pages.contact.mapUrl ?? `${basePath}/contact`
  const isExternalPrimary = /^https?:\/\//u.test(home.hero.primaryCta.href)
  const isExternalMap = /^https?:\/\//u.test(mapHref)
  const motionStyle = data.designRecipe?.motionVariant
  const services = data.pages.services.services.slice(0, 4)
  const values = data.pages.about.values.slice(0, 3)
  const faq = data.pages.faq?.sections.slice(0, 3) ?? []

  return (
    <div className="overflow-hidden bg-[var(--demo-surface)] text-[var(--demo-ink)] [font-feature-settings:'palt']">
      <section className="grid min-h-[680px] lg:grid-cols-[.52fr_.48fr]">
        <div className="relative flex items-end px-5 pb-14 pt-24 sm:px-10 sm:pb-20 lg:px-16 lg:pb-24">
          <div className="absolute left-5 top-12 hidden h-24 w-px bg-[var(--demo-accent)] sm:left-10 sm:block lg:left-16" aria-hidden="true" />
          <PremiumV3Reveal motionStyle={motionStyle} className="max-w-3xl">
            <p className="mb-6 flex items-center gap-3 text-[10px] font-bold tracking-[.24em] text-[var(--demo-accent)] sm:text-xs"><Scissors className="h-4 w-4" aria-hidden="true" />{home.hero.tagline}</p>
            <h1 className={`${demoHeadlineClass(home.hero.title, "hero")} max-w-[15em] font-[var(--demo-heading-weight)] text-balance [font-family:var(--demo-font-display)]`}><PremiumV3TextLines text={demoHeadlineText(home.hero.title)} /></h1>
            <p className="mt-7 max-w-[34rem] text-[15px] leading-8 text-[var(--demo-muted)] sm:text-[17px] sm:leading-9">{home.hero.subtitle}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href={home.hero.primaryCta.href} {...(isExternalPrimary ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="inline-flex min-h-12 items-center justify-center gap-3 bg-[var(--demo-ink)] px-7 text-sm font-bold text-white transition duration-500 hover:-translate-y-1 hover:bg-[var(--demo-accent)]">{home.hero.primaryCta.text}<ArrowUpRight className="h-4 w-4" /></a>
              <a href={`${basePath}/services`} className="inline-flex min-h-12 items-center justify-center gap-3 border border-[var(--demo-line)] px-7 text-sm font-bold transition hover:border-[var(--demo-ink)]">メニューを見る<ArrowRight className="h-4 w-4" /></a>
            </div>
          </PremiumV3Reveal>
        </div>
        <BeautyMediaMosaic media={visualSet} priority label="サロンの店内写真" />
      </section>

      <section className="border-y border-[var(--demo-line)]">
        <div className="mx-auto grid max-w-[1500px] divide-y divide-[var(--demo-line)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { label: direction.labels.category, value: home.hero.industryLabel },
            { label: direction.labels.place, value: home.hero.locationLabel },
            { label: direction.labels.information, value: instagram ? "公式Instagram" : "公式のご案内" },
          ].map((item) => <div key={item.label} className="px-5 py-6 sm:px-8"><p className="text-[10px] font-bold tracking-[.2em] text-[var(--demo-muted)]">{item.label}</p><p className="mt-2 text-sm font-medium">{item.value}</p></div>)}
        </div>
      </section>

      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-36">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.95fr_1.05fr] lg:gap-24">
          <PremiumV3Reveal motionStyle={motionStyle}>
            <p className="text-xs font-bold tracking-[.22em] text-[var(--demo-accent)]">{premium.intro.eyebrow}</p>
            <h2 className={`${demoHeadlineClass(premium.intro.title)} mt-6 max-w-[14em] font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{premium.intro.title}</h2>
            <p className="mt-8 max-w-2xl whitespace-pre-line text-base leading-9 text-[var(--demo-muted)]">{premium.intro.body}</p>
            <a href={`${basePath}/about`} className="group mt-9 inline-flex items-center gap-4 text-sm font-bold">サロンについて<span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--demo-ink)] text-white transition duration-500 group-hover:translate-x-1"><ArrowRight className="h-4 w-4" /></span></a>
          </PremiumV3Reveal>
          <PremiumV3Stagger className="border-t border-[var(--demo-line)]">
            {values.map((value, index) => <PremiumV3StaggerItem key={value.title} className="grid gap-4 border-b border-[var(--demo-line)] py-7 sm:grid-cols-[54px_.55fr_1fr]"><span className="text-xs text-[var(--demo-muted)]">0{index + 1}</span><h3 className="text-lg font-medium [font-family:var(--demo-font-display)]">{value.title}</h3><p className="text-sm leading-7 text-[var(--demo-muted)]">{value.description}</p></PremiumV3StaggerItem>)}
          </PremiumV3Stagger>
        </div>
      </section>

      <DemoPremiumV3Narrative
        modules={home.narrativeModules}
        label="SALON JOURNAL"
        title="この場所で、大切にしていること。"
        introduction="メニュー名だけでは伝わりにくいサロンの特徴を、確認できる情報から三つの章に分けてご紹介します。"
        motionStyle={motionStyle}
        variant="contrast"
      />

      <section className="grid bg-[var(--demo-surface-alt)] lg:grid-cols-[.45fr_.55fr]">
        <BeautyMediaMosaic media={visualSet.slice(0, 4)} label="サロンの風景" height="compact" />
        <div className="flex items-center px-5 py-20 sm:px-10 sm:py-28 lg:px-16">
          <div className="w-full max-w-2xl">
            <PremiumV3Reveal motionStyle={motionStyle} className="border-b border-[var(--demo-line)] pb-8"><p className="text-xs font-bold tracking-[.22em] text-[var(--demo-accent)]">{data.presentation?.servicesEyebrow ?? "メニュー"}</p><h2 className={`${demoHeadlineClass(data.presentation?.servicesHeading ?? data.pages.services.title)} mt-6 whitespace-pre-line font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{data.presentation?.servicesHeading ?? data.pages.services.title}</h2><p className="mt-6 text-sm leading-8 text-[var(--demo-muted)]">{data.pages.services.subtitle}</p></PremiumV3Reveal>
            <PremiumV3Stagger className="divide-y divide-[var(--demo-line)]">
              {services.map((service, index) => <PremiumV3StaggerItem key={service.title} className="group grid grid-cols-[44px_1fr_auto] items-center gap-3 py-6"><span className="text-xs text-[var(--demo-muted)]">0{index + 1}</span><div><h3 className="text-xl font-medium [font-family:var(--demo-font-display)]">{service.title}</h3><p className="mt-2 line-clamp-2 text-xs leading-6 text-[var(--demo-muted)]">{service.description}</p></div><ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-1 group-hover:translate-x-1" /></PremiumV3StaggerItem>)}
            </PremiumV3Stagger>
            <a href={`${basePath}/services`} className="mt-8 inline-flex items-center gap-3 border-b border-[var(--demo-ink)] pb-2 text-sm font-bold">すべてのメニューを見る<ArrowRight className="h-4 w-4" /></a>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-36"><div className="mx-auto max-w-7xl"><PremiumV3Reveal motionStyle={motionStyle} className="mb-10 flex flex-col gap-5 border-b border-[var(--demo-line)] pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold tracking-[.22em] text-[var(--demo-accent)]">{direction.labels.gallery}</p><h2 className={`${demoHeadlineClass(data.presentation?.galleryHeading ?? `${data.companyName}のスタイル`)} mt-5 font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{data.presentation?.galleryHeading ?? `${data.companyName}のスタイル`}</h2></div><a href={`${basePath}/works`} className="inline-flex items-center gap-2 text-sm font-bold">スタイルをもっと見る<ArrowRight className="h-4 w-4" /></a></PremiumV3Reveal><PremiumV3MediaCarousel media={premium.gallery} label={`${data.companyName}のスタイルスライダー`} variant="compact" /></div></section>

      {faq.length > 0 && <section className="border-y border-[var(--demo-line)] px-5 py-20 sm:px-10 sm:py-24 lg:px-16"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.55fr_1.45fr]"><PremiumV3Reveal motionStyle={motionStyle}><p className="text-xs font-bold tracking-[.22em] text-[var(--demo-accent)]">よくある質問</p><h2 className={`${demoHeadlineClass("ご予約・ご来店の前に")} mt-5 font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>ご予約・ご来店の前に。</h2></PremiumV3Reveal><div className="border-t border-[var(--demo-line)]">{faq.map((item) => <details key={item.id} className="group border-b border-[var(--demo-line)]"><summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-5 py-6 text-base font-medium marker:hidden sm:text-lg"><span>{item.heading}</span><span className="text-2xl font-light transition group-open:rotate-45">＋</span></summary><p className="max-w-3xl pb-7 text-sm leading-8 text-[var(--demo-muted)]">{item.body}</p></details>)}</div></div></section>}

      <section className="bg-[var(--demo-ink)] px-5 py-20 text-white sm:px-10 sm:py-24 lg:px-16"><PremiumV3Reveal motionStyle={motionStyle} className="mx-auto grid max-w-6xl gap-9 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-xs font-bold tracking-[.22em] text-white/52">ご予約・アクセス</p><h2 className={`${demoHeadlineClass(home.cta.title)} mt-5 max-w-[15em] font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{home.cta.title}</h2><p className="mt-6 max-w-xl text-base leading-8 text-white/68">{home.cta.subtitle}</p></div><div className="flex flex-col gap-3 sm:flex-row lg:flex-col">{instagram && <a href={instagram} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-3 bg-white px-8 text-sm font-bold text-black"><FaInstagram />Instagram</a>}<a href={mapHref} {...(isExternalMap ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="inline-flex min-h-12 items-center justify-center gap-3 border border-white/35 px-8 text-sm font-bold"><MapPin className="h-4 w-4" />所在地・アクセス</a></div></PremiumV3Reveal></section>
    </div>
  )
}
