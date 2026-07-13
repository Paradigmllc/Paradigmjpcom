"use client"

import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowDown, ArrowUpRight, Coffee, MapPin, MessageCircle } from "lucide-react"
import { FaFacebookF, FaInstagram, FaLine, FaTiktok, FaXTwitter, FaYoutube } from "react-icons/fa6"
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { DemoFAQ } from "./DemoFAQ"
import type { DemoMultiPageData, DemoPremiumMedia } from "@/lib/sales/demo-site-types"

export function DemoPremiumHomePage({ data }: { data: DemoMultiPageData }) {
  const premium = data.premium!
  const home = data.pages.home
  const reducedMotion = useReducedMotion()
  const [activeHero, setActiveHero] = useState(0)

  useEffect(() => {
    if (reducedMotion || premium.heroMedia.length < 2) return undefined
    const timer = window.setInterval(() => {
      setActiveHero((current) => (current + 1) % premium.heroMedia.length)
    }, 6500)
    return () => window.clearInterval(timer)
  }, [premium.heroMedia.length, reducedMotion])

  const accent = data.meta.accentColor
  const basePath = `/${data.slug}`
  const mapHref = data.pages.contact.mapUrl ?? `${basePath}/contact`

  return (
    <div className="overflow-hidden bg-[#f4efe7] text-[#241b16]" style={{ "--premium-accent": accent } as React.CSSProperties}>
      <section className="relative min-h-[760px] overflow-hidden bg-[#18110e] sm:min-h-[820px] lg:min-h-[min(920px,calc(100svh-7rem))]">
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={activeHero}
            className="absolute inset-0"
            initial={reducedMotion ? false : { opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <PremiumMedia media={premium.heroMedia[activeHero]} priority />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,12,8,.84)_0%,rgba(20,12,8,.48)_46%,rgba(20,12,8,.1)_76%),linear-gradient(0deg,rgba(20,12,8,.68)_0%,transparent_52%)]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:88px_88px]" />

        <div className="relative mx-auto flex min-h-[760px] max-w-7xl items-end px-5 pb-28 pt-24 sm:min-h-[820px] sm:px-8 sm:pb-32 lg:min-h-[min(920px,calc(100svh-7rem))] lg:px-12">
          <motion.div
            className="max-w-3xl text-white"
            initial={reducedMotion ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .8, delay: .2 }}
          >
            <p className="mb-7 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.28em] text-white/75 sm:text-xs">
              <span className="h-px w-10 bg-white/50" />
              {home.hero.tagline}
            </p>
            <h1 className="whitespace-pre-line font-premium-serif text-[clamp(3.35rem,8.5vw,7.5rem)] font-medium leading-[.93] tracking-[-.055em] text-balance">
              {home.hero.title}
            </h1>
            <p className="mt-8 max-w-xl text-base leading-8 text-white/78 sm:text-lg sm:leading-9">
              {home.hero.subtitle}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href={home.hero.primaryCta.href} target="_blank" rel="noopener noreferrer" className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-7 text-sm font-semibold text-[#2c1d16] transition hover:-translate-y-0.5 hover:bg-[#f8eee3]">
                {home.hero.primaryCta.text}<ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
              <a href={home.hero.secondaryCta.href} className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/30 bg-black/10 px-7 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/10">
                {home.hero.secondaryCta.text}
              </a>
            </div>
          </motion.div>

          <div className="absolute bottom-8 left-5 flex items-center gap-4 text-[10px] font-semibold uppercase tracking-[.25em] text-white/55 sm:left-8 lg:left-12">
            <ArrowDown className="h-4 w-4 animate-bounce" aria-hidden="true" /> Scroll to discover
          </div>
          <div className="absolute bottom-8 right-5 flex gap-2 sm:right-8 lg:right-12" aria-label="Hero slides">
            {premium.heroMedia.map((item, index) => (
              <button key={`${item.src}-${index}`} type="button" onClick={() => setActiveHero(index)} className="group flex h-8 items-center" aria-label={`スライド${index + 1}を表示`} aria-current={index === activeHero}>
                <span className={`block h-px transition-all ${index === activeHero ? "w-10 bg-white" : "w-5 bg-white/35 group-hover:bg-white/70"}`} />
              </button>
            ))}
          </div>
          <div className="absolute right-10 top-1/2 hidden -translate-y-1/2 flex-col gap-3 lg:flex" aria-label="公式SNS">
            {premium.social.map((social) => (
              <a key={`${social.network}-${social.href}`} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label} className="grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-black/15 text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white hover:text-[#2b1d17]">
                <PremiumSocialIcon network={social.network} />
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-5 py-24 sm:px-8 sm:py-32 lg:px-12 lg:py-40">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.82fr_1.18fr] lg:items-center lg:gap-24">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[.26em] text-[var(--premium-accent)]">{premium.intro.eyebrow}</p>
            <h2 className="mt-6 whitespace-pre-line font-premium-serif text-4xl leading-[1.16] tracking-[-.035em] text-balance sm:text-5xl lg:text-6xl">{premium.intro.title}</h2>
            <p className="mt-8 max-w-xl whitespace-pre-line text-base leading-8 text-[#6d5a50] sm:text-lg sm:leading-9">{premium.intro.body}</p>
            {premium.intro.note && <p className="mt-7 border-l border-[var(--premium-accent)] pl-5 text-sm leading-7 text-[#8b7568]">{premium.intro.note}</p>}
            <a href={`${basePath}/about`} className="group mt-9 inline-flex items-center gap-3 text-sm font-bold tracking-wide text-[#34251e]">
              お店について<span className="grid h-9 w-9 place-items-center rounded-full border border-[#34251e]/25 transition group-hover:bg-[#34251e] group-hover:text-white"><ArrowUpRight className="h-4 w-4" /></span>
            </a>
          </Reveal>
          <Reveal delay={.12} className="relative min-h-[520px] sm:min-h-[640px]">
            <div className="absolute left-0 top-0 h-[72%] w-[78%] overflow-hidden rounded-[2rem] shadow-[0_30px_80px_rgba(63,39,26,.18)]">
              <PremiumMedia media={premium.gallery[0]} />
            </div>
            <div className="absolute bottom-0 right-0 h-[48%] w-[56%] overflow-hidden rounded-[1.6rem] border-[10px] border-[#f4efe7] shadow-2xl sm:border-[14px]">
              <PremiumMedia media={premium.gallery[1] ?? premium.gallery[0]} />
            </div>
            <p className="absolute bottom-[4%] left-[4%] -rotate-90 origin-bottom-left font-premium-serif text-xs italic tracking-[.2em] text-[#7c6255]">Setagaya · Tokyo</p>
          </Reveal>
        </div>
      </section>

      <section className="bg-[#251914] px-5 py-24 text-white sm:px-8 sm:py-32 lg:px-12 lg:py-40">
        <div className="mx-auto max-w-7xl">
          <Reveal className="flex flex-col justify-between gap-8 border-b border-white/15 pb-12 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.28em] text-[#d7956d]">Signature menu</p>
              <h2 className="mt-5 font-premium-serif text-4xl tracking-[-.04em] sm:text-6xl">今日の気分に、<br />ちょうどいいもの。</h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-white/55">公開情報で確認できた内容をもとにした提案構成です。価格・提供時間・写真は店舗確認後に正式情報へ更新します。</p>
          </Reveal>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {home.features.map((feature, index) => (
              <Reveal key={feature.title} delay={index * .08}>
                <article className="group overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/[.04]">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <PremiumMedia media={premium.gallery[index % premium.gallery.length]} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                    <span className="absolute bottom-5 left-5 font-premium-serif text-5xl italic text-white/35">0{index + 1}</span>
                  </div>
                  <div className="p-7 sm:p-8">
                    <h3 className="font-premium-serif text-2xl">{feature.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-white/55">{feature.description}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
          <div className="mt-12 text-center"><a href={`${basePath}/services`} className="inline-flex items-center gap-3 rounded-full border border-white/25 px-7 py-3 text-sm font-semibold transition hover:bg-white hover:text-[#251914]">メニューを詳しく見る<ArrowUpRight className="h-4 w-4" /></a></div>
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8 sm:py-32 lg:px-12 lg:py-40">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mb-12 flex items-end justify-between gap-6">
            <div><p className="text-xs font-bold uppercase tracking-[.28em] text-[var(--premium-accent)]">Scenes</p><h2 className="mt-4 font-premium-serif text-4xl sm:text-6xl">店で過ごす、いくつかの時間。</h2></div>
          </Reveal>
          <GalleryCarousel media={premium.gallery} />
        </div>
      </section>

      {home.faq && <DemoFAQ faq={home.faq} isJa accent={accent} subtitle="ご来店前によくいただく質問をまとめました。最新情報は公式Instagramもご確認ください。" />}

      <section className="relative overflow-hidden bg-[#a95f3d] px-5 py-24 text-white sm:px-8 sm:py-32 lg:px-12">
        <div className="absolute inset-0 opacity-15 [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_34%),radial-gradient(circle_at_80%_80%,white_0,transparent_28%)]" />
        <Reveal className="relative mx-auto max-w-5xl text-center">
          <Coffee className="mx-auto h-9 w-9" aria-hidden="true" />
          <h2 className="mt-7 font-premium-serif text-4xl leading-tight tracking-[-.04em] sm:text-6xl">今日のSOSOMUを、<br />Instagramで。</h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-white/75">営業日や最新メニューは、公式Instagramの投稿をご確認ください。</p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <a href={home.cta.buttonHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-8 text-sm font-bold text-[#8b452c] transition hover:-translate-y-0.5"><FaInstagram className="h-4 w-4" />公式Instagramを見る</a>
            <a href={mapHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-white/35 px-8 text-sm font-bold text-white transition hover:bg-white/10"><MapPin className="h-4 w-4" />アクセスを確認</a>
          </div>
        </Reveal>
      </section>

      <div className="fixed inset-x-3 bottom-3 z-[65] flex gap-2 rounded-2xl border border-black/10 bg-[#fffaf4]/92 p-2 shadow-2xl backdrop-blur-xl sm:hidden">
        <a href={mapHref} target="_blank" rel="noopener noreferrer" className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#a95f3d]/20 text-xs font-bold text-[#6f3723]"><MapPin className="h-4 w-4" />アクセス</a>
        <a href={home.cta.buttonHref} target="_blank" rel="noopener noreferrer" className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#a95f3d] text-xs font-bold text-white"><FaInstagram className="h-4 w-4" />Instagram</a>
      </div>
    </div>
  )
}

function GalleryCarousel({ media }: { media: DemoPremiumMedia[] }) {
  const [api, setApi] = useState<CarouselApi>()
  const reducedMotion = useReducedMotion()
  const cycle = useCallback(() => api?.scrollNext(), [api])
  useEffect(() => {
    if (!api || reducedMotion || media.length < 2) return undefined
    const timer = window.setInterval(cycle, 5200)
    return () => window.clearInterval(timer)
  }, [api, cycle, media.length, reducedMotion])
  return (
    <Carousel setApi={setApi} opts={{ align: "start", loop: true }} className="mx-auto" aria-label="Cafe gallery">
      <CarouselContent className="-ml-5">
        {media.map((item, index) => (
          <CarouselItem key={`${item.src}-${index}`} className="basis-[88%] pl-5 sm:basis-[68%] lg:basis-[46%]">
            <article className="group">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1.8rem] bg-[#e4d8cb] shadow-[0_22px_65px_rgba(78,54,40,.13)]">
                <PremiumMedia media={item} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                {item.caption && <p className="absolute bottom-5 left-6 right-6 text-sm font-medium text-white">{item.caption}</p>}
              </div>
            </article>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="-left-4 top-1/2 h-11 w-11 border-0 bg-white/90 shadow-lg hover:bg-white sm:left-4" />
      <CarouselNext className="-right-4 top-1/2 h-11 w-11 border-0 bg-white/90 shadow-lg hover:bg-white sm:right-4" />
    </Carousel>
  )
}

function PremiumMedia({ media, priority = false }: { media: DemoPremiumMedia; priority?: boolean }) {
  if (media.kind === "video") {
    return <video src={media.src} autoPlay muted loop playsInline preload="metadata" className="h-full w-full object-cover" aria-label={media.alt} />
  }
  return <Image src={media.src} alt={media.alt} fill priority={priority} sizes="(max-width: 768px) 100vw, 75vw" className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.035]" style={{ objectPosition: media.objectPosition ?? "center" }} />
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reducedMotion = useReducedMotion()
  return <motion.div className={className} initial={reducedMotion ? false : { opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: .7, delay, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>
}

export function PremiumSocialIcon({ network }: { network: string }) {
  const props = { className: "h-4 w-4", "aria-hidden": true } as const
  if (network === "instagram") return <FaInstagram {...props} />
  if (network === "facebook") return <FaFacebookF {...props} />
  if (network === "youtube") return <FaYoutube {...props} />
  if (network === "tiktok") return <FaTiktok {...props} />
  if (network === "x") return <FaXTwitter {...props} />
  if (network === "line") return <FaLine {...props} />
  return <MessageCircle {...props} />
}
