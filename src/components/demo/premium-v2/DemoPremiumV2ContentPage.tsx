"use client"

import { ArrowUpRight } from "lucide-react"
import type { DemoContentPage, DemoMultiPageData } from "@/lib/sales/demo-site-types"
import { PremiumV2MediaCarousel, PremiumV2PageHero, PremiumV2Reveal } from "./PremiumV2Primitives"

type ContentPageKey = "works" | "news" | "faq" | "recruit" | "privacy" | "terms" | "commerce"

export function DemoPremiumV2ContentPage({ data, page, pageKey }: { data: DemoMultiPageData; page: DemoContentPage; pageKey: ContentPageKey }) {
  const premium = data.premium!
  const media = premium.gallery.length > 0 ? premium.gallery : premium.heroMedia
  const hero = media[pageKey === "works" ? 0 : pageKey === "faq" ? 1 : 2] ?? media[0]
  const isDocument = ["privacy", "terms", "commerce"].includes(pageKey)
  const isFaq = pageKey === "faq"
  const instagram = premium.social.find((item) => item.network === "instagram")

  return (
    <div className="overflow-hidden bg-[#f4f1e9] text-[#171713]">
      <PremiumV2PageHero title={page.title} subtitle={page.subtitle} eyebrow={page.eyebrow} media={hero} />
      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-36">
        <div className={`mx-auto ${isDocument ? "max-w-4xl" : "max-w-7xl"}`}>
          {isDocument && <PremiumV2Reveal className="mb-12 border-b border-black/20 pb-7"><p className="text-sm leading-7 text-black/55">このページは、正式公開時に事業者確認済みの内容へ更新することを前提とした掲載項目のデモです。</p></PremiumV2Reveal>}
          <div className={isDocument || isFaq ? "space-y-0 border-t border-black/20" : "grid gap-px bg-black/15 md:grid-cols-2"}>
            {page.sections.map((section, index) => (
              isFaq ? (
                <PremiumV2Reveal key={section.id} delay={index * 0.04}>
                  <details className="group border-b border-black/20 py-1">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 font-premium-serif text-2xl marker:hidden sm:text-3xl"><span>{section.heading}</span><span className="text-3xl font-light transition group-open:rotate-45">＋</span></summary>
                    <p className="max-w-3xl pb-7 text-sm leading-8 text-black/60 sm:text-base">{section.body}</p>
                  </details>
                </PremiumV2Reveal>
              ) : isDocument ? (
                <PremiumV2Reveal key={section.id} delay={index * 0.04} className="grid gap-5 border-b border-black/20 py-9 sm:grid-cols-[.4fr_1fr] sm:gap-12">
                  <h2 className="font-premium-serif text-2xl sm:text-3xl">{section.heading}</h2><div><p className="whitespace-pre-line text-sm leading-8 text-black/60 sm:text-base">{section.body}</p>{section.note && <p className="mt-4 text-xs text-[var(--demo-accent)]">{section.note}</p>}</div>
                </PremiumV2Reveal>
              ) : (
                <PremiumV2Reveal key={section.id} delay={index * 0.05} className="min-h-72 bg-[#f4f1e9] p-7 sm:p-10">
                  <span className="font-premium-serif text-5xl italic text-black/22">{String(index + 1).padStart(2, "0")}</span><h2 className="mt-12 font-premium-serif text-3xl tracking-[-.03em] sm:text-4xl">{section.heading}</h2><p className="mt-6 whitespace-pre-line text-sm leading-8 text-black/58">{section.body}</p>{section.note && <p className="mt-6 break-all text-xs text-[var(--demo-accent)]">{section.note}</p>}
                </PremiumV2Reveal>
              )
            ))}
          </div>
        </div>
      </section>
      {!isDocument && !isFaq && (
        <section className="bg-[#d9d2c2] px-5 py-20 sm:px-10 sm:py-28 lg:px-16">
          <div className="mx-auto max-w-7xl"><PremiumV2Reveal className="mb-10"><p className="text-xs font-bold uppercase tracking-[.3em] text-black/45">Gallery</p><h2 className="mt-5 font-premium-serif text-4xl tracking-[-.045em] sm:text-6xl">その場所の空気まで。</h2></PremiumV2Reveal><PremiumV2MediaCarousel media={media} label={`${page.title}のイメージスライダー`} /></div>
        </section>
      )}
      {instagram && !isDocument && <section className="bg-[var(--demo-accent)] px-5 py-16 text-white sm:px-10 lg:px-16"><PremiumV2Reveal className="mx-auto flex max-w-7xl flex-col gap-7 sm:flex-row sm:items-center sm:justify-between"><h2 className="font-premium-serif text-3xl sm:text-4xl">最新のお知らせはInstagramで。</h2><a href={instagram.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-3 bg-white px-7 text-sm font-bold text-black">公式Instagramを見る<ArrowUpRight className="h-4 w-4" /></a></PremiumV2Reveal></section>}
    </div>
  )
}
