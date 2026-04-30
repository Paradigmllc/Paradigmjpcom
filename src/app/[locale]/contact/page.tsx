import type { Metadata } from "next"
import { Mail, Clock, Calendar } from "lucide-react"
import PageHero from "@/components/PageHero"
import { ContactForm } from "./ContactForm"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isJa = locale === "ja"
  return {
    title: isJa ? "お問い合わせ" : "Contact",
    description: isJa
      ? "Paradigm合同会社へのお問い合わせ・無料相談のご予約はこちらから。"
      : "Contact Paradigm LLC. Book a free first consultation here.",
  }
}

const SIDEBAR_BLOCKS_JA = [
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

const SIDEBAR_BLOCKS_EN = [
  {
    icon: Calendar,
    gradient: "from-pink-400 via-paradigm-accent to-paradigm-tech",
    label: "About the consultation",
    items: ["First 30 minutes are free", "Zoom or Google Meet", "Weekdays 10:00-18:00 JST", "Discovery + initial proposal"],
  },
  {
    icon: Mail,
    gradient: "from-paradigm-tech via-paradigm-glow to-violet-400",
    label: "Contact details",
    items: ["Email: contact@paradigmjp.com", "Hours: weekdays 10:00-18:00 JST", "Reply: within one business day"],
  },
] as const

export default async function ContactPage({ params }: Props) {
  const { locale } = await params
  const isJa = locale === "ja"
  const SIDEBAR_BLOCKS = isJa ? SIDEBAR_BLOCKS_JA : SIDEBAR_BLOCKS_EN

  return (
    <>
      <PageHero
        badge="Contact"
        title={isJa ? "お気軽にご相談ください。" : "Drop us a line."}
        highlight={isJa ? "ご相談" : "Drop us"}
        desc={isJa ? "初回30分のオンライン相談は無料です。" : "First 30-minute consultation is on us."}
      />

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8 grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          <div className="lg:col-span-3 paradigm-glass rounded-2xl p-6 md:p-8 paradigm-glow-md">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">Form</p>
            <h2 className="font-display text-[22px] md:text-[28px] leading-[1.2] text-paradigm-ink mb-7 tracking-[-0.015em]">
              {isJa ? "お問い合わせフォーム" : "Get in touch"}
            </h2>
            <ContactForm locale={locale} />
          </div>

          <aside className="lg:col-span-2 space-y-4">
            {SIDEBAR_BLOCKS.map((b) => {
              const Icon = b.icon
              return (
                <div key={b.label} className="paradigm-glass rounded-2xl p-6 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${b.gradient} text-paradigm-paper mb-3 paradigm-glow-sm`}>
                    <Icon size={18} strokeWidth={1.5} />
                  </div>
                  <p className="paradigm-eyebrow text-paradigm-accent mb-3">{b.label}</p>
                  <ul className="space-y-2 text-[13px] text-paradigm-ink-soft leading-[1.75]">
                    {b.items.map((item) => (<li key={item}>{item}</li>))}
                  </ul>
                </div>
              )
            })}

            <div className="paradigm-glass rounded-2xl p-6 paradigm-glow-md border border-paradigm-accent/30">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-paradigm-glow via-paradigm-accent to-pink-400 text-paradigm-paper mb-3 paradigm-glow-sm">
                <Clock size={18} strokeWidth={1.5} />
              </div>
              <p className="paradigm-eyebrow text-paradigm-accent mb-3">{isJa ? "お急ぎの方へ" : "In a hurry?"}</p>
              <p className="text-[13px] text-paradigm-ink-soft leading-[1.75] mb-4">
                {isJa ? "Cal.com でオンライン相談をすぐにご予約いただけます。" : "Book directly via Cal.com."}
              </p>
              <a
                href="https://cal.appexx.me"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full justify-center items-center gap-2 bg-paradigm-ink text-paradigm-paper rounded-xl py-3 text-[12px] tracking-[0.14em] uppercase font-semibold hover:bg-paradigm-accent transition-colors"
              >
                {isJa ? "オンライン相談を予約" : "Book online"}
              </a>
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}
