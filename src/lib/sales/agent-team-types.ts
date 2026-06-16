import type { Region } from "@/lib/sales/types"

type JsonRecord = Record<string, unknown>

export const SALES_AGENT_INTENTS = [
  "status_report",
  "run_enrichment",
  "run_outreach_dry_run",
  "prepare_assets",
  "collect_list",
  "sync_twenty",
  "manual_review",
  "unknown",
  "show_menu",
  "search_company",
  "view_company",
  "run_diagnostic",
  "list_jobs",
  "list_queue",
  "approve_queue",
] as const
export type SalesAgentIntent = (typeof SALES_AGENT_INTENTS)[number]

export interface TelegramKeyboard {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>
}

export const SALES_AGENT_AUTONOMY_LEVELS = ["observe", "copilot", "autopilot_guarded"] as const
export type SalesAgentAutonomyLevel = (typeof SALES_AGENT_AUTONOMY_LEVELS)[number]

export const SALES_AGENT_SOURCES = [
  "telegram",
  "hermes_agent",
  "paperclip",
  "opencode",
  "openclaw",
  "trigger_dev",
  "dashboard",
] as const
export type SalesAgentSource = (typeof SALES_AGENT_SOURCES)[number]

export interface SalesAgentCommandInput {
  text: string
  chatId?: string | null
  username?: string | null
  source?: string | null
  autonomyLevel?: string | null
  region?: string | null
  limit?: number | null
}

export interface SalesAgentCommandResult {
  ok: boolean
  commandId: string | null
  intent: SalesAgentIntent
  status: "completed" | "blocked" | "failed"
  approvalRequired: boolean
  summary: string
  reply: string
  result: JsonRecord
}

export interface SalesAgentRole {
  id: "ceo_hermes" | "paperclip_operator" | "opencode_engineer" | "openclaw_researcher" | "outreach_worker"
  name: string
  owner: string
  responsibility: string
  autonomy: string
  guardrail: string
}

export interface DashboardAgentCommand {
  id: string
  source: SalesAgentSource | string
  telegramUser: string | null
  commandText: string
  intent: SalesAgentIntent | string
  autonomyLevel: SalesAgentAutonomyLevel | string
  status: string
  approvalRequired: boolean
  runSummary: string | null
  createdAt: string
  completedAt: string | null
}

export interface DashboardAgentTeam {
  status: "ready" | "degraded"
  endpointPath: string
  telegramBot: string
  roles: SalesAgentRole[]
  autonomyLevels: Array<{ id: SalesAgentAutonomyLevel; label: string; description: string }>
  guardrails: string[]
  recentCommands: DashboardAgentCommand[]
  storageStatus: "supabase" | "pending_migration" | "unconfigured"
}

export const AGENT_ROLES: SalesAgentRole[] = [
  {
    id: "ceo_hermes",
    name: "CEO Hermes Agent",
    owner: "Hermes",
    responsibility: "Telegram指示を営業方針、優先度、承認要否に分解する司令塔。",
    autonomy: "戦略判断と承認依頼まで。危険な実送信や契約操作は人間確認へ回す。",
    guardrail: "ライブフォーム送信、契約、DNS/インフラ変更は承認なしで実行しない。",
  },
  {
    id: "paperclip_operator",
    name: "Paperclip Operator",
    owner: "Paperclip",
    responsibility: "Supabaseジョブ、Appsmith手動キュー、Slack通知、証跡保存を担当。",
    autonomy: "カルテ生成やdry-runなど安全なバックグラウンド処理を進める。",
    guardrail: "失敗やCAPTCHA/SPA/法務リスクは手動キューに落とす。",
  },
  {
    id: "opencode_engineer",
    name: "OpenCode Engineer",
    owner: "OpenCode",
    responsibility: "コード修正、テスト、デプロイ準備、運用Docs更新を担当。",
    autonomy: "リポジトリ内の安全な実装と検証まで。秘密情報や本番DB破壊操作はしない。",
    guardrail: "push/deployは既存の安全スクリプトとスモーク確認を通す。",
  },
  {
    id: "openclaw_researcher",
    name: "OpenClaw Researcher",
    owner: "OpenClaw",
    responsibility: "Crawlee、Crawl4AI、PageSpeed、Wappalyzer、公開APIから企業情報を集める。",
    autonomy: "無料API/OSS中心の証拠収集、痛み仮説、ソースカバレッジ更新。",
    guardrail: "ログイン突破、規約違反、強いスクレイピングはしない。",
  },
  {
    id: "outreach_worker",
    name: "Outreach Worker",
    owner: "Trigger.dev / Steel-Browser",
    responsibility: "Dify文面生成、フォーム判定、dry-run、承認後の送信準備を担当。",
    autonomy: "デフォルトはdry-run。初回5件と危険判定はAppsmith承認。",
    guardrail: "Telegram指示だけで大量ライブ送信しない。",
  },
]

export const AUTONOMY_LEVELS: DashboardAgentTeam["autonomyLevels"] = [
  { id: "observe", label: "Observe", description: "状況確認だけ。DBや外部サービスは更新しない。" },
  { id: "copilot", label: "Copilot", description: "ジョブ作成、下書き、手動キュー化まで。実送信はしない。" },
  { id: "autopilot_guarded", label: "Guarded Autopilot", description: "カルテ生成やdry-runを実行。ただしライブ送信と契約は承認必須。" },
]

export const GUARDRAILS = [
  "Supabaseが唯一の正本。Twenty、NocoDB、Metabase、Appsmithは用途別UIとして同期する。",
  "Telegramからのフォーム営業は常にdry-runから開始し、初回ライブ送信5件は人間承認に回す。",
  "CAPTCHA、ログイン必須、強いSPA、法務/業種リスクはAppsmithの手動キューへ送る。",
  "契約書、請求、DNS、インフラ、APIキー変更はTelegram単独では実行しない。",
  "すべての指示と実行結果をSupabaseに記録し、Slack/管理画面で監査できるようにする。",
]
