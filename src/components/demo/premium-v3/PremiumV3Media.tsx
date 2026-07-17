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
    <div className={`${className} relative overflow-hidden bg-[radial-gradient(circle_at_22%_20%,rgba(69,185,190,.55),transparent_42%),radial-gradient(circle_at_82%_76%,rgba(255,255,255,.14),transparent_34%),linear-gradient(135deg,#071c22,#173a40_58%,#0e2429)]`} role="img" aria-label={label}>
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(115deg,transparent_0%,transparent_48%,rgba(255,255,255,.14)_48.2%,transparent_48.5%),linear-gradient(25deg,transparent_0%,transparent_68%,rgba(255,255,255,.1)_68.2%,transparent_68.5%)]" />
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/20 shadow-[0_0_0_24px_rgba(255,255,255,.03),0_0_0_48px_rgba(255,255,255,.025)]" />
      <div className="absolute left-[17%] top-[16%] h-[58%] w-px bg-white/20" />
      <div className="absolute left-[17%] top-[16%] h-px w-[44%] bg-white/20" />
      <div className="absolute left-8 top-8 max-w-[15rem] sm:left-10 sm:top-10">
        <p className="text-[9px] font-bold uppercase tracking-[.34em] text-white/55">{media?.eyebrow ?? "SCENE"} / EDITION 01</p>
        <p className="mt-4 text-sm leading-7 text-white/70">{label}</p>
      </div>
      <div className="absolute bottom-7 left-8 h-px w-20 bg-[var(--demo-accent)] sm:left-10" />
      <div className="absolute bottom-6 right-8 text-[clamp(5rem,16vw,12rem)] font-light leading-none tracking-[-.12em] text-white/12 sm:right-10">01</div>
      <div className="absolute bottom-7 left-8 text-[9px] font-bold tracking-[.28em] text-white/45 sm:left-10">VISUAL FIELD / {media?.title ?? "CURATED"}</div>
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
