// ─── BorderBeam ──────────────────────────────────────────────────────
// Magic UI primitive — rotating highlight beam along container border.
// conic-gradient + offset-path を使った擬似輪郭ライトトレース。
//
// 親要素に `relative` が必須。beam は absolute で overlay される。
//
// 用途: 年間損失カード・CTA パッケージカード・実行中ツール枠
// ─────────────────────────────────────────────────────────────────────

"use client"

import { cn } from "@/lib/utils"

interface BorderBeamProps {
  /** ビームの太さ px（default 1） */
  size?: number
  /** 1 周にかかる秒数（default 8） */
  duration?: number
  /** 開始オフセット % */
  anchor?: number
  /** border 幅 px（default 1.5） */
  borderWidth?: number
  /** グラデ開始色 */
  colorFrom?: string
  /** グラデ終端色 */
  colorTo?: string
  /** 遅延 s */
  delay?: number
  className?: string
}

export function BorderBeam({
  size = 200,
  duration = 8,
  anchor = 90,
  borderWidth = 1.5,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  delay = 0,
  className,
}: BorderBeamProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit]",
        "[border:var(--border-width)_solid_transparent]",
        "![mask-clip:padding-box,border-box] ![mask-composite:intersect]",
        "[mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]",
        "after:absolute after:aspect-square after:w-[var(--size)] after:animate-border-beam",
        "after:[animation-delay:var(--delay)]",
        "after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)]",
        "after:[offset-anchor:calc(var(--anchor)*1%)_50%]",
        "after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)*1px))]",
        className
      )}
      style={
        {
          "--size": size,
          "--duration": duration,
          "--anchor": anchor,
          "--border-width": `${borderWidth}px`,
          "--color-from": colorFrom,
          "--color-to": colorTo,
          "--delay": `-${delay}s`,
        } as React.CSSProperties
      }
      aria-hidden
    />
  )
}
