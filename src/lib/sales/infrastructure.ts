import { DB_TABLES } from "@/lib/sales/db-tables"
type SalesSupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => {
      order: (
        column: string,
        options?: { ascending?: boolean },
      ) => Promise<{
        data: unknown
        error: { message: string } | null
      }> | PromiseLike<{
        data: unknown
        error: { message: string } | null
      }>
    }
  }
}

export type InfrastructureMigrationStatus =
  | "ready"
  | "recommended"
  | "planned"
  | "in_progress"
  | "completed"
  | "blocked"
  | "tier_blocked"

export interface InfrastructureMigrationItem {
  slug: string
  title: string
  provider: string
  role: "current" | "target" | "runbook" | "service"
  status: InfrastructureMigrationStatus
  monthlyCostYen: number | null
  cpuLabel: string | null
  memoryLabel: string | null
  diskLabel: string | null
  publicUrl: string | null
  notes: string | null
  updatedAt: string | null
}

export interface InfrastructureMigrationData {
  status: "ready" | "degraded"
  currentProvider: string
  targetProvider: string
  budgetLimitYen: number
  items: InfrastructureMigrationItem[]
  nextSteps: string[]
  warnings: string[]
}

interface InfrastructureMigrationRow {
  slug: string
  title: string
  provider: string
  role: InfrastructureMigrationItem["role"]
  status: InfrastructureMigrationStatus
  monthly_cost_yen: number | null
  cpu_label: string | null
  memory_label: string | null
  disk_label: string | null
  public_url: string | null
  notes: string | null
  updated_at: string | null
}

const FALLBACK_ITEMS: InfrastructureMigrationItem[] = [
  {
    slug: "hetzner-current",
    title: "Hetzner paradigm-prod-01",
    provider: "Hetzner",
    role: "current",
    status: "recommended",
    monthlyCostYen: 3000,
    cpuLabel: "8 vCPU",
    memoryLabel: "16 GB",
    diskLabel: "160 GB",
    publicUrl: "https://coolify.paradigmjp.com",
    notes: "現行本番。Cloudflare 524 再発防止のため、Coolify/Traefik/アプリ負荷はdeploy/recoveryイベントで確認します。",
    updatedAt: null,
  },
  {
    slug: "hetzner-scale-up",
    title: "Hetzner scale-up reserve",
    provider: "Hetzner",
    role: "target",
    status: "planned",
    monthlyCostYen: 6000,
    cpuLabel: "16 vCPU",
    memoryLabel: "32 GB",
    diskLabel: "240 GB",
    publicUrl: null,
    notes: "数万件のリスト収集/解析が恒常化した場合の増強先。まずは queue 化と host guard で現行を安定化します。",
    updatedAt: null,
  },
  {
    slug: "migration-runbook",
    title: "全面移行ランブック",
    provider: "Paradigm",
    role: "runbook",
    status: "ready",
    monthlyCostYen: null,
    cpuLabel: null,
    memoryLabel: null,
    diskLabel: null,
    publicUrl: null,
    notes: "棚卸し、バックアップ、復元、DNS切替、並走確認、DigitalOcean解約の順に進めます。",
    updatedAt: null,
  },
]

const NEXT_STEPS = [
  "Hetzner CX43相当を新規契約し、Coolify / Docker / Traefik の空ホストを作成",
  "DigitalOceanの /data/coolify、DB dump、Docker volumes をバックアップ",
  "Supabase OSSをHetzner側SSOTとして復元し、SALES_SUPABASE_* を切替",
  "NocoDB / Twenty / Appsmith / Metabase / 各サービスを順に復元し、主要URLのHTTP 200を確認",
  "Cloudflare DNSをHetznerへ切替後、7-14日並走してDigitalOceanを解約",
]

function mapRow(row: InfrastructureMigrationRow): InfrastructureMigrationItem {
  return {
    slug: row.slug,
    title: row.title,
    provider: row.provider,
    role: row.role,
    status: row.status,
    monthlyCostYen: row.monthly_cost_yen,
    cpuLabel: row.cpu_label,
    memoryLabel: row.memory_label,
    diskLabel: row.disk_label,
    publicUrl: row.public_url,
    notes: row.notes,
    updatedAt: row.updated_at,
  }
}

export async function getInfrastructureMigrationData(
  sb: SalesSupabaseLike | null,
): Promise<InfrastructureMigrationData> {
  const warnings: string[] = []
  let items = FALLBACK_ITEMS

  if (sb) {
    const { data, error } = await sb
      .from(DB_TABLES.SALES_INFRASTRUCTURE_MIGRATION)
      .select("slug, title, provider, role, status, monthly_cost_yen, cpu_label, memory_label, disk_label, public_url, notes, updated_at")
      .order("sort_order", { ascending: true })

    if (error) {
      warnings.push(`sales_infrastructure_migration: ${error.message}`)
    } else {
      const rows = (data ?? []) as InfrastructureMigrationRow[]
      if (rows.length > 0) items = rows.map(mapRow)
    }
  }

  return {
    status: warnings.length > 0 ? "degraded" : "ready",
    currentProvider: "DigitalOcean",
    targetProvider: "Hetzner CX43",
    budgetLimitYen: 3000,
    items,
    nextSteps: NEXT_STEPS,
    warnings,
  }
}
