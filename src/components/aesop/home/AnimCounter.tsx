"use client"

/**
 * AnimCounter — viewport-triggered number tween (0 → target).
 *
 * framer-motion `useSpring` drives the animation; `useInView` gates it
 * so the count starts when the element scrolls into view rather than
 * on initial mount (which would be invisible). `once: true` prevents
 * re-counting if the user scrolls away and back.
 *
 * AE-PHP-1: 27 lines. Pure UI primitive.
 */

import { useEffect, useRef, useState } from "react"
import { useInView, useMotionValue, useSpring } from "framer-motion"

export default function AnimCounter({
  to,
  suffix = "",
  prefix = "",
}: {
  to: number
  suffix?: string
  prefix?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const value = useMotionValue(0)
  const spring = useSpring(value, { stiffness: 60, damping: 20 })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (inView) value.set(to)
  }, [inView, to, value])
  useEffect(() => spring.on("change", (v) => setDisplay(Math.round(v))), [spring])

  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  )
}
