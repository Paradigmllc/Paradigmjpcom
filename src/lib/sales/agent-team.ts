import { getServiceSalesSupabase } from "@/lib/supabase"
import { triggerEnrichmentRunner } from "@/lib/sales/enrichment-jobs"
import { runOutreachBatch } from "@/lib/sales/outreach/orchestrator"
import { pullTwentyCompaniesToSupabase } from "@/lib/sales/twenty-pull"
import { triggerReadyDiagnosticAssets } from "./agent-team-assets"
import { collectCompanyList, formatCollectListReply } from "./agent-team-collector"
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
} from "@/lib/sales/agent-team-types"
import {
  agentMenuSummary,
  approveQueueItem,
  buildMainMenuKeyboard,
  buildOssLinksKeyboard,
  enqueueManualReview,
  getCompanyCard,
  isAgentMenuSelection,
  listEnrichmentJobs,
  listOperatorQueueItems,
  notifyHumanReview,
  replyFor,
  runDiagnosticForCompany,
  searchCompanies,
  statusReport,
} from "./agent-team-telegram"
export { buildMainMenuKeyboard }
export { fetchRecentAgentCommands, getDashboardAgentTeam } from "./agent-team-dashboard"

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
  type TelegramKeyboard,
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
  // Combined patterns (unicode-escaped + literal) into single checks to avoid dead code
  if (/(\u72b6\u6cc1|\u9032\u6357|\u4ef6\u6570|\u30b5\u30de\u30ea|状況|進捗|status|kpi|件数|サマリ|summary)/i.test(text)) return "status_report"
  if (/(\/oss|oss管理|metabase|chatwoot|keystatic|directus|動向|ダッシュボード|dashboard|管理画面)/i.test(text)) return "oss_links"
  if (/(\u30ea\u30b9\u30c8|\u53ce\u96c6|\u53d6\u96c6|\u96c6\u3081\u3066|\u62bd\u51fa|\u4e00\u89a7|リスト|収集|集めて|抽出|一覧|list\s*collect|collect\s*list|collect|lead\s*list)/i.test(text)) return "collect_list"
  if (/(カルテ|診断|enrich|enrichment|解析|生成|report|レポート)/i.test(text)) return "run_enrichment"
  if (/(フォーム|送信|営業|outreach|dry.?run|preflight|文面)/i.test(text)) return "run_outreach_dry_run"
  if (/(資料|スライド|動画|デモ|asset|deck|slidev|gotenberg|hyperframes|remotion|astro)/i.test(text)) {
    return "prepare_assets"
  }
  if (/(twenty|crm|同期|sync|pull)/i.test(text)) return "sync_twenty"
  if (/(メニュー|menu|start|開始|使い方|help)/i.test(text)) return "show_menu"
  if (/(検索|search|探して|find|lookup)/i.test(text)) return "search_company"
  if (/(詳細|details|carte|カルテ表示|view)/i.test(text)) return "view_company"
  if (/(診断実行|diagnose|diagnostic|検査)/i.test(text)) return "run_diagnostic"
  if (/(ジョブ|jobs|キュー一覧|queue.*list)/i.test(text)) return "list_jobs"
  if (/(承認待ち|キュー|queue|operator.*queue|オペレータ)/i.test(text)) return "list_queue"
  if (/(承認|approve|実行|exec)/i.test(text)) return "approve_queue"
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
      // Phase 8-2: dispatch enrichment to Trigger.dev (event-driven) instead of running it
      // inline in the webhook request (WW-EVENT: no long HTTP occupation in the bot handler).
      const result = await triggerEnrichmentRunner(limit)
      const summary = result.dispatched
        ? `企業カルテ生成をキューに投入しました（最大 ${limit}件）。完了はベル/Slack通知でお知らせします。`
        : `企業カルテ生成の投入に失敗しました: ${result.error ?? "不明なエラー"}`
      await logAgentEvent(sb, { commandId, agentRole: "openclaw_researcher", eventType: "enrichment_dispatch", status: result.ok ? "success" : "warning", title: "企業カルテ生成をキュー投入しました", payload: result as unknown as JsonRecord })
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
      let assetResult: Record<string, unknown> = { queue, next: "Dify template selection -> generate-sales-asset -> Slack/Appsmith review" }
      let assetSummary = "成果物生成の準備キューを作りました。対象企業/セグメント確認後にDifyテンプレ選定へ進めます。"

      const assetTriggered = await triggerReadyDiagnosticAssets(sb, region)
      if (assetTriggered > 0) {
        assetResult = { ...assetResult, generated: assetTriggered }
        assetSummary += ` ${assetTriggered}社の診断レポート生成を開始しました。`
      }

      await logAgentEvent(sb, { commandId, agentRole: "paperclip_operator", eventType: "asset_prepare", status: queue.queued ? "success" : "warning", title: "成果物生成準備をキュー化しました", payload: assetResult })
      await notifyHumanReview({ intent, summary: assetSummary, commandText })
      await updateCommand(sb, commandId, { status: queue.queued ? "completed" : "blocked", runSummary: assetSummary, resultPayload: assetResult })
      return { ok: queue.queued, commandId, intent, status: queue.queued ? "completed" : "blocked", approvalRequired: true, summary: assetSummary, reply: replyFor({ intent, summary: assetSummary, approvalRequired: true, status: queue.queued ? "completed" : "blocked" }), result: assetResult }
    }

    if (intent === "collect_list") {
      const listResult = await collectCompanyList(commandText, { region: input.region, limit: input.limit })
      const reply = formatCollectListReply(listResult)
      await logAgentEvent(sb, { commandId, agentRole: "openclaw_researcher", eventType: "collect_list", status: listResult.ok ? "success" : "warning", title: "企業リスト収集", payload: listResult as unknown as JsonRecord })
      await updateCommand(sb, commandId, { status: listResult.ok ? "completed" : "failed", runSummary: reply, resultPayload: listResult as unknown as JsonRecord })
      return { ok: listResult.ok, commandId, intent, status: listResult.ok ? "completed" : "failed", approvalRequired: false, summary: reply, reply, result: listResult as unknown as JsonRecord }
    }

    if (intent === "oss_links") {
      const keyboard = buildOssLinksKeyboard()
      const summary = "🛠 OSS管理ツール\n\n各ツールを開くには下のボタンをタップしてください:\n📈 Metabase — 営業動向・KPIダッシュボード\n💬 Chatwoot — 顧客返信・inbox\n🖥 Keystatic — デモサイトCMS\n📑 Directus — 営業資料CMS\n🗂 RevenueOS — 営業OSパネル"
      const result = { oss: true, keyboard }
      await updateCommand(sb, commandId, { status: "completed", runSummary: summary, resultPayload: result })
      return { ok: true, commandId, intent, status: "completed", approvalRequired: false, summary, reply: summary, result }
    }

    if (intent === "show_menu") {
      const keyboard = buildMainMenuKeyboard()
      const summary = "📋 RevenueOS 営業指令メニュー\n\nボタンまたはコマンドを入力してください:\n/status - 状況確認\n/search [企業名/ドメイン] - 企業検索\n/enrich - カルテ生成\n/jobs - ジョブ一覧\n/queue - 承認待ち\n/sync - Twenty同期\n/help - 使い方"
      const result = { menu: true, keyboard }
      await updateCommand(sb, commandId, { status: "completed", runSummary: summary, resultPayload: result })
      return { ok: true, commandId, intent, status: "completed", approvalRequired: false, summary, reply: summary, result }
    }

    if (intent === "search_company") {
      const searchResult = await searchCompanies(sb, commandText)
      const keyboard = searchResult.companies.length > 0
        ? { inline_keyboard: searchResult.companies.map((c) => [{ text: `${c.company_name} (${c.domain})`, callback_data: `/view ${c.id}` }]).concat([[{ text: "◀️ メニュー", callback_data: "/menu" }]]) }
        : buildMainMenuKeyboard()
      const summary = searchResult.companies.length === 0
        ? `「${commandText.replace(/^\/search\s*/i, "")}」に一致する企業が見つかりませんでした。`
        : `${searchResult.companies.length}件見つかりました${searchResult.truncated ? "（上位10件）" : ""}:\n${searchResult.companies.map((c, i) => `${i + 1}. ${c.company_name} - ${c.domain}`).join("\n")}`
      const result = { search: searchResult, keyboard }
      await updateCommand(sb, commandId, { status: "completed", runSummary: summary, resultPayload: result })
      return { ok: true, commandId, intent, status: "completed", approvalRequired: false, summary, reply: summary, result }
    }

    if (intent === "view_company") {
      const card = await getCompanyCard(sb, commandText)
      const summary = card.found && card.company
        ? `🏢 ${card.company.company_name ?? card.company.domain}\nドメイン: ${card.company.domain}\n業界: ${card.company.industry ?? "不明"}\n国: ${card.company.country ?? "不明"}\nステータス: ${card.company.pipeline_status ?? "未設定"}\nスコア: ${card.company.lead_score ?? "N/A"}\nID: ${card.company.id}`
        : `企業IDまたはドメイン「${commandText.replace(/^\/(company|view)\s*/i, "")}」が見つかりませんでした。`
      const keyboard = card.found && card.company
        ? { inline_keyboard: [[{ text: "🩺 診断実行", callback_data: `/diagnose ${card.company.domain}` }], [{ text: "◀️ メニュー", callback_data: "/menu" }]] }
        : buildMainMenuKeyboard()
      const result = { company: card.company ?? null, keyboard }
      await updateCommand(sb, commandId, { status: "completed", runSummary: summary, resultPayload: result })
      return { ok: card.found, commandId, intent, status: "completed", approvalRequired: false, summary, reply: summary, result }
    }

    if (intent === "run_diagnostic") {
      const diag = await runDiagnosticForCompany(sb, commandText)
      const summary = diag.triggered
        ? `🩺 診断ジョブをキューに投入しました（ドメイン: ${commandText.replace(/^\/diagnose\s*/i, "")}）。処理完了まで数分お待ちください。`
        : `診断ジョブの投入に失敗しました: ${diag.error ?? "不明なエラー"}`
      const result = { diagnostic: diag, keyboard: buildMainMenuKeyboard() }
      await updateCommand(sb, commandId, { status: diag.triggered ? "completed" : "failed", runSummary: summary, resultPayload: result })
      return { ok: diag.triggered, commandId, intent, status: diag.triggered ? "completed" : "failed", approvalRequired: false, summary, reply: summary, result }
    }

    if (intent === "list_jobs") {
      const jobs = await listEnrichmentJobs(sb)
      const summary = jobs.jobs.length === 0
        ? "📋 エンリッチジョブはありません。"
        : `📋 最近のジョブ (${jobs.jobs.length}件):\n${jobs.jobs.map((j, i) => `${i + 1}. ${j.domain} [${j.status}] ${j.created_at.slice(0, 16)}`).join("\n")}`
      const result = { jobs: jobs.jobs, keyboard: buildMainMenuKeyboard() }
      await updateCommand(sb, commandId, { status: "completed", runSummary: summary, resultPayload: result })
      return { ok: true, commandId, intent, status: "completed", approvalRequired: false, summary, reply: summary, result }
    }

    if (intent === "list_queue") {
      const queue = await listOperatorQueueItems(sb)
      const summary = queue.items.length === 0
        ? "📝 承認待ちアイテムはありません。"
        : `📝 承認待ちキュー (${queue.items.length}件):\n${queue.items.map((q, i) => `${i + 1}. [${q.queue_type}] ${q.status} (優先度${q.priority}) ID:${q.id.slice(0, 8)}`).join("\n")}`
      const keyboard = queue.items.length > 0
        ? { inline_keyboard: queue.items.map((q) => [{ text: `✅ 承認: ${q.id.slice(0, 8)}...`, callback_data: `/approve ${q.id}` }]).concat([[{ text: "◀️ メニュー", callback_data: "/menu" }]]) }
        : buildMainMenuKeyboard()
      const result = { queue: queue.items, keyboard }
      await updateCommand(sb, commandId, { status: "completed", runSummary: summary, resultPayload: result })
      return { ok: true, commandId, intent, status: "completed", approvalRequired: false, summary, reply: summary, result }
    }

    if (intent === "approve_queue") {
      const itemId = commandText.replace(/^\/approve\s*/i, "").trim()
      const approved = await approveQueueItem(sb, itemId)
      const summary = approved.approved
        ? `✅ キューアイテム ${itemId.slice(0, 12)}... を承認し、処理を開始しました。`
        : `承認に失敗しました: ${approved.error ?? "不明なエラー"}`
      const result = { approved: approved.approved, keyboard: buildMainMenuKeyboard() }
      await updateCommand(sb, commandId, { status: approved.approved ? "completed" : "failed", runSummary: summary, resultPayload: result })
      return { ok: approved.approved, commandId, intent, status: approved.approved ? "completed" : "failed", approvalRequired: false, summary, reply: summary, result }
    }

    const fallbackQueue = await enqueueManualReview(sb, {
      reason: "Telegram指示の意図が自動実行ルールに一致しないため、CEO Hermes Agentの確認待ちにしました。",
      commandText,
      intent,
      region,
      priority: 70,
    })
    const result = { queue: fallbackQueue }
    const summary = "指示を手動レビューに回しました。必要なら具体的に『カルテ生成』『フォーム営業dry-run』『Twenty同期』などで再指示してください。"
    await logAgentEvent(sb, { commandId, agentRole: "ceo_hermes", eventType: "manual_review", status: fallbackQueue.queued ? "success" : "warning", title: "手動レビューへ回しました", payload: result })
    await notifyHumanReview({ intent, summary, commandText })
    await updateCommand(sb, commandId, { status: fallbackQueue.queued ? "blocked" : "failed", runSummary: summary, resultPayload: result })
    return { ok: fallbackQueue.queued, commandId, intent, status: fallbackQueue.queued ? "blocked" : "failed", approvalRequired: true, summary, reply: replyFor({ intent, summary, approvalRequired: true, status: fallbackQueue.queued ? "blocked" : "failed" }), result }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent command failed"
    console.error("[sales-agent-team] command failed:", error)
    const errorResult = { error: message }
    await logAgentEvent(sb, { commandId, agentRole: "system", eventType: "exception", status: "error", title: "AIチーム実行に失敗しました", message, payload: errorResult })
    await updateCommand(sb, commandId, { status: "failed", runSummary: message, resultPayload: errorResult })
    return { ok: false, commandId, intent, status: "failed", approvalRequired, summary: message, reply: replyFor({ intent, summary: message, approvalRequired, status: "failed" }), result: errorResult }
  }
}
