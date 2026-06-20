import { envConfigured } from "@/lib/sales/dashboard-audit"
import type { DashboardToolConnection } from "@/lib/sales/dashboard-types"

export interface ToolConnectionRow {
  slug: DashboardToolConnection["slug"]
  display_name: string
  role: string
  interface_type: string
  deployment_type: string
  status: string
  base_url: string | null
  health_url: string | null
  owner: string | null
  last_checked_at: string | null
}

export const TOOL_ORDER: DashboardToolConnection["slug"][] = [
  "supabase",
  "nocodb",
  "appsmith",
  "twenty",
  "metabase",
  "trigger_dev",
  "calcom",
  "chatwoot",
  "livekit",
  "docuseal",
  "directus",
  "keystatic",
]

const TOOL_ENV: Record<DashboardToolConnection["slug"], string | null> = {
  supabase: "NEXT_PUBLIC_SUPABASE_URL",
  nocodb: "NOCODB_BASE_URL",
  appsmith: "APPSMITH_BASE_URL",
  twenty: "TWENTY_BASE_URL",
  metabase: "METABASE_BASE_URL",
  trigger_dev: "TRIGGER_DASHBOARD_URL",
  calcom: "CALCOM_BASE_URL",
  docuseal: "DOCUSEAL_BASE_URL",
  directus: "DIRECTUS_BASE_URL",
  keystatic: "KEYSTATIC_BASE_URL",
  chatwoot: "CHATWOOT_BASE_URL",
  livekit: "LIVEKIT_URL",
}

const TOOL_REQUIRED_ENV: Partial<Record<DashboardToolConnection["slug"], string[]>> = {
  chatwoot: ["CHATWOOT_BASE_URL", "CHATWOOT_API_KEY", "CHATWOOT_ACCOUNT_ID"],
  livekit: ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"],
  directus: ["DIRECTUS_BASE_URL", "DIRECTUS_TOKEN"],
  keystatic: ["KEYSTATIC_BASE_URL"],
  trigger_dev: ["TRIGGER_SECRET_KEY"],
}

function readToolStatus(slug: DashboardToolConnection["slug"]): DashboardToolConnection["status"] {
  if (slug === "trigger_dev") {
    const hasSecret = envConfigured("TRIGGER_SECRET_KEY", "TRIGGER_ACCESS_TOKEN", "TRIGGER_DEV_API_KEY")
    return hasSecret ? "active" : "planned"
  }

  const required = TOOL_REQUIRED_ENV[slug]
  if (required && required.length > 0) {
    return required.every((name) => {
      const value = process.env[name]
      return typeof value === "string" && value.trim().length > 0
    })
      ? "active"
      : "planned"
  }
  return readToolUrl(slug) ? "active" : "planned"
}

function readToolUrl(slug: DashboardToolConnection["slug"]): string | null {
  const envName = TOOL_ENV[slug]
  const value = envName ? process.env[envName] : null
  if (value && value.trim().length > 0) return value.trim()
  if (slug === "supabase") {
    const fallback = process.env.NEXT_PUBLIC_SUPABASE_URL
    return fallback && fallback.trim().length > 0 ? fallback.trim() : null
  }
  if (slug === "directus") {
    const fallback = process.env.NEXT_PUBLIC_DIRECTUS_URL
    return fallback && fallback.trim().length > 0 ? fallback.trim() : null
  }
  if (slug === "keystatic") {
    const fallback = process.env.NEXT_PUBLIC_KEYSTATIC_URL
    return fallback && fallback.trim().length > 0 ? fallback.trim() : null
  }
  if (slug !== "trigger_dev") return null
  return "https://cloud.trigger.dev"
}

export const FALLBACK_TOOLS: DashboardToolConnection[] = [
  {
    slug: "supabase",
    displayName: "Supabase OSS",
    role: "営業データのSSOT。PostgreSQL、RLS、REST API、自動化の中心。",
    interfaceType: "database",
    deploymentType: "oss_or_cloud",
    status: "active",
    baseUrl: readToolUrl("supabase"),
    healthUrl: null,
    owner: "Paradigm",
    lastCheckedAt: null,
  },
  {
    slug: "nocodb",
    displayName: "NocoDB OSS",
    role: "大量リードのクレンジング、一括編集、CSV作業場。",
    interfaceType: "spreadsheet",
    deploymentType: "oss_self_hosted",
    status: readToolUrl("nocodb") ? "active" : "planned",
    baseUrl: readToolUrl("nocodb"),
    healthUrl: null,
    owner: null,
    lastCheckedAt: null,
  },
  {
    slug: "appsmith",
    displayName: "Appsmith OSS",
    role: "外部オペレーターが1件ずつ安全に処理する専用画面。",
    interfaceType: "operator_console",
    deploymentType: "oss_self_hosted",
    status: readToolUrl("appsmith") ? "active" : "planned",
    baseUrl: readToolUrl("appsmith"),
    healthUrl: null,
    owner: null,
    lastCheckedAt: null,
  },
  {
    slug: "twenty",
    displayName: "Twenty OSS",
    role: "商談、関係性、担当者、時系列履歴を扱うCRM。",
    interfaceType: "crm",
    deploymentType: "oss_self_hosted",
    status: readToolUrl("twenty") ? "active" : "planned",
    baseUrl: readToolUrl("twenty"),
    healthUrl: null,
    owner: null,
    lastCheckedAt: null,
  },
  {
    slug: "metabase",
    displayName: "Metabase OSS",
    role: "経営向けの返信率、送信数、成約率、リスト別成果分析。",
    interfaceType: "bi",
    deploymentType: "oss_self_hosted",
    status: readToolUrl("metabase") ? "active" : "planned",
    baseUrl: readToolUrl("metabase"),
    healthUrl: null,
    owner: null,
    lastCheckedAt: null,
  },
  {
    slug: "trigger_dev",
    displayName: "Trigger.dev",
    role: "通知、同期、イベント駆動ジョブ、長時間ジョブを担う本番オーケストレーター。",
    interfaceType: "automation",
    deploymentType: "cloud_or_self_hosted",
    status: readToolStatus("trigger_dev"),
    baseUrl: readToolUrl("trigger_dev"),
    healthUrl: null,
    owner: null,
    lastCheckedAt: null,
  },
  { slug: "calcom", displayName: "Cal.com OSS", role: "診断レポート後の商談予約、担当者別の空き枠管理、予約Webhookの回収導線。", interfaceType: "scheduling", deploymentType: "oss_self_hosted", status: readToolUrl("calcom") ? "active" : "planned", baseUrl: readToolUrl("calcom"), healthUrl: null, owner: null, lastCheckedAt: null },
  { slug: "chatwoot", displayName: "Chatwoot OSS", role: "メール返信、サイトチャット、SNS DMを集約し、AI返信またはフォローアップキューへ戻す受信箱。", interfaceType: "inbox", deploymentType: "oss_self_hosted", status: readToolStatus("chatwoot"), baseUrl: readToolUrl("chatwoot"), healthUrl: null, owner: null, lastCheckedAt: null },
  { slug: "livekit", displayName: "LiveKit OSS", role: "AI音声面談、初期ヒアリング、議事録回収のためのリアルタイム音声・映像レーン。", interfaceType: "voice", deploymentType: "oss_self_hosted", status: readToolStatus("livekit"), baseUrl: readToolUrl("livekit"), healthUrl: null, owner: null, lastCheckedAt: null },
  { slug: "docuseal", displayName: "Docuseal OSS", role: "契約書、申込書、NDAの電子署名と契約ステータス管理。", interfaceType: "contract", deploymentType: "oss_self_hosted", status: readToolUrl("docuseal") ? "active" : "planned", baseUrl: readToolUrl("docuseal"), healthUrl: null, owner: null, lastCheckedAt: null },
  { slug: "directus", displayName: "Directus OSS", role: "営業資料、提案書、スライド素材を外部CMSで管理する場合の資料スタジオ。", interfaceType: "cms", deploymentType: "oss_self_hosted", status: readToolStatus("directus"), baseUrl: readToolUrl("directus"), healthUrl: null, owner: null, lastCheckedAt: null },
  { slug: "keystatic", displayName: "Keystatic OSS", role: "AstroデモサイトをGitベースで安全に編集するためのデモサイトCMS。", interfaceType: "demo_cms", deploymentType: "oss_self_hosted", status: readToolStatus("keystatic"), baseUrl: readToolUrl("keystatic"), healthUrl: null, owner: null, lastCheckedAt: null },
]

export function mapTool(row: ToolConnectionRow): DashboardToolConnection {
  return {
    slug: row.slug,
    displayName: row.display_name,
    role: row.role,
    interfaceType: row.interface_type,
    deploymentType: row.deployment_type,
    status: row.status,
    baseUrl: row.base_url ?? readToolUrl(row.slug),
    healthUrl: row.health_url,
    owner: row.owner,
    lastCheckedAt: row.last_checked_at,
  }
}

export function mergeFallbackTools(rows: DashboardToolConnection[]): DashboardToolConnection[] {
  const bySlug = new Map(rows.map((tool) => [tool.slug, tool]))
  for (const fallback of FALLBACK_TOOLS) {
    const existing = bySlug.get(fallback.slug)
    if (!existing) {
      bySlug.set(fallback.slug, fallback)
      continue
    }

    bySlug.set(fallback.slug, {
      ...existing,
      displayName: fallback.displayName,
      role: fallback.role,
      interfaceType: fallback.interfaceType,
      deploymentType: fallback.deploymentType,
      baseUrl: existing.baseUrl ?? fallback.baseUrl,
      healthUrl: existing.healthUrl ?? fallback.healthUrl,
      owner: existing.owner ?? fallback.owner,
    })
  }
  return TOOL_ORDER.map((slug) => bySlug.get(slug)).filter(Boolean) as DashboardToolConnection[]
}
