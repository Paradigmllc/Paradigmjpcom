"use client"

import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion"
import type { DemoPremiumMedia } from "@/lib/sales/demo-site-types"

export function PremiumV3Media({ media, priority = false, className = "", sizes = "(max-width: 1024px) 100vw, 60vw" }: { media: DemoPremiumMedia; priority?: boolean; className?: string; sizes?: string }) {
  const reducedMotion = useReducedMotion()
  if (media.kind === "video") {
    return <motion.video src={media.src} autoPlay muted loop playsInline preload="metadata" aria-label={media.alt} className={`${className} h-full w-full object-cover`} style={{ objectPosition: media.objectPosition ?? "center" }} initial={reducedMotion ? false : { scale: 1.045 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} />
  }
  return (
    <motion.div className={`${className} overflow-hidden`} initial={reducedMotion ? false : { scale: 1.035 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] }}>
      <Image src={media.src} alt={media.alt} fill priority={priority} sizes={sizes} className="object-cover transition-transform duration-[1800ms] ease-out group-hover:scale-[1.055]" style={{ objectPosition: media.objectPosition ?? "center" }} />
    </motion.div>
  )
}
