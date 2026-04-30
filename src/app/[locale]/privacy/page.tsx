import type { Metadata } from "next"
import PageHero from "@/components/PageHero"

/**
 * /[locale]/privacy — privacy policy (Aesop voice).
 *
 * P18-D-3 rewrite. 9 numbered sections rendered as serif h2 + sans body
 * with hairline dividers between. No prose plugin / no dark hero.
 *
 * AE-PHP-1: 110 lines.
 */

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "Paradigm合同会社のプライバシーポリシー。個人情報の取り扱いについて。",
}

const SECTIONS: ReadonlyArray<{ title: string; body: React.ReactNode }> = [
  {
    title: "1. 個人情報の定義",
    body: <p>個人情報とは、生存する個人に関する情報であって、当該情報に含まれる氏名、生年月日その他の記述等により特定の個人を識別できるもの（他の情報と容易に照合することができ、それにより特定の個人を識別することができることとなるものを含む。）をいいます。</p>,
  },
  {
    title: "2. 個人情報の収集方法",
    body: <p>当社は、お問い合わせフォーム、メール、電話等を通じてお客様の個人情報を取得することがあります。取得する情報には、氏名、メールアドレス、電話番号、会社名等が含まれます。</p>,
  },
  {
    title: "3. 個人情報の利用目的",
    body: (
      <>
        <p>当社は、収集した個人情報を以下の目的で利用します。</p>
        <ul className="mt-4 space-y-2 list-disc pl-5">
          <li>お問い合わせへの回答・対応</li>
          <li>サービスの提供・改善</li>
          <li>新サービスや更新情報のお知らせ</li>
          <li>契約・請求に関する業務</li>
          <li>利用状況の分析・統計</li>
        </ul>
      </>
    ),
  },
  {
    title: "4. 個人情報の第三者提供",
    body: <p>当社は、法令に基づく場合を除き、お客様の同意なく個人情報を第三者に提供することはありません。</p>,
  },
  {
    title: "5. 個人情報の安全管理",
    body: <p>当社は、個人情報の漏洩、滅失又はき損を防止するため、適切なセキュリティ対策を講じます。</p>,
  },
  {
    title: "6. Cookie の使用",
    body: <p>当サイトでは、利用状況の分析・サービス改善のために Cookie を使用する場合があります。ブラウザの設定で Cookie を無効にすることが可能ですが、一部のサービスが正常に機能しなくなる場合があります。</p>,
  },
  {
    title: "7. 個人情報の開示・訂正・削除",
    body: <p>お客様は、ご自身の個人情報の開示・訂正・削除を求めることができます。ご希望の場合は下記のお問い合わせ先までご連絡ください。</p>,
  },
  {
    title: "8. プライバシーポリシーの変更",
    body: <p>当社は、必要に応じて本ポリシーを変更することがあります。変更後のポリシーは、当サイトに掲載した時点で効力を生じるものとします。</p>,
  },
  {
    title: "9. お問い合わせ",
    body: (
      <>
        <p>個人情報の取り扱いに関するお問い合わせは、下記までご連絡ください。</p>
        <p className="mt-4 text-paradigm-ink">
          <strong className="font-medium">Paradigm合同会社</strong>
          <br />
          メール: contact@paradigmjp.com
        </p>
      </>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        badge="Privacy"
        title="プライバシーポリシー"
        desc="最終更新日: 2025年4月"
      />
      <section className="bg-paradigm-paper paradigm-section">
        <div className="max-w-3xl mx-auto px-6 md:px-12">
          <div className="border-t border-paradigm-line">
            {SECTIONS.map((s) => (
              <article
                key={s.title}
                className="border-b border-paradigm-line py-10"
              >
                <h2 className="font-display text-[22px] md:text-[26px] leading-[1.25] tracking-[-0.005em] text-paradigm-ink mb-5">
                  {s.title}
                </h2>
                <div className="text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.9]">
                  {s.body}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
