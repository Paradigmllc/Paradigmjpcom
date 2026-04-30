"use client"

/**
 * HomeClient — paradigm /[locale] homepage orchestrator.
 *
 * 2026-04-30 ユーザ追加指示「HP を見ただけで感動して問い合わせたくなる豪華さ」
 * 「Aesop に拘りすぎなくて OK」「もっと MagicUI で強化」を反映し、
 * Modern Tech × Luxury のフルパッケージ構成。各 section を独立 file へ分割し
 * AE-PHP-1 (≤500 行) 厳守。本 orchestrator は薄い renderer として section
 * の配列を順番に組み立てるだけ。
 *
 * Sections (8 bands):
 *   1. HeroSection            — video bg + parallax + Sparkles + gradient typing + 4 stats
 *   2. MarqueeSection         — 動的 trust 帯 (双方向)
 *   3. ServicesSection        — Bento grid + BorderBeam (各カード固有色)
 *   4. StatsHeroicSection     — ink band + 巨大 gradient NumberTicker + Meteors
 *   5. FeaturesSection        — Ripple hover + gradient icon
 *   6. TestimonialsSection    — quote cards + avatar gradient + Marquee trust
 *   7. CtaSection             — Meteors + Sparkles + ShimmerButton
 *
 * AE-PHP-1: 25 行 (orchestrator は薄く保つ)
 * AE-PHP-2: 全 visible string は messages 経由 (各 section 内で useTranslations)
 */

import HeroSection from "@/components/aesop/home/HeroSection"
import MarqueeSection from "@/components/aesop/home/MarqueeSection"
import ServicesSection from "@/components/aesop/home/ServicesSection"
import StatsHeroicSection from "@/components/aesop/home/StatsHeroicSection"
import FeaturesSection from "@/components/aesop/home/FeaturesSection"
import TestimonialsSection from "@/components/aesop/home/TestimonialsSection"
import CtaSection from "@/components/aesop/home/CtaSection"

export default function HomeClient() {
  return (
    <div className="overflow-x-hidden">
      <HeroSection />
      <MarqueeSection />
      <ServicesSection />
      <StatsHeroicSection />
      <FeaturesSection />
      <TestimonialsSection />
      <CtaSection />
    </div>
  )
}
