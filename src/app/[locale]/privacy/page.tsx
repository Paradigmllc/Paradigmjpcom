import type { Metadata } from "next"
import PageHero from "@/components/PageHero"
import FadeIn from "@/components/aesop/FadeIn"

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "Paradigm合同会社のプライバシーポリシー。個人情報の取り扱いについて。",
}

const SECTIONS: ReadonlyArray<{ title: string; body: React.ReactNode }> = [
  { title: "1. 個人情報の定義", body: <p>個人情報とは、生存する個人に関する情報であって、当該情報に含まれる氏名、生年月日その他の記述等により特定の個人を識別できるもの（他の情報と容易に照合することができ、それにより特定の個人を識別することができることとなるものを含む。）をいいます。</p> },
  { title: "2. 個人情報の収集方法", body: <p>当社は、お問い合わせフォーム、メール、電話等を通じてお客様の個人情報を取得することがあります。取得する情報には、氏名、メールアドレス、電話番号、会社名等が含まれます。</p> },
  { title: "3. 個人情報の利用目的", body: (
      <>
        <p>当社は、収集した個人情報を以下の目的で利用します。</p>
        <ul className="mt-3 space-y-1.5 list-disc pl-5 text-paradigm-ink-soft">
          <li>お問い合わせへの回答・対応</li>
          <li>サービスの提供・改善</li>
          <li>新サービスや更新情報のお知らせ</li>
          <li>契約・請求に関する業務</li>
          <li>利用状況の分析・統計</li>
        </ul>
      </>
    ) },
  { title: "4. 個人情報の第三者提供", body: <p>当社は、法令に基づく場合を除き、お客様の同意なく個人情報を第三者に提供することはありません。</p> },
  { title: "5. 個人情報の安全管理", body: <p>当社は、個人情報の漏洩、滅失又はき損を防止するため、適切なセキュリティ対策を講じます。</p> },
  { title: "6. Cookie の使用", body: <p>当サイトでは、利用状況の分析・サービス改善のために Cookie を使用する場合があります。ブラウザの設定で Cookie を無効にすることが可能ですが、一部のサービスが正常に機能しなくなる場合があります。</p> },
  { title: "7. 個人情報の開示・訂正・削除", body: <p>お客様は、ご自身の個人情報の開示・訂正・削除を求めることができます。ご希望の場合は下記のお問い合わせ先までご連絡ください。</p> },
  { title: "8. プライバシーポリシーの変更", body: <p>当社は、必要に応じて本ポリシーを変更することがあります。変更後のポリシーは、当サイトに掲載した時点で効力を生じるものとします。</p> },
  { title: "9. お問い合わせ", body: (
      <>
        <p>個人情報の取り扱いに関するお問い合わせは、下記までご連絡ください。</p>
        <p className="mt-3 text-paradigm-ink"><strong className="font-medium">Paradigm 合同会社</strong><br />メール: contact@paradigmjp.com</p>
      </>
    ) },
]

export default function PrivacyPage() {
  return (
    <>
      <PageHero badge="Privacy" title="プライバシーポリシー" desc="最終更新日: 2025年4月" />
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-8 space-y-3">
          {SECTIONS.map((s, i) => (
            <FadeIn key={s.title} delay={i * 0.04}>
              <article className="paradigm-glass rounded-2xl p-6 md:p-7 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500">
                <h2 className="font-display text-[18px] md:text-[22px] leading-[1.2] tracking-[-0.01em] text-paradigm-ink mb-4">
                  <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-paradigm-tech bg-clip-text text-transparent">
                    {s.title}
                  </span>
                </h2>
                <div className="text-[13px] md:text-[14px] text-paradigm-ink-soft leading-[1.85]">{s.body}</div>
              </article>
            </FadeIn>
          ))}
        </div>
      </section>
    </>
  )
}
