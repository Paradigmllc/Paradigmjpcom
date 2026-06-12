import { getServiceSalesSupabase } from "@/lib/supabase"
import { notifySlack } from "@/lib/notify"
import { runEnrichmentJobs } from "@/lib/sales/enrichment-jobs"
import { runOutreachBatch } from "@/lib/sales/outreach/orchestrator"
import { pullTwentyCompaniesToSupabase } from "@/lib/sales/twenty-pull"
import { isValidRegion, type Region } from "@/lib/sales/types"
import { DB_TABLES } from "@/lib/sales/db-tables"
import {
  SALES_AGENT_INTENTS,
  SALES_AGENT_AUTONOMY_LEVELS,
  SALES_AGENT_SOURCES,
  type SalesAgentIntent,
  type SalesAgentAutonomyLevel,
  type SalesAgentSource,
  type SalesAgentCommandInput,
  type SalesAgentCommandResult,
  type SalesAgentRole,
  type DashboardAgentCommand,
  type DashboardAgentTeam,
  AGENT_ROLES,
  AUTONOMY_LEVELS,
  GUARDRAILS,
} from "@/lib/sales/agent-team-types"

export {
  SALES_AGENT_INTENTS,
  SALES_AGENT_AUTONOMY_LEVELS,
  SALES_AGENT_SOURCES,
  type SalesAgentIntent,
  type SalesAgentAutonomyLevel,
  type SalesAgentSource,
  type SalesAgentCommandInput,
  type SalesAgentCommandResult,
  type SalesAgentRole,
  type DashboardAgentCommand,
  type DashboardAgentTeam,
} from "@/lib/sales/agent-team-types"

type JsonRecord = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

function normalizeSource(source: string | null | undefined): SalesAgentSource {
  if (source && (SALES_AGENT_SOURCES as readonly string[]).includes(source)) return source as SalesAgentSource
  return "telegram"
}

function normalizeAutonomy(level: string | null | undefined): SalesAgentAutonomyLevel {
  if (level && (SALES_AGENT_AUTONOMY_LEVELS as readonly string[]).includes(level)) {
    return level as SalesAgentAutonomyLevel
  }
  return "copilot"
}

function normalizeRegion(region: string | null | undefined): Region {
  return region && isValidRegion(region) ? region : "jp"
}

function normalizeLimit(limit: number | null | undefined, max: number): number {
  if (!Number.isFinite(limit ?? Number.NaN)) return Math.min(3, max)
  return Math.max(1, Math.min(Math.trunc(limit as number), max))
}

export function classifyAgentCommand(text: string): SalesAgentIntent {
  const value = text.toLowerCase()
  if (/(状況|進捗|status|kpi|件数|サマリ|summary)/i.test(text)) return "status_report"
  if (/(カルテ|診断|enrich|enrichment|解析|生成|report|レポート)/i.test(text)) return "run_enrichment"
  if (/(フォーム|送信|営業|outreach|dry.?run|preflight|文面)/i.test(text)) return "run_outreach_dry_run"
  if (/(資料|スライド|動画|デモ|asset|deck|slidev|gotenberg|hyperframes|remotion|astro)/i.test(text)) {
    return "prepare_assets"
  }
  if (/(twenty|crm|同期|sync|pull)/i.test(text)) return "sync_twenty"
  if (value.trim().length === 0) return "unknown"
  return "manual_review"
}

function wantsLiveOutreach(text: string): boolean {
  return /(実送信|本送信|live\s*send|dry\s*run\s*false|dryrun\s*false|承認なし|大量送信)/i.test(text)
}

function agentRoleForSource(source: SalesAgentSource): SalesAgentRole["id"] {
  if (source === "hermes_agent") return "ceo_hermes"
  if (source === "opencode") return "opencode_engineer"
  if (source === "openclaw") return "openclaw_researcher"
  if (source === "paperclip") return "paperclip_operator"
  return "ceo_hermes"
}

function isAgentMenuSelection(text: string, source: SalesAgentSource): boolean {
  if (source === "telegram" || source === "dashboard" || source === "trigger_dev") return false
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

function agentMenuSummary(source: SalesAgentSource): { summary: string; result: JsonRecord } {
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

async function insertCommand(
  sb: ServiceSupabase | null,
  input: {
    commandText: string
    source: SalesAgentSource
    chatId: string | null
    telegramUser: string | null
    intent: SalesAgentIntent
    autonomyLevel: SalesAgentAutonomyLevel
    approvalRequired: boolean
  },
): Promise<string | null> {
  if (!sb) return null
  const { data, error } = await sb
    .from(DB_TABLES.SALES_AGENT_COMMANDS)
    .insert({
      source: input.source,
      chat_id: input.chatId,
      telegram_user: input.telegramUser,
      command_text: input.commandText,
      intent: input.intent,
      autonomy_level: input.autonomyLevel,
      status: "running",
      approval_required: input.approvalRequired,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[sales-agent-team] command insert failed:", error.message)
    return null
  }
  return typeof data?.id === "string" ? data.id : null
}

async function updateCommand(
  sb: ServiceSupabase | null,
  commandId: string | null,
  patch: {
    status: "completed" | "blocked" | "failed"
    runSummary: string
    resultPayload: JsonRecord
  },
): Promise<void> {
  if (!sb || !commandId) return
  const { error } = await sb
    .from(DB_TABLES.SALES_AGENT_COMMANDS)
    .update({
      status: patch.status,
      run_summary: patch.runSummary,
      result_payload: patch.resultPayload,
      completed_at: new Date().toISOString(),
    })
    .eq("id", commandId)

  if (error) console.error("[sales-agent-team] command update failed:", error.message)
}

async function logAgentEvent(
  sb: ServiceSupabase | null,
  input: {
    commandId: string | null
    agentRole: string
    eventType: string
    status: "info" | "success" | "warning" | "error"
    title: string
    message?: string
    payload?: JsonRecord
  },
): Promise<void> {
  if (!sb || !input.commandId) return
  const { error } = await sb.from(DB_TABLES.SALES_AGENT_EVENTS).insert({
    command_id: input.commandId,
    agent_role: input.agentRole,
    event_type: input.eventType,
    status: input.status,
    title: input.title,
    message: input.message ?? null,
    payload: input.payload ?? {},
  })
  if (error) console.error("[sales-agent-team] event insert failed:", error.message)
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

async function statusReport(sb: ServiceSupabase | null): Promise<JsonRecord> {
  if (!sb) return { configured: false }
  const [companies, queuedJobs, openQueue, recentCommands] = await Promise.all([
    countRows(sb, "sales_companies"),
    countRowsByStatus(sb, "sales_enrichment_jobs", ["queued", "running"]),
    countRowsByStatus(sb, "sales_operator_queue_items", ["open", "in_progress", "blocked"]),
    countRows(sb, "sales_agent_commands"),
  ])
  return { configured: true, companies, queuedJobs, openQueue, recentCommands }
}

async function enqueueManualReview(
  sb: ServiceSupabase | null,
  input: { reason: string; commandText: string; intent: SalesAgentIntent; region: Region; priority?: number },
): Promise<{ queued: boolean; error?: string }> {
  if (!sb) return { queued: false, error: "Supabase service_role not configured" }
  const { error } = await sb.from(DB_TABLES.SALES_OPERATOR_QUEUE_ITEMS).insert({
    region: input.region,
    queue_type: "analysis",
    priority: input.priority ?? 80,
    status: "open",
    source_tool: "trigger_dev",
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

function replyFor(input: { intent: SalesAgentIntent; summary: string; approvalRequired: boolean; status: string }): string {
  const approval = input.approvalRequired ? "\n承認: 必要です。Appsmith/Slack側の確認キューを見てください。" : ""
  return `Paradigm AI営業チーム: ${input.summary}\nIntent: ${input.intent}\nStatus: ${input.status}${approval}`
}

async function notifyHumanReview(input: { intent: SalesAgentIntent; summary: string; commandText: string }): Promise<void> {
  await notifySlack(
    `Paradigm AI Bot approval required\nIntent: ${input.intent}\nSummary: ${input.summary}\nCommand: ${input.commandText}`,
  )
}

export async function handleAgentCommand(input: SalesAgentCommandInput): Promise<SalesAgentCommandResult> {
  const commandText = input.text.trim()
  const source = normalizeSource(input.source)
  const autonomyLevel = normalizeAutonomy(input.autonomyLevel)
  const region = normalizeRegion(input.region)
  const intent = classifyAgentCommand(commandText)
  const liveBlocked = wantsLiveOutreach(commandText)
  const approvalRequired = intent === "run_outreach_dry_run" || intent === "prepare_assets" || intent === "manual_review" || liveBlocked
  const sb = getServiceSalesSupabase()
  const commandId = await insertCommand(sb, {
    commandText,
    source,
    chatId: input.chatId ?? null,
    telegramUser: input.username ?? null,
    intent,
    autonomyLevel,
    approvalRequired,
  })

  try {
    if (isAgentMenuSelection(commandText, source)) {
      const selected = agentMenuSummary(source)
      await logAgentEvent(sb, {
        commandId,
        agentRole: agentRoleForSource(source),
        eventType: "agent_selected",
        status: "success",
        title: selected.summary,
        payload: selected.result,
      })
      await updateCommand(sb, commandId, {
        status: "completed",
        runSummary: selected.summary,
        resultPayload: selected.result,
      })
      return {
        ok: true,
        commandId,
        intent,
        status: "completed",
        approvalRequired: false,
        summary: selected.summary,
        reply: replyFor({ intent, summary: selected.summary, approvalRequired: false, status: "completed" }),
        result: selected.result,
      }
    }

    if (liveBlocked) {
      const queue = await enqueueManualReview(sb, {
        reason: "Telegramからライブ送信/大量送信の指示が来たため承認待ちにしました。",
        commandText,
        intent: "run_outreach_dry_run",
        region,
        priority: 95,
      })
      const result = { queue }
      const summary = "ライブ送信指示は安全ゲートで停止し、手動承認キューへ回しました。"
      await logAgentEvent(sb, {
        commandId,
        agentRole: "ceo_hermes",
        eventType: "approval_gate",
        status: "warning",
        title: "ライブ送信を承認待ちにしました",
        message: commandText,
        payload: result,
      })
      await notifyHumanReview({ intent: "run_outreach_dry_run", summary, commandText })
      await updateCommand(sb, commandId, { status: "blocked", runSummary: summary, resultPayload: result })
      return { ok: true, commandId, intent: "run_outreach_dry_run", status: "blocked", approvalRequired: true, summary, reply: replyFor({ intent: "run_outreach_dry_run", summary, approvalRequired: true, status: "blocked" }), result }
    }

    if (intent === "status_report" || autonomyLevel === "observe") {
      const result = await statusReport(sb)
      const summary = `状況確認を返しました。リード ${String(result.companies ?? 0)}件、生成待ち ${String(result.queuedJobs ?? 0)}件、手動キュー ${String(result.openQueue ?? 0)}件。`
      await logAgentEvent(sb, { commandId, agentRole: "ceo_hermes", eventType: "status_report", status: "success", title: "営業OS状況を確認しました", payload: result })
      await updateCommand(sb, commandId, { status: "completed", runSummary: summary, resultPayload: result })
      return { ok: true, commandId, intent, status: "completed", approvalRequired: false, summary, reply: replyFor({ intent, summary, approvalRequired: false, status: "completed" }), result }
    }

    if (intent === "run_enrichment") {
      const limit = normalizeLimit(input.limit, 5)
      const result = await runEnrichmentJobs(limit)
      const summary = `企業カルテ生成を実行しました。処理 ${result.processed}件、完了 ${result.completed}件、失敗 ${result.failed}件。`
      await logAgentEvent(sb, { commandId, agentRole: "openclaw_researcher", eventType: "enrichment_run", status: result.ok ? "success" : "warning", title: "企業カルテ生成を実行しました", payload: result as unknown as JsonRecord })
      await updateCommand(sb, commandId, { status: result.ok ? "completed" : "failed", runSummary: summary, resultPayload: result as unknown as JsonRecord })
      return { ok: result.ok, commandId, intent, status: result.ok ? "completed" : "failed", approvalRequired: false, summary, reply: replyFor({ intent, summary, approvalRequired: false, status: result.ok ? "completed" : "failed" }), result: result as unknown as JsonRecord }
    }

    if (intent === "run_outreach_dry_run") {
      const limit = normalizeLimit(input.limit, 5)
      const result = await runOutreachBatch({
        region,
        limit,
        dryRun: true,
        first5Approval: true,
        enableLlm: true,
        checkRobots: true,
        dedupDays: 30,
      })
      const summary = `フォーム営業dry-runを実行しました。処理 ${result.processed}件、手動確認 ${result.manualQueue}件、skip ${result.skipped}件。`
      await logAgentEvent(sb, { commandId, agentRole: "outreach_worker", eventType: "outreach_dry_run", status: "success", title: "フォーム営業dry-runを実行しました", payload: result as unknown as JsonRecord })
      await updateCommand(sb, commandId, { status: "completed", runSummary: summary, resultPayload: result as unknown as JsonRecord })
      return { ok: true, commandId, intent, status: "completed", approvalRequired: true, summary, reply: replyFor({ intent, summary, approvalRequired: true, status: "completed" }), result: result as unknown as JsonRecord }
    }

    if (intent === "sync_twenty") {
      const result = await pullTwentyCompaniesToSupabase(normalizeLimit(input.limit, 200), {
        autoRunPipeline: true,
        dispatchPipeline: true,
        requestedBy: "sales_agent_team",
      })
      const summary = result.configured
        ? `TwentyからSupabaseへ同期しました。更新 ${result.updated}件、skip ${result.skipped}件。`
        : "Twenty APIが未設定のため、同期は実行できませんでした。"
      await logAgentEvent(sb, { commandId, agentRole: "paperclip_operator", eventType: "twenty_sync", status: result.ok ? "success" : "warning", title: "Twenty同期を処理しました", payload: result as unknown as JsonRecord })
      await updateCommand(sb, commandId, { status: result.ok ? "completed" : "blocked", runSummary: summary, resultPayload: result as unknown as JsonRecord })
      return { ok: result.ok, commandId, intent, status: result.ok ? "completed" : "blocked", approvalRequired: !result.ok, summary, reply: replyFor({ intent, summary, approvalRequired: !result.ok, status: result.ok ? "completed" : "blocked" }), result: result as unknown as JsonRecord }
    }

    if (intent === "prepare_assets") {
      const queue = await enqueueManualReview(sb, {
        reason: "診断レポート/デモサイト/営業資料/営業動画の生成ブリーフを作るため、人間が対象企業またはセグメントを確認します。",
        commandText,
        intent,
        region,
        priority: 85,
      })
      const result = { queue, next: "Dify template selection -> generate-sales-asset -> Slack/Appsmith review" }
      const summary = "成果物生成の準備キューを作りました。対象企業/セグメント確認後にDifyテンプレ選定へ進めます。"
      await logAgentEvent(sb, { commandId, agentRole: "paperclip_operator", eventType: "asset_prepare", status: queue.queued ? "success" : "warning", title: "成果物生成準備をキュー化しました", payload: result })
      await notifyHumanReview({ intent, summary, commandText })
      await updateCommand(sb, commandId, { status: queue.queued ? "completed" : "blocked", runSummary: summary, resultPayload: result })
      return { ok: queue.queued, commandId, intent, status: queue.queued ? "completed" : "blocked", approvalRequired: true, summary, reply: replyFor({ intent, summary, approvalRequired: true, status: queue.queued ? "completed" : "blocked" }), result }
    }

    const queue = await enqueueManualReview(sb, {
      reason: "Telegram指示の意図が自動実行ルールに一致しないため、CEO Hermes Agentの確認待ちにしました。",
      commandText,
      intent,
      region,
      priority: 70,
    })
    const result = { queue }
    const summary = "指示を手動レビューに回しました。必要なら具体的に『カルテ生成』『フォーム営業dry-run』『Twenty同期』などで再指示してください。"
    await logAgentEvent(sb, { commandId, agentRole: "ceo_hermes", eventType: "manual_review", status: queue.queued ? "success" : "warning", title: "手動レビューへ回しました", payload: result })
    await notifyHumanReview({ intent, summary, commandText })
    await updateCommand(sb, commandId, { status: queue.queued ? "blocked" : "failed", runSummary: summary, resultPayload: result })
    return { ok: queue.queued, commandId, intent, status: queue.queued ? "blocked" : "failed", approvalRequired: true, summary, reply: replyFor({ intent, summary, approvalRequired: true, status: queue.queued ? "blocked" : "failed" }), result }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent command failed"
    console.error("[sales-agent-team] command failed:", error)
    const result = { error: message }
    await logAgentEvent(sb, { commandId, agentRole: "system", eventType: "exception", status: "error", title: "AIチーム実行に失敗しました", message, payload: result })
    await updateCommand(sb, commandId, { status: "failed", runSummary: message, resultPayload: result })
    return { ok: false, commandId, intent, status: "failed", approvalRequired, summary: message, reply: replyFor({ intent, summary: message, approvalRequired, status: "failed" }), result }
  }
}

export async function fetchRecentAgentCommands(limit = 12): Promise<{
  commands: DashboardAgentCommand[]
  storageStatus: DashboardAgentTeam["storageStatus"]
}> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { commands: [], storageStatus: "unconfigured" }

  const { data, error } = await sb
    .from(DB_TABLES.SALES_AGENT_COMMANDS)
    .select("id, source, telegram_user, command_text, intent, autonomy_level, status, approval_required, run_summary, created_at, completed_at")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[sales-agent-team] fetch recent commands failed:", error.message)
    return { commands: [], storageStatus: "pending_migration" }
  }

  return {
    storageStatus: "supabase",
    commands: ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      source: String(row.source ?? "telegram"),
      telegramUser: typeof row.telegram_user === "string" ? row.telegram_user : null,
      commandText: String(row.command_text ?? ""),
      intent: String(row.intent ?? "unknown"),
      autonomyLevel: String(row.autonomy_level ?? "copilot"),
      status: String(row.status ?? "queued"),
      approvalRequired: row.approval_required === true,
      runSummary: typeof row.run_summary === "string" ? row.run_summary : null,
      createdAt: String(row.created_at ?? new Date().toISOString()),
      completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
    })),
  }
}

export async function getDashboardAgentTeam(): Promise<DashboardAgentTeam> {
  const recent = await fetchRecentAgentCommands()
  return {
    status: recent.storageStatus === "supabase" ? "ready" : "degraded",
    endpointPath: "/api/sales/agent/telegram-command",
    telegramBot: "@aiparadigmbot",
    roles: AGENT_ROLES,
    autonomyLevels: AUTONOMY_LEVELS,
    guardrails: GUARDRAILS,
    recentCommands: recent.commands,
    storageStatus: recent.storageStatus,
  }
}
