"use client"

import { motion, useInView, useMotionValue, useSpring } from "framer-motion"
import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react"

// ─── StaggeredFadeIn ────────────────────────────────────────────

export function StaggeredFadeIn({
  children,
  className,
  delay = 0,
  stagger = 0.08,
  duration = 0.5,
  once = true,
}: {
  children: ReactNode
  className?: string
  delay?: number
  stagger?: number
  duration?: number
  once?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once, margin: "-40px" })

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: stagger, delayChildren: delay },
        },
      }}
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration, ease: [0.25, 0.46, 0.45, 0.94] },
                },
              }}
            >
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  )
}

// ─── CountUpMetric ──────────────────────────────────────────────

export function CountUpMetric({
  value,
  prefix = "",
  suffix = "",
  duration = 1.5,
  decimals = 0,
  locale = "en-US",
  className,
}: {
  value: number
  prefix?: string
  suffix?: string
  duration?: number
  decimals?: number
  locale?: string
  className?: string
}) {
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { duration: duration * 1000, bounce: 0 })
  const [display, setDisplay] = useState("0")

  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  useEffect(() => {
    const unsubscribe = spring.on("change", (latest: number) => {
      const rounded = latest.toFixed(decimals)
      const formatted = Number(rounded).toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
      setDisplay(formatted)
    })
    return unsubscribe
  }, [spring, decimals, locale])

  return (
    <span className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  )
}

// ─── PulseHighlight ─────────────────────────────────────────────

export function PulseHighlight({
  children,
  className,
  active = true,
}: {
  children: ReactNode
  className?: string
  active?: boolean
}) {
  return (
    <span className={className} style={{ position: "relative", display: "inline-block" }}>
      {children}
      {active && (
        <motion.span
          aria-hidden
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: 8,
            zIndex: -1,
            background:
              "radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, transparent 70%)",
          }}
          animate={{
            opacity: [0.4, 1, 0.4],
            scale: [0.95, 1.08, 0.95],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
    </span>
  )
}

// ─── SlideInSection ─────────────────────────────────────────────

export function SlideInSection({
  children,
  className,
  direction = "left",
  delay = 0,
  duration = 0.6,
  once = true,
}: {
  children: ReactNode
  className?: string
  direction?: "left" | "right" | "up" | "down"
  delay?: number
  duration?: number
  once?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once, margin: "-60px" })

  const offsets: Record<string, { x?: number; y?: number }> = {
    left: { x: -40 },
    right: { x: 40 },
    up: { y: 40 },
    down: { y: -40 },
  }

  const offset = offsets[direction]

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: 0, ...offset },
        visible: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: { duration, delay, ease: [0.25, 0.46, 0.45, 0.94] },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

// ─── ShimmerCard ────────────────────────────────────────────────

export function ShimmerCard({
  className,
  style,
  children,
}: {
  className?: string
  style?: CSSProperties
  children?: ReactNode
}) {
  return (
    <div
      className={className}
      style={{ position: "relative", overflow: "hidden", ...style }}
    >
      <motion.div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 45%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.12) 55%, transparent 60%)",
          backgroundSize: "200% 100%",
          zIndex: 1,
          pointerEvents: "none",
        }}
        animate={{
          backgroundPosition: ["200% 0", "-200% 0"],
        }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
    </div>
  )
}
