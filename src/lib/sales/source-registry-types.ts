export type RevenueSourceLane =
  | "tech_footprint"
  | "no_website_local_smb"
  | "enrichment"
  | "outreach"
  | "orchestration"
  | "asset"
  | "disabled"

export type RevenueSourceCost =
  | "free"
  | "free_with_limits"
  | "env_required"
  | "paid"
  | "internal"
  | "disabled_by_policy"

export type RevenueSourceImplementationStatus =
  | "live"
  | "live_if_configured"
  | "partial"
  | "implemented_not_wired"
  | "catalog_only"
  | "disabled_by_policy"

export type RevenueSourceScaleTier =
  | "bulk"
  | "per_domain_light"
  | "per_domain_deep"
  | "browser_expensive"
  | "manual"
  | "post_lead"

export interface RevenueSourceRegistryItem {
  slug: string
  label: string
  category: "list" | "analysis" | "outreach" | "orchestration" | "asset" | "video" | "demo"
  lane: RevenueSourceLane
  cost: RevenueSourceCost
  implementationStatus: RevenueSourceImplementationStatus
  scaleTier: RevenueSourceScaleTier
  env: string[]
  primaryInput: string
  primaryOutput: string
  notes: string
}

export interface RevenueSourceRegistrySummary {
  total: number
  byStatus: Record<RevenueSourceImplementationStatus, number>
  byLane: Record<RevenueSourceLane, number>
  byScaleTier: Record<RevenueSourceScaleTier, number>
  bulkReady: number
  disabledByPolicy: number
  needsConfiguration: number
}
