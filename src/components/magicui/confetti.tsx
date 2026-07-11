// ─── Confetti ────────────────────────────────────────────────────────
// Magic UI primitive — one-shot celebratory particle burst.
// framer-motion で Canvas を使わず軽量な DOM パーティクルを散らす。
//
// 使い方:
//   const [fire, setFire] = useState(false)
//   useEffect(() => { setFire(true) }, [])
//   {fire && <Confetti />}
//
// 用途: 希望パネル完了時・診断レポート表示直後・CTA 成功時
// ─────────────────────────────────────────────────────────────────────

"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface ConfettiProps {
  /** パーティクル数（default 60） */
  count?: number
  /** カラーパレット（default カラフル 6色） */
  colors?: string[]
  /** アニメ継続秒数（default 2.2） */
  duration?: number
  className?: string
}

interface ConfettiPiece {
  id: number
  left: number
  color: string
  delay: number
  rotate: number
  distance: number
  size: number
  xOffset: number
}

function seededUnit(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

export function Confetti({
  count = 60,
  colors = ["#ff6b6b", "#feca57", "#48dbfb", "#1dd1a1", "#ff9ff3", "#54a0ff"],
  duration = 2.2,
  className,
}: ConfettiProps) {
  // useMemo で render 毎の再ランダム化を防止（flicker 回避）
  const pieces = useMemo<ConfettiPiece[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: seededUnit(i * 7 + count) * 100,
        color: colors[Math.floor(seededUnit(i * 11 + count) * colors.length)]!,
        delay: seededUnit(i * 13 + count) * 0.3,
        rotate: seededUnit(i * 17 + count) * 720 - 360,
        distance: 120 + seededUnit(i * 19 + count) * 260,
        size: 6 + seededUnit(i * 23 + count) * 6,
        xOffset: seededUnit(i * 29 + count) * 80 - 40,
      })),
    [count, colors]
  )

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden z-10",
        className
      )}
      aria-hidden
    >
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          className="absolute top-0"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 0.4}px`,
            backgroundColor: p.color,
            borderRadius: "1px",
          }}
          initial={{ y: -20, opacity: 0, rotate: 0 }}
          animate={{
            y: p.distance,
            opacity: [0, 1, 1, 0],
            rotate: p.rotate,
            x: p.xOffset,
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
