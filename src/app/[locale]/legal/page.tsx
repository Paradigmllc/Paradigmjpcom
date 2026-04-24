import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
  description: "Paradigm合同会社の特定商取引法に基づく表記。",
}

export default function LegalPage() {
  return (
    <>
      <section className="py-20 px-6 bg-gradient-to-br from-primary to-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">特定商取引法に基づく表記</h1>
        </div>
      </section>

      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <tbody>
                {[
                  ["販売事業者", "Paradigm合同会社"],
                  ["代表者", "代表社員"],
                  ["所在地", "請求があった場合、遅滞なく開示いたします"],
                  ["電話番号", "請求があった場合、遅滞なく開示いたします"],
                  ["メールアドレス", "contact@paradigmjp.com"],
                  ["URL", "https://paradigmjp.com"],
                  ["販売価格", "各サービスページに記載の料金（税別）"],
                  ["支払方法", "銀行振込（請求書払い）"],
                  ["支払時期", "請求書発行後、月末締め翌月末払い"],
                  ["サービス提供時期", "契約締結後、双方合意のスケジュールに従い提供開始"],
                  ["返品・キャンセル", "サービスの性質上、提供開始後の返品・返金はいたしかねます。契約前に十分なヒアリングを実施し、合意の上で着手いたします。"],
                  ["解約条件", "Web制作: 納品完了をもって契約終了。MEO/SEO: 最低契約期間6ヶ月、途中解約の違約金なし（当月末で終了）。"],
                  ["追加費用", "お見積り金額以外の追加費用が発生する場合は、事前にお客様の承認を得た上で実施します。"],
                ].map(([label, value], i) => (
                  <tr key={label} className={`${i % 2 === 0 ? "bg-gray-50" : "bg-white"} border-b border-gray-100 last:border-0`}>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-primary w-1/3 align-top">{label}</th>
                    <td className="py-4 px-6 text-sm text-text-muted leading-relaxed">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  )
}
