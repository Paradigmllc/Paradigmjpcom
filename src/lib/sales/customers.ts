/**
 * lib/sales/customers.ts — sales_customers CRUD (Sprint 8)
 *
 * 役割: 成約後の顧客管理。Notion 主管・双方向同期。
 *       WL 戦略 (is_white_label) を初日から対応。
 */

import { getServiceSupabase } from "@/lib/supabase"
import type {
  SalesCustomer,
  ContractStatus,
  HealthLevel,
  ContractProduct,
} from "./types"

export interface CreateCustomerInput {
  company_id?: string | null
  customer_name: string
  contract_products: ContractProduct[]
  monthly_amount: number
  contract_start?: string | null
  next_invoice_date?: string | null
  contract_status?: ContractStatus
  health?: HealthLevel
  is_white_label?: boolean
  wl_client_count?: number
  assigned_to?: string | null
}

/** 新規顧客を作成 (companies.deal_stage='成約' から派生) */
export async function createCustomer(
  input: CreateCustomerInput,
): Promise<{ ok: boolean; customer?: SalesCustomer; error?: string }> {
  const sb = getServiceSupabase()
  if (!sb) return { ok: false, error: "Supabase service_role not configured" }
  const { data, error } = await sb
    .from("sales_customers")
    .insert({
      company_id: input.company_id ?? null,
      customer_name: input.customer_name,
      contract_products: input.contract_products,
      monthly_amount: input.monthly_amount,
      contract_start: input.contract_start ?? null,
      next_invoice_date: input.next_invoice_date ?? null,
      contract_status: input.contract_status ?? "トライアル",
      health: input.health ?? "🟢 良好",
      is_white_label: input.is_white_label ?? false,
      wl_client_count: input.wl_client_count ?? 0,
      assigned_to: input.assigned_to ?? null,
    })
    .select()
    .single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, customer: data as SalesCustomer }
}

/** MRR 合算 (現在の月次総収益・WL は wl_client_count × monthly_amount で換算) */
export async function calculateMrr(): Promise<{
  total: number
  active_count: number
  wl_count: number
  wl_revenue: number
}> {
  const sb = getServiceSupabase()
  if (!sb) return { total: 0, active_count: 0, wl_count: 0, wl_revenue: 0 }
  const { data } = await sb
    .from("sales_customers")
    .select("monthly_amount, is_white_label, wl_client_count")
    .in("contract_status", ["継続中", "トライアル"])
  if (!data) return { total: 0, active_count: 0, wl_count: 0, wl_revenue: 0 }
  let total = 0
  let wlRevenue = 0
  let wlCount = 0
  for (const row of data as SalesCustomer[]) {
    const monthly = Number(row.monthly_amount ?? 0)
    total += monthly
    if (row.is_white_label) {
      wlCount += 1
      wlRevenue += monthly
    }
  }
  return {
    total,
    active_count: data.length,
    wl_count: wlCount,
    wl_revenue: wlRevenue,
  }
}

/** notion_page_id でルックアップ (逆流時の anchor) */
export async function findCustomerByNotionId(
  notionPageId: string,
): Promise<SalesCustomer | null> {
  const sb = getServiceSupabase()
  if (!sb) return null
  const { data } = await sb
    .from("sales_customers")
    .select("*")
    .eq("notion_page_id", notionPageId)
    .maybeSingle()
  return (data as SalesCustomer) ?? null
}

/** 健全度更新 (health: 🟢/🟡/🔴) — 解約予兆検知の hook */
export async function updateCustomerHealth(
  customerId: string,
  health: HealthLevel,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getServiceSupabase()
  if (!sb) return { ok: false, error: "Supabase service_role not configured" }
  const { error } = await sb
    .from("sales_customers")
    .update({ health })
    .eq("id", customerId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
