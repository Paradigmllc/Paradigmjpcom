"use client"

import type { DemoPremiumMedia } from "@/lib/sales/demo-site-types"
import { PremiumV3Media } from "./PremiumV3Media"

type MosaicHeight = "home" | "page" | "compact"

const HEIGHT_CLASSES: Record<MosaicHeight, string> = {
  home: "min-h-[520px] lg:min-h-[680px]",
  page: "min-h-[420px] lg:min-h-[500px]",
  compact: "min-h-[520px] lg:min-h-[760px]",
}

export function BeautyMediaMosaic({
  media,
  label,
  priority = false,
  height = "home",
}: {
  media: DemoPremiumMedia[]
  label: string
  priority?: boolean
  height?: MosaicHeight
}) {
  const compact = height === "compact"
  return (
    <div className={`relative flex h-full items-center overflow-hidden bg-[var(--demo-ink)] ${HEIGHT_CLASSES[height]}`} role="group" aria-label={label}>
      <div className={`grid w-full grid-cols-2 gap-2 p-5 sm:p-8 ${compact ? "lg:grid-cols-2 lg:p-12" : "lg:grid-cols-3 lg:p-10"}`}>
        {media.slice(0, 6).map((item, index) => (
          <figure key={item.src} className={`group relative aspect-square overflow-hidden bg-white/8 ${!compact && index >= 4 ? "hidden lg:block" : ""}`}>
            <PremiumV3Media media={item} priority={priority && index === 0} className="absolute inset-0" sizes={compact ? "(max-width:1024px) 46vw, 22vw" : "(max-width:1024px) 46vw, 16vw"} />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/62 to-transparent px-3 pb-3 pt-8 text-[10px] leading-5 text-white/72">{item.alt}</figcaption>
          </figure>
        ))}
      </div>
      <span className="absolute bottom-3 right-5 text-[9px] font-bold tracking-[.24em] text-white/40">{compact ? "SALON DETAILS" : "INSIDE THE SALON"}</span>
    </div>
  )
}
