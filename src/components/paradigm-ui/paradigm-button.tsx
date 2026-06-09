"use client"

import { cn } from "@/lib/utils"
import { type ButtonHTMLAttributes, type AnchorHTMLAttributes, forwardRef, type ElementType, type ReactNode } from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[12px] tracking-[0.12em] uppercase font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paradigm-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-paradigm-ink text-paradigm-paper hover:bg-paradigm-accent shadow-lg shadow-paradigm-accent/20 hover:shadow-paradigm-accent/40 hover:scale-[1.03]",
        secondary:
          "paradigm-glass text-paradigm-ink hover:bg-paradigm-paper-card border border-paradigm-line hover:border-paradigm-accent/30",
        ghost:
          "text-paradigm-ink-soft hover:text-paradigm-ink hover:bg-paradigm-paper-card",
        outline:
          "border border-paradigm-line text-paradigm-ink hover:border-paradigm-accent/50 hover:text-paradigm-accent",
        glow:
          "bg-paradigm-paper text-paradigm-ink shadow-lg shadow-paradigm-accent/30 hover:shadow-xl hover:shadow-paradigm-accent/50 hover:scale-[1.03]",
        "glow-dark":
          "bg-paradigm-paper text-paradigm-ink shadow-lg shadow-paradigm-accent/30 hover:shadow-xl hover:shadow-paradigm-accent/50 hover:scale-[1.03] paradigm-glow-lg",
      },
      size: {
        sm: "px-4 py-2 text-[10px]",
        md: "px-6 py-3",
        lg: "px-8 py-4",
        xl: "px-10 py-5 text-[13px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
)

interface ParadigmButtonBaseProps
  extends VariantProps<typeof buttonVariants> {
  className?: string
  children?: ReactNode
  asChild?: boolean
}

type ParadigmButtonAsButton = ParadigmButtonBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ParadigmButtonBaseProps> & {
    href?: undefined
  }

type ParadigmButtonAsLink = ParadigmButtonBaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ParadigmButtonBaseProps> & {
    href: string
  }

type ParadigmButtonProps = ParadigmButtonAsButton | ParadigmButtonAsLink

const ParadigmButton = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ParadigmButtonProps
>(({ className, variant, size, asChild, ...props }, ref) => {
  const Comp: ElementType = asChild ? Slot : "href" in props ? "a" : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref as never}
      {...(props as Record<string, unknown>)}
    />
  )
})
ParadigmButton.displayName = "ParadigmButton"

export { ParadigmButton, buttonVariants }
export type { ParadigmButtonProps }
