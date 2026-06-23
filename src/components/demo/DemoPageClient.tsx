"use client"

import { motion } from "framer-motion"
import type { DemoPageData } from "@/lib/sales/demo-site-types"
import { DemoHero } from "./DemoHero"
import { DemoNavigation } from "./DemoNavigation"
import { DemoFeatures } from "./DemoFeatures"
import { DemoStats } from "./DemoStats"
import { DemoBeforeAfter } from "./DemoBeforeAfter"
import { DemoCallToAction } from "./DemoCallToAction"
import { DemoFooter } from "./DemoFooter"

export function DemoPageClient({ data }: { data: DemoPageData }) {
  const isJa = data.locale === "ja"
  const {
    hero,
    navigation,
    features,
    stats,
    beforeAfter,
    cta,
    totalLoss,
    companyName,
  } = data

  const showLoss = totalLoss && totalLoss !== "¥0" && totalLoss !== "0" && totalLoss !== "¥ 0"
  const formattedLoss = showLoss ? formatLoss(totalLoss!) : ""

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#050510] text-white antialiased">
      {/* Ambient orbs */}
      <motion.div
        className="pointer-events-none absolute -right-[100px] -top-[200px] z-0 h-[600px] w-[600px] rounded-full opacity-30 blur-[120px]"
        style={{ background: hero.accentColor }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-[100px] -left-[50px] z-0 h-[400px] w-[400px] rounded-full opacity-30 blur-[120px]"
        style={{ background: hero.accentColorDark }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
      />

      <DemoNavigation items={navigation} ctaText={hero.primaryCta.text} ctaHref={hero.primaryCta.href} companyName={companyName} accentColor={hero.accentColor} />

      <main className="relative z-10">
        <DemoHero {...hero} isJa={isJa} />

        <DemoStats stats={stats} isJa={isJa} accentColor={hero.accentColor} />

        {showLoss && (
          <motion.section
            className="border-y border-white/5 px-6 py-16"
            style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.02) 100%)" }}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-4 py-1.5 text-xs font-bold text-red-400">
                {isJa ? "推定機会損失" : "Estimated Opportunity Loss"}
              </div>
              <p className="mb-4 text-6xl font-black text-red-400 md:text-8xl">{formattedLoss}</p>
              <p className="mx-auto max-w-xl text-lg text-zinc-400">
                {isJa
                  ? "現状のWebサイトで毎月失われている推定売上です。改善によりこの損失を回収できます。"
                  : "Estimated revenue lost each month with the current website. This can be recovered through improvement."}
              </p>
            </div>
          </motion.section>
        )}

        <DemoBeforeAfter items={beforeAfter} isJa={isJa} accentColor={hero.accentColor} />

        <DemoFeatures features={features} isJa={isJa} accentColor={hero.accentColor} />

        <DemoCallToAction {...cta} isJa={isJa} />
      </main>

      <DemoFooter isJa={isJa} />
    </div>
  )
}

function formatLoss(value: string): string {
  const match = value.match(/^(¥?\s*)([\d,]+)(.*)$/)
  if (!match) return value
  const [, symbol, num, suffix] = match
  const cleaned = num.replace(/,/g, "")
  const formatted = Number(cleaned).toLocaleString("en-US")
  return `${symbol}${formatted}${suffix}`
}
