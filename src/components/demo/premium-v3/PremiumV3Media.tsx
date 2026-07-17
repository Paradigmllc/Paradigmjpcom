"use client"

import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion"
import type { DemoPremiumMedia } from "@/lib/sales/demo-site-types"

export function normalizeDemoMediaUrl(source: string): string {
  try {
    const url = new URL(source)
    if (url.hostname === "image.ekiten.jp" && /^\?\d+to\d+_[a-z]+$/iu.test(url.search)) {
      url.search = ""
      return url.toString()
    }
  } catch (error) {
    console.error("[demo-media] invalid media URL:", error)
  }
  return source
}

export function isGeneratedDemoVisualUrl(source: string): boolean {
  try {
    const url = new URL(source)
    return url.pathname.includes("/api/sales/demo-visuals/")
  } catch (error) {
    console.error("[demo-media] generated visual URL check failed:", error)
    return false
  }
}

export function PremiumV3Media({ media, priority = false, className = "", sizes = "(max-width: 1024px) 100vw, 60vw" }: { media: DemoPremiumMedia; priority?: boolean; className?: string; sizes?: string }) {
  const reducedMotion = useReducedMotion()
  const source = normalizeDemoMediaUrl(media.src)
  if (media.kind === "video") {
    return <motion.video src={source} autoPlay muted loop playsInline preload="metadata" aria-label={media.alt} className={`${className} h-full w-full object-cover`} style={{ objectPosition: media.objectPosition ?? "center" }} initial={reducedMotion ? false : { scale: 1.045 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} />
  }
  return (
    <motion.div className={`${className} overflow-hidden`} initial={reducedMotion ? false : { scale: 1.035 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] }}>
      {isGeneratedDemoVisualUrl(source)
        ? <motion.img src={source} alt={media.alt} loading={priority ? "eager" : "lazy"} className="h-full w-full object-cover transition-transform duration-[1800ms] ease-out group-hover:scale-[1.055]" style={{ objectPosition: media.objectPosition ?? "center" }} />
        : <Image src={source} alt={media.alt} fill priority={priority} sizes={sizes} className="object-cover transition-transform duration-[1800ms] ease-out group-hover:scale-[1.055]" style={{ objectPosition: media.objectPosition ?? "center" }} />}
    </motion.div>
  )
}
