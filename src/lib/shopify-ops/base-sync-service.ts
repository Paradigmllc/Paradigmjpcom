import { DB_TABLES } from "@/lib/sales/db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { fetchAllBaseItems, isBaseAppConfigured, isBaseShopConnected } from "./base-client"
import { buildShopifyProductSetInput, normalizeBaseItem, type NormalizedBaseProduct, type SericiaCollectionHandle } from "./base-sync"
import { ensureShopifyCollection, getShopifyLocationId, isShopifyAdminConfigured, upsertShopifyProduct } from "./shopify-admin"
import type { BaseSyncMode, BaseSyncPreviewItem, BaseSyncRun, BaseSyncRunStatus, BaseSyncStatus } from "./types"

type DbRow = Record<string, unknown>

const COLLECTIONS: Record<SericiaCollectionHandle, string> = {
  tableware: "Tableware",
  craft: "Craft",
  living: "Living",
  gifts: "Gifts",
}

export const BASE_SYNC_AUTOMATION_INTERVAL_MINUTES = 30

type BaseSyncTrigger = BaseSyncRun["triggeredBy"]

type RunOptions = {
  triggeredBy?: BaseSyncTrigger
  products?: NormalizedBaseProduct[]
}

function requireDatabase() {
  const database = getServiceSalesSupabase()
  if (!database) throw new Error("BASE同期用データベースが設定されていません")
  return database
}

function numberFrom(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function stringFrom(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function nullableStringFrom(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function runFromRow(row: DbRow): BaseSyncRun {
  const summary = row.summary && typeof row.summary === "object" ? row.summary as Record<string, unknown> : {}
  return {
    id: stringFrom(row.id),
    mode: row.mode as BaseSyncRun["mode"],
    status: row.status as BaseSyncRun["status"],
    triggeredBy: summary.triggeredBy === "scheduled" ? "scheduled" : "manual",
    sourceCount: numberFrom(row.source_count),
    createdCount: numberFrom(row.created_count),
    updatedCount: numberFrom(row.updated_count),
    skippedCount: numberFrom(row.skipped_count),
    failedCount: numberFrom(row.failed_count),
    errorMessage: nullableStringFrom(row.error_message),
    startedAt: stringFrom(row.started_at),
    completedAt: nullableStringFrom(row.completed_at),
  }
}

function previewFromSummary(value: unknown): BaseSyncPreviewItem[] {
  if (!value || typeof value !== "object" || !("previewItems" in value)) return []
  const previewItems = (value as { previewItems?: unknown }).previewItems
  return Array.isArray(previewItems) ? previewItems.slice(0, 50) as BaseSyncPreviewItem[] : []
}

export async function getBaseSyncStatus(): Promise<BaseSyncStatus> {
  const database = requireDatabase()
  const [connected, runsResult, linksResult] = await Promise.all([
    isBaseShopConnected(),
    database.from(DB_TABLES.SHOPIFY_BASE_SYNC_RUNS).select("*").order("started_at", { ascending: false }).limit(10),
    database.from(DB_TABLES.SHOPIFY_BASE_PRODUCT_LINKS).select("id", { count: "exact", head: true }),
  ])
  if (runsResult.error) throw new Error(`BASE同期履歴の取得に失敗しました: ${runsResult.error.message}`)
  if (linksResult.error) throw new Error(`BASE商品リンク数の取得に失敗しました: ${linksResult.error.message}`)
  const runRows = (runsResult.data ?? []) as DbRow[]
  const recentRuns = runRows.map(runFromRow)
  const lastSummary = runRows[0]?.summary
  const shopifyConfigured = isShopifyAdminConfigured()
  const syncRunning = recentRuns.some((run) => (
    run.status === "running" && Date.parse(run.startedAt) >= Date.now() - 30 * 60 * 1_000
  ))
  return {
    baseAppConfigured: isBaseAppConfigured(),
    baseShopConnected: connected,
    shopifyConfigured,
    syncRunning,
    readyToSync: connected && shopifyConfigured && !syncRunning,
    lastRun: recentRuns[0] ?? null,
    recentRuns,
    linkedProductCount: linksResult.count ?? 0,
    previewItems: previewFromSummary(lastSummary),
    scheduledAutomationEnabled: true,
    automationIntervalMinutes: BASE_SYNC_AUTOMATION_INTERVAL_MINUTES,
    lastScheduledRun: recentRuns.find((run) => run.triggeredBy === "scheduled") ?? null,
  }
}

async function createRun(mode: BaseSyncMode): Promise<string> {
  const database = requireDatabase()
  const { data, error } = await database.rpc("shopify_base_start_sync", { p_mode: mode })
  if (error) {
    if (/already running|既に実行中/i.test(error.message)) {
      throw new Error("BASE同期は既に実行中です。完了後に再試行してください")
    }
    throw new Error(`BASE同期履歴の開始に失敗しました: ${error.message}`)
  }
  const id = stringFrom(data)
  if (!id) throw new Error("BASE同期履歴の開始結果が不正です")
  return id
}

async function updateRun(id: string, patch: Record<string, unknown>): Promise<void> {
  const database = requireDatabase()
  const { error } = await database
    .from(DB_TABLES.SHOPIFY_BASE_SYNC_RUNS)
    .update({ ...patch, completed_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw new Error(`BASE同期履歴の更新に失敗しました: ${error.message}`)
}

function preview(products: NormalizedBaseProduct[]): BaseSyncPreviewItem[] {
  return products.slice(0, 50).map((product) => ({
    baseItemId: product.baseItemId,
    title: product.title,
    sku: product.sku,
    priceJpy: product.priceJpy,
    inventory: product.inventory,
    imageCount: product.imageCount,
    variationCount: product.variationCount,
    collectionHandle: product.collectionHandle,
    visibleInBase: product.visibleInBase,
  }))
}

async function readRun(id: string): Promise<BaseSyncRun> {
  const database = requireDatabase()
  const { data, error } = await database.from(DB_TABLES.SHOPIFY_BASE_SYNC_RUNS).select("*").eq("id", id).single()
  if (error) throw new Error(`BASE同期結果の取得に失敗しました: ${error.message}`)
  return runFromRow(data as DbRow)
}

export async function recordScheduledBaseSyncOutcome(
  status: Extract<BaseSyncRunStatus, "blocked" | "failed">,
  reason: string,
  products: NormalizedBaseProduct[] = [],
): Promise<BaseSyncRun> {
  const runId = await createRun("apply")
  await updateRun(runId, {
    status,
    source_count: products.length,
    failed_count: status === "failed" ? 1 : 0,
    error_message: reason,
    summary: { triggeredBy: "scheduled", previewItems: preview(products), safetyStopped: true },
  })
  return readRun(runId)
}

function sourceSnapshot(product: NormalizedBaseProduct): Record<string, unknown> {
  return {
    title: product.title,
    priceJpy: product.priceJpy,
    inventory: product.inventory,
    collectionHandle: product.collectionHandle,
    modifiedAt: product.modifiedAt,
  }
}

function snapshotsMatch(existing: unknown, next: Record<string, unknown>): boolean {
  if (!existing || typeof existing !== "object") return false
  const current = existing as Record<string, unknown>
  return Object.entries(next).every(([key, value]) => current[key] === value)
}

export async function runBaseToShopifySync(mode: BaseSyncMode, options: RunOptions = {}): Promise<BaseSyncRun> {
  const triggeredBy = options.triggeredBy ?? "manual"
  const runId = await createRun(mode)
  try {
    const products = options.products ?? (await fetchAllBaseItems()).map(normalizeBaseItem)
    const previewItems = preview(products)
    if (mode === "dry_run") {
      await updateRun(runId, {
        status: "succeeded",
        source_count: products.length,
        skipped_count: products.filter((product) => !product.visibleInBase).length,
        summary: { triggeredBy, previewItems },
      })
    } else {
      if (!isShopifyAdminConfigured()) throw new Error("Shopify Admin APIが未設定です")
      const database = requireDatabase()
      const locationId = await getShopifyLocationId()
      const collectionEntries = await Promise.all(Object.entries(COLLECTIONS).map(async ([handle, title]) => [handle, await ensureShopifyCollection(handle, title)] as const))
      const collectionIds = Object.fromEntries(collectionEntries) as Record<SericiaCollectionHandle, string>
      const baseIds = products.map((product) => product.baseItemId)
      const existingResult = baseIds.length > 0
        ? await database.from(DB_TABLES.SHOPIFY_BASE_PRODUCT_LINKS).select("base_item_id,source_snapshot").in("base_item_id", baseIds)
        : { data: [], error: null }
      if (existingResult.error) throw new Error(`BASE商品リンクの取得に失敗しました: ${existingResult.error.message}`)
      const existingIds = new Set(((existingResult.data ?? []) as DbRow[]).map((row) => numberFrom(row.base_item_id)))
      const existingSnapshots = new Map(((existingResult.data ?? []) as DbRow[]).map((row) => [numberFrom(row.base_item_id), row.source_snapshot]))
      let createdCount = 0
      let updatedCount = 0
      let skippedCount = 0
      let failedCount = 0
      const errors: Array<{ baseItemId: number; message: string }> = []

      for (const product of products) {
        try {
          const nextSnapshot = sourceSnapshot(product)
          if (snapshotsMatch(existingSnapshots.get(product.baseItemId), nextSnapshot)) {
            skippedCount += 1
            continue
          }
          const handle = `base-${product.baseItemId}`
          const input = buildShopifyProductSetInput(product, locationId, collectionIds[product.collectionHandle])
          const shopifyProduct = await upsertShopifyProduct(input, handle)
          const variantMap = Object.fromEntries(product.variations.map((variation, index) => [
            String(variation.baseVariationId ?? 0),
            {
              shopifyVariantId: shopifyProduct.variants.nodes[index]?.id ?? null,
              shopifyInventoryItemId: shopifyProduct.variants.nodes[index]?.inventoryItem.id ?? null,
            },
          ]))
          const { error } = await database.from(DB_TABLES.SHOPIFY_BASE_PRODUCT_LINKS).upsert({
            base_item_id: product.baseItemId,
            shopify_product_id: shopifyProduct.id,
            shopify_handle: shopifyProduct.handle,
            variant_map: variantMap,
            source_snapshot: nextSnapshot,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "base_item_id" })
          if (error) throw new Error(error.message)
          if (existingIds.has(product.baseItemId)) updatedCount += 1
          else createdCount += 1
        } catch (error) {
          console.error(`[base-sync] product ${product.baseItemId} failed:`, error)
          failedCount += 1
          errors.push({ baseItemId: product.baseItemId, message: error instanceof Error ? error.message : String(error) })
        }
      }
      await updateRun(runId, {
        status: failedCount > 0 ? "failed" : "succeeded",
        source_count: products.length,
        created_count: createdCount,
        updated_count: updatedCount,
        skipped_count: skippedCount,
        failed_count: failedCount,
        summary: { triggeredBy, previewItems, errors: errors.slice(0, 50) },
        error_message: failedCount > 0 ? `${failedCount}件の商品同期に失敗しました` : null,
      })
    }
  } catch (error) {
    console.error("[base-sync] run failed:", error)
    await updateRun(runId, {
      status: "failed",
      failed_count: 1,
      error_message: error instanceof Error ? error.message : String(error),
    })
    throw error
  }

  return readRun(runId)
}
