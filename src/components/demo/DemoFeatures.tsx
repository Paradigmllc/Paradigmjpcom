"use client"

import { motion } from "framer-motion"
import type { DemoFeatureItem } from "@/lib/sales/demo-site-types"

const ICON_MAP: Record<string, string> = {
  "tabler:sparkles": "✨",
  "tabler:shield-check": "🛡️",
  "tabler:route": "🔗",
  "tabler:search": "🔍",
  "tabler:palette": "🎨",
  "tabler:chart-bar": "📊",
  "tabler:trending-up": "📈",
  "tabler:bolt": "⚡",
  "tabler:lock": "🔒",
  "tabler:target-arrow": "🎯",
  "tabler:clock": "⏱️",
  "tabler:star": "⭐",
  "tabler:globe": "🌐",
  SPARKLES: "✨",
  SHIELD_CHECK: "🛡️",
  ROUTE: "🔗",
  SEARCH: "🔍",
  PALETTE: "🎨",
  SPEED: "⚡",
  TRUST: "🛡️",
  SNS: "📱",
  OPS: "⚙️",
  REACH: "📈",
  DATA: "📊",
  VIDEO: "🎬",
  MAP: "📍",
}

const SEVERITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  critical: { bg: "bg-red-500/10", border: "border-red-400/30", text: "text-red-400" },
  warning: { bg: "bg-amber-500/10", border: "border-amber-400/30", text: "text-amber-400" },
  info: { bg: "bg-blue-500/10", border: "border-blue-400/30", text: "text-blue-400" },
}

function featureIcon(icon: string | undefined): string {
  if (!icon) return "✨"
  return ICON_MAP[icon] ?? icon.replace(/^tabler:/, "").replace(/-/g, " ").slice(0, 2).toUpperCase()
}

export function DemoFeatures({
  features,
  isJa,
  accentColor,
}: {
  features: DemoFeatureItem[]
  isJa: boolean
  accentColor: string
}) {
  if (!features.length) return null

  return (
    <section id="features" className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <p
            className="mb-4 text-sm font-bold uppercase tracking-[.3em]"
            style={{ color: accentColor }}
          >
            {isJa ? "改善ポイント" : "Improvements"}
          </p>
          <h2 className="text-3xl font-bold md:text-4xl">
            {isJa ? "具体的な改善内容" : "What We Improve"}
          </h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature, i) => {
            const sev = SEVERITY_COLORS[feature.severity] ?? SEVERITY_COLORS.info
            return (
              <motion.div
                key={feature.title}
                className="group rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all hover:border-white/20"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1, ease: "easeOut" }}
              >
                <div className="mb-4 flex items-center gap-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl border text-lg font-bold"
                    style={{
                      background: `linear-gradient(to bottom right, ${accentColor}20, ${accentColor}20)`,
                      borderColor: `${accentColor}30`,
                      color: accentColor,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                </div>

                <p className="mb-4 leading-relaxed text-zinc-400">{feature.description}</p>

                {feature.metricLabel && (
                  <div className={`rounded-xl border ${sev.border} ${sev.bg} p-4`}>
                    <div className={`mb-1 text-xs font-bold uppercase tracking-wider ${sev.text}`}>
                      {feature.metricLabel}
                    </div>
                    <div className={`text-2xl font-black ${sev.text}`}>
                      {feature.metricValue}
                    </div>
                    {feature.metricBench && (
                      <div className="mt-1 text-xs text-zinc-500">{feature.metricBench}</div>
                    )}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
