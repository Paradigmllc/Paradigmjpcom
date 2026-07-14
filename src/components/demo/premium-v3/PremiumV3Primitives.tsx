"use client"

import type { DemoDesignRecipe, DemoPremiumMedia } from "@/lib/sales/demo-site-types"
import { PremiumV3Parallax, PremiumV3Reveal, PremiumV3TextLines } from "./PremiumV3Motion"
import { PremiumV3Media } from "./PremiumV3Media"

export { PremiumV3MediaCarousel } from "./PremiumV3Carousel"
export { PremiumV3Media } from "./PremiumV3Media"
export { PremiumV3KineticRail, PremiumV3Parallax, PremiumV3Reveal, PremiumV3ScrollProgress, PremiumV3Stagger, PremiumV3StaggerItem, PremiumV3TextLines } from "./PremiumV3Motion"

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
            <h1 className="mt-6 max-w-3xl text-[clamp(2.7rem,5.2vw,5rem)] font-[var(--demo-heading-weight)] leading-[1.02] tracking-[-.035em] text-balance [font-family:var(--demo-font-display)]"><PremiumV3TextLines text={title} /></h1>
            <p className="mt-8 max-w-xl border-l border-[var(--demo-line)] pl-5 text-base leading-8 text-[var(--demo-muted)] sm:text-lg">{subtitle}</p>
          </PremiumV3Reveal>
        </div>
        <div className="group relative min-h-[420px] overflow-hidden lg:min-h-[500px]">
          <PremiumV3Parallax className="absolute -inset-y-14 inset-x-0"><PremiumV3Media media={media} priority className="absolute inset-0" sizes="(max-width:1024px) 100vw, 56vw" /></PremiumV3Parallax>
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        </div>
      </header>
    )
  }

  return (
    <header className="relative flex min-h-[520px] items-end overflow-hidden bg-[#171713] text-white sm:min-h-[580px]">
      <PremiumV3Parallax className="absolute -inset-y-14 inset-x-0"><PremiumV3Media media={media} priority className="absolute inset-0" sizes="100vw" /></PremiumV3Parallax>
      <div className="absolute inset-0 bg-gradient-to-r from-black/76 via-black/35 to-black/5" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/42 via-transparent to-black/15" />
      <PremiumV3Reveal motionStyle={motionStyle} className="relative mx-auto w-full max-w-[1500px] px-5 pb-14 pt-28 sm:px-10 sm:pb-18 lg:px-16 lg:pb-20">
        <p className="text-[10px] font-bold uppercase tracking-[.32em] text-white/68 sm:text-xs">{eyebrow}</p>
        <h1 className="mt-6 max-w-4xl text-[clamp(2.7rem,5.2vw,5.2rem)] font-[var(--demo-heading-weight)] leading-[1.01] tracking-[-.035em] text-balance [font-family:var(--demo-font-display)]"><PremiumV3TextLines text={title} /></h1>
        <p className="mt-7 max-w-2xl border-l border-white/45 pl-5 text-base leading-8 text-white/78 sm:text-lg">{subtitle}</p>
      </PremiumV3Reveal>
    </header>
  )
}
