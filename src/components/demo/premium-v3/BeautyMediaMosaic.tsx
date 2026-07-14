"use client"

import type { DemoPremiumMedia } from "@/lib/sales/demo-site-types"
import { PremiumV3Media } from "./PremiumV3Media"

type MosaicHeight = "home" | "page" | "compact"
export type BeautyMosaicLayout = "grid" | "editorial" | "strip" | "lookbook"

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
  layout = "grid",
}: {
  media: DemoPremiumMedia[]
  label: string
  priority?: boolean
  height?: MosaicHeight
  layout?: BeautyMosaicLayout
}) {
  const compact = height === "compact"
  const visibleMedia = media.slice(0, layout === "grid" ? 6 : 4)
  const gridClass = layout === "editorial"
    ? "grid-cols-12 grid-rows-[repeat(6,minmax(48px,1fr))] p-5 sm:p-8 lg:p-10"
    : layout === "strip"
      ? "grid-cols-2 grid-rows-2 p-5 sm:p-8 lg:p-10"
      : layout === "lookbook"
        ? "grid-cols-12 grid-rows-[repeat(5,minmax(58px,1fr))] p-5 sm:p-8 lg:p-10"
        : `${compact ? "grid-cols-2 lg:grid-cols-2 lg:p-12" : "grid-cols-2 lg:grid-cols-3 lg:p-10"} p-5 sm:p-8`

  function figureClass(index: number): string {
    if (layout === "editorial") {
      return [
        "col-span-7 row-span-4",
        "col-span-5 row-span-3",
        "col-span-5 row-span-3",
        "col-span-7 row-span-2",
      ][index] ?? "hidden"
    }
    if (layout === "lookbook") {
      return [
        "col-span-7 row-span-5",
        "col-span-5 row-span-3",
        "col-span-3 row-span-2",
        "col-span-2 row-span-2",
      ][index] ?? "hidden"
    }
    if (layout === "strip") return index % 2 === 0 ? "translate-y-3" : "-translate-y-3"
    return `aspect-square ${!compact && index >= 4 ? "hidden lg:block" : ""}`
  }

  return (
    <div className={`relative flex h-full items-center overflow-hidden bg-[var(--demo-ink)] ${HEIGHT_CLASSES[height]}`} role="group" aria-label={label}>
      <div className={`grid h-full w-full gap-2 ${gridClass}`}>
        {visibleMedia.map((item, index) => (
          <figure key={`${item.src}-${index}`} className={`group relative min-h-24 overflow-hidden bg-white/8 ${figureClass(index)}`}>
            <PremiumV3Media media={item} priority={priority && index === 0} className="absolute inset-0" sizes={compact ? "(max-width:1024px) 46vw, 22vw" : "(max-width:1024px) 46vw, 16vw"} />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/62 to-transparent px-3 pb-3 pt-8 text-[10px] leading-5 text-white/72">{item.alt}</figcaption>
          </figure>
        ))}
      </div>
      <span className="absolute bottom-3 right-5 text-[9px] font-bold tracking-[.24em] text-white/40">{layout === "editorial" ? "STORY NOTES" : layout === "strip" ? "SERVICE DETAILS" : layout === "lookbook" ? "SALON LOOKBOOK" : compact ? "SALON DETAILS" : "INSIDE THE SALON"}</span>
    </div>
  )
}
