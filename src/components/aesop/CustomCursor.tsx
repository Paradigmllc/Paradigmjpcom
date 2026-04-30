"use client"

/**
 * CustomCursor — minimal dot + ring cursor with `mix-blend-difference`.
 *
 * Two motion.divs:
 *   - Inner dot: instant (mouseX/Y motion values, no spring)
 *   - Outer ring: spring-followed with damping 20 / stiffness 180
 *
 * The ring lags slightly behind the dot creating a soft "magnetic"
 * feeling without the trail looking laggy. `mix-blend-difference` flips
 * the cursor color against any background — works on light and dark
 * themes without conditional logic.
 *
 * Disabled on touch / coarse-pointer / reduced-motion devices, so it
 * costs nothing on phones.
 *
 * AE-PHP-1: 65 lines. AE-PHP-4: pure interaction primitive.
 */

import { useEffect, useState } from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"

export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false)
  const [hovering, setHovering] = useState(false)
  const mouseX = useMotionValue(-100)
  const mouseY = useMotionValue(-100)
  const ringX = useSpring(mouseX, { damping: 20, stiffness: 180, mass: 0.4 })
  const ringY = useSpring(mouseY, { damping: 20, stiffness: 180, mass: 0.4 })

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!window.matchMedia("(hover:hover) and (pointer:fine)").matches) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    setEnabled(true)

    function move(e: MouseEvent) {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }
    function over(e: MouseEvent) {
      const t = e.target as HTMLElement | null
      if (!t) return
      const hit = t.closest("a, button, [data-cursor='link'], input, textarea, select, label")
      setHovering(!!hit)
    }
    window.addEventListener("mousemove", move, { passive: true })
    window.addEventListener("mouseover", over, { passive: true })
    return () => {
      window.removeEventListener("mousemove", move)
      window.removeEventListener("mouseover", over)
    }
  }, [mouseX, mouseY])

  if (!enabled) return null

  return (
    <>
      <motion.div
        aria-hidden
        style={{ x: mouseX, y: mouseY }}
        className="pointer-events-none fixed left-0 top-0 z-[100] -translate-x-1/2 -translate-y-1/2 mix-blend-difference"
      >
        <motion.div
          animate={{ scale: hovering ? 0 : 1, opacity: hovering ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          className="h-2 w-2 rounded-full bg-paradigm-paper"
        />
      </motion.div>
      <motion.div
        aria-hidden
        style={{ x: ringX, y: ringY }}
        className="pointer-events-none fixed left-0 top-0 z-[99] -translate-x-1/2 -translate-y-1/2 mix-blend-difference"
      >
        <motion.div
          animate={{ scale: hovering ? 1.5 : 1 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="h-10 w-10 rounded-full border border-paradigm-paper/80"
        />
      </motion.div>
    </>
  )
}
