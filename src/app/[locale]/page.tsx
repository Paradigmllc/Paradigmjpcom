"use client"

import HeroSection from "@/components/aesop/home/HeroSection"
import MarqueeSection from "@/components/aesop/home/MarqueeSection"
import ServicesSection from "@/components/aesop/home/ServicesSection"
import ProcessSection from "@/components/aesop/home/ProcessSection"
import StatsHeroicSection from "@/components/aesop/home/StatsHeroicSection"
import FeaturesSection from "@/components/aesop/home/FeaturesSection"
import TestimonialsSection from "@/components/aesop/home/TestimonialsSection"
import CtaSection from "@/components/aesop/home/CtaSection"

export default function HomePage() {
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
