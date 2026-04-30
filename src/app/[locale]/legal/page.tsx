import type { Metadata } from "next"
import PageHero from "@/components/PageHero"

/**
 * /[locale]/legal — 特定商取引法 disclosure (Aesop voice).
 *
 * P18-D-3 rewrite. 12-row dl table with hairline-only chrome and
 * paradigm-eyebrow for labels. PageHero handles the headline.
 *
 * AE-PHP-1: 60 lines.
 */

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
  description: "Paradigm合同会社の特定商取引法に基づく表記。",
}

const ROWS: ReadonlyArray<readonly [string, string]> = [
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
]

export default function LegalPage() {
  return (
    <>
      <PageHero
        badge="Legal"
        title="特定商取引法に基づく表記"
      />
      <section className="bg-paradigm-paper paradigm-section">
        <div className="max-w-3xl mx-auto px-6 md:px-12">
          <dl className="border-t border-paradigm-line">
            {ROWS.map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-1 md:grid-cols-[220px_1fr] border-b border-paradigm-line py-5"
              >
                <dt className="paradigm-eyebrow text-paradigm-ink-soft md:pt-0.5">
                  {label}
                </dt>
                <dd className="text-[14px] md:text-[15px] text-paradigm-ink leading-[1.85] mt-2 md:mt-0">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  )
}
