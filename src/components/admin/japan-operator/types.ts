import {
  isJapanOperatorStage,
  type JapanOperatorGateData,
  type JapanOperatorStage,
} from "@/lib/sales/japan-operator-workflow"

export type JsonRecord = Record<string, unknown>

export interface CompanySummary {
  id: string
  company_name: string
  domain: string
}

export interface OperatorCase {
  id: string
  company_id: string
  engagement_no: number
  offer_code: string
  offer_version: string
  offer_snapshot: JsonRecord
  stage: JapanOperatorStage
  status: string
  owner: string | null
  reviewer: string | null
  next_action: string | null
  next_action_due_at: string | null
  gate_data: JapanOperatorGateData
  blocker_codes: string[]
  stage_entered_at: string
  revision: number
  updated_at: string
  company: CompanySummary
}

export interface OperatorEvent {
  id: string
  case_id: string
  action: string
  from_stage: string | null
  to_stage: string | null
  actor: string
  actor_role: string | null
  note: string
  created_at: string
}

export interface OperatorPrincipal {
  key: string
  email: string | null
  role: string
  authSource: string
}

export function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function gateData(value: unknown): JapanOperatorGateData {
  return Object.fromEntries(Object.entries(record(value)).flatMap(([stage, checks]) => {
    if (!isJapanOperatorStage(stage)) return []
    return [[stage, Object.fromEntries(Object.entries(record(checks)).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"))]]
  }))
}

export function normalizeCase(value: unknown): OperatorCase | null {
  const row = record(value)
  if (!text(row.id) || !isJapanOperatorStage(row.stage)) return null
  const companyRow = record(Array.isArray(row.sales_companies) ? row.sales_companies[0] : row.sales_companies)
  return {
    id: text(row.id), company_id: text(row.company_id), engagement_no: typeof row.engagement_no === "number" ? row.engagement_no : 1,
    offer_code: text(row.offer_code), offer_version: text(row.offer_version), offer_snapshot: record(row.offer_snapshot),
    stage: row.stage, status: text(row.status, "active"), owner: text(row.owner) || null,
    reviewer: text(row.reviewer) || null, next_action: text(row.next_action) || null,
    next_action_due_at: text(row.next_action_due_at) || null, gate_data: gateData(row.gate_data),
    blocker_codes: Array.isArray(row.blocker_codes) ? row.blocker_codes.filter((item): item is string => typeof item === "string") : [],
    stage_entered_at: text(row.stage_entered_at), revision: typeof row.revision === "number" ? row.revision : 1,
    updated_at: text(row.updated_at), company: { id: text(companyRow.id), company_name: text(companyRow.company_name, "名称未取得"), domain: text(companyRow.domain, "—") },
  }
}

export function normalizeEvent(value: unknown): OperatorEvent | null {
  const row = record(value)
  if (!text(row.id)) return null
  return {
    id: text(row.id), case_id: text(row.case_id), action: text(row.action), from_stage: text(row.from_stage) || null,
    to_stage: text(row.to_stage) || null, actor: text(row.actor), actor_role: text(row.actor_role) || null,
    note: text(row.note), created_at: text(row.created_at),
  }
}
