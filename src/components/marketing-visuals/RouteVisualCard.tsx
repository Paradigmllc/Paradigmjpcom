"use client"

import Image from "next/image"
import { usePathname } from "next/navigation"
import { resolveMarketingVisualProfile } from "./marketing-visual-content"

export default function RouteVisualCard() {
  const pathname = usePathname()
  const profile = resolveMarketingVisualProfile(pathname) ?? resolveMarketingVisualProfile("/ja")
  if (!profile) return null

  const slide = profile.slides[0]

  return (
    <figure className="group mb-6 overflow-hidden rounded-2xl border border-paradigm-line bg-white shadow-[0_18px_45px_-32px_rgba(15,17,21,0.5)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-paradigm-surface">
        <Image
          src={slide.src}
          alt={slide.alt}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 320px"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.025]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-paradigm-ink/55 via-transparent to-transparent" />
        <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 text-white">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em]">{slide.label}</span>
          <span className="h-2 w-8 bg-paradigm-glow" aria-hidden />
        </figcaption>
      </div>
    </figure>
  )
}
