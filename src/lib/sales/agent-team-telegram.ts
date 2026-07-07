import { getServiceSalesSupabase } from "@/lib/supabase"
import { notifySlack } from "@/lib/notify"
import { DB_TABLES } from "@/lib/sales/db-tables"
import type { Region } from "@/lib/sales/types"
import type {
  SalesAgentIntent,
  SalesAgentSource,
  TelegramKeyboard,
} from "@/lib/sales/agent-team-types"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>
type JsonRecord = Record<string, unknown>

export function isAgentMenuSelection(text: string, source: SalesAgentSource): boolean {
  if (source === "telegram" || source === "dashboard" || source === "openclaw") return false
  const normalized = text.toLowerCase().replace(/[^a-z0-9]+/g, "")
  return [
    "hermes",
    "agenthermes",
    "hermesagent",
    "agenthermesagent",
    "ceohermes",
    "agentceohermes",
    "opencode",
    "agentopencode",
    "opencodeengineer",
    "agentopencodeengineer",
    "openclaw",
    "agentopenclaw",
    "openclawresearcher",
    "agentopenclawresearcher",
    "paperclip",
    "agentpaperclip",
    "paperclipoperator",
    "agentpaperclipoperator",
  ].includes(normalized)
}

export function agentMenuSummary(source: SalesAgentSource): { summary: string; result: JsonRecord } {
  if (source === "opencode") {
    return {
      summary: "OpenCode Engineerを選択しました。コード修正、テスト、デプロイ準備、原因調査の指示をそのまま送ってください。",
      result: { selectedAgent: "opencode_engineer", accepts: ["code_fix", "tests", "deploy_preparation", "debugging"] },
    }
  }
  if (source === "hermes_agent") {
    return {
      summary: "CEO Hermes Agentを選択しました。営業方針、優先度、承認要否、次アクション整理の指示をそのまま送ってください。",
      result: { selectedAgent: "ceo_hermes", accepts: ["strategy", "prioritization", "approval_review", "next_actions"] },
    }
  }
  if (source === "openclaw") {
    return {
      summary: "OpenClaw Researcherを選択しました。企業調査、証拠収集、ソース確認の指示をそのまま送ってください。",
      result: { selectedAgent: "openclaw_researcher", accepts: ["research", "evidence", "source_verification"] },
    }
  }
  return {
    summary: "Paperclip Operatorを選択しました。ジョブ管理、通知、手動キュー整理の指示をそのまま送ってください。",
    result: { selectedAgent: "paperclip_operator", accepts: ["job_ops", "notifications", "manual_queue"] },
  }
}

export function buildMainMenuKeyboard(): TelegramKeyboard {
  return {
    inline_keyboard: [
      [{ text: "📊 状況確認", callback_data: "/status" }],
      [{ text: "🔍 企業検索", callback_data: "/search " }, { text: "🩺 カルテ生成", callback_data: "/enrich" }],
      [{ text: "📋 ジョブ一覧", callback_data: "/jobs" }, { text: "📝 承認待ち", callback_data: "/queue" }],
      [{ text: "📤 Twenty同期", callback_data: "/sync" }, { text: "📦 資料生成", callback_data: "/assets" }],
      [{ text: "📋 リスト収集", callback_data: "/collect" }, { text: "🛠 OSS管理", callback_data: "/oss" }],
      [{ text: "❓ ヘルプ", callback_data: "/help" }],
    ],
  }
}

// Phase 8-3: OSS management deep links. One-tap open of the営業動向/OSS tools from Telegram
// (deep-link approach: Metabase trends, Chatwoot replies, Keystatic demo CMS, Directus sales-asset CMS,
// Twenty Sales OS panel). Uses env base URLs with production defaults.
function ossBase(envName: string, fallback: string): string {
  const v = process.env[envName]
  return (typeof v === "string" && v.trim() ? v.trim() : fallback).replace(/\/+$/, "")
}

export function buildOssLinksKeyboard(): TelegramKeyboard {
  const revenueOs = ossBase("PAYLOAD_PUBLIC_SERVER_URL", "https://paradigmjp.com")
  return {
    inline_keyboard: [
      [{ text: "📈 営業動向 (Metabase)", url: `${ossBase("METABASE_URL", "https://metabase.paradigmjp.com")}` }],
      [{ text: "💬 返信 (Chatwoot)", url: `${ossBase("CHATWOOT_BASE_URL", "https://chatwoot.paradigmjp.com")}` }],
      [{ text: "🖥 デモCMS (Keystatic)", url: `${ossBase("KEYSTATIC_BASE_URL", "https://keystatic.paradigmjp.com")}` }],
      [{ text: "📑 営業資料CMS (Directus)", url: `${ossBase("DIRECTUS_BASE_URL", "https://directus.paradigmjp.com")}` }],
      [{ text: "🗂 Twenty Sales OS", url: "https://twenty.paradigmjp.com" }],
      [{ text: "◀️ メニュー", callback_data: "/menu" }],
    ],
  }
}

export async function searchCompanies(
  sb: ServiceSupabase | null,
  query: string,
): Promise<{ companies: Array<{ id: string; company_name: string; domain: string }>; truncated: boolean }> {
  if (!sb) return { companies: [], truncated: false }
  const search = query.trim().replace(/^\/search\s*/i, "")
  if (!search) return { companies: [], truncated: false }

  const { data, error } = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .select("id, company_name, domain")
    .or(`domain.ilike.%${search}%,company_name.ilike.%${search}%`)
    .order("created_at", { ascending: false })
    .limit(11)

  if (error) {
    console.error("[sales-agent-team] company search failed:", error.message)
    return { companies: [], truncated: false }
  }

  const companies = ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    company_name: String(r.company_name ?? r.domain ?? "unknown"),
    domain: String(r.domain ?? ""),
  }))

  return { companies: companies.slice(0, 10), truncated: companies.length > 10 }
}

export async function getCompanyCard(
  sb: ServiceSupabase | null,
  identifier: string,
): Promise<{ found: boolean; company?: Record<string, unknown> }> {
  if (!sb) return { found: false }
  const id = identifier.trim().replace(/^\/(company|view)\s*/i, "")
  const { data, error } = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .select("*")
    .or(`id.eq.${id},domain.ilike.${id}`)
    .limit(1)
    .single()

  if (error || !data) return { found: false }
  return { found: true, company: data as unknown as Record<string, unknown> }
}

export async function runDiagnosticForCompany(
  sb: ServiceSupabase | null,
  domain: string,
): Promise<{ triggered: boolean; error?: string; jobId?: string }> {
  if (!sb) return { triggered: false, error: "Supabase not configured" }
  const cleanDomain = domain.trim()
    .replace(/^\/diagnose\s*/i, "")
    .replace(/^https?:\/\//, "")
    .replace(/\/.*/, "")
    .toLowerCase()

  const { data: existing } = await sb
    .from(DB_TABLES.SALES_COMPANIES)
    .select("id")
    .or(`domain.ilike.%${cleanDomain}%,company_name.ilike.%${cleanDomain}%`)
    .limit(1)
    .single()

  try {
    const { data: job, error } = await sb.from(DB_TABLES.SALES_ENRICHMENT_JOBS).insert({
      domain: cleanDomain,
      status: "queued",
      template_variant: "website_diagnostic",
      region: "jp",
      priority: 95,
      meta: { requested_by: "telegram_agent", created_via: "agent-team" },
    }).select("id").single()

    if (error) {
      console.error("[sales-agent-team] diagnostic insert failed:", error.message)
      return { triggered: false, error: error.message }
    }
    return { triggered: true, jobId: typeof job?.id === "string" ? job.id : undefined }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to queue diagnostic"
    console.error("[sales-agent-team] diagnostic failed:", message)
    return { triggered: false, error: message }
  }
}

export async function listEnrichmentJobs(
  sb: ServiceSupabase | null,
): Promise<{ jobs: Array<{ id: string; domain: string; status: string; created_at: string }> }> {
  if (!sb) return { jobs: [] }
  const { data, error } = await sb
    .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
    .select("id, domain, status, created_at")
    .order("created_at", { ascending: false })
    .limit(15)

  if (error) {
    console.error("[sales-agent-team] list jobs failed:", error.message)
    return { jobs: [] }
  }
  return {
    jobs: ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      domain: String(r.domain),
      status: String(r.status),
      created_at: String(r.created_at),
    })),
  }
}

export async function listOperatorQueueItems(
  sb: ServiceSupabase | null,
): Promise<{ items: Array<{ id: string; queue_type: string; status: string; priority: number; meta: unknown }> }> {
  if (!sb) return { items: [] }
  const { data, error } = await sb
    .from(DB_TABLES.SALES_OPERATOR_QUEUE_ITEMS)
    .select("id, queue_type, status, priority, meta")
    .in("status", ["open", "in_progress"])
    .order("priority", { ascending: false })
    .limit(10)

  if (error) {
    console.error("[sales-agent-team] list queue failed:", error.message)
    return { items: [] }
  }
  return { items: (data ?? []) as Array<{ id: string; queue_type: string; status: string; priority: number; meta: unknown }> }
}

export async function approveQueueItem(
  sb: ServiceSupabase | null,
  itemId: string,
): Promise<{ approved: boolean; error?: string }> {
  if (!sb) return { approved: false, error: "Supabase not configured" }
  const { error } = await sb
    .from(DB_TABLES.SALES_OPERATOR_QUEUE_ITEMS)
    .update({ status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("status", "open")

  if (error) {
    console.error("[sales-agent-team] approve queue failed:", error.message)
    return { approved: false, error: error.message }
  }
  return { approved: true }
}

async function countRows(sb: ServiceSupabase, table: string): Promise<number> {
  const { count, error } = await sb.from(table).select("id", { count: "exact", head: true })
  if (error) {
    console.error(`[sales-agent-team] count ${table} failed:`, error.message)
    return 0
  }
  return count ?? 0
}

async function countRowsByStatus(sb: ServiceSupabase, table: string, statuses: string[]): Promise<number> {
  const { count, error } = await sb.from(table).select("id", { count: "exact", head: true }).in("status", statuses)
  if (error) {
    console.error(`[sales-agent-team] count ${table} by status failed:`, error.message)
    return 0
  }
  return count ?? 0
}

export async function statusReport(sb: ServiceSupabase | null): Promise<JsonRecord> {
  if (!sb) return { configured: false }
  const [companies, queuedJobs, openQueue, recentCommands] = await Promise.all([
    countRows(sb, "sales_companies"),
    countRowsByStatus(sb, "sales_enrichment_jobs", ["queued", "running"]),
    countRowsByStatus(sb, "sales_operator_queue_items", ["open", "in_progress", "blocked"]),
    countRows(sb, "sales_agent_commands"),
  ])
  return { configured: true, companies, queuedJobs, openQueue, recentCommands }
}

export async function enqueueManualReview(
  sb: ServiceSupabase | null,
  input: { reason: string; commandText: string; intent: SalesAgentIntent; region: Region; priority?: number },
): Promise<{ queued: boolean; error?: string }> {
  if (!sb) return { queued: false, error: "Supabase service_role not configured" }
  const { error } = await sb.from(DB_TABLES.SALES_OPERATOR_QUEUE_ITEMS).insert({
    region: input.region,
    queue_type: "analysis",
    title: input.reason,
    priority: input.priority ?? 80,
    status: "open",
    source_tool: "openclaw",
    target_tool: "appsmith",
    meta: {
      reason: input.reason,
      command_text: input.commandText,
      intent: input.intent,
      created_by: "sales_agent_team",
      approval_required: true,
    },
  })
  if (error) {
    console.error("[sales-agent-team] manual queue insert failed:", error.message)
    return { queued: false, error: error.message }
  }
  return { queued: true }
}

export function replyFor(input: { intent: SalesAgentIntent; summary: string; approvalRequired: boolean; status: string }): string {
  const approval = input.approvalRequired ? "\n承認: 必要です。Appsmith/Slack側の確認キューを見てください。" : ""
  return `Paradigm AI営業チーム: ${input.summary}\nIntent: ${input.intent}\nStatus: ${input.status}${approval}`
}

export async function notifyHumanReview(input: { intent: SalesAgentIntent; summary: string; commandText: string }): Promise<void> {
  await notifySlack(
    `Paradigm AI Bot approval required\nIntent: ${input.intent}\nSummary: ${input.summary}\nCommand: ${input.commandText}`,
  )
}
