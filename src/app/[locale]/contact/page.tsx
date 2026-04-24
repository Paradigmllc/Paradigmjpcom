import type { Metadata } from "next"
import Link from "next/link"
import PageHero from "@/components/PageHero"
import { ContactForm } from "./ContactForm"

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "Paradigm合同会社へのお問い合わせ・無料相談のご予約はこちらから。Web制作・MEO・SEO/GEO・AI導入のご相談を承ります。",
}

export default function ContactPage() {
  return (
    <>
      <PageHero badge="Contact" title="お問い合わせ" desc="お気軽にご相談ください。初回30分のオンライン相談は無料です。" accent="violet" />

      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-16">
          {/* Form */}
          <div className="lg:col-span-3">
            <h2 className="text-2xl font-bold text-primary mb-8">お問い合わせフォーム</h2>
            <ContactForm />
          </div>

          {/* Info Sidebar */}
          <div className="lg:col-span-2 space-y-8">
            <div className="rounded-2xl bg-gray-50 p-8">
              <h3 className="font-bold text-primary text-lg mb-4">無料相談について</h3>
              <ul className="space-y-3 text-sm text-text-muted">
                <li className="flex gap-2"><span>&#9200;</span>初回30分間、完全無料</li>
                <li className="flex gap-2"><span>&#128187;</span>Zoom / Google Meetで実施</li>
                <li className="flex gap-2"><span>&#128197;</span>平日 10:00〜18:00</li>
                <li className="flex gap-2"><span>&#128221;</span>課題ヒアリング+簡易提案</li>
              </ul>
            </div>

            <div className="rounded-2xl bg-gray-50 p-8">
              <h3 className="font-bold text-primary text-lg mb-4">お問い合わせ先</h3>
              <div className="space-y-3 text-sm text-text-muted">
                <p><span className="font-medium text-primary">メール:</span> contact@paradigmjp.com</p>
                <p><span className="font-medium text-primary">対応時間:</span> 平日 10:00〜18:00</p>
                <p><span className="font-medium text-primary">返信:</span> 1営業日以内にご連絡します</p>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-accent/20 bg-accent/5 p-8">
              <h3 className="font-bold text-accent text-lg mb-3">お急ぎの方へ</h3>
              <p className="text-sm text-text-muted mb-4">
                Cal.comでオンライン相談をすぐにご予約いただけます。
              </p>
              <a href="https://cal.appexx.me" target="_blank" rel="noopener noreferrer" className="inline-flex w-full justify-center py-3 bg-accent text-white rounded-xl font-semibold text-sm hover:bg-accent/90 transition-colors">
                オンライン相談を予約
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
