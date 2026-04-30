// ─── Ripple ──────────────────────────────────────────────────────────
// Magic UI primitive — concentric expanding circles background.
// CTA 背後で "注目点" を作る。8層まで重ねて呼吸効果を演出。
//
// 親要素に `relative overflow-hidden` が必須。
//
// 用途: CTA ボタン背後・Hero 下敷き・集客フォーカスゾーン
// ─────────────────────────────────────────────────────────────────────

"use client"

import { cn } from "@/lib/utils"

interface RippleProps {
  /** 最深円半径 px（default 210） */
  mainCircleSize?: number
  /** 最深不透明度 0-1（default 0.24） */
  mainCircleOpacity?: number
  /** 重ねる数（default 8） */
  numCircles?: number
  /** 色（CSS color） */
  color?: string
  className?: string
}

export function Ripple({
  mainCircleSize = 210,
  mainCircleOpacity = 0.24,
  numCircles = 8,
  color = "currentColor",
  className,
}: RippleProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 select-none",
        "[mask-image:linear-gradient(to_bottom,white,transparent)]",
        className
      )}
      aria-hidden
    >
      {Array.from({ length: numCircles }).map((_, i) => {
        const size = mainCircleSize + i * 70
        const opacity = Math.max(0, mainCircleOpacity - i * 0.03)
        const animationDelay = `${i * 0.06}s`
        const borderStyle = i === numCircles - 1 ? "dashed" : "solid"

        return (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-ripple border"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              opacity,
              animationDelay,
              borderStyle,
              borderWidth: "1px",
              borderColor: color,
              backgroundColor: i < 3 ? `${color}08` : "transparent",
            }}
          />
        )
      })}
    </div>
  )
}
