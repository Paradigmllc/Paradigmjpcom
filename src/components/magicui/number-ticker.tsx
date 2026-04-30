// ─── NumberTicker ────────────────────────────────────────────────────
// Magic UI primitive — animates a number from 0 to target on mount.
// Uses framer-motion's motionValue + useSpring for buttery easing.
//
// 用途: 総合スコア・年間損失額・回復額など "ショックを演出する数字" に適用
// ─────────────────────────────────────────────────────────────────────

"use client"

import { useEffect, useRef } from "react"
import { motion, useInView, useMotionValue, useSpring } from "framer-motion"
import { cn } from "@/lib/utils"

interface NumberTickerProps {
  value: number
  /** 小数点以下桁数（default 0） */
  decimalPlaces?: number
  /** アニメーション方向（default "up" = 0→value） */
  direction?: "up" | "down"
  /** 遅延 (ms) */
  delay?: number
  /** spring 剛性 — 高いほど早く到達（default 100） */
  stiffness?: number
  /** spring 減衰 — 高いほど跳ねない（default 40） */
  damping?: number
  /** 通貨・単位の prefix (例: "¥") */
  prefix?: string
  /** 単位の suffix (例: "点" / "%" / "円") */
  suffix?: string
  className?: string
}

export function NumberTicker({
  value,
  decimalPlaces = 0,
  direction = "up",
  delay = 0,
  stiffness = 100,
  damping = 40,
  prefix,
  suffix,
  className,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(direction === "down" ? value : 0)
  const springValue = useSpring(motionValue, { stiffness, damping })
  const isInView = useInView(ref, { once: true, margin: "0px" })

  useEffect(() => {
    if (!isInView) return
    const timer = window.setTimeout(() => {
      motionValue.set(direction === "down" ? 0 : value)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [motionValue, isInView, delay, value, direction])

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (!ref.current) return
      ref.current.textContent = Intl.NumberFormat("ja-JP", {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(Number(latest.toFixed(decimalPlaces)))
    })
    return () => unsubscribe()
  }, [springValue, decimalPlaces])

  return (
    <motion.span
      className={cn("inline-flex items-baseline tabular-nums tracking-wider", className)}
    >
      {prefix && <span className="mr-0.5">{prefix}</span>}
      <span ref={ref}>0</span>
      {suffix && <span className="ml-0.5">{suffix}</span>}
    </motion.span>
  )
}
