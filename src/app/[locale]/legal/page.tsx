/**
 * /[locale]/legal — 特定商取引法に基づく表記 (法定情報・9 条)
 *
 * 役割:   特定商取引法に基づく表記 (法定情報・9 条)
 * 入力:   params.locale
 * 出力:   PageHero + 9 sections (会社名・所在地・代表・連絡先・販売価格・支払方法・引渡時期・返品・申込有効期限)
 *
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import PageHero from "@/components/PageHero"
import FadeIn from "@/components/aesop/FadeIn"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isJa = locale === "ja"
  return {
    title: isJa ? "特定商取引法に基づく表記" : "Specified Commercial Transactions Act notice",
    description: isJa ? "Paradigm合同会社の特定商取引法に基づく表記。" : "Paradigm LLC commercial transactions disclosure (Japan SCT Act).",
  }
}

const ROWS_JA: ReadonlyArray<readonly [string, string]> = [
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

const ROWS_EN: ReadonlyArray<readonly [string, string]> = [
  ["Vendor", "Paradigm LLC"],
  ["Representative", "Managing Member"],
  ["Address", "Disclosed promptly on request"],
  ["Phone", "Disclosed promptly on request"],
  ["Email", "contact@paradigmjp.com"],
  ["URL", "https://paradigmjp.com"],
  ["Pricing", "As listed on each service page (excl. tax)"],
  ["Payment", "Bank transfer (invoice-based)"],
  ["Payment timing", "Net 30 (invoice issued, paid by end of next month)"],
  ["Service start", "On contract signing, per mutually agreed schedule"],
  ["Returns / cancellations", "Due to the service nature, no refunds after start. Thorough scoping before signing."],
  ["Termination", "Web dev: ends on delivery. MEO/SEO: 6-month minimum, no early-termination fee (ends end of month)."],
  ["Extra fees", "Any out-of-scope work requires prior approval before execution."],
]

export default async function LegalPage({ params }: Props) {
  const { locale } = await params
  const isJa = locale === "ja"
  const ROWS = isJa ? ROWS_JA : ROWS_EN
  return (
    <>
      <PageHero badge="Legal" title={isJa ? "特定商取引法に基づく表記" : "Specified Commercial Transactions Act notice"} />
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <FadeIn className="relative z-10 max-w-3xl mx-auto px-6 md:px-8">
          <div className="paradigm-glass rounded-2xl overflow-hidden border border-paradigm-line paradigm-glow-md">
            <dl>
              {ROWS.map(([label, value], i) => (
                <div key={label} className={`grid grid-cols-1 md:grid-cols-[200px_1fr] py-4 px-5 ${i < ROWS.length - 1 ? "border-b border-paradigm-line/60" : ""}`}>
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
