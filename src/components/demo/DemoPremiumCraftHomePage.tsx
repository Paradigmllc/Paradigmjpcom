"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowRight, ArrowUpRight, MapPin, Sparkles } from "lucide-react"
import { FaInstagram } from "react-icons/fa6"
import { DemoFAQ } from "./DemoFAQ"
import type { DemoMultiPageData, DemoPremiumMedia } from "@/lib/sales/demo-site-types"

export function DemoPremiumCraftHomePage({ data }: { data: DemoMultiPageData }) {
  const premium = data.premium!
  const home = data.pages.home
  const reducedMotion = useReducedMotion()
  const [active, setActive] = useState(0)
  const basePath = `/${data.locale}/demo/${data.slug}`
  const mapHref = data.pages.contact.mapUrl ?? `${basePath}/contact`

  useEffect(() => {
    if (reducedMotion || premium.heroMedia.length < 2) return undefined
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % premium.heroMedia.length)
    }, 5600)
    return () => window.clearInterval(timer)
  }, [premium.heroMedia.length, reducedMotion])

  return (
    <div className="overflow-hidden bg-[#f1e8d7] text-[#271817]" style={{ "--craft-accent": data.meta.accentColor } as React.CSSProperties}>
      <section className="relative min-h-[760px] border-b border-[#4c2725]/20 lg:min-h-[min(900px,calc(100svh-7rem))]">
        <div className="mx-auto grid min-h-[760px] max-w-[1500px] lg:min-h-[min(900px,calc(100svh-7rem))] lg:grid-cols-[.9fr_1.1fr]">
          <div className="relative z-10 flex flex-col justify-between px-5 py-12 sm:px-10 sm:py-16 lg:px-16 lg:py-20">
            <motion.div initial={reducedMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7 }}>
              <p className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.32em] text-[#7c4542] sm:text-xs">
                <Sparkles className="h-4 w-4" aria-hidden="true" />{home.hero.tagline}
              </p>
              <h1 className="mt-10 whitespace-pre-line font-premium-serif text-[clamp(3.7rem,8vw,7.7rem)] font-medium leading-[.88] tracking-[-.07em] text-balance">
                {home.hero.title}
              </h1>
              <p className="mt-8 max-w-lg border-l border-[#8d4d49] pl-5 text-base leading-8 text-[#6b504b] sm:text-lg sm:leading-9">
                {home.hero.subtitle}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href={home.hero.primaryCta.href} target="_blank" rel="noopener noreferrer" className="group inline-flex min-h-12 items-center justify-center gap-3 bg-[#742f32] px-7 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#592326]">
                  {home.hero.primaryCta.text}<ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
                <a href={home.hero.secondaryCta.href} className="inline-flex min-h-12 items-center justify-center border border-[#4c2725]/30 px-7 text-sm font-bold transition hover:bg-[#271817] hover:text-white">
                  {home.hero.secondaryCta.text}
                </a>
              </div>
            </motion.div>
            <div className="mt-16 flex items-end justify-between gap-4">
              <p className="max-w-[14rem] text-[10px] font-semibold uppercase leading-5 tracking-[.22em] text-[#8a6b61]">Small batch · Shimokitazawa · Weekend</p>
              <div className="flex gap-2" aria-label="メインビジュアル切り替え">
                {premium.heroMedia.map((item, index) => (
                  <button key={`${item.src}-${index}`} type="button" aria-label={`写真${index + 1}を表示`} aria-current={active === index} onClick={() => setActive(index)} className={`h-10 min-w-10 border text-xs font-bold transition ${active === index ? "border-[#742f32] bg-[#742f32] text-white" : "border-[#4c2725]/25 text-[#6b504b] hover:border-[#742f32]"}`}>
                    {String(index + 1).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative min-h-[580px] overflow-hidden bg-[#3d2020] lg:min-h-full">
            <AnimatePresence initial={false} mode="sync">
              <motion.div key={active} className="absolute inset-0" initial={reducedMotion ? false : { opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}>
                <CraftMedia media={premium.heroMedia[active]} priority />
              </motion.div>
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-[#271817]/60 via-transparent to-transparent" />
            <p className="absolute bottom-8 left-8 max-w-xs font-premium-serif text-lg italic leading-7 text-white/85 sm:bottom-12 sm:left-12">
              {premium.heroMedia[active]?.caption}
            </p>
            <div className="absolute right-0 top-0 grid h-28 w-28 place-items-center bg-[#742f32] text-center text-[10px] font-bold uppercase leading-5 tracking-[.2em] text-white sm:h-36 sm:w-36">
              Open<br />on weekends
            </div>
          </div>
        </div>
      </section>

      <div className="border-b border-[#4c2725]/15 bg-[#742f32] py-4 text-[#f8edda]">
        <motion.div className="flex w-max gap-12 whitespace-nowrap text-[11px] font-bold uppercase tracking-[.34em]" animate={reducedMotion ? undefined : { x: [0, -720] }} transition={{ duration: 24, repeat: Infinity, ease: "linear" }}>
          {[0, 1, 2, 3].map((item) => <span key={item}>European baked sweets · Made in small batches · Latest opening on Instagram · </span>)}
        </motion.div>
      </div>

      <section className="px-5 py-24 sm:px-10 sm:py-32 lg:px-16 lg:py-40">
        <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:gap-24">
          <CraftReveal className="relative min-h-[520px] sm:min-h-[650px]">
            <div className="absolute inset-x-0 top-0 h-[82%] overflow-hidden border border-[#4c2725]/20 shadow-[18px_22px_0_#dac7aa]">
              <CraftMedia media={premium.gallery[1] ?? premium.gallery[0]} />
            </div>
            <div className="absolute bottom-0 right-4 w-52 rotate-2 border border-[#4c2725]/20 bg-[#fff8e9] p-5 shadow-xl sm:w-64 sm:p-7">
              <p className="text-[9px] font-bold uppercase tracking-[.26em] text-[#8a514c]">Proposal visual</p>
              <p className="mt-3 font-premium-serif text-lg leading-7">一つずつ焼き上げる、週末のためのお菓子。</p>
            </div>
          </CraftReveal>
          <CraftReveal delay={.1}>
            <p className="text-xs font-bold uppercase tracking-[.28em] text-[#8b4744]">{premium.intro.eyebrow}</p>
            <h2 className="mt-6 whitespace-pre-line font-premium-serif text-4xl leading-[1.08] tracking-[-.045em] sm:text-6xl">{premium.intro.title}</h2>
            <p className="mt-8 whitespace-pre-line text-base leading-8 text-[#6b504b] sm:text-lg sm:leading-9">{premium.intro.body}</p>
            {premium.intro.note && <p className="mt-7 border-y border-[#4c2725]/15 py-5 text-xs leading-6 text-[#866a61]">{premium.intro.note}</p>}
            <a href={`${basePath}/about`} className="group mt-8 inline-flex items-center gap-4 text-sm font-bold">店の物語を読む<span className="grid h-10 w-10 place-items-center rounded-full bg-[#742f32] text-white transition group-hover:translate-x-1"><ArrowRight className="h-4 w-4" /></span></a>
          </CraftReveal>
        </div>
      </section>

      <section className="border-y border-[#4c2725]/15 bg-[#fff8e9] px-5 py-24 sm:px-10 sm:py-32 lg:px-16 lg:py-36">
        <div className="mx-auto max-w-7xl">
          <CraftReveal className="grid gap-7 border-b border-[#4c2725]/20 pb-10 md:grid-cols-[.7fr_1.3fr] md:items-end">
            <p className="text-xs font-bold uppercase tracking-[.3em] text-[#8b4744]">This weekend&apos;s table</p>
            <h2 className="font-premium-serif text-4xl leading-tight tracking-[-.045em] sm:text-6xl">ヨーロッパの焼菓子を、<br />下北沢の週末に。</h2>
          </CraftReveal>
          <div className="divide-y divide-[#4c2725]/15">
            {home.features.map((feature, index) => (
              <CraftReveal key={feature.title} delay={index * .06} className="group grid gap-6 py-9 sm:grid-cols-[5rem_1fr_1.2fr] sm:items-center sm:py-11">
                <span className="font-premium-serif text-4xl italic text-[#b18a78]">0{index + 1}</span>
                <h3 className="font-premium-serif text-2xl sm:text-3xl">{feature.title}</h3>
                <p className="text-sm leading-7 text-[#765b53]">{feature.description}</p>
              </CraftReveal>
            ))}
          </div>
          <a href={`${basePath}/services`} className="mt-8 inline-flex items-center gap-3 bg-[#271817] px-7 py-4 text-sm font-bold text-white transition hover:bg-[#742f32]">お菓子について見る<ArrowUpRight className="h-4 w-4" /></a>
        </div>
      </section>

      <section className="bg-[#291b1b] px-5 py-24 text-white sm:px-10 sm:py-32 lg:px-16 lg:py-40">
        <div className="mx-auto max-w-7xl">
          <CraftReveal className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div><p className="text-xs font-bold uppercase tracking-[.3em] text-[#d6a798]">Weekend scenes</p><h2 className="mt-5 font-premium-serif text-4xl sm:text-6xl">小さな店の、大きな焼き色。</h2></div>
            <p className="max-w-sm text-sm leading-7 text-white/55">掲載写真は提案用コンセプトです。正式制作では承認済みの実写素材へ置き換えます。</p>
          </CraftReveal>
          <div className="grid gap-5 md:grid-cols-12 md:grid-rows-2">
            {premium.gallery.map((item, index) => (
              <CraftReveal key={`${item.src}-${index}`} delay={index * .08} className={`${index === 0 ? "md:col-span-7 md:row-span-2" : "md:col-span-5"}`}>
                <figure className={`group relative overflow-hidden ${index === 0 ? "aspect-[4/5] md:h-full md:aspect-auto" : "aspect-[16/9]"}`}>
                  <CraftMedia media={item} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                  <figcaption className="absolute bottom-5 left-5 right-5 text-sm font-semibold text-white">{item.caption}</figcaption>
                </figure>
              </CraftReveal>
            ))}
          </div>
        </div>
      </section>

      {home.faq && <DemoFAQ faq={home.faq} isJa accent={data.meta.accentColor} subtitle="営業日は週ごとに変わる場合があります。ご来店前に公式Instagramをご確認ください。" />}

      <section className="relative overflow-hidden bg-[#742f32] px-5 py-24 text-white sm:px-10 sm:py-32 lg:px-16">
        <div className="absolute -right-20 -top-28 font-premium-serif text-[20rem] leading-none text-white/[.04]" aria-hidden="true">O</div>
        <CraftReveal className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[.3em] text-[#e6c0ad]">Latest opening &amp; menu</p><h2 className="mt-5 whitespace-pre-line font-premium-serif text-4xl leading-tight tracking-[-.04em] sm:text-6xl">{home.cta.title}</h2><p className="mt-6 max-w-xl text-base leading-8 text-white/70">{home.cta.subtitle}</p></div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <a href={home.cta.buttonHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-3 bg-white px-8 text-sm font-bold text-[#742f32] transition hover:-translate-y-0.5"><FaInstagram className="h-4 w-4" />公式Instagram</a>
            <a href={mapHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-3 border border-white/35 px-8 text-sm font-bold transition hover:bg-white/10"><MapPin className="h-4 w-4" />アクセス</a>
          </div>
        </CraftReveal>
      </section>

      <div className="fixed inset-x-3 bottom-3 z-[65] flex gap-2 border border-[#4c2725]/15 bg-[#fff8e9]/94 p-2 shadow-2xl backdrop-blur-xl sm:hidden">
        <a href={mapHref} target="_blank" rel="noopener noreferrer" className="flex min-h-11 flex-1 items-center justify-center gap-2 border border-[#742f32]/25 text-xs font-bold text-[#742f32]"><MapPin className="h-4 w-4" />アクセス</a>
        <a href={home.cta.buttonHref} target="_blank" rel="noopener noreferrer" className="flex min-h-11 flex-1 items-center justify-center gap-2 bg-[#742f32] text-xs font-bold text-white"><FaInstagram className="h-4 w-4" />Instagram</a>
      </div>
    </div>
  )
}

function CraftMedia({ media, priority = false }: { media: DemoPremiumMedia; priority?: boolean }) {
  if (media.kind === "video") return <video src={media.src} autoPlay muted loop playsInline preload="metadata" className="h-full w-full object-cover" aria-label={media.alt} />
  return <Image src={media.src} alt={media.alt} fill priority={priority} sizes="(max-width: 768px) 100vw, 70vw" className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.035]" style={{ objectPosition: media.objectPosition ?? "center" }} />
}

function CraftReveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reducedMotion = useReducedMotion()
  return <motion.div className={className} initial={reducedMotion ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-70px" }} transition={{ duration: .68, delay, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>
}
