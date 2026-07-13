"use client"

import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import useEmblaCarousel from "embla-carousel-react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import type { DemoPremiumMedia } from "@/lib/sales/demo-site-types"

export function PremiumV2Media({
  media,
  priority = false,
  className = "",
  sizes = "(max-width: 1024px) 100vw, 60vw",
}: {
  media: DemoPremiumMedia
  priority?: boolean
  className?: string
  sizes?: string
}) {
  if (media.kind === "video") {
    return (
      <video
        src={media.src}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={media.alt}
        className={`${className} h-full w-full object-cover`}
        style={{ objectPosition: media.objectPosition ?? "center" }}
      />
    )
  }

  return (
    <div className={`${className} overflow-hidden`}>
      <Image
        src={media.src}
        alt={media.alt}
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover transition-transform duration-[1600ms] ease-out group-hover:scale-[1.035]"
        style={{ objectPosition: media.objectPosition ?? "center" }}
      />
    </div>
  )
}

export function PremiumV2Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const reducedMotion = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function PremiumV2PageHero({
  title,
  subtitle,
  eyebrow,
  media,
}: {
  title: string
  subtitle: string
  eyebrow: string
  media: DemoPremiumMedia
}) {
  return (
    <header className="relative flex min-h-[560px] items-end overflow-hidden bg-[#171713] text-white sm:min-h-[650px]">
      <PremiumV2Media media={media} priority className="absolute inset-0" sizes="100vw" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />
      <PremiumV2Reveal className="relative mx-auto w-full max-w-[1500px] px-5 pb-16 pt-32 sm:px-10 sm:pb-20 lg:px-16 lg:pb-24">
        <p className="text-[10px] font-bold uppercase tracking-[.32em] text-white/65 sm:text-xs">{eyebrow}</p>
        <h1 className="mt-6 max-w-4xl whitespace-pre-line font-premium-serif text-[clamp(2.85rem,6.2vw,6.7rem)] leading-[.94] tracking-[-.055em] text-balance">
          {title}
        </h1>
        <p className="mt-8 max-w-2xl border-l border-white/45 pl-5 text-base leading-8 text-white/75 sm:text-lg sm:leading-9">
          {subtitle}
        </p>
      </PremiumV2Reveal>
    </header>
  )
}

export function PremiumV2MediaCarousel({
  media,
  label,
}: {
  media: DemoPremiumMedia[]
  label: string
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: media.length > 2, align: "start" })
  const [selectedIndex, setSelectedIndex] = useState(0)

  const updateSelected = useCallback(() => {
    if (emblaApi) setSelectedIndex(emblaApi.selectedScrollSnap())
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

  if (media.length === 0) return null

  return (
    <section aria-label={label} className="overflow-hidden">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex touch-pan-y gap-4">
          {media.map((item, index) => (
            <div key={`${item.src}-${index}`} className="min-w-0 shrink-0 basis-[88%] sm:basis-[62%] lg:basis-[42%]">
              <figure className="group relative aspect-[4/3] overflow-hidden bg-black/10">
                <PremiumV2Media media={item} className="absolute inset-0" sizes="(max-width: 640px) 88vw, 45vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white sm:p-7">
                  <span className="max-w-md font-premium-serif text-xl sm:text-2xl">{item.caption ?? item.alt}</span>
                  <span className="text-[10px] font-bold tracking-[.25em] text-white/60">{String(index + 1).padStart(2, "0")}</span>
                </figcaption>
              </figure>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-2" aria-label="スライド位置">
          {media.map((item, index) => (
            <button
              key={`${item.src}-dot-${index}`}
              type="button"
              aria-label={`${index + 1}枚目を表示`}
              aria-current={selectedIndex === index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={`h-1.5 rounded-full transition-all ${selectedIndex === index ? "w-8 bg-current" : "w-1.5 bg-current opacity-25"}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" aria-label="前のスライド" onClick={() => emblaApi?.scrollPrev()} className="grid h-12 w-12 place-items-center rounded-full border border-current/20 transition hover:bg-black hover:text-white"><ArrowLeft className="h-4 w-4" /></button>
          <button type="button" aria-label="次のスライド" onClick={() => emblaApi?.scrollNext()} className="grid h-12 w-12 place-items-center rounded-full border border-current/20 transition hover:bg-black hover:text-white"><ArrowRight className="h-4 w-4" /></button>
        </div>
      </div>
    </section>
  )
}
