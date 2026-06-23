"use client"

import { getTemplateDesignCSS } from "@/lib/sales/demo-templates/registry"
import type { DemoTemplate } from "@/lib/sales/demo-templates/registry"

const spacingMap: Record<string, string> = {
  compact: "py-8 sm:py-12",
  normal: "py-16 sm:py-20",
  generous: "py-20 sm:py-28",
}
const containerMap: Record<string, string> = {
  narrow: "max-w-3xl",
  normal: "max-w-5xl",
  wide: "max-w-6xl",
  full: "max-w-7xl",
}

/**
 * SectionWrapper — Applies template design tokens as CSS variables
 */
interface SectionWrapperProps {
  template?: DemoTemplate["designTokens"]
  bg?: string
  border?: boolean
  compact?: boolean
  className?: string
  id?: string
  children: React.ReactNode
}

export function SectionWrapper({
  template,
  bg = "bg-white",
  border = false,
  compact = false,
  className = "",
  id,
  children,
}: SectionWrapperProps) {
  const spacing = spacingMap[template?.spacing ?? "normal"] ?? spacingMap.normal
  const container = containerMap[template?.containerWidth ?? "normal"] ?? containerMap.normal
  const designCSS = template
    ? getTemplateDesignCSS({ designTokens: template } as DemoTemplate)
    : {}

  return (
    <section
      id={id}
      className={`${bg} ${border ? "border-y border-gray-100" : ""} ${compact ? "px-4 py-8 sm:px-6 lg:px-8" : `px-4 ${spacing} sm:px-6 lg:px-8`} ${className}`}
      style={designCSS as React.CSSProperties}
    >
      <div className={`mx-auto ${container}`}>
        {children}
      </div>
    </section>
  )
}
