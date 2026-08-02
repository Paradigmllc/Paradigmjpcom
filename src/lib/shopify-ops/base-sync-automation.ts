import { fetchAllBaseItems } from "./base-client"
import { normalizeBaseItem } from "./base-sync"
import { getBaseSyncStatus, recordScheduledBaseSyncOutcome, runBaseToShopifySync } from "./base-sync-service"
import type { BaseSyncAutomationResult, BaseSyncRun, BaseSyncStatus } from "./types"

const REPEATED_BLOCK_HOURS = 12
const REPEATED_FAILURE_HOURS = 2

type SafetyInput = Pick<BaseSyncStatus,
  "baseAppConfigured" | "baseShopConnected" | "shopifyConfigured" | "syncRunning" | "linkedProductCount"
> & { sourceCount: number | null }

export function assessScheduledBaseSync(input: SafetyInput): string | null {
  if (!input.baseAppConfigured) return "BASE Developersアプリが未設定です"
  if (!input.baseShopConnected) return "BASEショップのOAuth接続がありません"
  if (!input.shopifyConfigured) return "Shopify Admin APIが未設定です"
  if (input.syncRunning) return "別のBASE同期が実行中です"
  if (input.sourceCount === null) return null
  if (input.sourceCount === 0) return "BASEの商品が0件のため自動同期を停止しました"

  if (input.linkedProductCount >= 5) {
    const collapseFloor = Math.ceil(input.linkedProductCount * 0.5)
    if (input.sourceCount < collapseFloor) {
      return `BASE商品数が急減しました（${input.linkedProductCount}件 → ${input.sourceCount}件）`
    }
    const spikeCeiling = Math.max(input.linkedProductCount * 2, input.linkedProductCount + 100)
    if (input.sourceCount > spikeCeiling) {
      return `BASE商品数が異常増加しました（${input.linkedProductCount}件 → ${input.sourceCount}件）`
    }
  }
  return null
}

function repeatedRecently(lastRun: BaseSyncRun | null, status: BaseSyncAutomationResult["status"], reason: string): boolean {
  if (!lastRun || lastRun.status !== status || lastRun.errorMessage !== reason) return false
  const hours = status === "failed" ? REPEATED_FAILURE_HOURS : REPEATED_BLOCK_HOURS
  return Date.parse(lastRun.startedAt) >= Date.now() - hours * 60 * 60 * 1_000
}

export async function runScheduledBaseSync(): Promise<BaseSyncAutomationResult> {
  const before = await getBaseSyncStatus()
  const prerequisiteBlock = assessScheduledBaseSync({ ...before, sourceCount: null })
  if (prerequisiteBlock) {
    if (before.syncRunning && before.lastRun) {
      return { status: "blocked", reason: prerequisiteBlock, run: before.lastRun, notifyOperator: false }
    }
    const notifyOperator = !repeatedRecently(before.lastScheduledRun, "blocked", prerequisiteBlock)
    const run = await recordScheduledBaseSyncOutcome("blocked", prerequisiteBlock)
    return { status: "blocked", reason: prerequisiteBlock, run, notifyOperator }
  }

  let products
  try {
    products = (await fetchAllBaseItems()).map(normalizeBaseItem)
  } catch (error) {
    console.error("[base-sync-scheduled] BASE catalog fetch failed:", error)
    const reason = error instanceof Error ? error.message : String(error)
    const notifyOperator = !repeatedRecently(before.lastScheduledRun, "failed", reason)
    const run = await recordScheduledBaseSyncOutcome("failed", reason)
    return { status: "failed", reason, run, notifyOperator }
  }

  const safetyBlock = assessScheduledBaseSync({ ...before, sourceCount: products.length })
  if (safetyBlock) {
    const notifyOperator = !repeatedRecently(before.lastScheduledRun, "blocked", safetyBlock)
    const run = await recordScheduledBaseSyncOutcome("blocked", safetyBlock, products)
    return { status: "blocked", reason: safetyBlock, run, notifyOperator }
  }

  const run = await runBaseToShopifySync("apply", { triggeredBy: "scheduled", products })
  const recovered = before.lastScheduledRun !== null && before.lastScheduledRun.status !== "succeeded"
  const changed = run.createdCount + run.updatedCount > 0
  return {
    status: run.status === "failed" ? "failed" : "succeeded",
    reason: run.errorMessage,
    run,
    notifyOperator: recovered || changed || run.failedCount > 0,
  }
}
