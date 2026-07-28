import { Check } from "lucide-react";
import Link from "next/link";

const PACKAGE_ITEMS = {
  en: [
    "Market and offer framing",
    "Japan-facing LP / HP localization",
    "Social Media launch setup for up to two priority channels",
    "Sourced market and competitor report",
    "Trust and regulatory-applicability coordination",
    "Inquiry or eligible payment routing",
    "Launch operations, shared workspace and handover",
  ],
  ja: [
    "市場・オファー整理",
    "日本向けLP / HPローカライズ",
    "優先SNS最大2チャネルの初期設定",
    "根拠付き市場・競合レポート",
    "信頼情報・規制適用可能性の整理",
    "問い合わせ・対象となる決済導線",
    "公開後の運用、共有ワークスペース、引き継ぎ",
  ],
} as const;

interface OpportunityOfferPanelProps {
  callHref: string;
  contactHref: string;
  isJa: boolean;
}

export function OpportunityOfferPanel({
  callHref,
  contactHref,
  isJa,
}: OpportunityOfferPanelProps) {
  const packageItems = isJa ? PACKAGE_ITEMS.ja : PACKAGE_ITEMS.en;

  return (
    <section
      className="bg-zinc-950 px-5 pb-16 text-white"
      aria-labelledby="opportunity-offer-title"
    >
      <div className="mx-auto max-w-6xl rounded-2xl border border-zinc-700 bg-zinc-900/60 p-6 shadow-2xl sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">
              {isJa ? "固定の契約条件" : "Fixed commercial terms"}
            </p>
            <h2
              id="opportunity-offer-title"
              className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              $15,000 {isJa ? "一括前払い" : "paid upfront"}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-300">
              {isJa
                ? "選定した契約先には最初の6か月を追加月額なしで提供。期間終了後の継続条件・月額は個別協議のうえ書面合意。"
                : "The standard Managed Japan Desk fee is $2,000/month. Selected launch partners receive six months included at no additional monthly fee: $2,000/month × 6 months = $12,000 of value; month 7 onward is $2,000/month under the signed terms."}
            </p>

            <div className="mt-6 rounded-xl border border-amber-300/40 bg-amber-300/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
                {isJa ? "期間限定・数組限定" : "Limited launch offer"}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white">
                {isJa
                  ? "6か月の月額無料は、審査を通過した数組だけが対象です。"
                  : "The $2,000/month × 6 months = $12,000 value campaign is available to selected launch partners and confirmed in writing."}
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-300">
                {isJa
                  ? "適用可否は15分面談と契約書面で確定します。フォーム送信だけでは枠は確保されません。"
                  : "Eligibility and availability are confirmed during the 15-minute review and in the signed terms. A form submission alone does not reserve a place."}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold">
              {isJa ? "パッケージに含まれる内容" : "What the package includes"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {isJa
                ? "7つの作業を、日本向けの購入導線と引き継ぎまで一つの実装範囲として提供します。"
                : "Seven connected workstreams delivered as one Japan buyer path with an accountable handover."}
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {packageItems.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-lg border border-zinc-700 bg-zinc-950/60 p-3 text-sm leading-6 text-zinc-200"
                >
                  <Check
                    aria-hidden="true"
                    className="mt-1 size-4 shrink-0 text-red-300"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-zinc-700 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-400">
            {isJa
              ? "次のステップを選択してください。"
              : "Choose the next step that suits your team."}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={callHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white px-5 py-3 text-center text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-100"
            >
              {isJa ? "15分面談を予約" : "Book the 15-minute review"}
            </a>
            <Link
              href={contactHref}
              className="rounded-lg border border-zinc-600 px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:border-zinc-400 hover:bg-zinc-800"
            >
              {isJa ? "申込（フォーム）" : "Apply via the form"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
