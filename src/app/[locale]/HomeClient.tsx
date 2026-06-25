"use client"

/**
 * HomeClient — paradigm /[locale] homepage (P18-D-7 quality leap).
 *
 * 8-band cinematic premium tech home.
 *
 * 1. HeroSection         — 4K video bg + 128px display + multi-color gradient
 * 2. MarqueeSection      — 双方向 trust 帯
 * 3. ServicesSection     — Bento + 3D tilt + rounded-3xl + multi-color BorderBeam
 * 4. ProcessSection      — 4-step + AnimatedBeam connectors (NEW)
 * 5. StatsHeroicSection  — 巨大 NumberTicker + rainbow gradients
 * 6. FeaturesSection     — Bento + Ripple + gradient icons
 * 7. TestimonialsSection — 3 quote glass cards + Marquee
 * 8. CtaSection          — Meteors + Sparkles + gradient headline
 */

import HeroSection from "@/components/aesop/home/HeroSection"
import MarqueeSection from "@/components/aesop/home/MarqueeSection"
import ServicesSection from "@/components/aesop/home/ServicesSection"
import ProcessSection from "@/components/aesop/home/ProcessSection"
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
      <ProcessSection />
      <StatsHeroicSection />
      <FeaturesSection />
      <TestimonialsSection />
      <CtaSection />
    </div>
  )
}
