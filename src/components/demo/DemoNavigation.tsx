"use client"

import type { DemoNavigationItem } from "@/lib/sales/demo-site-types"

interface Props {
  items: DemoNavigationItem[]
  ctaText: string
  ctaHref: string
  companyName: string
  accentColor: string
}

export function DemoNavigation({ items, ctaText, ctaHref, companyName, accentColor }: Props) {
  const initials = companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-bold text-black">
            {initials || companyName.slice(0, 1)}
          </div>
          <span className="max-w-[200px] truncate text-sm font-bold text-white">
            {companyName}
          </span>
        </div>

        <div className="hidden gap-6 text-sm text-zinc-400 sm:flex">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </div>

        <a
          href={ctaHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
        >
          {ctaText}
          <ArrowIcon />
        </a>
      </div>
    </nav>
  )
}

function ArrowIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12h14M12 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
