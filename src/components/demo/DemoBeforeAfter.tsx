"use client"

import type { DemoBeforeAfterItem } from "@/lib/sales/demo-site-types"

const SEVERITY_BADGES: Record<string, { label: string; labelJa: string; className: string }> = {
  critical: { label: "Critical", labelJa: "緊急", className: "bg-red-500/20 text-red-400 border-red-400/30" },
  warning: { label: "Warning", labelJa: "注意", className: "bg-amber-500/20 text-amber-400 border-amber-400/30" },
  info: { label: "Info", labelJa: "改善", className: "bg-blue-500/20 text-blue-400 border-blue-400/30" },
}

export function DemoBeforeAfter({
  items,
  isJa,
  accentColor,
}: {
  items: DemoBeforeAfterItem[]
  isJa: boolean
  accentColor: string
}) {
  if (!items.length) return null

  return (
    <section id="before-after" className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <p
            className="mb-4 text-sm font-bold uppercase tracking-[.3em]"
            style={{ color: accentColor }}
          >
            {isJa ? "Before / After" : "Before / After"}
          </p>
          <h2 className="text-3xl font-bold md:text-4xl">
            {isJa ? "改善前後の比較" : "Before & After Comparison"}
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const badge = SEVERITY_BADGES[item.severity] ?? SEVERITY_BADGES.info
            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm"
              >
                <div className="p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">{item.label}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.className}`}>
                      {isJa ? badge.labelJa : badge.label}
                    </span>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                        {isJa ? "改善前" : "Before"}
                      </p>
                      <div className="rounded-lg border border-red-400/20 bg-red-500/5 p-3">
                        <p className="text-xs leading-relaxed text-zinc-400">
                          {item.beforeDescription}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                        {isJa ? "改善後" : "After"}
                      </p>
                      <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-3">
                        <p className="text-xs leading-relaxed text-zinc-300">
                          {item.afterDescription}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
