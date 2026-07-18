"use client"

import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Newspaper } from "lucide-react"
import type { DemoContentPage, DemoMultiPageData, DemoPremiumMedia } from "@/lib/sales/demo-site-types"
import { demoHeadlineClass } from "@/lib/sales/demo-art-direction"
import { PremiumV3Media, PremiumV3Reveal, PremiumV3Stagger, PremiumV3StaggerItem } from "./PremiumV3Primitives"
import { uniqueHeroMedia } from "./PremiumV3HeroDeck"

type JournalVariant = 0 | 1 | 2

const PROFILE_COPY: Record<string, { category: string; eyebrow: string; title: string; description: string }> = {
  dental: { category: "医院からのお知らせ", eyebrow: "PATIENT JOURNAL", title: "受診前に知っておきたいこと。", description: "診療案内、院内のこと、来院前に確認したい情報を、読みやすくまとめています。" },
  construction: { category: "施工・仕事のご案内", eyebrow: "PROJECT JOURNAL", title: "仕事の背景まで、丁寧に。", description: "施工の考え方や素材、相談前に知っておきたいことを、写真と言葉でご紹介します。" },
  retail: { category: "店舗・ブランド便り", eyebrow: "STORE JOURNAL", title: "選ぶ時間を、もっと豊かに。", description: "商品の背景や店内の風景、営業に関するご案内を、最新情報としてお届けします。" },
  restaurant: { category: "営業・季節のご案内", eyebrow: "TABLE JOURNAL", title: "この場所の、今を伝える。", description: "季節のメニュー、店内の風景、ご来店前に確認したい情報をご案内します。" },
  beauty_salon: { category: "サロンからのお知らせ", eyebrow: "SALON JOURNAL", title: "スタイルと時間のこと。", description: "メニューやスタイル、サロンで過ごす時間について、写真とともにご紹介します。" },
  default: { category: "事業からのお知らせ", eyebrow: "INSIGHT JOURNAL", title: "知りたい情報を、ひとつに。", description: "サービスの考え方、事例、営業に関するご案内を、確認しやすい形で整理しています。" },
}

function profileCopy(data: DemoMultiPageData) {
  const profile = data.presentation?.industryProfile ?? String(data.industry)
  return PROFILE_COPY[profile] ?? PROFILE_COPY.default
}

function journalVariant(data: DemoMultiPageData): JournalVariant {
  const recipe = data.designRecipe
  return Math.abs((recipe?.compositionVariant ?? 0) + (recipe?.rhythmVariant ?? 0)) % 3 as JournalVariant
}

function articleMedia(data: DemoMultiPageData, index: number): DemoPremiumMedia | undefined {
  const media = uniqueHeroMedia([...(data.premium?.gallery ?? []), ...(data.premium?.heroMedia ?? [])], 8)
  return media.length > 0 ? media[index % media.length] : undefined
}

function articleBody(section: DemoContentPage["sections"][number]) {
  return section.body.replace(/(?:生成イメージ|AI生成|エキテン掲載素材|権利確認前|提案用素材)[。\s]*/gu, "").trim() || "最新のご案内を掲載しています。詳しい内容は公式窓口へお問い合わせください。"
}

function articleHref(data: DemoMultiPageData, sectionId: string) {
  return `/${data.slug}/news#${sectionId}`
}

function ArticleCard({ data, section, index, featured = false, dark = false }: { data: DemoMultiPageData; section: DemoContentPage["sections"][number]; index: number; featured?: boolean; dark?: boolean }) {
  const media = articleMedia(data, index)
  const copy = profileCopy(data)
  return <article id={section.id} className={`group overflow-hidden border ${dark ? "border-white/15 bg-white/[.06] text-white" : "border-[var(--demo-line)] bg-[var(--demo-surface)] text-[var(--demo-ink)]"} ${featured ? "lg:grid lg:grid-cols-[1.05fr_.95fr]" : ""}`}>
    <a href={articleHref(data, section.id)} className={`relative block overflow-hidden ${featured ? "min-h-[300px] sm:min-h-[440px]" : "aspect-[1.45/1]"}`} aria-label={`${section.heading}を読む`}>
      <PremiumV3Media media={media} className="absolute inset-0 transition duration-700 group-hover:scale-[1.04]" sizes={featured ? "(max-width:1024px) 100vw, 52vw" : "(max-width:768px) 100vw, 34vw"} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
      <span className="absolute left-5 top-5 bg-white/92 px-3 py-2 text-[10px] font-bold tracking-[.22em] text-black">{String(index + 1).padStart(2, "0")} / {copy.category}</span>
      <span className="absolute bottom-5 left-5 right-5 text-xs font-semibold tracking-[.08em] text-white/78">最新のご案内</span>
    </a>
    <div className={`flex flex-col justify-between p-6 sm:p-8 ${featured ? "lg:p-11" : "min-h-64"}`}>
      <div>
        <div className={`flex items-center gap-3 text-[10px] font-bold tracking-[.2em] ${dark ? "text-white/45" : "text-[var(--demo-muted)]"}`}><CalendarDays className="h-3.5 w-3.5" />{copy.category}<span aria-hidden="true">·</span><span>PREVIEW</span></div>
        <h3 className={`${demoHeadlineClass(section.heading, featured ? "section" : "card")} mt-5 font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{section.heading}</h3>
        <p className={`mt-5 text-sm leading-8 ${dark ? "text-white/62" : "text-[var(--demo-muted)]"}`}>{articleBody(section)}</p>
      </div>
      <a href={articleHref(data, section.id)} className={`mt-7 inline-flex items-center gap-3 text-sm font-bold ${dark ? "text-white" : "text-[var(--demo-ink)]"}`}>記事を読む<ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-1 group-hover:-translate-y-1" /></a>
    </div>
  </article>
}

function JournalRail({ data, copy, sections, dark = false }: { data: DemoMultiPageData; copy: ReturnType<typeof profileCopy>; sections: DemoContentPage["sections"]; dark?: boolean }) {
  return <aside className={`flex flex-col justify-between ${dark ? "text-white" : "text-[var(--demo-ink)]"}`}>
    <div>
      <div className={`flex items-center gap-3 text-xs font-bold uppercase tracking-[.3em] ${dark ? "text-white/52" : "text-[var(--demo-accent)]"}`}><BookOpen className="h-4 w-4" />{copy.eyebrow}</div>
      <h2 className={`${demoHeadlineClass(copy.title)} mt-6 font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{copy.title}</h2>
      <p className={`mt-6 max-w-sm text-sm leading-8 ${dark ? "text-white/62" : "text-[var(--demo-muted)]"}`}>{copy.description}</p>
      <div className={`mt-9 border-y py-5 text-xs tracking-[.1em] ${dark ? "border-white/15 text-white/55" : "border-[var(--demo-line)] text-[var(--demo-muted)]"}`}><span className="font-bold">{String(sections.length).padStart(2, "0")}</span> 件のご案内</div>
    </div>
    <div className="mt-10 space-y-3">
      <a href={`/${data.slug}/news`} className={`inline-flex min-h-12 w-full items-center justify-between px-5 text-sm font-bold ${dark ? "bg-white text-black" : "bg-[var(--demo-ink)] text-white"}`}>お知らせ一覧を見る<ArrowRight className="h-4 w-4" /></a>
      <a href={`/${data.slug}/contact`} className={`inline-flex min-h-12 w-full items-center justify-between border px-5 text-sm font-bold ${dark ? "border-white/35 text-white" : "border-[var(--demo-line)] text-[var(--demo-ink)]"}`}>ご相談・お問い合わせ<ArrowUpRight className="h-4 w-4" /></a>
    </div>
  </aside>
}

export function PremiumV3Journal({ data, mode = "home" }: { data: DemoMultiPageData; mode?: "home" | "page" }) {
  const sections = (data.pages.news?.sections ?? []).slice(0, 4)
  if (sections.length === 0) return null
  const copy = profileCopy(data)
  const variant = journalVariant(data)
  const motionStyle = data.designRecipe?.motionVariant

  if (mode === "page") return <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16"><div className="mx-auto max-w-7xl"><div className="grid gap-12 lg:grid-cols-[.36fr_1fr]"><PremiumV3Reveal motionStyle={motionStyle}><JournalRail data={data} copy={copy} sections={sections} /></PremiumV3Reveal><PremiumV3Stagger className="grid gap-5 md:grid-cols-2"><PremiumV3StaggerItem><ArticleCard data={data} section={sections[0]} index={0} featured /></PremiumV3StaggerItem>{sections.slice(1, 4).map((section, index) => <PremiumV3StaggerItem key={section.id}><ArticleCard data={data} section={section} index={index + 1} /></PremiumV3StaggerItem>)}</PremiumV3Stagger></div></div></section>

  if (variant === 1) return <section className="bg-[var(--demo-ink)] px-5 py-24 text-white sm:px-10 sm:py-32 lg:px-16" data-journal-variant="dark"><div className="mx-auto max-w-7xl"><div className="grid gap-12 lg:grid-cols-[.42fr_1.58fr] lg:items-start"><PremiumV3Reveal motionStyle={motionStyle}><JournalRail data={data} copy={copy} sections={sections} dark /></PremiumV3Reveal><div className="grid gap-5 lg:grid-cols-[1.16fr_.84fr]"><PremiumV3Reveal motionStyle={motionStyle}><ArticleCard data={data} section={sections[0]} index={0} featured dark /></PremiumV3Reveal><div className="grid gap-5">{sections.slice(1, 3).map((section, index) => <PremiumV3Reveal key={section.id} motionStyle={motionStyle} delay={index * .06}><ArticleCard data={data} section={section} index={index + 1} dark /></PremiumV3Reveal>)}</div></div></div></div></section>

  if (variant === 2) return <section className="bg-[var(--demo-surface-alt)] px-5 py-24 sm:px-10 sm:py-32 lg:px-16" data-journal-variant="offset"><div className="mx-auto max-w-7xl"><PremiumV3Reveal motionStyle={motionStyle} className="mb-12 flex flex-col gap-5 border-b border-[var(--demo-line)] pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-accent)]"><Newspaper className="h-4 w-4" />{copy.eyebrow}</p><h2 className={`${demoHeadlineClass(copy.title)} mt-5 font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{copy.title}</h2></div><a href={`/${data.slug}/news`} className="inline-flex items-center gap-2 text-sm font-bold">すべての記事<ArrowRight className="h-4 w-4" /></a></PremiumV3Reveal><div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><PremiumV3Reveal motionStyle={motionStyle} className="lg:pt-12"><JournalRail data={data} copy={copy} sections={sections} /></PremiumV3Reveal><div className="grid gap-5 md:grid-cols-2">{sections.slice(0, 3).map((section, index) => <PremiumV3Reveal key={section.id} motionStyle={motionStyle} delay={index * .06} className={index === 0 ? "md:col-span-2" : ""}><ArticleCard data={data} section={section} index={index} featured={index === 0} /></PremiumV3Reveal>)}</div></div></div></section>

  return <section className="px-5 py-24 sm:px-10 sm:py-32 lg:px-16" data-journal-variant="editorial"><div className="mx-auto max-w-7xl"><div className="grid gap-12 lg:grid-cols-[.34fr_1fr]"><PremiumV3Reveal motionStyle={motionStyle}><JournalRail data={data} copy={copy} sections={sections} /></PremiumV3Reveal><PremiumV3Stagger className="grid gap-5 md:grid-cols-3">{sections.slice(0, 3).map((section, index) => <PremiumV3StaggerItem key={section.id}><ArticleCard data={data} section={section} index={index} /></PremiumV3StaggerItem>)}</PremiumV3Stagger></div></div></section>
}
