// ─── Meteors ─────────────────────────────────────────────────────────
// Magic UI primitive — falling meteor streaks for dramatic backgrounds.
// 一定間隔ランダムで斜め降下する光線 (tailwind keyframe `meteor`)。
//
// 用途: 絶望パネル背景・CTA カード背景・レポート hero
// ─────────────────────────────────────────────────────────────────────

"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface MeteorsProps {
  /** 同時表示数（default 20） */
  number?: number
  /** ベース色（default 赤みがかった白） */
  color?: string
  className?: string
}

interface MeteorStyle {
  top: string
  left: string
  animationDelay: string
  animationDuration: string
}

export function Meteors({ number = 20, color = "#ffffff", className }: MeteorsProps) {
  const [meteorStyles, setMeteorStyles] = useState<MeteorStyle[]>([])

  useEffect(() => {
    const styles: MeteorStyle[] = Array.from({ length: number }, () => ({
      top: `${Math.floor(Math.random() * 100)}%`,
      left: `${Math.floor(Math.random() * 100)}%`,
      animationDelay: `${Math.random() * 1.8}s`,
      animationDuration: `${Math.floor(Math.random() * 6) + 4}s`,
    }))
    const frame = window.requestAnimationFrame(() => setMeteorStyles(styles))
    return () => window.cancelAnimationFrame(frame)
  }, [number])

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
      aria-hidden
    >
      {meteorStyles.map((style, idx) => (
        <span
          key={idx}
          className={cn(
            "absolute h-0.5 w-0.5 rotate-[215deg] rounded-[9999px] shadow-[0_0_0_1px_#ffffff10]",
            "animate-meteor"
          )}
          style={{
            ...style,
            backgroundColor: color,
          }}
        >
          <span
            className="absolute top-1/2 -z-10 h-[1px] w-[50px] -translate-y-1/2"
            style={{
              background: `linear-gradient(90deg, ${color}, transparent)`,
            }}
          />
        </span>
      ))}
    </div>
  )
}
