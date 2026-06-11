import { notifySlack } from "@/lib/notify"
import { notionCreatePage, notionPageUrl, N } from "@/lib/notion"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { resolveNotionDbId } from "@/lib/sales/notion-apply"
import { syncCustomerHandoffToTwenty } from "@/lib/sales/twenty-sync"
import type { Region } from "@/lib/sales/types"

type JsonRecord = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

export const CUSTOMER_HANDOFF_SOURCES = [
  "manual",
  "supabase_webhook",
  "docuseal",
  "stripe",
  "twenty",
  "telegram",
  "n8n",
] as const

export type CustomerHandoffSource = (typeof CUSTOMER_HANDOFF_SOURCES)[number]

export const CUSTOMER_HANDOFF_PRODUCT_TYPES = [
  "jp_web_production",
  "jp_dx_package",
  "global_jaas",
  "global_video_subscription",
] as const

export type CustomerHandoffProductType = (typeof CUSTOMER_HANDOFF_PRODUCT_TYPES)[number]

export interface CustomerSuccessHandoffInput {
  companyId: string
  source?: string | null
  contractName?: string | null
  contractProducts?: string[] | null
  monthlyAmountYen?: number | null
  contractAmountYen?: number | null
  contractStatus?: string | null
  docusealSubmissionId?: string | null
  docusealUrl?: string | null
  calComUrl?: string | null
  notionPageUrl?: string | null
  notionPageId?: string | null
  assignedTo?: string | null
  meta?: JsonRecord | null
}

export interface CustomerSuccessHandoffResult {
  ok: boolean
  companyId: string
  customerId: string | null
  contractId: string | null
  notionPageId: string | null
  notionPageUrl: string | null
  twentyCompanyId: string | null
  twentyCustomerPortalFieldSynced: boolean
  source: CustomerHandoffSource
  productTypes: CustomerHandoffProductType[]
  warnings: string[]
  error?: string
}

interface CompanyRow {
  id: string
  region: Region
  company_name: string
  domain: string
  report_url: string | null
  assigned_to: string | null
  meta: JsonRecord | null
}

const PRODUCT_LABELS: Record<CustomerHandoffProductType, string> = {
  jp_web_production: "Web制作",
  jp_dx_package: "DXパッケージ",
  global_jaas: "Japan Entry Package (JaaS)",
  global_video_subscription: "動画納品サブスク",
}

function normalizeSource(source: string | null | undefined): CustomerHandoffSource {
  return source && (CUSTOMER_HANDOFF_SOURCES as readonly string[]).includes(source)
    ? (source as CustomerHandoffSource)
    : "manual"
}

export function normalizeCustomerHandoffProductTypes(input: string[] | null | undefined): CustomerHandoffProductType[] {
  const values = input ?? []
  const picked = values
    .map((value) => value.trim().toLowerCase())
    .map((value): CustomerHandoffProductType | null => {
      if (value === "jp_web_production" || value.includes("web")) return "jp_web_production"
      if (value === "jp_dx_package" || value.includes("dx") || value.includes("automation")) return "jp_dx_package"
      if (value === "global_jaas" || value.includes("jaas") || value.includes("japan entry")) return "global_jaas"
      if (value === "global_video_subscription" || value.includes("video") || value.includes("動画")) return "global_video_subscription"
      return null
    })
    .filter((value): value is CustomerHandoffProductType => value !== null)

  return Array.from(new Set(picked.length > 0 ? picked : ["jp_web_production"]))
}

function productLabels(productTypes: CustomerHandoffProductType[]): string[] {
  return productTypes.map((type) => PRODUCT_LABELS[type])
}

function customerStatusLabel(status: string | null | undefined): string {
  const value = status?.trim().toLowerCase()
  if (value === "trial" || value === "トライアル") return "トライアル"
  if (value === "paused" || value === "on_hold" || value === "保留") return "保留"
  if (value === "cancelled" || value === "canceled" || value === "解約") return "解約"
  return "契約中"
}

function numberOrNull(value: number | null | undefined): number | null {
  return Number.isFinite(value ?? Number.NaN) ? Math.max(0, Math.trunc(value as number)) : null
}

function mergeMeta(...items: Array<JsonRecord | null | undefined>): JsonRecord {
  return Object.assign({}, ...items.filter((item): item is JsonRecord => Boolean(item)))
}

function readUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    return new URL(value).toString()
  } catch (error) {
    console.warn("[customer-handoff] invalid URL skipped:", { value, error })
    return null
  }
}

async function fetchCompany(sb: ServiceSupabase, companyId: string): Promise<CompanyRow | null> {
  const { data, error } = await sb
    .from("sales_companies")
    .select("id, region, company_name, domain, report_url, assigned_to, meta")
    .eq("id", companyId)
    .maybeSingle()

  if (error) {
    console.error("[customer-handoff] fetchCompany failed:", error.message)
    throw new Error(error.message)
  }
  return (data as CompanyRow | null) ?? null
}

async function upsertCustomer(
  sb: ServiceSupabase,
  input: {
    company: CompanyRow
    productTypes: CustomerHandoffProductType[]
    monthlyAmountYen: number | null
    assignedTo: string | null
    notionPageId: string | null
    notionUrl: string | null
    contractStatus: string
    source: CustomerHandoffSource
    meta: JsonRecord
  },
): Promise<{ id: string; meta: JsonRecord }> {
  const existing = await sb
    .from("sales_customers")
    .select("id, meta")
    .eq("company_id", input.company.id)
    .maybeSingle()

  if (existing.error) {
    console.error("[customer-handoff] upsertCustomer select failed:", existing.error.message)
    throw new Error(existing.error.message)
  }

  const meta = mergeMeta(existing.data?.meta as JsonRecord | null, {
    customer_success: {
      source: input.source,
      notion_page_url: input.notionUrl,
      handoff_completed_at: new Date().toISOString(),
    },
    ...input.meta,
  })

  const payload = {
    region: input.company.region,
    company_id: input.company.id,
    customer_name: input.company.company_name,
    contract_products: productLabels(input.productTypes),
    monthly_amount: input.monthlyAmountYen ?? 0,
    contract_start: new Date().toISOString().slice(0, 10),
    contract_status: input.contractStatus,
    health: "🟢 良好",
    assigned_to: input.assignedTo,
    notion_page_id: input.notionPageId,
    meta,
  }

  const result = existing.data?.id
    ? await sb.from("sales_customers").update(payload).eq("id", existing.data.id).select("id, meta").single()
    : await sb.from("sales_customers").insert(payload).select("id, meta").single()

  if (result.error) {
    console.error("[customer-handoff] upsertCustomer upsert failed:", result.error.message)
    throw new Error(result.error.message)
  }
  return { id: String(result.data.id), meta: (result.data.meta ?? {}) as JsonRecord }
}

async function upsertContract(
  sb: ServiceSupabase,
  input: {
    customerId: string
    company: CompanyRow
    contractName: string
    productTypes: CustomerHandoffProductType[]
    amountYen: number | null
    status: string
    docusealSubmissionId: string | null
    docusealUrl: string | null
    source: CustomerHandoffSource
    meta: JsonRecord
  },
): Promise<string | null> {
  const row = {
    region: input.company.region,
    customer_id: input.customerId,
    contract_name: input.contractName,
    contract_type: input.productTypes[0] === "global_video_subscription"
      ? "video_sub"
      : input.productTypes[0] === "global_jaas"
        ? "japan_entry"
        : input.productTypes[0] === "jp_dx_package"
          ? "dx_ai"
          : "web_build",
    amount_yen: input.amountYen,
    currency: "JPY",
    start_date: new Date().toISOString().slice(0, 10),
    pdf_r2_url: input.docusealUrl,
    docusign_envelope_id: input.docusealSubmissionId,
    docusign_status: input.status,
    status: input.status,
    last_synced: new Date().toISOString(),
    meta: {
      source: input.source,
      provider: input.docusealSubmissionId ? "docuseal" : "manual",
      product_types: input.productTypes,
      ...input.meta,
    },
  }

  const result = input.docusealSubmissionId
    ? await sb.from("sales_contracts").upsert(row, { onConflict: "docusign_envelope_id" }).select("id").single()
    : await sb.from("sales_contracts").insert(row).select("id").single()

  if (result.error) {
    console.error("[customer-handoff] contract upsert failed:", result.error.message)
    return null
  }
  return typeof result.data?.id === "string" ? result.data.id : null
}

async function createCustomerNotionPage(input: {
  company: CompanyRow
  customerId: string
  productTypes: CustomerHandoffProductType[]
  contractName: string
  contractStatus: string
  contractAmountYen: number | null
  calComUrl: string | null
  docusealUrl: string | null
}): Promise<{ pageId: string | null; pageUrl: string | null; warning?: string }> {
  const dbId = resolveNotionDbId("customer", input.company.region)
  if (!dbId) return { pageId: null, pageUrl: null, warning: "Notion customer DB is not configured" }

  const titleProps = ["顧客名", "Customer", "Name"]
  const baseProps = {
    契約ステータス: N.select(input.contractStatus),
    契約商材: N.multiSelect(productLabels(input.productTypes)),
    月額: N.number(input.contractAmountYen ?? 0),
    契約開始日: N.date(new Date().toISOString().slice(0, 10)),
    診断レポートURL: input.company.report_url ? N.url(input.company.report_url) : undefined,
    CalComURL: input.calComUrl ? N.url(input.calComUrl) : undefined,
    DocusealURL: input.docusealUrl ? N.url(input.docusealUrl) : undefined,
  }
  const cleanBaseProps = Object.fromEntries(Object.entries(baseProps).filter(([, value]) => value !== undefined))

  for (const titleProp of titleProps) {
    const res = await notionCreatePage(dbId, {
      [titleProp]: N.title(input.company.company_name),
      ...cleanBaseProps,
    })
    if (res.ok && res.data?.id) return { pageId: res.data.id, pageUrl: notionPageUrl(res.data.id) }
    console.warn("[customer-handoff] Notion customer page create failed:", res.error)
  }

  return { pageId: null, pageUrl: null, warning: "Notion customer page could not be created with known title properties" }
}

async function logHandoff(
  sb: ServiceSupabase,
  input: CustomerSuccessHandoffResult & { payload: JsonRecord },
): Promise<void> {
  await sb.from("sales_sync_logs").insert({
    direction: "supabase->twenty",
    entity_type: "customer",
    entity_id: input.customerId,
    notion_page_id: input.notionPageId,
    action: "update",
    status: input.ok ? "success" : "error",
    error_message: input.error ?? null,
    payload: input.payload,
  })
}

export async function runCustomerSuccessHandoff(
  input: CustomerSuccessHandoffInput,
): Promise<CustomerSuccessHandoffResult> {
  const sb = getServiceSalesSupabase()
  const source = normalizeSource(input.source)
  const productTypes = normalizeCustomerHandoffProductTypes(input.contractProducts)
  const warnings: string[] = []
  if (!sb) {
    return {
      ok: false,
      companyId: input.companyId,
      customerId: null,
      contractId: null,
      notionPageId: null,
      notionPageUrl: null,
      twentyCompanyId: null,
      twentyCustomerPortalFieldSynced: false,
      source,
      productTypes,
      warnings,
      error: "Supabase service_role not configured",
    }
  }

  try {
    const company = await fetchCompany(sb, input.companyId)
    if (!company) {
      console.error("[customer-handoff] sales_companies row not found for companyId:", input.companyId)
      throw new Error("sales_companies row not found")
    }

    const amountYen = numberOrNull(input.contractAmountYen ?? input.monthlyAmountYen)
    const contractStatus = customerStatusLabel(input.contractStatus)
    const contractName = input.contractName ?? `${company.company_name} - ${PRODUCT_LABELS[productTypes[0]]}`
    const assignedTo = input.assignedTo ?? company.assigned_to ?? null
    const calComUrl = readUrl(input.calComUrl)
    const docusealUrl = readUrl(input.docusealUrl)

    let notionPageId = input.notionPageId ?? null
    let notionUrl = readUrl(input.notionPageUrl)

    const customer = await upsertCustomer(sb, {
      company,
      productTypes,
      monthlyAmountYen: numberOrNull(input.monthlyAmountYen) ?? amountYen,
      assignedTo,
      notionPageId,
      notionUrl,
      contractStatus,
      source,
      meta: input.meta ?? {},
    })

    if (!notionPageId && !notionUrl) {
      const notion = await createCustomerNotionPage({
        company,
        customerId: customer.id,
        productTypes,
        contractName,
        contractStatus,
        contractAmountYen: amountYen,
        calComUrl,
        docusealUrl,
      })
      notionPageId = notion.pageId
      notionUrl = notion.pageUrl
      if (notion.warning) warnings.push(notion.warning)

      if (notionPageId || notionUrl) {
        await sb
          .from("sales_customers")
          .update({
            notion_page_id: notionPageId,
            meta: mergeMeta(customer.meta, {
              customer_success: {
                source,
                notion_page_url: notionUrl,
                handoff_completed_at: new Date().toISOString(),
              },
            }),
          })
          .eq("id", customer.id)
      }
    }

    const contractId = await upsertContract(sb, {
      customerId: customer.id,
      company,
      contractName,
      productTypes,
      amountYen,
      status: contractStatus,
      docusealSubmissionId: input.docusealSubmissionId ?? null,
      docusealUrl,
      source,
      meta: input.meta ?? {},
    })

    await sb
      .from("sales_companies")
      .update({
        deal_stage: "成約",
        meta: mergeMeta(company.meta, {
          customer_success: {
            customer_id: customer.id,
            contract_id: contractId,
            notion_page_url: notionUrl,
            product_types: productTypes,
            handoff_completed_at: new Date().toISOString(),
          },
        }),
      })
      .eq("id", company.id)

    const twenty = await syncCustomerHandoffToTwenty({
      domain: company.domain,
      companyName: company.company_name,
      customerPortalUrl: notionUrl,
      contractName,
      contractStatus,
      contractAmountYen: amountYen,
      docusealUrl,
      calComUrl,
    })
    if (!twenty.ok && twenty.error) warnings.push(twenty.error)
    if (twenty.ok && twenty.customerPortalFieldSynced === false) {
      warnings.push("Twenty customer portal custom field was unavailable; URL was written into HOME summary instead")
    }

    await sb.from("sales_activity_log").insert({
      region: company.region,
      company_id: company.id,
      customer_id: customer.id,
      activity_type: "note",
      subject: "成約後ハンドオフ",
      result: "completed",
      assigned_to: assignedTo,
      body: `Notion: ${notionUrl ?? "pending"} / Contract: ${contractName}`,
      meta: { source, product_types: productTypes, twenty },
    })

    const result: CustomerSuccessHandoffResult = {
      ok: true,
      companyId: company.id,
      customerId: customer.id,
      contractId,
      notionPageId,
      notionPageUrl: notionUrl,
      twentyCompanyId: twenty.companyId ?? null,
      twentyCustomerPortalFieldSynced: twenty.customerPortalFieldSynced === true,
      source,
      productTypes,
      warnings,
    }
    await logHandoff(sb, { ...result, payload: { contractName, calComUrl, docusealUrl, source, productTypes } })
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : "customer success handoff failed"
    console.error("[customer-handoff] failed:", error)
    const result: CustomerSuccessHandoffResult = {
      ok: false,
      companyId: input.companyId,
      customerId: null,
      contractId: null,
      notionPageId: null,
      notionPageUrl: null,
      twentyCompanyId: null,
      twentyCustomerPortalFieldSynced: false,
      source,
      productTypes,
      warnings,
      error: message,
    }
    await notifySlack(`Customer success handoff failed: ${message}`).catch((notifyError) => {
      console.error("[customer-handoff] Slack notify failed:", notifyError)
    })
    return result
  }
}
