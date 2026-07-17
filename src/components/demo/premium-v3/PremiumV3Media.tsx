"use client"

import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion"
import { useEffect, useState } from "react"
import type { DemoPremiumMedia } from "@/lib/sales/demo-site-types"
import { isPremiumMediaUsable } from "@/lib/sales/demo-media-quality"

export function normalizeDemoMediaUrl(source: string): string {
  try {
    const url = new URL(source)
    if (url.hostname === "image.ekiten.jp" && /^(?:\?\d+to\d+_[a-z]+|\?size=1to1_[a-z]+)$/iu.test(url.search)) {
      url.search = ""
      return url.toString()
    }
  } catch (error) {
    console.error("[demo-media] invalid media URL:", error)
  }
  return source
}

function PremiumMediaFallback({ media, className, label }: { media?: DemoPremiumMedia; className: string; label: string }) {
  return (
    <div className={`${className} relative overflow-hidden bg-[radial-gradient(circle_at_18%_20%,color-mix(in_srgb,var(--demo-accent)_38%,transparent),transparent_42%),linear-gradient(135deg,var(--demo-ink),#2c3538_56%,var(--demo-accent-dark))]`} role="img" aria-label={label}>
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full border border-white/15" />
      <div className="absolute bottom-8 left-8 h-px w-20 bg-[var(--demo-accent)]" />
      <div className="absolute bottom-7 left-8 text-[10px] font-bold uppercase tracking-[.34em] text-white/55">{media?.eyebrow ?? "SCENE"}</div>
      <div className="absolute bottom-7 right-8 text-[9px] font-bold tracking-[.28em] text-white/35">VISUAL / 01</div>
    </div>
  )
}

export function PremiumV3Media({ media, priority = false, className = "", sizes = "(max-width: 1024px) 100vw, 60vw" }: { media?: DemoPremiumMedia; priority?: boolean; className?: string; sizes?: string }) {
  const reducedMotion = useReducedMotion()
  const [imageState, setImageState] = useState<"ready" | "fallback">("ready")
  const source = media ? normalizeDemoMediaUrl(media.src) : ""

  useEffect(() => {
    setImageState("ready")
  }, [source])

  if (!media || (media.kind === "image" && (!isPremiumMediaUsable(media, "hero") || imageState === "fallback"))) {
    return <PremiumMediaFallback media={media} className={className} label={media?.alt ?? "ビジュアル"} />
  }
  if (media.kind === "video") {
    return <motion.video src={source} autoPlay muted loop playsInline preload="metadata" aria-label={media.alt} className={`${className} h-full w-full object-cover`} style={{ objectPosition: media.objectPosition ?? "center" }} initial={reducedMotion ? false : { scale: 1.045 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} />
  }
  return (
    <motion.div className={`${className} overflow-hidden`} initial={reducedMotion ? false : { scale: 1.035 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] }}>
      <Image src={source} alt={media.alt} fill priority={priority} sizes={sizes} onLoad={(event) => {
        const { naturalWidth, naturalHeight } = event.currentTarget
        if (naturalWidth < 1_200 || naturalHeight < 720) {
          console.warn("[demo-media] rejected low-resolution asset at render time", { source, naturalWidth, naturalHeight })
          setImageState("fallback")
        }
      }} onError={(error) => {
        console.error("[demo-media] failed to load image", { source, error })
        setImageState("fallback")
      }} className="object-cover transition-transform duration-[1800ms] ease-out group-hover:scale-[1.055]" style={{ objectPosition: media.objectPosition ?? "center" }} />
    </motion.div>
  )
}
