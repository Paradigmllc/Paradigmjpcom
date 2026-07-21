import { retrieveChatKnowledge } from "@/lib/chat-knowledge"
import type { ChatLocale } from "@/lib/chat-knowledge"

export type { ChatLocale } from "@/lib/chat-knowledge"

const STALE_ENGLISH_ANSWER =
  /free consult|free audit|¥|198,000|300,000|350,000|200\+ clients|98% retention|founded 20\d{2}|\$(?:1,?300|1,?500|3,?000|5,?000|8,?000)/i

const ALLOWED_DOLLAR_VALUES = new Set([
  "$0",
  "$13K",
  "$13k",
  "$13,000",
  "$13000",
  "$12K",
  "$12k",
  "$12,000",
  "$2,000",
  "$2K",
  "$2k",
])

export function isSafeEnglishCommercialAnswer(answer: string): boolean {
  if (!answer.trim() || STALE_ENGLISH_ANSWER.test(answer)) return false
  if (/cancel(?:led|lation)?\s+anytime/i.test(answer)) return false
  if (
    /\bsubject to separate written terms\b|can be cancelled/i.test(answer) &&
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
  const groundedSource = retrieveChatKnowledge(question, locale, 1)[0]
  if (groundedSource) return groundedSource.content
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
    return "開始日は、書面での範囲確定、入金確認、必要素材・アクセス、承認者の受領後に記録します。開始日から14営業日以内に合意したセットアップを納品できない場合、13,000ドルを全額返金します。顧客側の追加変更や保留は契約上記録して時計を一時停止します。"
  }
  if (
    question.includes("wise") ||
    question.includes("usdc") ||
    question.includes("振込") ||
    question.includes("支払方法") ||
    question.includes("クレジットカード")
  ) {
    return "適合確認後の支払方法はWise、銀行振込、USDC、クレジットカード（Stripe請求書または決済リンク）です。請求書で受取人、手数料、USDCのネットワークとウォレットを確認し、公開フォームには送金情報を入力しません。"
  }
  if (question.includes("返金") || question.includes("保証")) {
    return "納品保証は売上成果ではなく、合意した固定セットアップが対象です。記録した開始日から14営業日以内に納品できない場合、13,000ドルを全額返金します。顧客側の追加変更や保留は書面で記録して時計を一時停止します。"
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
    return "Japan Entry is a fixed $13,000 setup, paid before kickoff. For selected launch partners, the standard $2,000/month managed-operation layer is included for six months at no additional monthly fee: $2,000/month × 6 months = $12,000 of value. Month 7 onward is $2,000/month under the signed terms. Apply: https://paradigmjp.com/en/contact?intent=japan-entry"
  }
  if (
    question.includes("process") ||
    question.includes("step") ||
    question.includes("how does") ||
    question.includes("workflow")
  ) {
    return "We confirm fit and fixed scope, sign and collect the $13,000 setup, receive access/assets, localize the revenue path, connect the Japan operation, verify the buyer journey, and launch. One English-speaking owner stays accountable."
  }
  if (
    question.includes("timeline") ||
    question.includes("how long") ||
    question.includes("delivery time") ||
    question.includes("weeks")
  ) {
    return "The Start Date is recorded after agreement, payment is cleared, required access and complete assets are available, and an empowered approver is assigned. If the agreed setup is not delivered within 14 business days from that Start Date, 100% of the $13,000 setup fee is refunded. Client-requested changes or holds pause the clock under the written terms."
  }
  if (
    question.includes("wise") ||
    question.includes("usdc") ||
    question.includes("bank transfer") ||
    question.includes("credit card") ||
    question.includes("payment method")
  ) {
    return "Payment methods after fit review: Wise, bank transfer, USDC, or credit card through a Stripe invoice or payment link. The invoice confirms recipient, fees, and—if using USDC—the network and wallet. Do not send funds from public-form fields."
  }
  if (question.includes("refund") || question.includes("guarantee")) {
    return "The delivery guarantee covers the agreed fixed setup, not sales or revenue. If Paradigm misses 14 business days from the recorded Start Date, 100% of the $13,000 setup fee is refunded. Client-requested changes or holds pause the clock under the written scope."
  }
  if (
    question.includes("include") ||
    question.includes("scope") ||
    question.includes("deliver") ||
    question.includes("service")
  ) {
    return "Included in the standard setup envelope: Japan Opportunity analysis, a Japanese landing page plus normally eight to ten core pages, payment setup coordination, up to two Social Media channels, launch creative, a Notion or Trello workspace, regulatory-readiness coordination, launch verification, and handover. The signed scope is final; legal, tax, banking, licensing, logistics, advertising, specialist advice, and provider approval remain separate."
  }
  if (
    question.includes("async") ||
    question.includes("notion") ||
    question.includes("trello") ||
    question.includes("loom") ||
    question.includes("meeting") ||
    question.includes("zoom") ||
    question.includes("interpret") ||
    question.includes("translation")
  ) {
    return "Paradigm is async-first: each client gets a private Notion workspace by default (or Trello), with Home, Request Queue, Launch Roadmap, Deliverables, Approvals, Reports, and a Loom archive. You can queue as many Japan-related requests as needed, with one primary request active at a time. New requests are acknowledged within one business day and normally enter active production within two business days; client-side waits pause the clock. Kickoff and decision meetings can use Zoom with translated captions or AI interpretation where available; the written English scope and post-call summary take precedence."
  }
  if (
    question.includes("sow") ||
    question.includes("statement of work") ||
    question.includes("msa") ||
    question.includes("order form") ||
    question.includes("sla") ||
    question.includes("dpa") ||
    question.includes("nda") ||
    question.includes("contract") ||
    question.includes("agreement") ||
    question.includes("acceptance") ||
    question.includes("change request") ||
    question.includes("electronic signature")
  ) {
    return "The public site is an overview, not the contract. Before kickoff, the written record may include master service terms, a Setup SOW, an Order Form and service schedule/SLA, plus a DPA, NDA, or payment addendum when needed. The SOW records the fixed setup deliverables, dependencies, acceptance criteria, exclusions, and change-control path. A material change or new deliverable is a written Change Request. Signed terms and the written post-call summary take precedence over an informal chat message."
  }
  if (
    question.includes("support") ||
    question.includes("maintenance") ||
    question.includes("after") ||
    question.includes("launch")
  ) {
    return "The standard managed-operation fee is $2,000/month. For selected launch partners, six months are included at no additional monthly fee: $2,000/month × 6 months = $12,000 of value. Month 7 onward is $2,000/month under the signed terms. The standard operating envelope is up to four pages or 5,000 words per month, one active creative request at a time, up to two Social Media channels, and a 48-business-hour start commitment for standard requests; exact channels, ownership, and priorities are confirmed in the written scope."
  }
  if (
    question.includes("contact") ||
    question.includes("consult") ||
    question.includes("book") ||
    question.includes("talk")
  ) {
    return "Apply for Japan Entry at https://paradigmjp.com/en/contact?intent=japan-entry. The form confirms decision authority, $13,000 approval timing, and launch timing. Email: info@paradigmjp.com"
  }
  if (
    question.includes("company") ||
    question.includes("paradigm") ||
    question.includes("who are you") ||
    question.includes("about")
  ) {
    return "Paradigm LLC is a Tokyo-based Japan market-entry operator for overseas SMBs. We publish only verified company and commercial information; see https://paradigmjp.com/en/about and /en/legal."
  }
  return "Japan Entry is a fixed $13,000 setup for fast-decision overseas SMBs: Wise, bank transfer, USDC, or credit card payment after fit review. For selected launch partners, the standard $2,000/month managed-operation layer is included for six months at no additional monthly fee: $2,000/month × 6 months = $12,000 of value. Month 7 onward is $2,000/month under the signed terms. If the agreed setup is not delivered within 14 business days from the recorded Start Date, the full setup fee is refunded under the written terms. Ask about scope, timing, or eligibility at https://paradigmjp.com/en/contact?intent=japan-entry"
}
