import type { Metadata } from "next"
import PageHero from "@/components/PageHero"
import FadeIn from "@/components/aesop/FadeIn"

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
  description: "Paradigm合同会社の特定商取引法に基づく表記。",
}

const ROWS: ReadonlyArray<readonly [string, string]> = [
  ["販売事業者", "Paradigm 合同会社"],
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
  ["解約条件", "Web 制作: 納品完了をもって契約終了。MEO/SEO: 最低契約期間 6 ヶ月、途中解約の違約金なし（当月末で終了）。"],
  ["追加費用", "お見積り金額以外の追加費用が発生する場合は、事前にお客様の承認を得た上で実施します。"],
]

export default function LegalPage() {
  return (
    <>
      <PageHero badge="Legal" title="特定商取引法に基づく表記" />
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <FadeIn className="relative z-10 max-w-3xl mx-auto px-6 md:px-8">
          <div className="paradigm-glass rounded-2xl overflow-hidden border border-paradigm-line paradigm-glow-md">
            <dl>
              {ROWS.map(([label, value], i) => (
                <div
                  key={label}
                  className={`grid grid-cols-1 md:grid-cols-[200px_1fr] py-4 px-5 ${i < ROWS.length - 1 ? "border-b border-paradigm-line/60" : ""}`}
                >
                  <dt className="paradigm-eyebrow text-paradigm-accent md:pt-0.5">{label}</dt>
                  <dd className="text-[13px] md:text-[14px] text-paradigm-ink leading-[1.75] mt-1.5 md:mt-0">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </FadeIn>
      </section>
    </>
  )
}
