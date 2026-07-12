export type ChatLocale = "ja" | "en"

const STALE_ENGLISH_ANSWER =
  /free consult|free audit|¥|198,000|300,000|350,000|200\+ clients|98% retention|founded 20\d{2}|\$(?:1,?300|1,?500|2,?000|3,?000|5,?000|8,?000)/i

const ALLOWED_DOLLAR_VALUES = new Set([
  "$0",
  "$995",
  "$12K",
  "$12k",
  "$12,000",
  "$12000",
])

export function isSafeEnglishCommercialAnswer(answer: string): boolean {
  if (!answer.trim() || STALE_ENGLISH_ANSWER.test(answer)) return false
  if (/cancel(?:led|lation)?\s+anytime/i.test(answer)) return false
  if (
    /\bcancellable\b|can be cancelled/i.test(answer) &&
    !/signed terms/i.test(answer)
  ) {
    return false
  }

  const dollarValues = answer.match(/\$(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?[Kk]?/g) ?? []
  return dollarValues.every((value) => ALLOWED_DOLLAR_VALUES.has(value))
}

export function getFallbackAnswer(
  question: string,
  locale: ChatLocale,
): string {
  const normalizedQuestion = question.toLowerCase()
  if (locale === "en") return getFallbackAnswerEn(normalizedQuestion)
  return getFallbackAnswerJa(normalizedQuestion)
}

function getFallbackAnswerJa(question: string): string {
  if (
    question.includes("見積") ||
    question.includes("料金") ||
    question.includes("費用") ||
    question.includes("価格") ||
    question.includes("いくら")
  ) {
    return "国内向けサービスの最新料金は https://paradigmjp.com/ja/pricing に掲載しています。対応範囲・支払時期・追加費用は、着手前の見積書と契約書で明確にします。"
  }
  if (
    question.includes("流れ") ||
    question.includes("プロセス") ||
    question.includes("ステップ") ||
    question.includes("手順")
  ) {
    return "お問い合わせ後、要件確認 → 固定範囲と見積りの書面提示 → 契約・入金 → 制作 → 検証 → 公開の順で進みます。個別条件は着手前に書面で確認します。"
  }
  if (
    question.includes("納期") ||
    question.includes("期間") ||
    question.includes("どのくらい")
  ) {
    return "納期は対象サービス、必要素材、確認回数により変わります。契約前に固定範囲と提供予定日を書面で提示します。"
  }
  return "ご質問ありがとうございます。公開情報にない実績・価格・保証は推測せず、契約前に書面で確認します。お問い合わせ: https://paradigmjp.com/ja/contact ／ info@paradigmjp.com"
}

function getFallbackAnswerEn(question: string): string {
  if (
    question.includes("price") ||
    question.includes("cost") ||
    question.includes("quote") ||
    question.includes("how much") ||
    question.includes("pricing")
  ) {
    return "Japan Entry is a fixed $12,000 setup, paid before kickoff. Managed operation is $0/month for the first six months, then $995/month from month seven. Future-period cancellation follows the signed terms. Apply: https://paradigmjp.com/en/contact?intent=japan-entry"
  }
  if (
    question.includes("process") ||
    question.includes("step") ||
    question.includes("how does") ||
    question.includes("workflow")
  ) {
    return "We confirm fit and fixed scope, sign and collect the $12,000 setup, receive access/assets, localize the revenue path, connect the Japan operation, verify the buyer journey, and launch. One English-speaking owner stays accountable."
  }
  if (
    question.includes("timeline") ||
    question.includes("how long") ||
    question.includes("delivery time") ||
    question.includes("weeks")
  ) {
    return "The launch target is 21 business days after agreement, payment, required access, and assets are complete. Client or specialist-review delays move the target; the fixed written scope records dependencies before payment."
  }
  if (
    question.includes("include") ||
    question.includes("scope") ||
    question.includes("deliver") ||
    question.includes("service")
  ) {
    return "Included: localized revenue site and conversion path, buyer-facing trust/compliance coordination, eligible payment or inquiry routing, Japanese AI-assisted support setup, analytics, notifications, launch verification, and handover."
  }
  if (
    question.includes("support") ||
    question.includes("maintenance") ||
    question.includes("after") ||
    question.includes("launch")
  ) {
    return "Six months of managed Japan operation are included at $0/month. From month seven it is $995/month; future-period cancellation follows the signed terms. Exact support channels, ownership, and response expectations are confirmed in the written scope."
  }
  if (
    question.includes("contact") ||
    question.includes("consult") ||
    question.includes("book") ||
    question.includes("talk")
  ) {
    return "Apply for Japan Entry at https://paradigmjp.com/en/contact?intent=japan-entry. The form confirms decision authority, $12,000 approval timing, and launch timing. Email: info@paradigmjp.com"
  }
  if (
    question.includes("company") ||
    question.includes("paradigm") ||
    question.includes("who are you") ||
    question.includes("about")
  ) {
    return "Paradigm LLC is a Tokyo-based Japan market-entry operator for overseas SMBs. We publish only verified company and commercial information; see https://paradigmjp.com/en/about and /en/legal."
  }
  return "Japan Entry is a fixed $12,000 setup for fast-decision overseas SMBs: 14-business-day launch target after prerequisites, six months at $0/month, then $995/month; future-period cancellation follows the signed terms. Ask about scope, timing, eligibility, or apply at https://paradigmjp.com/en/contact?intent=japan-entry"
}
