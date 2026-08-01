"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react"
import type { DemoDesignRecipe, DemoPremiumMedia } from "@/lib/sales/demo-site-types"
import { canonicalDemoMediaSrc } from "@/lib/sales/demo-public-surface"
import { isPremiumMediaUsable } from "@/lib/sales/demo-media-quality"
import { demoHeadlineClass, demoHeadlineText } from "@/lib/sales/demo-art-direction"
import { PremiumV3Media } from "./PremiumV3Media"
import { PremiumV3Reveal, PremiumV3ScrollCue, PremiumV3TextLines } from "./PremiumV3Motion"

const AUTOPLAY_MS = 6800

export type PremiumV3HeroDeckVariant = "cinematic" | "split"

export function uniqueHeroMedia(media: DemoPremiumMedia[], limit = 5): DemoPremiumMedia[] {
  const seen = new Set<string>()
  return media.filter((item) => {
    const source = canonicalDemoMediaSrc(item.src)
    if (!source || seen.has(source)) return false
    seen.add(source)
    return isPremiumMediaUsable(item, "hero")
  }).slice(0, limit)
}

export function PremiumV3HeroDeck({
  media,
  title,
  subtitle,
  eyebrow,
  locationLabel,
  primaryCta,
  secondaryCta,
  variant = "cinematic",
  splitSide = "right",
  motionStyle = "editorial",
}: {
  media: DemoPremiumMedia[]
  title: string
  subtitle: string
  eyebrow: string
  locationLabel: string
  primaryCta: { text: string; href: string }
  secondaryCta: { text: string; href: string }
  variant?: PremiumV3HeroDeckVariant
  splitSide?: "left" | "right"
  motionStyle?: DemoDesignRecipe["motionVariant"]
}) {
  const slides = useMemo(() => uniqueHeroMedia(media), [media])
  const reducedMotion = useReducedMotion()
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: slides.length > 1, align: "start", skipSnaps: false })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [playing, setPlaying] = useState(!reducedMotion)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const active = slides[selectedIndex] ?? slides[0]
  const isSplit = variant === "split"
  const isExternalPrimary = /^https?:\/\//u.test(primaryCta.href)
  const isExternalSecondary = /^https?:\/\//u.test(secondaryCta.href)
  const stageStyle = { "--hero-slide": selectedIndex } as CSSProperties

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const scheduleNext = useCallback(() => {
    clearTimer()
    if (!emblaApi || !playing || hovered || focused || reducedMotion || slides.length < 2 || document.hidden) return
    timerRef.current = setTimeout(() => emblaApi.scrollNext(), AUTOPLAY_MS)
  }, [clearTimer, emblaApi, focused, hovered, playing, reducedMotion, slides.length])

  const updateSelected = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    updateSelected()
    emblaApi.on("select", updateSelected)
    emblaApi.on("reInit", updateSelected)
    return () => {
      emblaApi.off("select", updateSelected)
      emblaApi.off("reInit", updateSelected)
    }
  }, [emblaApi, updateSelected])

  useEffect(() => {
    scheduleNext()
    return clearTimer
  }, [clearTimer, scheduleNext, selectedIndex])

  useEffect(() => {
    const handleVisibility = () => document.hidden ? clearTimer() : scheduleNext()
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [clearTimer, scheduleNext])

  const track = (
    <div ref={emblaRef} className="premium-hero-deck__viewport h-full overflow-hidden" aria-roledescription="carousel" aria-label={`${title}のビジュアルスライダー`}>
      <div className="flex h-full touch-pan-y">
        {(slides.length > 0 ? slides : [undefined]).map((item, index) => (
          <div className={`premium-hero-deck__slide relative min-w-0 flex-[0_0_100%] overflow-hidden ${selectedIndex === index ? "is-active" : ""}`} key={`${item?.src ?? "fallback"}-${index}`} role="group" aria-roledescription="slide" aria-label={`${index + 1} / ${Math.max(slides.length, 1)}`} aria-hidden={selectedIndex !== index}>
            <PremiumV3Media media={item} priority={index === 0} className="absolute inset-0" sizes={isSplit ? "(max-width: 1024px) 100vw, 58vw" : "100vw"} />
            <div className="premium-hero-deck__image-wash absolute inset-0" aria-hidden="true" />
            <div className="premium-hero-deck__slide-number absolute bottom-7 right-7 text-[10px] font-bold tracking-[.28em] text-white/70 sm:bottom-10 sm:right-10">{String(index + 1).padStart(2, "0")}</div>
          </div>
        ))}
      </div>
    </div>
  )

  const controls = slides.length > 1 && (
    <div className="premium-hero-deck__controls relative z-20 flex items-center gap-2" aria-label="スライダー操作">
      {!reducedMotion && <button type="button" aria-label={playing ? "自動再生を停止" : "自動再生を開始"} onClick={() => setPlaying((value) => !value)} className="grid h-11 w-11 place-items-center border border-white/30 text-white transition hover:bg-white hover:text-black">
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>}
      <button type="button" aria-label="前のスライド" onClick={() => emblaApi?.scrollPrev()} className="grid h-11 w-11 place-items-center border border-white/30 text-white transition hover:bg-white hover:text-black"><ArrowLeft className="h-4 w-4" /></button>
      <button type="button" aria-label="次のスライド" onClick={() => emblaApi?.scrollNext()} className="grid h-11 w-11 place-items-center border border-white/30 text-white transition hover:bg-white hover:text-black"><ArrowRight className="h-4 w-4" /></button>
      <div className="ml-2 flex gap-1.5" role="tablist" aria-label="スライドを選択">
        {slides.map((item, index) => <button key={item.src} type="button" role="tab" aria-selected={selectedIndex === index} aria-label={`${index + 1}枚目を表示`} onClick={() => emblaApi?.scrollTo(index)} className="group flex h-8 items-center px-1"><span className={`block h-px transition-all duration-500 ${selectedIndex === index ? "w-9 bg-white" : "w-4 bg-white/40 group-hover:w-7 group-hover:bg-white/70"}`} /></button>)}
      </div>
    </div>
  )

  const content = (
    <PremiumV3Reveal motionStyle={motionStyle} className={`premium-hero-deck__content relative z-20 ${isSplit ? "max-w-2xl" : "max-w-5xl"}`}>
      <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.34em] text-white/70 sm:text-xs"><span className="h-px w-8 bg-[var(--demo-accent)]" />{eyebrow}</div>
      <h1 className={`${demoHeadlineClass(title, "hero")} mt-7 max-w-[16em] font-[var(--demo-heading-weight)] text-balance text-white [font-family:var(--demo-font-display)]`}><PremiumV3TextLines text={demoHeadlineText(title)} /></h1>
      <p className="mt-7 max-w-2xl border-l border-white/45 pl-5 text-base leading-8 text-white/78 sm:text-lg">{subtitle}</p>
      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <a href={primaryCta.href} {...(isExternalPrimary ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="inline-flex min-h-12 items-center justify-center gap-3 bg-white px-7 text-sm font-bold text-black transition hover:-translate-y-1 hover:bg-white/90">{primaryCta.text}<ArrowUpRight className="h-4 w-4" /></a>
        <a href={secondaryCta.href} {...(isExternalSecondary ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="inline-flex min-h-12 items-center justify-center border border-white/45 px-7 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/10">{secondaryCta.text}</a>
      </div>
    </PremiumV3Reveal>
  )

  if (isSplit) {
    return (
      <section className="premium-hero-deck premium-hero-deck--split relative grid min-h-[680px] overflow-hidden bg-[var(--demo-ink)] lg:min-h-[720px] lg:grid-cols-[.9fr_1.1fr]" style={stageStyle} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={() => setFocused(false)}>
        <div className={`premium-hero-deck__split-copy relative z-10 flex items-center px-5 py-24 sm:px-10 lg:px-16 ${splitSide === "left" ? "lg:order-last" : "lg:order-first"}`}>{content}</div>
        <div className={`premium-hero-deck__split-media relative min-h-[420px] lg:min-h-0 ${splitSide === "left" ? "lg:order-first" : "lg:order-last"}`}>{track}<div className="absolute inset-x-5 bottom-6 flex items-end justify-between sm:inset-x-10 lg:bottom-10">{controls}<p className="hidden max-w-[14rem] text-right text-xs leading-6 text-white/65 sm:block">{active?.caption ?? active?.alt ?? locationLabel}</p></div></div>
        <PremiumV3ScrollCue dark />
      </section>
    )
  }

  return (
    <section className="premium-hero-deck premium-hero-deck--cinematic relative min-h-[680px] overflow-hidden bg-[var(--demo-ink)] text-white lg:min-h-[calc(100svh-4.9rem)]" style={stageStyle} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={() => setFocused(false)}>
      <div className="absolute inset-0">{track}</div>
      <div className="premium-hero-deck__ambient absolute inset-0" aria-hidden="true" />
      <div className="premium-hero-deck__cinematic-copy relative mx-auto flex min-h-[680px] max-w-[1500px] flex-col justify-end px-5 pb-14 pt-28 sm:px-10 sm:pb-20 lg:min-h-[calc(100svh-4.9rem)] lg:px-16">{content}<div className="mt-12 flex items-center justify-between gap-6">{controls}<p className="hidden text-right text-xs uppercase tracking-[.28em] text-white/60 sm:block">{locationLabel}</p></div></div>
      <PremiumV3ScrollCue dark />
    </section>
  )
}
