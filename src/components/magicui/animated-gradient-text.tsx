// ─── AnimatedGradientText ───────────────────────────────────────────
// Magic UI primitive — gradient text that slowly animates left→right.
// CSS-only (background-clip + background-position keyframe).
//
// 用途: 「絶望」「希望」などセクション headline に適用
// ─────────────────────────────────────────────────────────────────────

"use client"

import { cn } from "@/lib/utils"

interface AnimatedGradientTextProps {
  children: React.ReactNode
  /** グラデーション色（CSS color stops） */
  colors?: string[]
  /** アニメーション継続秒数（default 6） */
  speed?: number
  className?: string
}

export function AnimatedGradientText({
  children,
  colors = ["#ff6b6b", "#feca57", "#48dbfb", "#ff6b6b"],
  speed = 6,
  className,
}: AnimatedGradientTextProps) {
  const gradient = `linear-gradient(to right, ${colors.join(", ")})`
  return (
    <span
      className={cn(
        "inline-block bg-clip-text text-transparent font-bold",
        "bg-[length:200%_auto] animate-gradient-x",
        className
      )}
      style={{
        backgroundImage: gradient,
        animationDuration: `${speed}s`,
      }}
    >
      {children}
    </span>
  )
}
