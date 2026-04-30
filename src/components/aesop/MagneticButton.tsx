"use client"

/**
 * MagneticButton — pointer follows the button on (hover:hover) devices.
 *
 * Effect: cursor entering button area pulls the content towards it with
 * a spring-physics fall-off, then snaps back to center on leave. Disabled
 * on touch / coarse pointers because the hover-follow does nothing useful
 * without a mouse and would feel jittery from incidental finger drags.
 *
 * Used on primary CTAs and large brand wordmarks. Subtle by default
 * (strength=20) — bumping past 30 starts to feel gimmicky.
 *
 * AE-PHP-1: 47 lines. Pure interaction primitive — no business logic.
 */

import { useRef, type ReactNode } from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"

type Props = {
  children: ReactNode
  className?: string
  strength?: number
  as?: "div" | "span"
}

export default function MagneticButton({
  children,
  className = "",
  strength = 20,
  as = "div",
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { damping: 15, stiffness: 160, mass: 0.3 })
  const sy = useSpring(y, { damping: 15, stiffness: 160, mass: 0.3 })

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (typeof window === "undefined") return
    if (!window.matchMedia("(hover:hover) and (pointer:fine)").matches) return
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const relX = e.clientX - rect.left - rect.width / 2
    const relY = e.clientY - rect.top - rect.height / 2
    x.set((relX / (rect.width / 2)) * strength)
    y.set((relY / (rect.height / 2)) * strength)
  }
  function reset() {
    x.set(0)
    y.set(0)
  }

  const Cmp = as === "span" ? motion.span : motion.div

  return (
    <Cmp
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ x: sx, y: sy, display: "inline-flex" }}
      className={className}
    >
      {children}
    </Cmp>
  )
}
