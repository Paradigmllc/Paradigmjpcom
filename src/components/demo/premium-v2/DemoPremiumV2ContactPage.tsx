"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { ArrowUpRight, CheckCircle2, Clock3, MapPin } from "lucide-react"
import { FaInstagram } from "react-icons/fa6"
import type { DemoMultiPageData } from "@/lib/sales/demo-site-types"
import { PremiumV2PageHero, PremiumV2Reveal } from "./PremiumV2Primitives"

export const inquirySchema = z.object({
  name: z.string().trim().min(1, "お名前を入力してください").max(80, "80文字以内で入力してください"),
  email: z.string().trim().email("正しいメールアドレスを入力してください"),
  phone: z.string().trim().max(30, "30文字以内で入力してください"),
  topic: z.string().min(1, "お問い合わせ種別を選択してください"),
  message: z.string().trim().min(10, "10文字以上で入力してください").max(2000, "2000文字以内で入力してください"),
  privacy: z.boolean().refine((accepted) => accepted, { message: "内容を確認のうえ同意してください" }),
})

type InquiryValues = z.infer<typeof inquirySchema>

export function buildGoogleMapsEmbedUrl(address: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
}

export function DemoPremiumV2ContactPage({ data }: { data: DemoMultiPageData }) {
  const premium = data.premium!
  const contact = data.pages.contact
  const hero = premium.gallery[2] ?? premium.heroMedia[0]
  const instagram = premium.social.find((item) => item.network === "instagram")
  const mapEmbedUrl = buildGoogleMapsEmbedUrl(contact.address)
  const isPreviewForm = Boolean(data.privatePreview) || contact.formEnabled === false

  return (
    <div className="overflow-hidden bg-[#f4f1e9] text-[#171713]">
      <PremiumV2PageHero title={contact.title} subtitle={contact.subtitle} eyebrow="VISIT & CONTACT" media={hero} />

      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-36">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.72fr_1.28fr] lg:gap-20">
          <PremiumV2Reveal>
            <p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-accent)]">Information</p>
            <h2 className="mt-6 font-premium-serif text-4xl leading-[1.04] tracking-[-.045em] sm:text-6xl">アクセスと<br />お問い合わせ。</h2>
            <p className="mt-7 max-w-md text-sm leading-8 text-black/55">{contact.formNote}</p>
          </PremiumV2Reveal>
          <PremiumV2Reveal delay={0.08} className="grid gap-px bg-black/15 sm:grid-cols-2">
            <InfoBlock icon={<MapPin className="h-5 w-5" />} label="所在地">{contact.mapUrl ? <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-black/25 underline-offset-4">{contact.address}</a> : contact.address}</InfoBlock>
            <InfoBlock icon={<Clock3 className="h-5 w-5" />} label="営業案内">最新の営業情報をご確認ください<br /><span className="text-xs text-black/45">変更情報は公式案内へ</span></InfoBlock>
            {instagram && <InfoBlock icon={<FaInstagram className="h-5 w-5" />} label="公式Instagram"><a href={instagram.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 underline decoration-black/25 underline-offset-4">最新の営業情報<ArrowUpRight className="h-4 w-4" /></a></InfoBlock>}
            <InfoBlock icon={<ArrowUpRight className="h-5 w-5" />} label="お問い合わせ">下記フォームから入力できます<br /><span className="text-xs text-black/45">デモでは送信されません</span></InfoBlock>
          </PremiumV2Reveal>
        </div>
      </section>

      {contact.mapUrl && <section className="grid border-y border-black/10 lg:grid-cols-[1.1fr_.9fr]">
        <div className="relative min-h-[520px] bg-[#d9d2c2] lg:min-h-[720px]">
          <iframe
            src={mapEmbedUrl}
            title={`${contact.companyName}へのアクセス地図`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 h-full w-full border-0 grayscale-[.28] contrast-[.95]"
            allowFullScreen
          />
        </div>
        <div className="flex items-center bg-[#171713] px-5 py-20 text-white sm:px-10 sm:py-24 lg:px-16">
          <PremiumV2Reveal>
            <p className="text-xs font-bold uppercase tracking-[.3em] text-white/40">Access</p>
            <h2 className="mt-6 font-premium-serif text-4xl tracking-[-.04em] sm:text-5xl">{contact.companyName}</h2>
            <p className="mt-7 text-base leading-8 text-white/65">{contact.address}</p>
            <p className="mt-5 text-sm leading-7 text-white/45">地図を拡大して周辺の目印や経路をご確認いただけます。建物内の位置は、公式案内もあわせてご覧ください。</p>
            {contact.mapUrl && <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-9 inline-flex min-h-12 items-center gap-3 border border-white/35 px-6 text-sm font-bold transition hover:bg-white hover:text-black">Google Mapsで開く<ArrowUpRight className="h-4 w-4" /></a>}
          </PremiumV2Reveal>
        </div>
      </section>}

      <section className="px-5 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-36">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.65fr_1.35fr] lg:gap-20">
          <PremiumV2Reveal>
            <p className="text-xs font-bold uppercase tracking-[.3em] text-[var(--demo-accent)]">Contact form</p>
            <h2 className="mt-6 font-premium-serif text-4xl leading-[1.05] tracking-[-.045em] sm:text-6xl">お問い合わせ。</h2>
            <p className="mt-7 text-sm leading-8 text-black/55">入力、バリデーション、完了表示まで実装したフォームです。非公開デモでは、相手事業者への誤送信を防ぐため外部送信を停止しています。</p>
          </PremiumV2Reveal>
          <PremiumV2InquiryForm data={data} previewOnly={isPreviewForm} />
        </div>
      </section>
    </div>
  )
}

function InfoBlock({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return <div className="min-h-48 bg-[#f4f1e9] p-6 sm:p-8"><div className="flex items-center gap-3 text-[var(--demo-accent)]">{icon}<p className="text-[10px] font-bold uppercase tracking-[.24em]">{label}</p></div><div className="mt-8 text-sm leading-7">{children}</div></div>
}

function PremiumV2InquiryForm({ data, previewOnly }: { data: DemoMultiPageData; previewOnly: boolean }) {
  const contact = data.pages.contact
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [submitError, setSubmitError] = useState("")
  const { register, handleSubmit, reset, formState: { errors } } = useForm<InquiryValues>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { name: "", email: "", phone: "", topic: "", message: "", privacy: false },
  })

  const onSubmit = async (values: InquiryValues) => {
    setStatus("loading")
    setSubmitError("")
    try {
      if (previewOnly) {
        await new Promise((resolve) => window.setTimeout(resolve, 450))
        setStatus("success")
        reset()
        return
      }
      const response = await fetch("/api/demo-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: values.name, email: values.email, company: contact.companyName, message: `[${values.topic}]\n${values.message}\n電話: ${values.phone || "未入力"}` }),
      })
      const result: unknown = await response.json()
      if (!response.ok || typeof result !== "object" || result === null || !("ok" in result) || result.ok !== true) throw new Error("送信を完了できませんでした")
      setStatus("success")
      reset()
    } catch (error) {
      console.error("[PremiumV2Contact] form submission failed:", error)
      setStatus("error")
      setSubmitError(error instanceof Error ? error.message : "送信を完了できませんでした")
    }
  }

  if (status === "success") {
    return (
      <PremiumV2Reveal className="flex min-h-[520px] flex-col items-center justify-center border border-black/15 bg-white/45 p-8 text-center sm:p-12" >
        <CheckCircle2 className="h-12 w-12 text-[var(--demo-accent)]" />
        <h3 className="mt-7 font-premium-serif text-4xl">入力内容を確認しました。</h3>
        <p className="mt-5 max-w-md text-sm leading-7 text-black/55">{previewOnly ? "これは非公開デモのため、内容は外部へ送信されていません。正式納品時に指定の受付先へ接続できます。" : "お問い合わせありがとうございます。内容を確認のうえご連絡します。"}</p>
        <button type="button" onClick={() => setStatus("idle")} className="mt-8 border-b border-black pb-2 text-sm font-bold">別の内容を入力する</button>
      </PremiumV2Reveal>
    )
  }

  return (
    <PremiumV2Reveal>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-6 border border-black/15 bg-white/40 p-6 sm:grid-cols-2 sm:p-9">
        <Field label="お名前" error={errors.name?.message}><input {...register("name")} autoComplete="name" className="premium-input" placeholder="山田 太郎" /></Field>
        <Field label="メールアドレス" error={errors.email?.message}><input {...register("email")} type="email" autoComplete="email" className="premium-input" placeholder="email@example.com" /></Field>
        <Field label="電話番号（任意）" error={errors.phone?.message}><input {...register("phone")} type="tel" autoComplete="tel" className="premium-input" placeholder="090-0000-0000" /></Field>
        <Field label="お問い合わせ種別" error={errors.topic?.message}><select {...register("topic")} className="premium-input"><option value="">選択してください</option><option value="商品について">商品について</option><option value="営業・アクセスについて">営業・アクセスについて</option><option value="取材・お取引について">取材・お取引について</option><option value="その他">その他</option></select></Field>
        <div className="sm:col-span-2"><Field label="お問い合わせ内容" error={errors.message?.message}><textarea {...register("message")} rows={6} className="premium-input resize-none" placeholder="お問い合わせ内容をご記入ください" /></Field></div>
        <div className="sm:col-span-2"><label className="flex items-start gap-3 text-sm leading-6 text-black/60"><input {...register("privacy")} type="checkbox" className="mt-1 h-4 w-4 accent-[var(--demo-accent)]" />入力内容とプライバシーに関する案内を確認し、フォームの利用に同意します。</label>{errors.privacy?.message && <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{errors.privacy.message}</p>}</div>
        {status === "error" && <p role="alert" className="sm:col-span-2 text-sm font-semibold text-red-700">{submitError}</p>}
        <div className="sm:col-span-2"><button type="submit" disabled={status === "loading"} className="inline-flex min-h-14 w-full items-center justify-center gap-3 bg-black px-8 text-sm font-bold text-white transition hover:bg-[var(--demo-accent)] disabled:cursor-wait disabled:opacity-60">{status === "loading" ? "確認中…" : previewOnly ? "入力内容を確認する（送信なし）" : "お問い合わせを送信する"}<ArrowUpRight className="h-4 w-4" /></button></div>
      </form>
      <style jsx global>{`.premium-input{width:100%;border:0;border-bottom:1px solid rgb(0 0 0 / .22);background:transparent;padding:.75rem 0;color:#171713;outline:none;transition:border-color .2s}.premium-input:focus{border-color:var(--demo-accent)}.premium-input::placeholder{color:rgb(0 0 0 / .32)}`}</style>
    </PremiumV2Reveal>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-bold tracking-[.08em] text-black/65">{label}</span>{children}{error && <span role="alert" className="mt-2 block text-xs font-semibold text-red-700">{error}</span>}</label>
}
