"use client"

import type { DemoStatsItem } from "@/lib/sales/demo-site-types"

export function DemoStats({
  stats,
  isJa,
  accentColor,
}: {
  stats: DemoStatsItem[]
  isJa: boolean
  accentColor: string
}) {
  if (!stats.length) return null

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <p
            className="mb-4 text-sm font-bold uppercase tracking-[.3em]"
            style={{ color: accentColor }}
          >
            {isJa ? "目標指標" : "Target Metrics"}
          </p>
          <h2 className="text-3xl font-bold md:text-4xl">
            {isJa ? "改善後の目標指標" : "Post-Improvement Targets"}
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          {stats.map((stat, i) => {
            const colorVariants = [
              "from-emerald-500/20 to-teal-500/20 border-emerald-400/20 text-emerald-400",
              "from-amber-500/20 to-orange-500/20 border-amber-400/20 text-amber-400",
              "from-violet-500/20 to-purple-500/20 border-violet-400/20 text-violet-400",
              "from-cyan-500/20 to-blue-500/20 border-cyan-400/20 text-cyan-400",
            ]
            const colorClass = colorVariants[i % colorVariants.length]

            return (
              <div
                key={stat.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm"
              >
                <p className="mb-2 text-xs uppercase tracking-widest text-zinc-500">
                  {stat.title}
                </p>
                <p className={`mb-1 text-4xl font-black bg-gradient-to-r ${colorClass} bg-clip-text text-transparent`}>
                  {stat.amount}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
