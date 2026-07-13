"use client"

import { ArrowUpRight, Clock3, MapPin } from "lucide-react"
import { FaInstagram } from "react-icons/fa6"
import type { DemoMultiPageData } from "@/lib/sales/demo-site-types"
import { buildGoogleMapsEmbedUrl, PremiumV2InquiryForm } from "../premium-v2/DemoPremiumV2ContactPage"
import { PremiumV3PageHero, PremiumV3Reveal } from "./PremiumV3Primitives"

export function DemoPremiumV3ContactPage({ data }: { data: DemoMultiPageData }) {
  const premium = data.premium!
  const contact = data.pages.contact
  const hero = premium.gallery[2] ?? premium.heroMedia[0]
  const instagram = premium.social.find((item) => item.network === "instagram")
  const mapEmbedUrl = buildGoogleMapsEmbedUrl(contact.address)
  const isPreviewForm = Boolean(data.privatePreview) || contact.formEnabled === false
  const motionStyle = data.designRecipe?.motionVariant
  const isRestaurant = data.industry === "restaurant"

  return (
    <div className="overflow-hidden bg-[var(--demo-surface)] text-[var(--demo-ink)]">
      <PremiumV3PageHero title={contact.title} subtitle={contact.subtitle} eyebrow="VISIT & CONTACT" media={hero} recipe={data.designRecipe} />
      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.62fr_1.38fr] lg:gap-20"><PremiumV3Reveal motionStyle={motionStyle}><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-accent)]">Information</p><h2 className="mt-6 text-4xl leading-[1.12] tracking-[-.035em] sm:text-5xl [font-family:var(--demo-font-display)]">{isRestaurant ? "訪れる前に、" : "ご相談の前に、"}<br />確認できること。</h2><p className="mt-7 max-w-md text-sm leading-8 text-[var(--demo-muted)]">{contact.formNote}</p></PremiumV3Reveal><PremiumV3Reveal motionStyle={motionStyle} delay={0.08} className="grid gap-px bg-[var(--demo-line)] sm:grid-cols-2"><InfoBlock icon={<MapPin className="h-5 w-5" />} label="所在地">{contact.mapUrl ? <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-black/25 underline-offset-4">{contact.address}</a> : contact.address}</InfoBlock><InfoBlock icon={<Clock3 className="h-5 w-5" />} label="営業案内">最新の営業情報をご確認ください<br /><span className="text-xs text-[var(--demo-muted)]">変更情報は公式案内へ</span></InfoBlock>{instagram && <InfoBlock icon={<FaInstagram className="h-5 w-5" />} label="公式Instagram"><a href={instagram.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 underline decoration-black/25 underline-offset-4">最新情報を見る<ArrowUpRight className="h-4 w-4" /></a></InfoBlock>}<InfoBlock icon={<ArrowUpRight className="h-5 w-5" />} label="お問い合わせ">下記フォームから入力できます<br /><span className="text-xs text-[var(--demo-muted)]">デモでは送信されません</span></InfoBlock></PremiumV3Reveal></div></section>
      {contact.mapUrl && <section className="grid border-y border-[var(--demo-line)] lg:grid-cols-[1.16fr_.84fr]"><div className="relative min-h-[500px] bg-[var(--demo-surface-alt)] lg:min-h-[650px]"><iframe src={mapEmbedUrl} title={`${contact.companyName}へのアクセス地図`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="absolute inset-0 h-full w-full border-0 grayscale-[.18] contrast-[.96]" allowFullScreen /></div><div className="flex items-center bg-[var(--demo-ink)] px-5 py-20 text-white sm:px-10 lg:px-14"><PremiumV3Reveal motionStyle={motionStyle}><p className="text-xs font-bold uppercase tracking-[.3em] text-white/42">Access</p><h2 className="mt-6 text-4xl tracking-[-.035em] sm:text-5xl [font-family:var(--demo-font-display)]">{contact.companyName}</h2><p className="mt-7 text-base leading-8 text-white/68">{contact.address}</p><p className="mt-5 text-sm leading-8 text-white/48">地図を拡大して周辺の目印や経路をご確認いただけます。建物内の位置や営業状況は、公式案内もあわせてご覧ください。</p><a href={contact.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-9 inline-flex min-h-12 items-center gap-3 border border-white/35 px-6 text-sm font-bold transition hover:bg-white hover:text-black">Google Mapsで開く<ArrowUpRight className="h-4 w-4" /></a></PremiumV3Reveal></div></section>}
      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.58fr_1.42fr] lg:gap-20"><PremiumV3Reveal motionStyle={motionStyle}><p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-accent)]">Contact form</p><h2 className="mt-6 text-4xl leading-[1.1] tracking-[-.035em] sm:text-5xl [font-family:var(--demo-font-display)]">お問い合わせ。</h2><p className="mt-7 text-sm leading-8 text-[var(--demo-muted)]">入力、確認、完了表示まで体験できます。非公開デモでは相手事業者への誤送信を防ぐため、外部送信を停止しています。</p></PremiumV3Reveal><PremiumV2InquiryForm data={data} previewOnly={isPreviewForm} /></div></section>
    </div>
  )
}

function InfoBlock({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return <div className="min-h-48 bg-[var(--demo-surface)] p-6 sm:p-8"><div className="flex items-center gap-3 text-[var(--demo-accent)]">{icon}<p className="text-[10px] font-bold uppercase tracking-[.24em]">{label}</p></div><div className="mt-8 text-sm leading-7">{children}</div></div>
}
