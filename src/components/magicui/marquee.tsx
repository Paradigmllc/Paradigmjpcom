// ─── Marquee ─────────────────────────────────────────────────────────
// Magic UI primitive — infinite horizontal scroll of children.
// 親 stripe 内で children を duplicate して seamless ループ。
//
// 用途: trust badges / 実績数字 / クライアントロゴの editorial 帯
// reverse / pauseOnHover / vertical 切替対応。
// ─────────────────────────────────────────────────────────────────────

"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface MarqueeProps {
  children: ReactNode
  /** 1 周にかかる秒数（default 30） */
  duration?: number
  /** 子要素間 gap (px / Tailwind class) */
  gap?: string
  /** ホバーで停止 */
  pauseOnHover?: boolean
  /** 逆方向 */
  reverse?: boolean
  /** 縦方向 */
  vertical?: boolean
  className?: string
}

export function Marquee({
  children,
  duration = 30,
  gap = "3rem",
  pauseOnHover = true,
  reverse = false,
  vertical = false,
  className,
}: MarqueeProps) {
  return (
    <div
      className={cn(
        "group relative flex overflow-hidden",
        vertical ? "flex-col" : "flex-row",
        className,
      )}
      style={{ "--mq-gap": gap, "--mq-duration": `${duration}s` } as React.CSSProperties}
    >
      {[0, 1].map((i) => (
        <div
          key={i}
          aria-hidden={i > 0}
          className={cn(
            "flex shrink-0 items-center justify-around",
            vertical ? "flex-col animate-mq-vertical" : "flex-row animate-mq-horizontal",
            reverse && "[animation-direction:reverse]",
            pauseOnHover && "group-hover:[animation-play-state:paused]",
          )}
          style={{ gap: "var(--mq-gap)", paddingRight: vertical ? 0 : "var(--mq-gap)", paddingBottom: vertical ? "var(--mq-gap)" : 0 }}
        >
          {children}
        </div>
      ))}
    </div>
  )
}
