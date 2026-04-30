import type { Metadata } from "next"
import PageHero from "@/components/PageHero"
import { ContactForm } from "./ContactForm"

/**
 * /[locale]/contact — Aesop voice.
 *
 * P18-D-2 rewrite. 5-col grid: form (3 cols) + sidebar (2 cols).
 * Sidebar info blocks switch from gray-50 rounded chrome to hairline
 * card with paradigm-eyebrow labels. Cal.com block becomes a quiet
 * outline CTA rather than the previous accent-bordered alarm pill.
 *
 * AE-PHP-1: 80 lines.
 */

export const metadata: Metadata = {
  title: "お問い合わせ",
  description:
    "Paradigm合同会社へのお問い合わせ・無料相談のご予約はこちらから。Web制作・MEO・SEO/GEO・AI導入のご相談を承ります。",
}

export default function ContactPage() {
  return (
    <>
      <PageHero
        badge="Contact"
        title="お問い合わせ"
        desc="お気軽にご相談ください。初回30分のオンライン相談は無料です。"
      />

      <section className="bg-paradigm-paper paradigm-section">
        <div className="max-w-5xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">
          <div className="lg:col-span-3">
            <p className="paradigm-eyebrow mb-5">Form</p>
            <h2 className="font-display text-[28px] md:text-[36px] leading-[1.2] text-paradigm-ink mb-10">
              お問い合わせフォーム
            </h2>
            <ContactForm />
          </div>

          <aside className="lg:col-span-2 space-y-10">
            <div className="border-t border-paradigm-line pt-6">
              <p className="paradigm-eyebrow mb-4">無料相談について</p>
              <ul className="space-y-3 text-[14px] text-paradigm-ink-soft leading-[1.85]">
                <li>初回30分間、完全無料</li>
                <li>Zoom / Google Meet で実施</li>
                <li>平日 10:00〜18:00</li>
                <li>課題ヒアリング+簡易提案</li>
              </ul>
            </div>

            <div className="border-t border-paradigm-line pt-6">
              <p className="paradigm-eyebrow mb-4">お問い合わせ先</p>
              <dl className="space-y-3 text-[14px] text-paradigm-ink-soft leading-[1.85]">
                <div>
                  <dt className="text-paradigm-ink font-medium inline">メール: </dt>
                  <dd className="inline">contact@paradigmjp.com</dd>
                </div>
                <div>
                  <dt className="text-paradigm-ink font-medium inline">対応時間: </dt>
                  <dd className="inline">平日 10:00〜18:00</dd>
                </div>
                <div>
                  <dt className="text-paradigm-ink font-medium inline">返信: </dt>
                  <dd className="inline">1営業日以内にご連絡します</dd>
                </div>
              </dl>
            </div>

            <div className="border-t border-paradigm-line pt-6">
              <p className="paradigm-eyebrow mb-4">お急ぎの方へ</p>
              <p className="text-[14px] text-paradigm-ink-soft leading-[1.85] mb-5">
                Cal.com でオンライン相談をすぐにご予約いただけます。
              </p>
              <a
                href="https://cal.appexx.me"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full justify-center items-center gap-2 border border-paradigm-ink text-paradigm-ink py-3 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-ink hover:text-paradigm-paper transition-colors"
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
