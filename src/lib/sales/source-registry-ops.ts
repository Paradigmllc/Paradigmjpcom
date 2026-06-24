import type { RevenueSourceRegistryItem } from "./source-registry-types"

function item(input: RevenueSourceRegistryItem): RevenueSourceRegistryItem {
  return input
}

// Data lives in source-registry-data.ts to keep this file under 500 lines.
export { REVENUE_SOURCE_REGISTRY_OPS } from "./source-registry-data"
