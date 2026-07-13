"use client"

import { motion } from "framer-motion"
import type { DemoDesignRecipe, DemoPremiumMedia } from "@/lib/sales/demo-site-types"
import { PremiumV2Media, PremiumV2MediaCarousel } from "../premium-v2/PremiumV2Primitives"

export const PremiumV3Media = PremiumV2Media
export const PremiumV3MediaCarousel = PremiumV2MediaCarousel

export function PremiumV3Reveal({
  children,
  className = "",
  delay = 0,
  motionStyle: _motionStyle = "editorial",
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  motionStyle?: DemoDesignRecipe["motionVariant"]
}) {
  return (
    <motion.div
      className={className}
      initial={false}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function PremiumV3PageHero({
  title,
  subtitle,
  eyebrow,
  media,
  recipe,
}: {
  title: string
  subtitle: string
  eyebrow: string
  media: DemoPremiumMedia
  recipe?: DemoDesignRecipe
}) {
  const split = recipe?.rhythmVariant === 1 || recipe?.rhythmVariant === 3
  const motionStyle = recipe?.motionVariant

  if (split) {
    return (
      <header className="grid min-h-[500px] bg-[var(--demo-surface)] text-[var(--demo-ink)] lg:grid-cols-[.88fr_1.12fr]">
        <div className="flex items-end px-5 pb-14 pt-28 sm:px-10 sm:pb-18 lg:px-16 lg:pb-20">
          <PremiumV3Reveal motionStyle={motionStyle}>
            <p className="text-[10px] font-bold uppercase tracking-[.32em] text-[var(--demo-muted)] sm:text-xs">{eyebrow}</p>
            <h1 className="mt-6 max-w-3xl text-[clamp(2.7rem,5.2vw,5rem)] font-[var(--demo-heading-weight)] leading-[1.02] tracking-[-.035em] text-balance [font-family:var(--demo-font-display)]">{title}</h1>
            <p className="mt-8 max-w-xl border-l border-[var(--demo-line)] pl-5 text-base leading-8 text-[var(--demo-muted)] sm:text-lg">{subtitle}</p>
          </PremiumV3Reveal>
        </div>
        <div className="group relative min-h-[420px] overflow-hidden lg:min-h-[500px]">
          <PremiumV3Media media={media} priority className="absolute inset-0" sizes="(max-width:1024px) 100vw, 56vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        </div>
      </header>
    )
  }

  return (
    <header className="relative flex min-h-[520px] items-end overflow-hidden bg-[#171713] text-white sm:min-h-[580px]">
      <PremiumV3Media media={media} priority className="absolute inset-0" sizes="100vw" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/76 via-black/35 to-black/5" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/42 via-transparent to-black/15" />
      <PremiumV3Reveal motionStyle={motionStyle} className="relative mx-auto w-full max-w-[1500px] px-5 pb-14 pt-28 sm:px-10 sm:pb-18 lg:px-16 lg:pb-20">
        <p className="text-[10px] font-bold uppercase tracking-[.32em] text-white/68 sm:text-xs">{eyebrow}</p>
        <h1 className="mt-6 max-w-4xl text-[clamp(2.7rem,5.2vw,5.2rem)] font-[var(--demo-heading-weight)] leading-[1.01] tracking-[-.035em] text-balance [font-family:var(--demo-font-display)]">{title}</h1>
        <p className="mt-7 max-w-2xl border-l border-white/45 pl-5 text-base leading-8 text-white/78 sm:text-lg">{subtitle}</p>
      </PremiumV3Reveal>
    </header>
  )
}
