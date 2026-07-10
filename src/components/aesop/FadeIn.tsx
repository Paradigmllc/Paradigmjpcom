"use client"

/**
 * FadeIn — viewport-triggered slide-up reveal.
 *
 * Aesop / Le Labo / COS use this exact 40px-up + 0.7s cubic ease pattern
 * for editorial sections. `viewport={{ once: true, margin: "-80px" }}`
 * fires the animation 80px before the element enters, so by the time the
 * user scrolls to it the motion has already settled — feels expensive
 * rather than performative.
 *
 * AE-PHP-1: 32 lines. Pure motion primitive — no business logic.
 */

import { motion, useReducedMotion, type Variants } from "framer-motion"
import type { ReactNode } from "react"

const variants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
}

type AsTag = "div" | "section" | "article" | "li"

export default function FadeIn({
  children,
  delay = 0,
  className = "",
  as = "div",
  duration = 0.7,
}: {
  children: ReactNode
  delay?: number
  className?: string
  as?: AsTag
  duration?: number
}) {
  const shouldReduceMotion = useReducedMotion()
  const Cmp =
    as === "section" ? motion.section
    : as === "article" ? motion.article
    : as === "li" ? motion.li
    : motion.div
  return (
    <Cmp
      className={className}
      variants={shouldReduceMotion ? undefined : variants}
      initial={shouldReduceMotion ? false : "hidden"}
      whileInView={shouldReduceMotion ? undefined : "visible"}
      viewport={{ once: true, margin: "-80px" }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </Cmp>
  )
}
