import type { OpportunityFinding } from "@/lib/sales/opportunity-brief";

const FIXES: Record<string, { en: string; ja: string }> = {
  "japanese-language": {
    en: "Rebuild the acquisition and checkout path in natural Japanese",
    ja: "自然な日本語で集客から購入までの導線を再設計",
  },
  "jpy-pricing": {
    en: "Introduce transparent JPY pricing and tax presentation",
    ja: "日本円価格と税表示を明確化",
  },
  "local-payments": {
    en: "Add locally familiar payment methods and reassurance",
    ja: "日本で馴染みのある決済と安心材料を追加",
  },
  "japan-shipping": {
    en: "Make Japan delivery scope, time and returns explicit",
    ja: "日本配送の対象・日数・返品条件を明文化",
  },
  "commerce-disclosure": {
    en: "Prepare the required commerce disclosure and seller details",
    ja: "特商法表記と販売者情報を整備",
  },
  privacy: {
    en: "Localize privacy handling and APPI-facing explanations",
    ja: "個人情報の取扱いとAPPI向け説明を日本向けに整備",
  },
};

export function OpportunityActionPlan({
  findings,
  locale,
}: {
  findings: OpportunityFinding[];
  locale: string;
}) {
  const isJa = locale === "ja";
  const gaps = findings.filter((finding) => finding.status === "gap");
  const priorities = (
    gaps.length > 0
      ? gaps
      : findings.filter((finding) => finding.status === "unknown")
  ).slice(0, 3);
  const buildItems = priorities.map(
    (finding) => FIXES[finding.id]?.[isJa ? "ja" : "en"] ?? finding.title,
  );

  return (
    <section
      className="bg-zinc-950 px-5 py-16 text-white print:break-before-page"
      aria-labelledby="plan-title"
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">
          Recommended path
        </p>
        <h2
          id="plan-title"
          className="mt-3 text-3xl font-semibold tracking-tight"
        >
          {isJa
            ? "証拠から逆算した最初の21営業日"
            : "The first 21 business days, prioritized by evidence"}
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <PlanStep
            number="01"
            eyebrow={isJa ? "Day 1–3" : "Days 1–3"}
            title={isJa ? "事業前提を確定" : "Validate unit economics"}
            items={[
              isJa
                ? "実測の国別アクセスを接続"
                : "Connect first-party country traffic",
              isJa
                ? "単価・CVR・粗利を置換"
                : "Replace AOV, conversion and margin",
              isJa ? "競合比較対象を承認" : "Approve the competitor set",
            ]}
          />
          <PlanStep
            number="02"
            eyebrow={isJa ? "Day 4–14" : "Days 4–14"}
            title={isJa ? "離脱要因を実装で解消" : "Remove conversion friction"}
            items={
              buildItems.length > 0
                ? buildItems
                : [
                    isJa
                      ? "日本語・価格・決済・信頼導線を統合"
                      : "Unify language, pricing, payment and trust",
                  ]
            }
          />
          <PlanStep
            number="03"
            eyebrow={isJa ? "Day 15–21" : "Days 15–21"}
            title={
              isJa ? "計測可能な検証を開始" : "Launch measurable validation"
            }
            items={[
              isJa
                ? "日本向け獲得ページを公開"
                : "Publish the Japan acquisition path",
              isJa
                ? "イベント・CV計測を確認"
                : "Verify event and conversion tracking",
              isJa
                ? "3か月の判断基準を固定"
                : "Lock 90-day decision thresholds",
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function PlanStep({
  number,
  eyebrow,
  title,
  items,
}: {
  number: string;
  eyebrow: string;
  title: string;
  items: string[];
}) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center justify-between">
        <span className="text-2xl font-semibold text-red-300">{number}</span>
        <span className="text-xs text-zinc-500">{eyebrow}</span>
      </div>
      <h3 className="mt-5 font-semibold">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-400">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-red-300">→</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
