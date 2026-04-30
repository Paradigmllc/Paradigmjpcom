// ─── BentoGrid ───────────────────────────────────────────────────────
// Magic UI primitive — asymmetric grid layout with hover lift.
// "画一的なカードの連打" ではなく "弁当箱的な非対称" で視線を誘導する。
//
// 使い方:
//   <BentoGrid>
//     <BentoCard name="総合スコア" className="md:col-span-2">{...}</BentoCard>
//     <BentoCard name="年間損失">{...}</BentoCard>
//   </BentoGrid>
//
// 用途: /report/[token] のダッシュボード / diagnose 完了後サマリ
// ─────────────────────────────────────────────────────────────────────

"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface BentoGridProps {
  children: ReactNode
  className?: string
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4",
        className
      )}
    >
      {children}
    </div>
  )
}

interface BentoCardProps {
  name: string
  /** ヘッダー上部（スコア等の大きな数字） */
  header?: ReactNode
  /** カード本体説明 */
  description?: ReactNode
  /** 右下アイコン・CTA */
  cta?: ReactNode
  /** 背景装飾レイヤー（Meteors / Ripple 等を流す） */
  background?: ReactNode
  /** カード全体を md:col-span-2 等で装飾可能 */
  className?: string
}

export function BentoCard({
  name,
  header,
  description,
  cta,
  background,
  className,
}: BentoCardProps) {
  return (
    <div
      className={cn(
        "group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-2xl",
        "bg-surface-1 border border-border",
        "shadow-[0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
        "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(0,0,0,.06),0_8px_16px_rgba(0,0,0,.08),0_20px_40px_rgba(0,0,0,.08)]",
        className
      )}
    >
      {background && (
        <div className="absolute inset-0 pointer-events-none">{background}</div>
      )}
      <div className="relative z-10 flex flex-col gap-2 p-5 flex-1">
        {header && <div className="mb-2">{header}</div>}
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          {name}
        </h3>
        {description && (
          <div className="text-sm text-text-primary leading-relaxed">
            {description}
          </div>
        )}
      </div>
      {cta && (
        <div className="relative z-10 p-5 pt-0 flex justify-end">{cta}</div>
      )}
    </div>
  )
}
