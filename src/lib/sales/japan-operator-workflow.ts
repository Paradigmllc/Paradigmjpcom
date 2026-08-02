export const JAPAN_OPERATOR_STAGES = [
  "prospect_intake",
  "evidence_verified",
  "memo_ready",
  "human_approved",
  "permission_sent",
  "replied",
  "qualification",
  "validation_sow",
  "paid_validation",
  "launch_sow",
  "operator_contract",
  "active_operator",
] as const

export type JapanOperatorStage = (typeof JAPAN_OPERATOR_STAGES)[number]

export const JAPAN_OPERATOR_CASE_STATUSES = [
  "active",
  "on_hold",
  "won",
  "lost",
  "disqualified",
] as const

export type JapanOperatorCaseStatus = (typeof JAPAN_OPERATOR_CASE_STATUSES)[number]

export const JAPAN_OPERATOR_OFFER_CODES = [
  "standard_operator_v1",
  "country_partner_setup_v1",
  "custom_approved_v1",
] as const

export type JapanOperatorOfferCode = (typeof JAPAN_OPERATOR_OFFER_CODES)[number]
export type JapanOperatorGateData = Partial<Record<JapanOperatorStage, Record<string, boolean>>>

export interface JapanOperatorStageDefinition {
  stage: JapanOperatorStage
  label: string
  owner: string
  slaBusinessDays: number | null
  purpose: string
  requiredChecks: ReadonlyArray<{ id: string; label: string }>
}

export const JAPAN_OPERATOR_STAGE_DEFINITIONS: ReadonlyArray<JapanOperatorStageDefinition> = [
  {
    stage: "prospect_intake",
    label: "候補受付",
    owner: "Research",
    slaBusinessDays: 1,
    purpose: "候補を登録し、日本向け運用案件として調査するかを決める。",
    requiredChecks: [],
  },
  {
    stage: "evidence_verified",
    label: "根拠確認済み",
    owner: "Research",
    slaBusinessDays: 2,
    purpose: "日本進出意向、連絡経路、商品範囲、既存代理店の有無を再確認する。",
    requiredChecks: [
      { id: "intent_source_current", label: "日本進出・代理店募集の一次根拠が現行である" },
      { id: "contact_route_verified", label: "正規の連絡経路と送信可否を確認した" },
      { id: "incumbent_partner_checked", label: "既存の日本独占パートナーが見当たらない" },
      { id: "product_scope_identified", label: "対象SKU・商品カテゴリを特定した" },
    ],
  },
  {
    stage: "memo_ready",
    label: "メモ完成",
    owner: "Strategy",
    slaBusinessDays: 3,
    purpose: "3ページのJapan Opportunity Memoを意思決定に使える品質へ仕上げる。",
    requiredChecks: [
      { id: "opportunity_thesis", label: "日本での機会仮説を一文で説明できる" },
      { id: "comparator_sources", label: "価格・競合・代替品に根拠URLがある" },
      { id: "channel_hypothesis", label: "優先チャネルと選定理由を記載した" },
      { id: "landed_cost_model", label: "着地原価・価格・粗利の仮説を明示した" },
      { id: "regulatory_screen", label: "規制・表示・輸入者リスクを一次判定した" },
      { id: "ninety_day_plan", label: "90日計画、Go/Revise/Stop条件を記載した" },
    ],
  },
  {
    stage: "human_approved",
    label: "人間承認済み",
    owner: "Commercial lead",
    slaBusinessDays: 1,
    purpose: "外部提示前に事実、推計、表現、安全性を人が承認する。",
    requiredChecks: [
      { id: "factual_claims_reviewed", label: "企業固有の事実と出典を確認した" },
      { id: "financial_assumptions_labeled", label: "推計値を実績と誤認させない表記にした" },
      { id: "legal_disclaimer_present", label: "規制一次判定が法的助言ではないと明示した" },
      { id: "send_copy_approved", label: "件名・本文・宛先を承認した" },
    ],
  },
  {
    stage: "permission_sent",
    label: "送付許可を打診済み",
    owner: "Sales operator",
    slaBusinessDays: 5,
    purpose: "メモ送付の許可だけを求め、外部送信履歴を残す。",
    requiredChecks: [
      { id: "delivery_route_verified", label: "本人性のある宛先・フォームを再確認した" },
      { id: "suppression_check", label: "配信停止・営業禁止・重複送信を確認した" },
      { id: "sent_logged", label: "人が実行した送信日時と経路をCRMへ記録した" },
    ],
  },
  {
    stage: "replied",
    label: "返信あり",
    owner: "Sales operator",
    slaBusinessDays: 1,
    purpose: "返信内容とメモ送付許可を記録し、次の一手を決める。",
    requiredChecks: [
      { id: "reply_logged", label: "返信原文・日時・温度感を記録した" },
      { id: "permission_to_send_memo", label: "メモ送付または商談継続の許可を得た" },
    ],
  },
  {
    stage: "qualification",
    label: "適格性確認済み",
    owner: "Commercial lead",
    slaBusinessDays: 3,
    purpose: "30分商談で予算、権利、在庫、規制、意思決定能力を確認する。",
    requiredChecks: [
      { id: "annual_revenue_confirmed", label: "売上規模または事業継続性を確認した" },
      { id: "gross_margin_confirmed", label: "商品別の粗利余力を確認した" },
      { id: "inventory_capacity_confirmed", label: "初回在庫と補充リードタイムを確認した" },
      { id: "monthly_media_budget_confirmed", label: "日本向け販促予算を確認した" },
      { id: "decision_authority_confirmed", label: "契約・価格・在庫の決裁者を確認した" },
      { id: "japan_rights_confirmed", label: "日本で付与可能なSKU・チャネル権利を確認した" },
      { id: "regulatory_history_confirmed", label: "事故、リコール、認証、クレーム履歴を確認した" },
    ],
  },
  {
    stage: "validation_sow",
    label: "検証SOW提示",
    owner: "Commercial lead",
    slaBusinessDays: 3,
    purpose: "$5,000 Paid Market Validationの契約範囲を固定する。",
    requiredChecks: [
      { id: "msa_attached", label: "MSAまたは基本条件を添付した" },
      { id: "validation_scope_locked", label: "検証成果物と対象SKUを固定した" },
      { id: "exclusions_locked", label: "第三者費用と対象外作業を明記した" },
      { id: "client_dependencies_locked", label: "必要データ・回答期限・承認者を明記した" },
      { id: "acceptance_criteria_locked", label: "Go/Revise/Stopの受入条件を明記した" },
      { id: "docuseal_submission_created", label: "Docuseal提出IDを契約SSOTへ記録した" },
    ],
  },
  {
    stage: "paid_validation",
    label: "有料検証開始",
    owner: "Delivery lead",
    slaBusinessDays: 10,
    purpose: "署名・入金・入力資料の確認後に検証を開始する。",
    requiredChecks: [
      { id: "signed_event_verified", label: "Docuseal署名イベントを確認した" },
      { id: "invoice_paid", label: "入金消込を確認した" },
      { id: "kickoff_inputs_received", label: "検証に必要な原価・販売・商品資料を受領した" },
    ],
  },
  {
    stage: "launch_sow",
    label: "ローンチSOW提示",
    owner: "Delivery lead",
    slaBusinessDays: 5,
    purpose: "$20,000 total Japan Launchへ進む条件と責任分界を固定する。",
    requiredChecks: [
      { id: "validation_decision_go", label: "検証結果がGoで、根拠と未解決リスクを承認した" },
      { id: "sku_channel_scope_locked", label: "対象SKU・販売チャネル・地域を固定した" },
      { id: "importer_of_record_allocated", label: "輸入者・販売者・納税主体を割り当てた" },
      { id: "insurance_recall_allocated", label: "保険、事故報告、リコール費用の責任を割り当てた" },
      { id: "inventory_and_media_committed", label: "在庫、広告費、承認SLAをブランドが確約した" },
      { id: "launch_acceptance_locked", label: "ローンチ成果物と受入基準を固定した" },
    ],
  },
  {
    stage: "operator_contract",
    label: "運営契約締結",
    owner: "Commercial + Finance",
    slaBusinessDays: 5,
    purpose: "月額、売上分配、監査、独占、解除条件を契約へ落とす。",
    requiredChecks: [
      { id: "launch_sow_signed", label: "ローンチSOWの署名を確認した" },
      { id: "net_collected_sales_defined", label: "Net Collected Japan Salesの控除項目を定義した" },
      { id: "revenue_share_audit_rights", label: "月次明細・証憑・監査権を定義した" },
      { id: "exclusivity_kpis_locked", label: "独占対象SKU・チャネルと四半期KPIを定義した" },
      { id: "cure_and_selloff_locked", label: "是正期間、非独占化、在庫売切り、移管を定義した" },
      { id: "operator_contract_signed", label: "運営契約・必要な追加条項の署名を確認した" },
    ],
  },
  {
    stage: "active_operator",
    label: "運営中",
    owner: "Japan operator",
    slaBusinessDays: null,
    purpose: "週次運営、月次精算、四半期KPI判定を継続する。",
    requiredChecks: [
      { id: "kickoff_complete", label: "運営キックオフと権限移管を完了した" },
      { id: "weekly_reporting_owner", label: "週次レポートの作成者・承認者を決めた" },
      { id: "customer_support_sla", label: "日本語CSの受付時間・一次応答・エスカレーションを決めた" },
      { id: "monthly_finance_reconciliation", label: "月次売上・控除・請求の締め日を決めた" },
      { id: "quarterly_kpi_review", label: "独占継続を判断する四半期会議を設定した" },
    ],
  },
]

export const STANDARD_OPERATOR_TERMS = {
  validationFeeUsd: 5_000,
  launchTotalUsd: 20_000,
  validationCreditDays: 30,
  monthlyRetainerUsd: 2_500,
  revenueShareRate: 0.1,
} as const

export function isJapanOperatorStage(value: unknown): value is JapanOperatorStage {
  return typeof value === "string" && JAPAN_OPERATOR_STAGES.includes(value as JapanOperatorStage)
}

export function isJapanOperatorCaseStatus(value: unknown): value is JapanOperatorCaseStatus {
  return typeof value === "string" && JAPAN_OPERATOR_CASE_STATUSES.includes(value as JapanOperatorCaseStatus)
}

export function isJapanOperatorOfferCode(value: unknown): value is JapanOperatorOfferCode {
  return typeof value === "string" && JAPAN_OPERATOR_OFFER_CODES.includes(value as JapanOperatorOfferCode)
}

export function getJapanOperatorStageDefinition(stage: JapanOperatorStage): JapanOperatorStageDefinition {
  const definition = JAPAN_OPERATOR_STAGE_DEFINITIONS.find((item) => item.stage === stage)
  if (!definition) throw new Error(`Unknown Japan operator stage: ${stage}`)
  return definition
}

export function getNextJapanOperatorStage(stage: JapanOperatorStage): JapanOperatorStage | null {
  const index = JAPAN_OPERATOR_STAGES.indexOf(stage)
  return index >= 0 && index < JAPAN_OPERATOR_STAGES.length - 1
    ? JAPAN_OPERATOR_STAGES[index + 1] ?? null
    : null
}

export function getMissingJapanOperatorChecks(
  stage: JapanOperatorStage,
  gateData: JapanOperatorGateData,
): Array<{ id: string; label: string }> {
  const values = gateData[stage] ?? {}
  return getJapanOperatorStageDefinition(stage).requiredChecks.filter((check) => values[check.id] !== true)
}

export function canAdvanceJapanOperatorCase(
  currentStage: JapanOperatorStage,
  gateData: JapanOperatorGateData,
): { ok: true; nextStage: JapanOperatorStage } | { ok: false; reason: string; missing: Array<{ id: string; label: string }> } {
  const nextStage = getNextJapanOperatorStage(currentStage)
  if (!nextStage) return { ok: false, reason: "既に最終ステージです", missing: [] }
  const missing = getMissingJapanOperatorChecks(nextStage, gateData)
  if (missing.length > 0) return { ok: false, reason: "次ステージの入場条件が未完了です", missing }
  return { ok: true, nextStage }
}

export interface RevenueShareInputsMinor {
  grossCollected: number
  consumptionTax: number
  refunds: number
  chargebacks: number
  discounts: number
  sellerPaidDuties: number
  marketplaceAndPaymentFees: number
}

export function calculateJapanOperatorRevenueShare(inputs: RevenueShareInputsMinor): {
  netCollectedJapanSales: number
  revenueShare: number
} {
  for (const [name, value] of Object.entries(inputs)) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer in minor units`)
  }
  const deductions = inputs.consumptionTax + inputs.refunds + inputs.chargebacks + inputs.discounts
    + inputs.sellerPaidDuties + inputs.marketplaceAndPaymentFees
  const netCollectedJapanSales = Math.max(0, inputs.grossCollected - deductions)
  return {
    netCollectedJapanSales,
    revenueShare: Math.round(netCollectedJapanSales * STANDARD_OPERATOR_TERMS.revenueShareRate),
  }
}
