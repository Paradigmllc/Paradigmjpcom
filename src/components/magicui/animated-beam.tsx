// ─── AnimatedBeam ────────────────────────────────────────────────────
// Magic UI primitive — SVG path with a moving gradient "beam" connecting
// two elements in the DOM. 親 container と 2 つの refs を受け取り、
// getBoundingClientRect で位置を測って弧を描く。
//
// 使い方:
//   const containerRef = useRef<HTMLDivElement>(null)
//   const fromRef = useRef<HTMLDivElement>(null)
//   const toRef = useRef<HTMLDivElement>(null)
//   ...
//   <div ref={containerRef} className="relative">
//     <div ref={fromRef} />
//     <div ref={toRef} />
//     <AnimatedBeam containerRef={containerRef} fromRef={fromRef} toRef={toRef} />
//   </div>
//
// 用途: /report/[token] 自社 → 競合カード間のエッジ・Pain → Prescription リンク
// ─────────────────────────────────────────────────────────────────────

"use client"

import { useEffect, useId, useState, type RefObject } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface AnimatedBeamProps {
  containerRef: RefObject<HTMLElement | null>
  fromRef: RefObject<HTMLElement | null>
  toRef: RefObject<HTMLElement | null>
  /** 曲率 — 正なら上、負なら下に湾曲 */
  curvature?: number
  /** 逆向き */
  reverse?: boolean
  /** パス色 */
  pathColor?: string
  /** パス不透明度 */
  pathOpacity?: number
  /** パス幅 px */
  pathWidth?: number
  /** グラデ開始色 */
  gradientStartColor?: string
  /** グラデ終端色 */
  gradientStopColor?: string
  /** 1 周秒数（default 4） */
  duration?: number
  /** 遅延 s */
  delay?: number
  className?: string
}

export function AnimatedBeam({
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  pathColor = "gray",
  pathOpacity = 0.2,
  pathWidth = 2,
  gradientStartColor = "#ffaa40",
  gradientStopColor = "#9c40ff",
  duration = 4,
  delay = 0,
  className,
}: AnimatedBeamProps) {
  const id = useId()
  const [pathD, setPathD] = useState("")
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    function updatePath() {
      if (!containerRef.current || !fromRef.current || !toRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const fromRect = fromRef.current.getBoundingClientRect()
      const toRect = toRef.current.getBoundingClientRect()

      const svgWidth = containerRect.width
      const svgHeight = containerRect.height
      setSvgDimensions({ width: svgWidth, height: svgHeight })

      const startX = fromRect.left - containerRect.left + fromRect.width / 2
      const startY = fromRect.top - containerRect.top + fromRect.height / 2
      const endX = toRect.left - containerRect.left + toRect.width / 2
      const endY = toRect.top - containerRect.top + toRect.height / 2

      const controlY = (startY + endY) / 2 - curvature
      setPathD(`M ${startX},${startY} Q ${(startX + endX) / 2},${controlY} ${endX},${endY}`)
    }

    updatePath()

    const resizeObserver = new ResizeObserver(updatePath)
    if (containerRef.current) resizeObserver.observe(containerRef.current)
    window.addEventListener("scroll", updatePath, true)
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("scroll", updatePath, true)
    }
  }, [containerRef, fromRef, toRef, curvature])

  const gradientCoordinates = reverse
    ? { x1: ["90%", "-10%"], x2: ["100%", "0%"], y1: ["0%", "0%"], y2: ["0%", "0%"] }
    : { x1: ["10%", "110%"], x2: ["0%", "100%"], y1: ["0%", "0%"], y2: ["0%", "0%"] }

  return (
    <svg
      fill="none"
      width={svgDimensions.width}
      height={svgDimensions.height}
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "pointer-events-none absolute left-0 top-0 transform-gpu stroke-2",
        className
      )}
      viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
      aria-hidden
    >
      <path
        d={pathD}
        stroke={pathColor}
        strokeWidth={pathWidth}
        strokeOpacity={pathOpacity}
        strokeLinecap="round"
      />
      <path
        d={pathD}
        strokeWidth={pathWidth}
        stroke={`url(#${id})`}
        strokeOpacity="1"
        strokeLinecap="round"
      />
      <defs>
        <motion.linearGradient
          className="transform-gpu"
          id={id}
          gradientUnits="userSpaceOnUse"
          initial={{ x1: "0%", x2: "0%", y1: "0%", y2: "0%" }}
          animate={{
            x1: gradientCoordinates.x1,
            x2: gradientCoordinates.x2,
            y1: gradientCoordinates.y1,
            y2: gradientCoordinates.y2,
          }}
          transition={{ delay, duration, ease: [0.16, 1, 0.3, 1], repeat: Infinity, repeatDelay: 0 }}
        >
          <stop stopColor={gradientStartColor} stopOpacity="0" />
          <stop stopColor={gradientStartColor} />
          <stop offset="32.5%" stopColor={gradientStopColor} />
          <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
        </motion.linearGradient>
      </defs>
    </svg>
  )
}
