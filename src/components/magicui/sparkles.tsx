// ─── Sparkles ────────────────────────────────────────────────────────
// Magic UI primitive — twinkling star particles.
// 「成功」イベントの祝福演出。Lucide の Sparkles とは別物（こちらはパーティクル）。
//
// 用途: ツール成功時・スコア表示直前の 400-800ms フラッシュ
// ─────────────────────────────────────────────────────────────────────

"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface SparklesProps {
  /** パーティクル数（default 12） */
  count?: number
  /** 色（default 金色） */
  color?: string
  /** アニメーション継続秒数（default 1.2） */
  duration?: number
  className?: string
}

interface Particle {
  id: number
  x: number
  y: number
  size: number
  delay: number
}

export function Sparkles({
  count = 12,
  color = "#fbbf24",
  duration = 1.2,
  className,
}: SparklesProps) {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    const generated: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 0.3,
    }))
    const frame = window.requestAnimationFrame(() => setParticles(generated))
    return () => window.cancelAnimationFrame(frame)
  }, [count])

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
      aria-hidden
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: color,
            boxShadow: `0 0 ${p.size * 2}px ${color}`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration,
            delay: p.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  )
}
