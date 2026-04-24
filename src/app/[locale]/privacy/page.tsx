import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "Paradigm合同会社のプライバシーポリシー。個人情報の取り扱いについて。",
}

export default function PrivacyPage() {
  return (
    <>
      <section className="py-20 px-6 bg-gradient-to-br from-primary to-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">プライバシーポリシー</h1>
          <p className="text-gray-300">最終更新日: 2025年4月</p>
        </div>
      </section>

      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto prose prose-sm prose-gray">
          <div className="space-y-10 text-text-muted leading-relaxed text-sm">
            <div>
              <h2 className="text-xl font-bold text-primary mb-4">1. 個人情報の定義</h2>
              <p>個人情報とは、生存する個人に関する情報であって、当該情報に含まれる氏名、生年月日その他の記述等により特定の個人を識別できるもの（他の情報と容易に照合することができ、それにより特定の個人を識別することができることとなるものを含む。）をいいます。</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">2. 個人情報の収集方法</h2>
              <p>当社は、お問い合わせフォーム、メール、電話等を通じてお客様の個人情報を取得することがあります。取得する情報には、氏名、メールアドレス、電話番号、会社名等が含まれます。</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">3. 個人情報の利用目的</h2>
              <p>当社は、収集した個人情報を以下の目的で利用します。</p>
              <ul className="mt-3 space-y-2 list-disc pl-5">
                <li>お問い合わせへの回答・対応</li>
                <li>サービスの提供・改善</li>
                <li>新サービスや更新情報のお知らせ</li>
                <li>契約・請求に関する業務</li>
                <li>利用状況の分析・統計</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">4. 個人情報の第三者提供</h2>
              <p>当社は、法令に基づく場合を除き、お客様の同意なく個人情報を第三者に提供することはありません。</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">5. 個人情報の安全管理</h2>
              <p>当社は、個人情報の漏洩、滅失又はき損を防止するため、適切なセキュリティ対策を講じます。</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">6. Cookieの使用</h2>
              <p>当サイトでは、利用状況の分析・サービス改善のためにCookieを使用する場合があります。ブラウザの設定でCookieを無効にすることが可能ですが、一部のサービスが正常に機能しなくなる場合があります。</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">7. 個人情報の開示・訂正・削除</h2>
              <p>お客様は、ご自身の個人情報の開示・訂正・削除を求めることができます。ご希望の場合は下記のお問い合わせ先までご連絡ください。</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">8. プライバシーポリシーの変更</h2>
              <p>当社は、必要に応じて本ポリシーを変更することがあります。変更後のポリシーは、当サイトに掲載した時点で効力を生じるものとします。</p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-primary mb-4">9. お問い合わせ</h2>
              <p>個人情報の取り扱いに関するお問い合わせは、下記までご連絡ください。</p>
              <p className="mt-3">
                <strong className="text-primary">Paradigm合同会社</strong><br />
                メール: contact@paradigmjp.com
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
