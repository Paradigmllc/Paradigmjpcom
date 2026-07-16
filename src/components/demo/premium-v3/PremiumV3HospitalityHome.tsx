"use client"

import { ArrowRight, ArrowUpRight, CalendarDays, Clock3, Leaf, MapPin, Utensils } from "lucide-react"
import { FaInstagram } from "react-icons/fa6"
import type { DemoDesignRecipe, DemoMultiPageData, DemoPremiumMedia } from "@/lib/sales/demo-site-types"
import { demoHeadlineClass } from "@/lib/sales/demo-art-direction"
import { PremiumV3HeroDeck, uniqueHeroMedia } from "./PremiumV3HeroDeck"
import { PremiumV3KineticRail, PremiumV3Media, PremiumV3MediaCarousel, PremiumV3Parallax, PremiumV3Reveal, PremiumV3Stagger, PremiumV3StaggerItem } from "./PremiumV3Primitives"

/**
 * Hospitality is intentionally a separate composition family. A restaurant is
 * not a generic SMB with a different label: guests need appetite, atmosphere,
 * menu context, and a frictionless visit decision in one continuous story.
 */
export function PremiumV3HospitalityHome({ data }: { data: DemoMultiPageData }) {
  const premium = data.premium!
  const home = data.pages.home
  const about = data.pages.about
  const contact = data.pages.contact
  const basePath = `/${data.slug}`
  const motionStyle = data.designRecipe?.motionVariant
  const media = uniqueHeroMedia([...premium.heroMedia, ...premium.gallery], 8)
  const hero = media[0] ?? premium.heroMedia[0]
  const visitMedia = media[1] ?? hero
  const instagram = premium.social.find((item) => item.network === "instagram")
  const news = data.pages.news?.sections.slice(0, 3) ?? []
  const faq = data.pages.faq?.sections.slice(0, 4) ?? []
  const mapHref = contact.mapUrl ?? `${basePath}/contact`
  const isExternalMap = /^https?:\/\//u.test(mapHref)

  return (
    <div className="premium-hospitality-home overflow-hidden bg-[var(--demo-surface)] text-[var(--demo-ink)]">
      <PremiumV3HeroDeck
        media={media}
        title={home.hero.title}
        subtitle={home.hero.subtitle}
        eyebrow={home.hero.tagline}
        locationLabel={home.hero.locationLabel}
        primaryCta={home.hero.primaryCta}
        secondaryCta={{ text: "お店について", href: `${basePath}/about` }}
        variant="cinematic"
        motionStyle={motionStyle}
      />

      <HospitalityIndex data={data} instagram={instagram?.href} />

      <section className="premium-hospitality-manifesto px-5 py-24 sm:px-10 sm:py-32 lg:px-16 lg:py-40">
        <div className="mx-auto grid max-w-[1380px] gap-14 lg:grid-cols-[.42fr_1.58fr] lg:gap-20">
          <PremiumV3Reveal motionStyle={motionStyle} className="premium-hospitality-side-note">
            <span className="premium-hospitality-vertical-mark">THE TABLE / 01</span>
            <p className="mt-8 max-w-[16rem] text-xs leading-7 text-[var(--demo-muted)]">料理だけでなく、照明、音、器、会話。訪れた人が過ごす時間までをひとつの体験として設計しています。</p>
          </PremiumV3Reveal>
          <PremiumV3Reveal motionStyle={motionStyle} delay={0.08}>
            <p className="premium-hospitality-kicker">{premium.intro.eyebrow || "TASTE / PLACE / TIME"}</p>
            <h2 className={`${demoHeadlineClass(premium.intro.title, "section")} mt-7 max-w-4xl font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{premium.intro.title}</h2>
            <p className="mt-9 max-w-3xl text-base leading-9 text-[var(--demo-muted)] sm:text-lg sm:leading-10">{premium.intro.body}</p>
            <div className="mt-12 flex flex-wrap items-center gap-6 border-t border-[var(--demo-line)] pt-7">
              <a href={`${basePath}/about`} className="premium-hospitality-link inline-flex items-center gap-3 text-sm font-bold">お店の考え方を読む<ArrowRight className="h-4 w-4" /></a>
              <span className="text-xs tracking-[.18em] text-[var(--demo-muted)]">{home.hero.locationLabel}</span>
            </div>
          </PremiumV3Reveal>
        </div>
      </section>

      <PremiumV3KineticRail text={`${data.companyName} / MENU / SCENES / VISIT`} />

      <HospitalityMenu data={data} media={media} motionStyle={motionStyle} />

      <section className="premium-hospitality-ritual grid bg-[var(--demo-ink)] text-white lg:grid-cols-[.92fr_1.08fr]">
        <div className="relative min-h-[540px] overflow-hidden sm:min-h-[680px]">
          <PremiumV3Parallax className="absolute -inset-y-16 inset-x-0">
            <PremiumV3Media media={visitMedia} className="absolute inset-0" sizes="(max-width:1024px) 100vw, 46vw" />
          </PremiumV3Parallax>
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/5" />
          <p className="absolute bottom-8 left-6 max-w-xs text-sm leading-7 text-white/72 sm:bottom-10 sm:left-10">{visitMedia?.caption ?? visitMedia?.alt ?? `${data.companyName}の店内風景`}</p>
          <span className="absolute right-6 top-8 text-[10px] font-bold tracking-[.28em] text-white/55 sm:right-10">SCENE / 02</span>
        </div>
        <div className="flex items-center px-5 py-24 sm:px-10 sm:py-32 lg:px-20">
          <PremiumV3Reveal motionStyle={motionStyle}>
            <p className="premium-hospitality-kicker text-white/48">THE RITUAL OF A VISIT</p>
            <h2 className={`${demoHeadlineClass(about.mission, "section")} mt-7 max-w-2xl font-[var(--demo-heading-weight)] text-white [font-family:var(--demo-font-display)]`}>{about.mission}</h2>
            <p className="mt-8 max-w-xl text-base leading-9 text-white/64">{about.story}</p>
            <div className="mt-10 grid max-w-xl gap-4 border-t border-white/16 pt-7 sm:grid-cols-3">
              <RitualStat icon={<Utensils />} label="料理" value="季節の素材" />
              <RitualStat icon={<Leaf />} label="空間" value="静かな余白" />
              <RitualStat icon={<Clock3 />} label="時間" value="ゆっくりと" />
            </div>
          </PremiumV3Reveal>
        </div>
      </section>

      <HospitalityProcess data={data} motionStyle={motionStyle} />

      <section className="premium-hospitality-scenes bg-[var(--demo-surface-alt)] px-5 py-24 sm:px-10 sm:py-32 lg:px-16 lg:py-40">
        <div className="mx-auto max-w-[1380px]">
          <PremiumV3Reveal motionStyle={motionStyle} className="grid gap-7 border-b border-[var(--demo-line)] pb-9 md:grid-cols-[1fr_.65fr] md:items-end">
            <div><p className="premium-hospitality-kicker">SCENES / 03</p><h2 className={`${demoHeadlineClass(data.presentation?.galleryHeading ?? `${data.companyName}の景色。`, "section")} mt-5 font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{data.presentation?.galleryHeading ?? `${data.companyName}の景色。`}</h2></div>
            <p className="text-sm leading-8 text-[var(--demo-muted)]">店内の光、料理の表情、スタッフの手元。来店前に知りたい空気を、写真でゆっくりご覧いただけます。</p>
          </PremiumV3Reveal>
          <div className="mt-12"><PremiumV3MediaCarousel media={media} label={`${data.companyName}の店内と料理のスライダー`} variant="wide" /></div>
        </div>
      </section>

      {news.length > 0 && <HospitalityJournal data={data} items={news} motionStyle={motionStyle} />}

      {faq.length > 0 && <section className="px-5 py-24 sm:px-10 sm:py-32 lg:px-16"><div className="mx-auto grid max-w-[1380px] gap-12 lg:grid-cols-[.5fr_1.5fr] lg:gap-24"><PremiumV3Reveal motionStyle={motionStyle}><p className="premium-hospitality-kicker">BEFORE YOUR VISIT</p><h2 className={`${demoHeadlineClass("訪れる前に、確認できること。", "section")} mt-6 font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>訪れる前に、<br />確認できること。</h2></PremiumV3Reveal><div className="border-t border-[var(--demo-line)]">{faq.map((item, index) => <details key={item.id} className="group border-b border-[var(--demo-line)]"><summary className="grid cursor-pointer list-none grid-cols-[52px_1fr_auto] items-center gap-4 py-7 marker:hidden"><span className="text-xs text-[var(--demo-muted)]">Q{String(index + 1).padStart(2, "0")}</span><span className="text-lg font-semibold">{item.heading}</span><span className="text-2xl font-light transition group-open:rotate-45">＋</span></summary><p className="max-w-3xl pb-8 pl-16 text-sm leading-8 text-[var(--demo-muted)]">{item.body}</p></details>)}</div></div></section>}

      <section className="premium-hospitality-visit bg-[var(--demo-accent)] px-5 py-24 text-white sm:px-10 sm:py-28 lg:px-16 lg:py-32">
        <PremiumV3Reveal motionStyle={motionStyle} className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div><p className="premium-hospitality-kicker text-white/58">VISIT / {data.companyName}</p><h2 className={`${demoHeadlineClass(home.cta.title, "section")} mt-6 max-w-3xl font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{home.cta.title}</h2><p className="mt-6 max-w-2xl text-base leading-8 text-white/75">{home.cta.subtitle}</p><div className="mt-9 flex flex-wrap gap-5 text-sm text-white/72"><span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{contact.address}</span><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />最新情報は公式案内をご確認ください</span></div></div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">{instagram && <a href={instagram.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-13 items-center justify-center gap-3 bg-white px-8 text-sm font-bold text-black"><FaInstagram className="h-4 w-4" />公式Instagram<ArrowUpRight className="h-4 w-4" /></a>}<a href={mapHref} {...(isExternalMap ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="inline-flex min-h-13 items-center justify-center gap-3 border border-white/45 px-8 text-sm font-bold"><MapPin className="h-4 w-4" />アクセスを見る<ArrowUpRight className="h-4 w-4" /></a></div>
        </PremiumV3Reveal>
      </section>
    </div>
  )
}

function HospitalityIndex({ data, instagram }: { data: DemoMultiPageData; instagram?: string }) {
  const items = [
    { label: "Category", value: data.pages.home.hero.industryLabel },
    { label: "Place", value: data.pages.home.hero.locationLabel },
    { label: "Follow", value: instagram ? "Official Instagram" : "Official information" },
  ]
  return <section className="premium-hospitality-index border-b border-[var(--demo-line)]"><div className="mx-auto grid max-w-[1380px] divide-y divide-[var(--demo-line)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">{items.map((item, index) => <div key={item.label} className="relative px-5 py-7 sm:px-8 sm:py-8"><span className="absolute right-5 top-7 text-[10px] text-[var(--demo-muted)] sm:right-8">0{index + 1}</span><p className="premium-hospitality-kicker">{item.label}</p><p className="mt-3 pr-8 text-sm font-semibold">{item.value}</p></div>)}</div></section>
}

function HospitalityMenu({ data, media, motionStyle }: { data: DemoMultiPageData; media: DemoPremiumMedia[]; motionStyle?: DemoDesignRecipe["motionVariant"] }) {
  const services = data.pages.services.services.slice(0, 4)
  return <section className="premium-hospitality-menu px-5 py-24 sm:px-10 sm:py-32 lg:px-16 lg:py-40"><div className="mx-auto max-w-[1380px]"><PremiumV3Reveal motionStyle={motionStyle} className="grid gap-8 md:grid-cols-[.8fr_1.2fr] md:items-end"><div><p className="premium-hospitality-kicker">MENU / 02</p><h2 className={`${demoHeadlineClass(data.presentation?.servicesHeading ?? data.pages.services.title, "section")} mt-6 max-w-2xl font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{data.presentation?.servicesHeading ?? data.pages.services.title}</h2></div><p className="max-w-xl text-sm leading-8 text-[var(--demo-muted)]">その日の気分や過ごし方に合わせて選べる、{data.companyName}のおすすめをご紹介します。内容・提供状況は公式案内をご確認ください。</p></PremiumV3Reveal><PremiumV3Stagger className="mt-14 grid gap-5 md:grid-cols-2 lg:gap-7">{services.map((service, index) => <PremiumV3StaggerItem key={service.title} className={`premium-hospitality-menu-card group ${index === 0 ? "md:row-span-2" : ""}`}><div className={`relative overflow-hidden ${index === 0 ? "aspect-[4/5] md:h-full" : "aspect-[1.42/1]"}`}><PremiumV3Media media={media[index % Math.max(media.length, 1)] ?? media[0]} className="absolute inset-0" sizes={index === 0 ? "(max-width:768px) 100vw, 50vw" : "(max-width:768px) 100vw, 42vw"} /><div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/15 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8"><p className="text-[10px] font-bold tracking-[.24em] text-white/58">DISH / {String(index + 1).padStart(2, "0")}</p><h3 className="mt-3 text-2xl [font-family:var(--demo-font-display)] sm:text-3xl">{service.title}</h3><p className="mt-3 max-w-lg text-sm leading-7 text-white/72">{service.description}</p><p className="mt-5 border-t border-white/22 pt-4 text-xs leading-6 text-white/58">{service.features.slice(0, 3).join(" ／ ")}</p></div></div></PremiumV3StaggerItem>)}</PremiumV3Stagger><a href={`/${data.slug}/services`} className="premium-hospitality-link mt-10 inline-flex items-center gap-3 text-sm font-bold">メニューをすべて見る<ArrowUpRight className="h-4 w-4" /></a></div></section>
}

function HospitalityProcess({ data, motionStyle }: { data: DemoMultiPageData; motionStyle?: DemoDesignRecipe["motionVariant"] }) {
  const process = data.pages.services.process.slice(0, 4)
  if (process.length === 0) return null
  return <section className="premium-hospitality-process border-y border-[var(--demo-line)] bg-[var(--demo-surface)] px-5 py-24 sm:px-10 sm:py-32 lg:px-16"><div className="mx-auto grid max-w-[1380px] gap-12 lg:grid-cols-[.64fr_1.36fr] lg:gap-24"><PremiumV3Reveal motionStyle={motionStyle}><p className="premium-hospitality-kicker">{data.pages.services.processEyebrow ?? "VISIT"}</p><h2 className={`${demoHeadlineClass(data.pages.services.processTitle ?? "店で過ごす時間。", "section")} mt-6 max-w-xl font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{data.pages.services.processTitle ?? "店で過ごす時間。"}</h2><p className="mt-7 max-w-md text-sm leading-8 text-[var(--demo-muted)]">はじめての方にも、いつもの方にも。ご来店前から席を立つまでの時間を、確認できる情報でご案内します。</p></PremiumV3Reveal><div className="border-t border-[var(--demo-line)]">{process.map((step, index) => <PremiumV3Reveal key={step.step} motionStyle={motionStyle} delay={index * 0.05} className="grid gap-5 border-b border-[var(--demo-line)] py-7 sm:grid-cols-[72px_1fr] sm:gap-8"><span className="text-xs text-[var(--demo-muted)]">0{index + 1}</span><div><h3 className="text-2xl [font-family:var(--demo-font-display)]">{step.title}</h3><p className="mt-3 max-w-2xl text-sm leading-8 text-[var(--demo-muted)]">{step.description}</p></div></PremiumV3Reveal>)}</div></div></section>
}

function HospitalityJournal({ data, items, motionStyle }: { data: DemoMultiPageData; items: NonNullable<DemoMultiPageData["pages"]["news"]>["sections"]; motionStyle?: DemoDesignRecipe["motionVariant"] }) {
  return <section className="premium-hospitality-journal px-5 py-24 sm:px-10 sm:py-32 lg:px-16 lg:py-40"><div className="mx-auto max-w-[1380px]"><PremiumV3Reveal motionStyle={motionStyle} className="grid gap-8 border-b border-[var(--demo-line)] pb-9 md:grid-cols-[1fr_.65fr] md:items-end"><div><p className="premium-hospitality-kicker">JOURNAL / 04</p><h2 className={`${demoHeadlineClass("季節と営業のお知らせ。", "section")} mt-6 font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>季節と営業の<br />お知らせ。</h2></div><p className="text-sm leading-8 text-[var(--demo-muted)]">営業日、季節のメニュー、店内の小さな変化。最新情報は公式の案内を優先してご確認ください。</p></PremiumV3Reveal><div className="mt-12 grid gap-px bg-[var(--demo-line)] md:grid-cols-3">{items.map((item, index) => <PremiumV3Reveal key={item.id} motionStyle={motionStyle} delay={index * 0.05} className="group bg-[var(--demo-surface)] p-7 sm:p-9"><span className="text-xs text-[var(--demo-muted)]">{String(index + 1).padStart(2, "0")} / NOTE</span><h3 className="mt-12 text-2xl [font-family:var(--demo-font-display)]">{item.heading}</h3><p className="mt-5 text-sm leading-8 text-[var(--demo-muted)]">{item.body}</p><a href={`/${data.slug}/news`} className="premium-hospitality-link mt-7 inline-flex items-center gap-2 text-xs font-bold">お知らせを見る<ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></a></PremiumV3Reveal>)}</div></div></section>
}

function RitualStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="text-white/72"><div className="flex items-center gap-2 text-white/46">{icon}<span className="text-[10px] font-bold tracking-[.2em]">{label}</span></div><p className="mt-3 text-sm">{value}</p></div>
}
