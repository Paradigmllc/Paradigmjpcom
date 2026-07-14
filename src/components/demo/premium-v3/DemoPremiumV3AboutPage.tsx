"use client"

import { ArrowRight, ArrowUpRight } from "lucide-react"
import type { DemoMultiPageData } from "@/lib/sales/demo-site-types"
import { demoHeadlineClass, resolveDemoArtDirection } from "@/lib/sales/demo-art-direction"
import { PremiumV3Media, PremiumV3MediaCarousel, PremiumV3PageHero, PremiumV3Reveal } from "./PremiumV3Primitives"

export function DemoPremiumV3AboutPage({ data }: { data: DemoMultiPageData }) {
  const premium = data.premium!
  const about = data.pages.about
  const media = premium.gallery.length > 0 ? premium.gallery : premium.heroMedia
  const hero = media[2] ?? media[0] ?? premium.heroMedia[0]
  const storyParagraphs = about.story.split(/\n{2,}/u).filter(Boolean)
  const instagram = premium.social.find((item) => item.network === "instagram")
  const motionStyle = data.designRecipe?.motionVariant
  const basePath = `/${data.slug}`
  const direction = resolveDemoArtDirection(data)

  return (
    <div className="overflow-hidden bg-[var(--demo-surface)] text-[var(--demo-ink)]">
      <PremiumV3PageHero title={about.title} subtitle={about.subtitle} eyebrow={direction.labels.story} media={hero} mediaGallery={direction.id === "beauty" ? media : undefined} recipe={data.designRecipe} variant={direction.hero} />
      <section className="border-b border-[var(--demo-line)] px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.62fr_1.38fr] lg:gap-24">
          <PremiumV3Reveal motionStyle={motionStyle}><p className="text-xs font-bold tracking-[.22em] text-[var(--demo-accent)]">基本情報</p><h2 className={`${demoHeadlineClass(`${data.companyName}をつくるもの`)} mt-6 font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{data.companyName}を<br />つくるもの。</h2><dl className="mt-10 border-t border-[var(--demo-line)] text-sm"><div className="grid grid-cols-[90px_1fr] gap-4 border-b border-[var(--demo-line)] py-4"><dt className="text-[var(--demo-muted)]">拠点</dt><dd>{about.locationLabel}</dd></div><div className="grid grid-cols-[90px_1fr] gap-4 border-b border-[var(--demo-line)] py-4"><dt className="text-[var(--demo-muted)]">事業</dt><dd>{about.industryLabel}</dd></div></dl></PremiumV3Reveal>
          <PremiumV3Reveal motionStyle={motionStyle} delay={0.08} className="lg:pt-20"><p className="border-l-2 border-[var(--demo-accent)] pl-6 text-xl leading-9 sm:text-2xl sm:leading-10 [font-family:var(--demo-font-display)]">{about.mission}</p><div className="mt-10 space-y-6">{storyParagraphs.map((paragraph) => <p key={paragraph} className="whitespace-pre-line text-base leading-9 text-[var(--demo-muted)] sm:text-lg">{paragraph}</p>)}</div><p className="mt-10 border-t border-[var(--demo-line)] pt-8 text-sm leading-8 text-[var(--demo-muted)]">{about.teamNote}</p></PremiumV3Reveal>
        </div>
      </section>

      <section className="grid bg-[var(--demo-ink)] text-white lg:grid-cols-[1.1fr_.9fr]">
        <div className="group relative min-h-[520px] lg:min-h-[720px]"><PremiumV3Media media={media[1] ?? hero} className="absolute inset-0" sizes="(max-width:1024px) 100vw, 55vw" /><div className="absolute inset-0 bg-gradient-to-t from-black/48 via-transparent to-transparent" /></div>
        <div className="flex items-center px-5 py-20 sm:px-10 sm:py-28 lg:px-14"><PremiumV3Reveal motionStyle={motionStyle}><p className="text-xs font-bold tracking-[.22em] text-white/48">日々の姿勢</p><h2 className={`${demoHeadlineClass(about.teamNote)} mt-8 font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{about.teamNote}</h2><p className="mt-8 text-sm leading-8 text-white/62">サービスの内容と現在のご案内は、各ページと公式情報からご確認いただけます。</p></PremiumV3Reveal></div>
      </section>

      <section className="bg-[var(--demo-surface-alt)] px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-32"><div className="mx-auto max-w-7xl"><PremiumV3Reveal motionStyle={motionStyle} className="mb-8 grid gap-6 border-b border-[var(--demo-line)] pb-9 md:grid-cols-[1fr_.55fr] md:items-end"><div><p className="text-xs font-bold tracking-[.22em] text-[var(--demo-muted)]">私たちが大切にすること</p><h2 className={`${demoHeadlineClass("大切にしていること")} mt-5 font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>大切にしていること。</h2></div><p className="text-sm leading-8 text-[var(--demo-muted)]">考え方を、日々の仕事でどのように形にしているかをご紹介します。</p></PremiumV3Reveal><div className="divide-y divide-[var(--demo-line)]">{about.values.map((value, index) => <PremiumV3Reveal key={value.title} motionStyle={motionStyle} delay={index * 0.05} className="grid gap-5 py-8 md:grid-cols-[90px_.6fr_1fr]"><span className="text-sm text-[var(--demo-muted)]">0{index + 1}</span><h3 className="text-2xl font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]">{value.title}</h3><p className="text-sm leading-8 text-[var(--demo-muted)]">{value.description}</p></PremiumV3Reveal>)}</div></div></section>

      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-32"><div className="mx-auto max-w-7xl"><PremiumV3Reveal motionStyle={motionStyle} className="mb-10"><p className="text-xs font-bold tracking-[.22em] text-[var(--demo-accent)]">日々の風景</p><h2 className={`${demoHeadlineClass(`${data.companyName}の日々`)} mt-5 font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{data.companyName}の日々。</h2></PremiumV3Reveal><PremiumV3MediaCarousel media={media} label={`${data.companyName}のイメージギャラリー`} variant={data.industry === "beauty_salon" ? "compact" : "wide"} /><div className="mt-10 flex flex-wrap gap-5">{instagram && <a href={instagram.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 border-b border-[var(--demo-ink)] pb-2 text-sm font-bold">最新情報をInstagramで見る<ArrowUpRight className="h-4 w-4" /></a>}<a href={`${basePath}/services`} className="inline-flex items-center gap-3 border-b border-[var(--demo-line)] pb-2 text-sm font-bold">{data.meta.navLabels?.services ?? "サービス"}を見る<ArrowRight className="h-4 w-4" /></a></div></div></section>
    </div>
  )
}

