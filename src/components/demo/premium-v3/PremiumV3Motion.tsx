"use client"

import { useEffect, useRef, useState } from "react"
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion"
import type { DemoDesignRecipe } from "@/lib/sales/demo-site-types"

const EASE = [0.22, 1, 0.36, 1] as const

export function buildPremiumV3RevealVariants(style: DemoDesignRecipe["motionVariant"]): Variants {
  if (style === "restrained") {
    return {
      hidden: { opacity: 0.96, y: 8 },
      visible: { opacity: 1, y: 0 },
    }
  }
  if (style === "expressive") {
    return {
      hidden: { opacity: 0.94, y: 18, scale: 0.99, filter: "blur(1px)" },
      visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
    }
  }
  return {
    hidden: { opacity: 0.95, y: 12, clipPath: "inset(0 0 2% 0)" },
    visible: { opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" },
  }
}

export function PremiumV3Reveal({
  children,
  className = "",
  delay = 0,
  motionStyle = "editorial",
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  motionStyle?: DemoDesignRecipe["motionVariant"]
}) {
  const reducedMotion = useReducedMotion()
  return (
    <motion.div
      className={className}
      variants={buildPremiumV3RevealVariants(motionStyle)}
      initial={reducedMotion ? "visible" : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-8% 0px -8% 0px" }}
      transition={{ duration: motionStyle === "restrained" ? 0.55 : 0.85, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

export function PremiumV3Stagger({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const reducedMotion = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reducedMotion ? "visible" : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-8%" }}
      variants={{
        hidden: {},
        visible: { transition: { delayChildren: delay, staggerChildren: reducedMotion ? 0 : 0.09 } },
      }}
    >
      {children}
    </motion.div>
  )
}

export function PremiumV3StaggerItem({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0.95, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.72, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  )
}

export function PremiumV3Parallax({
  children,
  className = "",
  distance = 48,
}: {
  children: React.ReactNode
  className?: string
  distance?: number
}) {
  const isMobile = useIsMobile()
  const reducedMotion = useReducedMotion()
  if (isMobile || reducedMotion) return <div className={className}>{children}</div>
  return <PremiumV3ParallaxMotion className={className} distance={distance}>{children}</PremiumV3ParallaxMotion>
}

function PremiumV3ParallaxMotion({ children, className, distance }: { children: React.ReactNode; className: string; distance: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const rawY = useTransform(scrollYProgress, [0, 1], [distance, -distance])
  const y = useSpring(rawY, { stiffness: 90, damping: 28, mass: 0.55 })

  return (
    <motion.div ref={ref} className={className} style={{ y }}>
      {children}
    </motion.div>
  )
}

export function PremiumV3TextLines({
  text,
  className = "",
}: {
  text: string
  className?: string
}) {
  const reducedMotion = useReducedMotion()
  const lines = text.split(/\n/u)
  return (
    <span className={className} aria-label={text}>
      {lines.map((line, index) => (
        <span key={`${line}-${index}`} className="block overflow-hidden pb-[.08em]">
          <motion.span
            aria-hidden="true"
            className="block"
            initial={reducedMotion ? false : { y: "6%", rotate: 0.2, opacity: 0.96 }}
            animate={{ y: "0%", rotate: 0, opacity: 1 }}
            transition={{ duration: 1.05, delay: 0.12 + index * 0.11, ease: EASE }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

/**
 * A restrained pointer response for primary actions. It adds the small amount
 * of physicality people expect from a premium studio site without turning
 * every interaction into a noisy hover effect. Touch and reduced-motion users
 * receive the same button with no transform.
 */
export function PremiumV3Magnetic({
  children,
  className = "",
  strength = 0.16,
}: {
  children: React.ReactNode
  className?: string
  strength?: number
}) {
  const reducedMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 360, damping: 24, mass: 0.22 })
  const springY = useSpring(y, { stiffness: 360, damping: 24, mass: 0.22 })

  if (reducedMotion) return <span className={className}>{children}</span>

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    x.set((event.clientX - (rect.left + rect.width / 2)) * strength)
    y.set((event.clientY - (rect.top + rect.height / 2)) * strength)
  }

  return (
    <motion.div
      ref={ref}
      className={`inline-block ${className}`}
      style={{ x: springX, y: springY }}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => { x.set(0); y.set(0) }}
    >
      {children}
    </motion.div>
  )
}

export function PremiumV3ScrollCue({ dark = false }: { dark?: boolean }) {
  const reducedMotion = useReducedMotion()
  const tone = dark ? "text-white/58" : "text-[var(--demo-muted)]"
  const line = dark ? "bg-white/48" : "bg-[var(--demo-line)]"
  return (
    <div className={`pointer-events-none absolute bottom-7 right-5 hidden items-center gap-3 text-[9px] font-bold uppercase tracking-[.32em] sm:flex lg:right-10 ${tone}`} aria-hidden="true">
      <span>Scroll</span>
      <motion.span
        className={`relative block h-9 w-px overflow-hidden ${line}`}
        animate={reducedMotion ? undefined : { scaleY: [0.35, 1, 0.35], opacity: [0.45, 1, 0.45] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "top" }}
      />
    </div>
  )
}

export function PremiumV3KineticRail({ text }: { text: string }) {
  const reducedMotion = useReducedMotion()
  const repeated = Array.from({ length: 4 }, (_, index) => <span key={index} className="mx-7">{text}<span className="ml-14 text-[var(--demo-accent)]">✦</span></span>)
  return (
    <div className="overflow-hidden border-y border-[var(--demo-line)] py-4" aria-hidden="true">
      <motion.div
        className="flex w-max whitespace-nowrap text-[11px] font-bold uppercase tracking-[.32em] text-[var(--demo-muted)]"
        animate={reducedMotion ? undefined : { x: ["0%", "-25%"] }}
        transition={{ duration: 24, ease: "linear", repeat: Infinity }}
      >
        {repeated}{repeated}
      </motion.div>
    </div>
  )
}

export function PremiumV3ScrollProgress() {
  const isMobile = useIsMobile()
  const reducedMotion = useReducedMotion()
  if (isMobile || reducedMotion) return null
  return <PremiumV3ScrollProgressMotion />
}

function PremiumV3ScrollProgressMotion() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 150, damping: 28, restDelta: 0.001 })
  return <motion.div aria-hidden="true" className="fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-[var(--demo-accent)]" style={{ scaleX }} />
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])
  return isMobile
}
