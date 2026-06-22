import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import {
  AGENT_ROLES,
  AUTONOMY_LEVELS,
  GUARDRAILS,
  type DashboardAgentCommand,
  type DashboardAgentTeam,
} from "@/lib/sales/agent-team-types"

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
