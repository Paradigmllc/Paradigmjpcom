"use client"

import { cn } from "@/lib/utils"
import { type ReactNode } from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const EASE = [0.22, 1, 0.36, 1] as const

interface GlowCardProps extends Omit<HTMLMotionProps<"div">, "children" | "title"> {
  children?: ReactNode
  className?: string
  variant?: "glass" | "solid" | "outline"
  glow?: "sm" | "md" | "lg" | "none"
  beamDelay?: number
  beamDuration?: number
  showBeam?: boolean
  delay?: number
}

const glowMap = {
  sm: "paradigm-glow-sm",
  md: "paradigm-glow-md",
  lg: "paradigm-glow-lg",
  none: "",
} as const

const variantMap = {
  glass: "paradigm-glass border-paradigm-line/60",
  solid: "bg-paradigm-paper-card border border-paradigm-line",
  outline: "border border-paradigm-line bg-transparent",
} as const

export function GlowCard({
  children,
  className,
  variant = "glass",
  glow = "sm",
  beamDelay = 0,
  beamDuration = 9,
  showBeam = false,
  delay = 0,
  ...props
}: GlowCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: EASE }}
      className={cn(
        "relative rounded-2xl overflow-hidden group",
        variantMap[variant],
        glowMap[glow],
        "hover:scale-[1.01] hover:shadow-lg transition-all duration-500",
        className,
      )}
      {...props}
    >
      {showBeam && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background:
                "conic-gradient(from 0deg at 50% 50%, transparent, rgb(var(--paradigm-glow) / 0.2), transparent 25%)",
              animation: `spin-around ${beamDuration}s linear infinite`,
              animationDelay: `${beamDelay}s`,
            }}
          />
        </div>
      )}
      {children}
    </motion.div>
  )
}

interface SectionHeaderProps {
  eyebrow?: string
  heading: string
  description?: string
  className?: string
  align?: "left" | "center"
  eyebrowClassName?: string
  headingClassName?: string
}

export function SectionHeader({
  eyebrow,
  heading,
  description,
  className,
  align = "left",
  eyebrowClassName,
  headingClassName,
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-10 max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <p className={cn("paradigm-eyebrow mb-3 text-paradigm-accent", eyebrowClassName)}>
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          "font-display text-[26px] md:text-[40px] leading-[1.12] tracking-[-0.025em] text-paradigm-ink",
          headingClassName,
        )}
      >
        {heading}
      </h2>
      {description && (
        <p className="text-[14px] text-paradigm-ink-soft leading-[1.8] mt-4">{description}</p>
      )}
    </div>
  )
}

interface StatCardProps {
  value: string
  label: string
  variant?: "default" | "gradient"
  delay?: number
}

export function StatCard({ value, label, variant = "default", delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay, ease: EASE }}
      className="bg-paradigm-paper-card border border-paradigm-line rounded-2xl p-5 text-center paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500"
    >
      <div
        className={cn(
          "font-display text-[28px] md:text-[34px] leading-none mb-2",
          variant === "gradient"
            ? "bg-gradient-to-br from-paradigm-accent via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent"
            : "text-paradigm-accent",
        )}
      >
        {value}
      </div>
      <p className="text-[12px] text-paradigm-ink-soft leading-[1.6]">{label}</p>
    </motion.div>
  )
}

export function IconBadge({
  icon,
  children,
  className,
}: {
  icon?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 paradigm-glass rounded-full px-4 py-2 paradigm-glow-sm", className)}>
      {icon}
      <span className="paradigm-eyebrow text-paradigm-paper">{children}</span>
    </span>
  )
}
