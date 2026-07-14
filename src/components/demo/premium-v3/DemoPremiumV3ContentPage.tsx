"use client"

import { ArrowRight, ArrowUpRight, MapPin, Newspaper } from "lucide-react"
import { FaInstagram } from "react-icons/fa6"
import type { DemoContentPage, DemoMultiPageData } from "@/lib/sales/demo-site-types"
import { demoHeadlineClass, resolveDemoArtDirection } from "@/lib/sales/demo-art-direction"
import { PremiumV3Media, PremiumV3MediaCarousel, PremiumV3PageHero, PremiumV3Reveal } from "./PremiumV3Primitives"

type ContentPageKey = "works" | "news" | "faq" | "recruit" | "privacy" | "terms" | "commerce"

export function DemoPremiumV3ContentPage({ data, page, pageKey }: { data: DemoMultiPageData; page: DemoContentPage; pageKey: ContentPageKey }) {
  if (["privacy", "terms", "commerce"].includes(pageKey)) return <DocumentPage data={data} page={page} />
  if (pageKey === "works") return <WorksPage data={data} page={page} />
  if (pageKey === "news") return <NewsPage data={data} page={page} />
  if (pageKey === "recruit") return <RecruitPage data={data} page={page} />
  return <FaqPage data={data} page={page} />
}

function pageMedia(data: DemoMultiPageData) {
  const premium = data.premium!
  return premium.gallery.length > 0 ? premium.gallery : premium.heroMedia
}

function pageHero(data: DemoMultiPageData, page: DemoContentPage, media: ReturnType<typeof pageMedia>[number]) {
  const direction = resolveDemoArtDirection(data)
  return <PremiumV3PageHero title={page.title} subtitle={page.subtitle} eyebrow={page.eyebrow} media={media} recipe={data.designRecipe} variant={direction.hero} />
}

function WorksPage({ data, page }: { data: DemoMultiPageData; page: DemoContentPage }) {
  const media = pageMedia(data)
  const hero = media[0] ?? data.premium!.heroMedia[0]
  const motionStyle = data.designRecipe?.motionVariant
  const isRestaurant = data.industry === "restaurant"
  const direction = resolveDemoArtDirection(data)
  if (direction.worksLayout === "salon-lookbook") return <BeautyWorksPage data={data} page={page} />
  return (
    <div className="overflow-hidden bg-[var(--demo-surface)] text-[var(--demo-ink)]">
      {pageHero(data, page, hero)}
      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16"><div className="mx-auto max-w-7xl"><PremiumV3Reveal motionStyle={motionStyle} className="grid gap-8 border-b border-[var(--demo-line)] pb-10 lg:grid-cols-[1.1fr_.9fr]"><h2 className="text-4xl leading-[1.12] tracking-[-.035em] sm:text-6xl [font-family:var(--demo-font-display)]">{isRestaurant ? "写真から伝わる、" : "実績から見える、"}<br />{data.companyName}{isRestaurant ? "の空気。" : "の仕事。"}</h2><p className="self-end text-base leading-9 text-[var(--demo-muted)]">{isRestaurant ? "商品やサービスだけでなく、その場所で過ごす時間や仕事の細部も大切な情報です。確認できる写真と言葉を組み合わせてご紹介します。" : "提供するサービスだけでなく、取り組み方や仕事の細部も大切な判断材料です。確認できる事実とビジュアルを組み合わせてご紹介します。"}</p></PremiumV3Reveal></div></section>
      <section className="pb-20 sm:pb-28 lg:pb-32"><div className="mx-auto max-w-[1500px] space-y-20 px-5 sm:px-10 lg:space-y-28 lg:px-16">{page.sections.map((section, index) => { const itemMedia = media[index % media.length] ?? hero; return <PremiumV3Reveal key={section.id} motionStyle={motionStyle} className={`grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-center ${index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}><div className="group relative min-h-[420px] overflow-hidden sm:min-h-[560px]"><PremiumV3Media media={itemMedia} className="absolute inset-0" sizes="(max-width:1024px) 100vw, 60vw" /><span className="absolute left-5 top-5 bg-black/72 px-3 py-2 text-[10px] font-bold tracking-[.25em] text-white">0{index + 1}</span></div><div className="lg:px-10"><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-accent)]">Scene {String(index + 1).padStart(2, "0")}</p><h2 className="mt-5 text-4xl tracking-[-.03em] sm:text-5xl [font-family:var(--demo-font-display)]">{section.heading}</h2><p className="mt-7 whitespace-pre-line text-base leading-9 text-[var(--demo-muted)]">{section.body}</p></div></PremiumV3Reveal>})}</div></section>
      <section className="bg-[var(--demo-surface-alt)] px-5 py-20 sm:px-10 sm:py-24 lg:px-16"><div className="mx-auto max-w-7xl"><PremiumV3Reveal motionStyle={motionStyle}><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-muted)]">Explore</p><h2 className="mt-5 text-4xl tracking-[-.035em] sm:text-5xl [font-family:var(--demo-font-display)]">{data.meta.navLabels?.services ?? "商品・サービス"}を詳しく。</h2><div className="mt-9 grid border-t border-[var(--demo-line)] md:grid-cols-3">{data.pages.services.services.slice(0, 3).map((service, index) => <a key={service.title} href={`/${data.slug}/services`} className="group border-b border-[var(--demo-line)] py-7 md:border-r md:px-7"><span className="text-xs text-[var(--demo-muted)]">0{index + 1}</span><h3 className="mt-5 text-2xl [font-family:var(--demo-font-display)]">{service.title}</h3><p className="mt-4 text-sm leading-7 text-[var(--demo-muted)]">{service.description}</p><ArrowRight className="mt-6 h-4 w-4 transition group-hover:translate-x-1" /></a>)}</div></PremiumV3Reveal></div></section>
    </div>
  )
}

function BeautyWorksPage({ data, page }: { data: DemoMultiPageData; page: DemoContentPage }) {
  const media = pageMedia(data)
  const hero = media[0] ?? data.premium!.heroMedia[0]
  const direction = resolveDemoArtDirection(data)
  const motionStyle = data.designRecipe?.motionVariant
  const entries = page.sections.slice(0, Math.max(3, media.length))

  return (
    <div className="overflow-hidden bg-[var(--demo-surface)] text-[var(--demo-ink)] [font-feature-settings:'palt']">
      <PremiumV3PageHero title={page.title} subtitle={page.subtitle} eyebrow="スタイル・サロンの風景" media={hero} recipe={data.designRecipe} variant={direction.hero} />
      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-32"><div className="mx-auto max-w-7xl"><PremiumV3Reveal motionStyle={motionStyle} className="grid gap-8 border-b border-[var(--demo-line)] pb-10 lg:grid-cols-[1fr_.7fr] lg:items-end"><h2 className={`${demoHeadlineClass(`${data.companyName}で生まれるスタイル`)} max-w-[14em] font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{data.companyName}で生まれる、<br />それぞれのスタイル。</h2><p className="text-base leading-9 text-[var(--demo-muted)]">仕上がりだけでなく、サロンで過ごす時間や空間の雰囲気も写真でご覧いただけます。</p></PremiumV3Reveal></div></section>
      <section className="px-5 pb-20 sm:px-10 sm:pb-28 lg:px-16 lg:pb-36"><div className="mx-auto grid max-w-[1500px] gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">{entries.map((section, index) => {
        const itemMedia = media[index % media.length] ?? hero
        return <PremiumV3Reveal key={section.id} motionStyle={motionStyle} delay={index * 0.04} className={index % 2 === 1 ? "lg:pt-16" : ""}><figure><div className="group relative aspect-square overflow-hidden bg-[var(--demo-surface-alt)]"><PremiumV3Media media={itemMedia} className="absolute inset-0" sizes="(max-width:768px) 50vw, 24vw" /><span className="absolute left-4 top-4 bg-white/90 px-3 py-2 text-[10px] font-bold tracking-[.2em] text-black">LOOK {String(index + 1).padStart(2, "0")}</span></div><figcaption className="border-b border-[var(--demo-line)] py-5"><h2 className={`${demoHeadlineClass(section.heading, "card")} font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>{section.heading}</h2><p className="mt-3 text-sm leading-7 text-[var(--demo-muted)]">{section.body}</p></figcaption></figure></PremiumV3Reveal>
      })}</div></section>
      <section className="bg-[var(--demo-surface-alt)] px-5 py-20 sm:px-10 sm:py-24 lg:px-16"><PremiumV3Reveal motionStyle={motionStyle} className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-xs font-bold tracking-[.22em] text-[var(--demo-accent)]">メニュー</p><h2 className={`${demoHeadlineClass("スタイルをつくるメニュー")} mt-5 font-[var(--demo-heading-weight)] [font-family:var(--demo-font-display)]`}>スタイルをつくるメニュー。</h2><p className="mt-5 max-w-2xl text-sm leading-8 text-[var(--demo-muted)]">提供内容とご利用の流れは、メニューページにまとめています。</p></div><a href={`/${data.slug}/services`} className="inline-flex min-h-12 items-center gap-3 bg-[var(--demo-ink)] px-7 text-sm font-bold text-white">メニューを見る<ArrowRight className="h-4 w-4" /></a></PremiumV3Reveal></section>
    </div>
  )
}

function NewsPage({ data, page }: { data: DemoMultiPageData; page: DemoContentPage }) {
  const media = pageMedia(data)
  const hero = media[2] ?? media[0] ?? data.premium!.heroMedia[0]
  const instagram = data.premium!.social.find((item) => item.network === "instagram")
  const motionStyle = data.designRecipe?.motionVariant
  return (
    <div className="overflow-hidden bg-[var(--demo-surface)] text-[var(--demo-ink)]">
      {pageHero(data, page, hero)}
      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16"><div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.62fr_1.38fr]"><PremiumV3Reveal motionStyle={motionStyle}><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-accent)]">Information desk</p><h2 className="mt-5 text-4xl leading-[1.14] tracking-[-.035em] sm:text-5xl [font-family:var(--demo-font-display)]">最新情報を、<br />迷わず確認できる場所へ。</h2><p className="mt-7 text-sm leading-8 text-[var(--demo-muted)]">営業情報や提供内容は変わることがあります。このページと公式SNSで、確認済みの情報をご案内します。</p></PremiumV3Reveal><div className="border-t border-[var(--demo-line)]">{page.sections.map((section, index) => <PremiumV3Reveal key={section.id} motionStyle={motionStyle} delay={index * 0.04} className="grid gap-5 border-b border-[var(--demo-line)] py-8 sm:grid-cols-[90px_1fr]"><span className="text-xs text-[var(--demo-muted)]">{String(index + 1).padStart(2, "0")}</span><div><h3 className="text-2xl [font-family:var(--demo-font-display)]">{section.heading}</h3><p className="mt-4 text-sm leading-8 text-[var(--demo-muted)]">{section.body}</p>{section.note && <a href={section.note} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 border-b border-[var(--demo-ink)] pb-1 text-sm font-bold">公式情報を見る<ArrowUpRight className="h-4 w-4" /></a>}</div></PremiumV3Reveal>)}</div></div></section>
      <section className="grid bg-[var(--demo-ink)] text-white lg:grid-cols-2"><div className="relative min-h-[460px]"><PremiumV3Media media={media[1] ?? hero} className="absolute inset-0" sizes="(max-width:1024px) 100vw, 50vw" /><div className="absolute inset-0 bg-black/20" /></div><div className="flex items-center px-5 py-20 sm:px-10 lg:px-16"><PremiumV3Reveal motionStyle={motionStyle}>{instagram ? <FaInstagram className="h-7 w-7 text-white/72" /> : <Newspaper className="h-7 w-7 text-white/72" />}<h2 className="mt-7 text-4xl leading-[1.13] tracking-[-.035em] sm:text-5xl [font-family:var(--demo-font-display)]">日々のご案内は、<br />{instagram ? "公式Instagramから。" : "公式情報から。"}</h2><p className="mt-7 max-w-xl text-sm leading-8 text-white/58">最新の営業案内や写真は、公開日が新しい公式情報をご確認ください。変更がある場合は、現在の案内を優先します。</p>{instagram && <a href={instagram.href} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex min-h-12 items-center gap-3 bg-white px-7 text-sm font-bold text-black">公式Instagramを見る<ArrowUpRight className="h-4 w-4" /></a>}</PremiumV3Reveal></div></section>
      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16"><div className="mx-auto max-w-7xl"><PremiumV3Reveal motionStyle={motionStyle} className="mb-10"><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-accent)]">Visual notes</p><h2 className="mt-5 text-4xl tracking-[-.035em] sm:text-5xl [font-family:var(--demo-font-display)]">写真で見る、最近の風景。</h2></PremiumV3Reveal><PremiumV3MediaCarousel media={media} label={`${page.title}の写真`} /></div></section>
    </div>
  )
}

function RecruitPage({ data, page }: { data: DemoMultiPageData; page: DemoContentPage }) {
  const media = pageMedia(data)
  const hero = media[2] ?? media[0] ?? data.premium!.heroMedia[0]
  const motionStyle = data.designRecipe?.motionVariant
  return (
    <div className="overflow-hidden bg-[var(--demo-surface)] text-[var(--demo-ink)]">
      {pageHero(data, page, hero)}
      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16"><div className="mx-auto max-w-7xl"><PremiumV3Reveal motionStyle={motionStyle} className="grid gap-8 border-b border-[var(--demo-line)] pb-10 lg:grid-cols-[1fr_.62fr]"><h2 className="text-4xl leading-[1.14] tracking-[-.035em] sm:text-6xl [font-family:var(--demo-font-display)]">仕事を知り、<br />考え方を知る。</h2><p className="self-end text-base leading-9 text-[var(--demo-muted)]">募集の有無だけでなく、何を大切にしている事業なのか。応募を検討するために必要な情報を、確認済みの範囲で整理します。</p></PremiumV3Reveal><div className="mt-10 grid gap-px bg-[var(--demo-line)] md:grid-cols-2">{page.sections.map((section, index) => <PremiumV3Reveal key={section.id} motionStyle={motionStyle} delay={index * 0.04} className="min-h-72 bg-[var(--demo-surface)] p-7 sm:p-9"><span className="text-xs text-[var(--demo-muted)]">0{index + 1}</span><h3 className="mt-10 text-3xl [font-family:var(--demo-font-display)]">{section.heading}</h3><p className="mt-6 whitespace-pre-line text-sm leading-8 text-[var(--demo-muted)]">{section.body}</p></PremiumV3Reveal>)}</div></div></section>
      <section className="grid bg-[var(--demo-surface-alt)] lg:grid-cols-[.9fr_1.1fr]"><div className="flex items-center px-5 py-20 sm:px-10 lg:px-16"><PremiumV3Reveal motionStyle={motionStyle}><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-accent)]">Our principles</p><h2 className="mt-6 text-4xl leading-[1.14] tracking-[-.035em] sm:text-5xl [font-family:var(--demo-font-display)]">{data.pages.about.mission}</h2><div className="mt-9 space-y-5">{data.pages.about.values.slice(0, 3).map((value) => <div key={value.title} className="border-t border-[var(--demo-line)] pt-5"><h3 className="font-semibold">{value.title}</h3><p className="mt-2 text-sm leading-7 text-[var(--demo-muted)]">{value.description}</p></div>)}</div></PremiumV3Reveal></div><div className="group relative min-h-[520px]"><PremiumV3Media media={media[1] ?? hero} className="absolute inset-0" sizes="(max-width:1024px) 100vw, 55vw" /></div></section>
      <section className="bg-[var(--demo-accent)] px-5 py-20 text-white sm:px-10 lg:px-16"><PremiumV3Reveal motionStyle={motionStyle} className="mx-auto flex max-w-6xl flex-col gap-7 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.3em] text-white/58">Application</p><h2 className="mt-5 text-4xl tracking-[-.035em] sm:text-5xl [font-family:var(--demo-font-display)]">正式な募集要項をご確認ください。</h2><p className="mt-5 max-w-2xl text-sm leading-8 text-white/72">募集がある場合は、職種、条件、応募方法をこのページまたは正式な案内窓口でお知らせします。</p></div><a href={`/${data.slug}/contact`} className="inline-flex min-h-12 items-center gap-3 border border-white/45 px-7 text-sm font-bold">お問い合わせ・アクセス<ArrowRight className="h-4 w-4" /></a></PremiumV3Reveal></section>
    </div>
  )
}

function FaqPage({ data, page }: { data: DemoMultiPageData; page: DemoContentPage }) {
  const media = pageMedia(data)
  const hero = media[1] ?? media[0] ?? data.premium!.heroMedia[0]
  const motionStyle = data.designRecipe?.motionVariant
  const isRestaurant = data.industry === "restaurant"
  return (
    <div className="overflow-hidden bg-[var(--demo-surface)] text-[var(--demo-ink)]">
      {pageHero(data, page, hero)}
      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.55fr_1.45fr]"><PremiumV3Reveal motionStyle={motionStyle}><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-accent)]">{isRestaurant ? "Before you visit" : "Before you inquire"}</p><h2 className="mt-5 text-4xl leading-[1.14] tracking-[-.035em] sm:text-5xl [font-family:var(--demo-font-display)]">よくある疑問を、<br />事前に確認。</h2><p className="mt-7 text-sm leading-8 text-[var(--demo-muted)]">ここにない事項や、営業状況によって変わる内容は、公式情報をご確認ください。</p></PremiumV3Reveal><div className="border-t border-[var(--demo-line)]">{page.sections.map((section, index) => <PremiumV3Reveal key={section.id} motionStyle={motionStyle} delay={index * 0.035}><details className="group border-b border-[var(--demo-line)]"><summary className="grid cursor-pointer list-none grid-cols-[42px_1fr_auto] items-center gap-4 py-7 marker:hidden"><span className="text-xs text-[var(--demo-muted)]">Q{String(index + 1).padStart(2, "0")}</span><span className="text-lg font-semibold sm:text-xl">{section.heading}</span><span className="text-2xl font-light transition group-open:rotate-45">＋</span></summary><p className="max-w-3xl pb-8 pl-[58px] text-sm leading-8 text-[var(--demo-muted)]">{section.body}</p></details></PremiumV3Reveal>)}</div></div></section>
      <section className="bg-[var(--demo-surface-alt)] px-5 py-20 sm:px-10 lg:px-16"><PremiumV3Reveal motionStyle={motionStyle} className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-muted)]">Still need help?</p><h2 className="mt-5 text-4xl tracking-[-.035em] sm:text-5xl [font-family:var(--demo-font-display)]">アクセスと最新情報はこちら。</h2><p className="mt-5 max-w-2xl text-sm leading-8 text-[var(--demo-muted)]">所在地、地図、公式SNSなど、現在確認できる窓口をまとめています。</p></div><a href={`/${data.slug}/contact`} className="inline-flex min-h-12 items-center gap-3 bg-[var(--demo-ink)] px-7 text-sm font-bold text-white"><MapPin className="h-4 w-4" />アクセスを見る</a></PremiumV3Reveal></section>
    </div>
  )
}

function DocumentPage({ data, page }: { data: DemoMultiPageData; page: DemoContentPage }) {
  const motionStyle = data.designRecipe?.motionVariant
  return (
    <div className="bg-[var(--demo-surface)] text-[var(--demo-ink)]">
      <header className="border-b border-[var(--demo-line)] px-5 pb-14 pt-24 sm:px-10 sm:pb-18 sm:pt-28 lg:px-16"><PremiumV3Reveal motionStyle={motionStyle} className="mx-auto max-w-6xl"><p className="text-xs font-bold uppercase tracking-[.32em] text-[var(--demo-accent)]">{page.eyebrow}</p><h1 className="mt-6 max-w-5xl text-[clamp(2.5rem,5vw,4.8rem)] leading-[1.08] tracking-[-.035em] [font-family:var(--demo-font-display)]">{page.title}</h1><p className="mt-7 max-w-3xl text-base leading-8 text-[var(--demo-muted)]">{page.subtitle}</p></PremiumV3Reveal></header>
      <section className="px-5 py-16 sm:px-10 sm:py-24 lg:px-16"><div className="mx-auto max-w-6xl"><PremiumV3Reveal motionStyle={motionStyle} className="mb-10 border-l-2 border-[var(--demo-accent)] bg-[var(--demo-surface-alt)] p-6"><p className="text-sm leading-8 text-[var(--demo-muted)]">正式公開前に、事業者の運用、契約条件、利用サービスおよび専門家の確認を反映します。以下は必要項目を欠落させないためのレビュー用文面です。</p></PremiumV3Reveal><div className="border-t border-[var(--demo-line)]">{page.sections.map((section, index) => <PremiumV3Reveal key={section.id} motionStyle={motionStyle} delay={index * 0.035} className="grid gap-5 border-b border-[var(--demo-line)] py-9 sm:grid-cols-[70px_.5fr_1fr] sm:gap-10"><span className="text-xs text-[var(--demo-muted)]">{String(index + 1).padStart(2, "0")}</span><h2 className="text-2xl sm:text-3xl [font-family:var(--demo-font-display)]">{section.heading}</h2><p className="whitespace-pre-line text-sm leading-8 text-[var(--demo-muted)] sm:text-base">{section.body}</p></PremiumV3Reveal>)}</div></div></section>
    </div>
  )
}
