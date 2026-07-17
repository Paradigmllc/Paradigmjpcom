"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import useEmblaCarousel from "embla-carousel-react"
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react"
import type { DemoPremiumMedia } from "@/lib/sales/demo-site-types"
import { PremiumV3Media } from "./PremiumV3Media"
import { canonicalDemoMediaSrc } from "@/lib/sales/demo-public-surface"
import { isPremiumMediaUsable } from "@/lib/sales/demo-media-quality"

const AUTOPLAY_MS = 5600

export function PremiumV3MediaCarousel({ media, label, variant = "wide" }: { media: DemoPremiumMedia[]; label: string; variant?: "wide" | "compact" }) {
  const uniqueMedia = media
    .filter((item) => isPremiumMediaUsable(item, "gallery"))
    .filter((item, index, items) => items.findIndex((candidate) => canonicalDemoMediaSrc(candidate.src) === canonicalDemoMediaSrc(item.src)) === index)
  const reducedMotion = useReducedMotion()
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: uniqueMedia.length > 1, align: "center", skipSnaps: false })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [playing, setPlaying] = useState(!reducedMotion)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const scheduleNext = useCallback(() => {
    clearTimer()
    if (!emblaApi || !playing || hovered || focused || reducedMotion || uniqueMedia.length < 2 || document.hidden) return
    timerRef.current = setTimeout(() => emblaApi.scrollNext(), AUTOPLAY_MS)
  }, [clearTimer, emblaApi, focused, hovered, playing, reducedMotion, uniqueMedia.length])

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
  }, [scheduleNext, selectedIndex, clearTimer])

  useEffect(() => {
    const handleVisibility = () => document.hidden ? clearTimer() : scheduleNext()
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [clearTimer, scheduleNext])

  if (uniqueMedia.length === 0) return <div className="relative min-h-[300px] overflow-hidden"><PremiumV3Media media={undefined} className="absolute inset-0" /><span className="absolute bottom-5 left-6 text-xs font-bold tracking-[.22em] text-white/60">{label}</span></div>
  const active = uniqueMedia[selectedIndex] ?? uniqueMedia[0]

  return (
    <section aria-label={label} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={() => setFocused(false)}>
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex touch-pan-y">
          {uniqueMedia.map((item, index) => {
            const selected = selectedIndex === index
            return (
              <motion.div
                key={`${item.src}-${index}`}
                className={`min-w-0 shrink-0 px-2 ${variant === "compact" ? "basis-[78%] sm:basis-[42%] lg:basis-[28%]" : "basis-[88%] sm:basis-[68%] lg:basis-[58%]"}`}
                animate={reducedMotion ? undefined : { scale: selected ? 1 : 0.92, opacity: selected ? 1 : 0.48 }}
                transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
              >
                <figure className={`group relative cursor-grab overflow-hidden bg-black/10 active:cursor-grabbing ${variant === "compact" ? "aspect-square" : "aspect-[4/3] sm:aspect-[16/10]"}`}>
                  <PremiumV3Media media={item} className="absolute inset-0" sizes={variant === "compact" ? "(max-width: 640px) 78vw, 30vw" : "(max-width: 640px) 88vw, 62vw"} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/68 via-transparent to-black/5" />
                  <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white sm:p-8">
                    <span className={`max-w-lg leading-tight [font-family:var(--demo-font-display)] ${variant === "compact" ? "text-base sm:text-xl" : "text-xl sm:text-3xl"}`}>{item.caption ?? item.alt}</span>
                    <span className="text-[10px] font-bold tracking-[.26em] text-white/58">{String(index + 1).padStart(2, "0")}</span>
                  </figcaption>
                </figure>
              </motion.div>
            )
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <div className="h-px overflow-hidden bg-[var(--demo-line)]">
            <motion.div
              key={`${selectedIndex}-${playing}-${hovered}-${focused}`}
              className="h-full origin-left bg-[var(--demo-ink)]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: playing && !hovered && !focused && !reducedMotion ? 1 : 0 }}
              transition={{ duration: AUTOPLAY_MS / 1000, ease: "linear" }}
            />
          </div>
          <div className="mt-3 flex min-h-6 items-center justify-between gap-5 text-xs text-[var(--demo-muted)]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={active.src} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -7 }}>
                {active.caption ?? active.alt}
              </motion.span>
            </AnimatePresence>
            <span className="shrink-0 tabular-nums">{String(selectedIndex + 1).padStart(2, "0")} / {String(uniqueMedia.length).padStart(2, "0")}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {!reducedMotion && uniqueMedia.length > 1 && (
            <button type="button" aria-label={playing ? "自動再生を停止" : "自動再生を開始"} onClick={() => setPlaying((value) => !value)} className="grid h-12 w-12 place-items-center rounded-full border border-current/20 transition hover:bg-[var(--demo-ink)] hover:text-white">
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
          )}
          <button type="button" aria-label="前のスライド" onClick={() => emblaApi?.scrollPrev()} className="grid h-12 w-12 place-items-center rounded-full border border-current/20 transition hover:bg-[var(--demo-ink)] hover:text-white"><ArrowLeft className="h-4 w-4" /></button>
          <button type="button" aria-label="次のスライド" onClick={() => emblaApi?.scrollNext()} className="grid h-12 w-12 place-items-center rounded-full border border-current/20 transition hover:bg-[var(--demo-ink)] hover:text-white"><ArrowRight className="h-4 w-4" /></button>
        </div>
      </div>
    </section>
  )
}
