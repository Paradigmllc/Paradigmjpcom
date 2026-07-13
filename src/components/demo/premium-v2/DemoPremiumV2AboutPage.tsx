"use client"

import { ArrowUpRight } from "lucide-react"
import type { DemoMultiPageData } from "@/lib/sales/demo-site-types"
import { PremiumV2Media, PremiumV2MediaCarousel, PremiumV2PageHero, PremiumV2Reveal } from "./PremiumV2Primitives"

export function DemoPremiumV2AboutPage({ data }: { data: DemoMultiPageData }) {
  const premium = data.premium!
  const about = data.pages.about
  const media = premium.gallery.length > 0 ? premium.gallery : premium.heroMedia
  const hero = media[2] ?? media[0] ?? premium.heroMedia[0]
  const storyParagraphs = about.story.split(/\n{2,}/).filter(Boolean)
  const instagram = premium.social.find((item) => item.network === "instagram")

  return (
    <div className="overflow-hidden bg-[#f4f1e9] text-[#171713]">
      <PremiumV2PageHero title={about.title} subtitle={about.subtitle} eyebrow="OUR STORY" media={hero} />

      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-36">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.72fr_1.28fr] lg:gap-20">
          <PremiumV2Reveal>
            <p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-accent)]">Beginning</p>
            <h2 className="mt-6 font-premium-serif text-4xl leading-[1.03] tracking-[-.045em] sm:text-6xl">{data.companyName}について。</h2>
          </PremiumV2Reveal>
          <PremiumV2Reveal delay={0.08} className="border-t border-black/20 pt-8 lg:mt-24">
            {storyParagraphs.map((paragraph) => <p key={paragraph} className="mb-6 whitespace-pre-line text-base leading-8 text-black/65 last:mb-0 sm:text-lg sm:leading-9">{paragraph}</p>)}
            <dl className="mt-10 grid gap-px bg-black/15 sm:grid-cols-2">
              <div className="bg-[#f4f1e9] p-5"><dt className="text-[10px] font-bold uppercase tracking-[.24em] text-black/40">Place</dt><dd className="mt-3 text-sm leading-7">{about.locationLabel}</dd></div>
              <div className="bg-[#f4f1e9] p-5"><dt className="text-[10px] font-bold uppercase tracking-[.24em] text-black/40">Style</dt><dd className="mt-3 text-sm leading-7">{about.industryLabel}</dd></div>
            </dl>
          </PremiumV2Reveal>
        </div>
      </section>

      <section className="grid bg-[#171713] text-white lg:grid-cols-2">
        <div className="relative min-h-[520px] lg:min-h-[760px]">
          <PremiumV2Media media={media[1] ?? hero} className="absolute inset-0" sizes="(max-width: 1024px) 100vw, 50vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </div>
        <div className="flex items-center px-5 py-20 sm:px-10 sm:py-28 lg:px-16">
          <PremiumV2Reveal>
            <p className="text-xs font-bold uppercase tracking-[.3em] text-white/40">Philosophy</p>
            <blockquote className="mt-8 font-premium-serif text-4xl leading-[1.12] tracking-[-.04em] sm:text-6xl">“{about.mission}”</blockquote>
            <p className="mt-8 max-w-xl text-sm leading-8 text-white/55">{about.teamNote}</p>
          </PremiumV2Reveal>
        </div>
      </section>

      <section className="bg-[#d9d2c2] px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-36">
        <div className="mx-auto max-w-7xl">
          <PremiumV2Reveal className="mb-12 border-b border-black/20 pb-8">
            <p className="text-xs font-bold uppercase tracking-[.3em] text-black/45">What we value</p>
            <h2 className="mt-5 font-premium-serif text-4xl tracking-[-.045em] sm:text-6xl">大切にしていること。</h2>
          </PremiumV2Reveal>
          <div className="grid gap-px bg-black/15 lg:grid-cols-3">
            {about.values.map((value, index) => (
              <PremiumV2Reveal key={value.title} delay={index * 0.06} className="min-h-72 bg-[#d9d2c2] p-7 sm:p-9">
                <span className="font-premium-serif text-5xl italic text-black/25">0{index + 1}</span>
                <h3 className="mt-12 font-premium-serif text-3xl">{value.title}</h3>
                <p className="mt-5 text-sm leading-7 text-black/58">{value.description}</p>
              </PremiumV2Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-36">
        <div className="mx-auto max-w-7xl">
          <PremiumV2Reveal className="mb-10"><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-accent)]">Scenes</p><h2 className="mt-5 font-premium-serif text-4xl tracking-[-.045em] sm:text-6xl">{data.companyName}の景色。</h2></PremiumV2Reveal>
          <PremiumV2MediaCarousel media={media} label={`${data.companyName}のイメージギャラリー`} />
          {instagram && <a href={instagram.href} target="_blank" rel="noopener noreferrer" className="mt-10 inline-flex items-center gap-3 border-b border-black pb-2 text-sm font-bold">最新情報をInstagramで見る<ArrowUpRight className="h-4 w-4" /></a>}
        </div>
      </section>
    </div>
  )
}
