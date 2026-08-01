export const MANUAL_OUTREACH_PLAYBOOKS = [
  "saas_ai_devtools",
  "web3_blockchain",
  "cyber_b2b_infrastructure",
  "education_membership",
  "research_data_media",
  "creator_tools",
  "gaming_tools",
  "premium_hobby_ecommerce",
  "hospitality_saas",
  "marketplace_platform",
  "general_online_smb",
] as const

export type ManualOutreachPlaybook = (typeof MANUAL_OUTREACH_PLAYBOOKS)[number]

export const MANUAL_OUTREACH_PLAYBOOK_LABELS: Record<ManualOutreachPlaybook, string> = {
  saas_ai_devtools: "SaaS・AI・DevTools",
  web3_blockchain: "Web3・Blockchain",
  cyber_b2b_infrastructure: "Cybersecurity・Privacy・B2Bインフラ",
  education_membership: "オンライン教育・講座・会員サービス",
  research_data_media: "データベース・リサーチ・有料メディア",
  creator_tools: "Creator・動画・音声・デザインツール",
  gaming_tools: "Gaming・ゲーム開発ツール",
  premium_hobby_ecommerce: "高級ホビー・専門EC",
  hospitality_saas: "ホテル・旅行・Hospitality SaaS",
  marketplace_platform: "マーケットプレイス・予約・仲介",
  general_online_smb: "その他のオンライン完結型SMB",
}

export const MANUAL_OUTREACH_PLAYBOOK_RULES: Record<ManualOutreachPlaybook, string> = {
  saas_ai_devtools: "Use only supplied language, documentation, onboarding, evaluation, or JPY-path observations.",
  web3_blockchain: "Use only supplied developer documentation, onboarding, trust, or conditionally worded regulatory-readiness observations.",
  cyber_b2b_infrastructure: "Use only supplied security overview, architecture, technical evaluation, procurement-documentation, onboarding, language, or trust observations.",
  education_membership: "Use only supplied course or membership explanation, preview, proof, language, JPY, purchase, or onboarding observations.",
  research_data_media: "Use only supplied coverage explanation, sample, use-case, language, JPY, invoice, purchase, or buyer-FAQ observations.",
  creator_tools: "Use only supplied tutorial, onboarding, example, template, use-case, language, JPY, or purchase observations.",
  gaming_tools: "Use only supplied product overview, tutorial, developer example, use-case, community, language, JPY, or onboarding observations.",
  premium_hobby_ecommerce: "Use only supplied product story, technical specification, dimensions, delivery, duties, returns, warranty, JPY, payment, or disclosure observations.",
  hospitality_saas: "Use only supplied operational use-case, workflow, integration, implementation, onboarding, support, language, or JPY-path observations.",
  marketplace_platform: "Use only supplied supplier onboarding, identity, trust, payment, cancellation, refund, support, language, or JPY-path observations.",
  general_online_smb: "Use only supplied public-page customer-path observations that match the classified business model.",
}

export interface ManualPositioningConcept {
  sourcePhrase: string
  japaneseHeadline: string
  japaneseSupportLine: string
}

const PLACEHOLDER = /(?:\[[^\]]+\]|\{\{[^}]+\}\}|<[^>]+>|\b(?:TBD|PLACEHOLDER|COMPANY_NAME)\b)/i
const UNSUPPORTED_PROMOTION = /(?:必ず|確実|保証|業界初|世界一|日本一|圧倒的|売上.{0,8}(?:増|向上)|コンバージョン.{0,8}(?:増|向上))/

export function groundManualPositioningConcept(
  concept: ManualPositioningConcept | null,
  productContext: string,
): ManualPositioningConcept | null {
  if (!concept) return null
  const sourcePhrase = concept.sourcePhrase.trim()
  const headline = concept.japaneseHeadline.trim()
  const supportLine = concept.japaneseSupportLine.trim()
  if (
    sourcePhrase.length < 3
    || !productContext.toLocaleLowerCase("en-US").includes(sourcePhrase.toLocaleLowerCase("en-US"))
    || headline.length < 4
    || headline.length > 60
    || supportLine.length < 8
    || supportLine.length > 140
    || PLACEHOLDER.test(`${headline} ${supportLine}`)
    || UNSUPPORTED_PROMOTION.test(`${headline} ${supportLine}`)
  ) return null
  return { sourcePhrase, japaneseHeadline: headline, japaneseSupportLine: supportLine }
}
