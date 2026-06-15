import { REVENUE_SOURCE_REGISTRY_CORE } from "./source-registry-core"
import { REVENUE_SOURCE_REGISTRY_OPS } from "./source-registry-ops"
import type {
  RevenueSourceImplementationStatus,
  RevenueSourceLane,
  RevenueSourceRegistryItem,
  RevenueSourceRegistrySummary,
  RevenueSourceScaleTier,
} from "./source-registry-types"

export type {
  RevenueSourceCost,
  RevenueSourceImplementationStatus,
  RevenueSourceLane,
  RevenueSourceRegistryItem,
  RevenueSourceRegistrySummary,
  RevenueSourceScaleTier,
} from "./source-registry-types"

export const REVENUE_SOURCE_REGISTRY: RevenueSourceRegistryItem[] = [
  ...REVENUE_SOURCE_REGISTRY_CORE,
  ...REVENUE_SOURCE_REGISTRY_OPS,
]

const SOURCE_STATUS_VALUES: RevenueSourceImplementationStatus[] = [
  "live",
  "live_if_configured",
  "partial",
  "implemented_not_wired",
  "catalog_only",
  "disabled_by_policy",
]

const SOURCE_LANE_VALUES: RevenueSourceLane[] = [
  "tech_footprint",
  "no_website_local_smb",
  "enrichment",
  "outreach",
  "orchestration",
  "asset",
  "disabled",
]

const SOURCE_SCALE_VALUES: RevenueSourceScaleTier[] = [
  "bulk",
  "per_domain_light",
  "per_domain_deep",
  "browser_expensive",
  "manual",
  "post_lead",
]

function countBy<T extends string>(values: readonly T[], items: RevenueSourceRegistryItem[], pick: (item: RevenueSourceRegistryItem) => T): Record<T, number> {
  const out = Object.fromEntries(values.map((value) => [value, 0])) as Record<T, number>
  for (const item of items) out[pick(item)] += 1
  return out
}

export function listRevenueSourceRegistry(): RevenueSourceRegistryItem[] {
  return [...REVENUE_SOURCE_REGISTRY].sort((a, b) => {
    if (a.lane !== b.lane) return a.lane.localeCompare(b.lane)
    if (a.implementationStatus !== b.implementationStatus) {
      return SOURCE_STATUS_VALUES.indexOf(a.implementationStatus) - SOURCE_STATUS_VALUES.indexOf(b.implementationStatus)
    }
    return a.label.localeCompare(b.label)
  })
}

export function summarizeRevenueSourceRegistry(items: RevenueSourceRegistryItem[] = REVENUE_SOURCE_REGISTRY): RevenueSourceRegistrySummary {
  return {
    total: items.length,
    byStatus: countBy(SOURCE_STATUS_VALUES, items, (item) => item.implementationStatus),
    byLane: countBy(SOURCE_LANE_VALUES, items, (item) => item.lane),
    byScaleTier: countBy(SOURCE_SCALE_VALUES, items, (item) => item.scaleTier),
    bulkReady: items.filter((item) => item.scaleTier === "bulk" && item.implementationStatus !== "catalog_only" && item.implementationStatus !== "disabled_by_policy").length,
    disabledByPolicy: items.filter((item) => item.implementationStatus === "disabled_by_policy").length,
    needsConfiguration: items.filter((item) => item.implementationStatus === "live_if_configured" || item.cost === "env_required").length,
  }
}
