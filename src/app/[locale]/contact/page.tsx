import type { Metadata } from "next"
import { Mail, Clock, Calendar } from "lucide-react"
import PageHero from "@/components/PageHero"
import { ContactForm } from "./ContactForm"

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "Paradigm合同会社へのお問い合わせ・無料相談のご予約はこちらから。Web制作・MEO・SEO/GEO・AI導入のご相談を承ります。",
}

const SIDEBAR_BLOCKS = [
  {
    icon: Calendar,
    gradient: "from-pink-400 via-paradigm-accent to-paradigm-tech",
    label: "無料相談について",
    items: ["初回30分間、完全無料", "Zoom / Google Meet で実施", "平日 10:00〜18:00", "課題ヒアリング+簡易提案"],
  },
  {
    icon: Mail,
    gradient: "from-paradigm-tech via-paradigm-glow to-violet-400",
    label: "お問い合わせ先",
    items: ["メール: contact@paradigmjp.com", "対応時間: 平日 10:00〜18:00", "返信: 1営業日以内にご連絡します"],
  },
] as const

export default function ContactPage() {
  return (
    <>
      <PageHero
        badge="Contact"
        title="お気軽にご相談ください。"
        highlight="ご相談"
        desc="初回30分のオンライン相談は無料です。"
      />

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8 grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          <div className="lg:col-span-3 paradigm-glass rounded-2xl p-6 md:p-8 paradigm-glow-md">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">Form</p>
            <h2 className="font-display text-[22px] md:text-[28px] leading-[1.2] text-paradigm-ink mb-7 tracking-[-0.015em]">
              お問い合わせフォーム
            </h2>
            <ContactForm />
          </div>

          <aside className="lg:col-span-2 space-y-4">
            {SIDEBAR_BLOCKS.map((b) => {
              const Icon = b.icon
              return (
                <div
                  key={b.label}
                  className="paradigm-glass rounded-2xl p-6 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500"
                >
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${b.gradient} text-paradigm-paper mb-3 paradigm-glow-sm`}>
                    <Icon size={18} strokeWidth={1.5} />
                  </div>
                  <p className="paradigm-eyebrow text-paradigm-accent mb-3">{b.label}</p>
                  <ul className="space-y-2 text-[13px] text-paradigm-ink-soft leading-[1.75]">
                    {b.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )
            })}

            <div className="paradigm-glass rounded-2xl p-6 paradigm-glow-md border border-paradigm-accent/30">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-paradigm-glow via-paradigm-accent to-pink-400 text-paradigm-paper mb-3 paradigm-glow-sm">
                <Clock size={18} strokeWidth={1.5} />
              </div>
              <p className="paradigm-eyebrow text-paradigm-accent mb-3">お急ぎの方へ</p>
              <p className="text-[13px] text-paradigm-ink-soft leading-[1.75] mb-4">
                Cal.com でオンライン相談をすぐにご予約いただけます。
              </p>
              <a
                href="https://cal.appexx.me"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full justify-center items-center gap-2 bg-paradigm-ink text-paradigm-paper rounded-xl py-3 text-[12px] tracking-[0.14em] uppercase font-semibold hover:bg-paradigm-accent transition-colors"
              >
                オンライン相談を予約
              </a>
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}
