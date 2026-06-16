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
    slug: "digitalocean-current",
    title: "DigitalOcean appexx-prod-01",
    provider: "DigitalOcean",
    role: "current",
    status: "tier_blocked",
    monthlyCostYen: 8100,
    cpuLabel: "4 vCPU",
    memoryLabel: "8 GB",
    diskLabel: "160 GB",
    publicUrl: "https://cloud.digitalocean.com/droplets/555590454",
    notes: "16GB以上へのresizeはアカウント制限で不可。無料クレジットは一時延命にのみ使います。",
    updatedAt: null,
  },
  {
    slug: "hetzner-target-cx43",
    title: "Hetzner CX43",
    provider: "Hetzner",
    role: "target",
    status: "recommended",
    monthlyCostYen: 3000,
    cpuLabel: "8 vCPU",
    memoryLabel: "16 GB",
    diskLabel: "160 GB",
    publicUrl: null,
    notes: "月3,000円前後の本命移行先。重いOSSは停止/起動管理しながら段階移行します。",
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
