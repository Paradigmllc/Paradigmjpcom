import { createHash } from "node:crypto"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { getBaseSyncStatus } from "./base-sync-service"
import { evaluateProductPublicationGate } from "./product-readiness"
import { getShopifyCatalogSnapshot } from "./shopify-admin"
import { getSocialAutomationStatus } from "./social-pipeline"
import type {
  LaunchAuditTrigger,
  ShopifyLaunchAudit,
  ShopifyLaunchControlStatus,
  ShopifyLaunchGate,
} from "./types"

type DbRow = Record<string, unknown>

export const LAUNCH_AUDIT_INTERVAL_HOURS = 6

function requireDatabase() {
  const database = getServiceSalesSupabase()
  if (!database) throw new Error("ローンチ監査用データベースが設定されていません")
  return database
}

function stringFrom(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function numberFrom(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function booleanFrom(value: unknown): boolean {
  return value === true
}

function envFlag(name: string): boolean {
  return /^(1|true|yes)$/i.test(process.env[name]?.trim() ?? "")
}

function gateArray(value: unknown): ShopifyLaunchGate[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is ShopifyLaunchGate => (
    Boolean(item)
    && typeof item === "object"
    && typeof (item as ShopifyLaunchGate).key === "string"
    && ((item as ShopifyLaunchGate).status === "ready" || (item as ShopifyLaunchGate).status === "blocked")
  ))
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function auditFromRow(row: DbRow): ShopifyLaunchAudit {
  return {
    id: stringFrom(row.id),
    triggerSource: row.trigger_source === "manual" ? "manual" : "scheduled",
    status: row.status === "ready" || row.status === "failed" ? row.status : "blocked",
    readyGateCount: numberFrom(row.ready_gate_count),
    totalGateCount: numberFrom(row.total_gate_count),
    catalogProductCount: numberFrom(row.catalog_product_count),
    eligibleProductCount: numberFrom(row.eligible_product_count),
    storefrontPasswordProtected: booleanFrom(row.storefront_password_protected),
    publicReleaseApproved: booleanFrom(row.public_release_approved),
    fingerprint: stringFrom(row.fingerprint),
    gates: gateArray(row.gates),
    blockers: stringArray(row.blockers),
    startedAt: stringFrom(row.started_at),
    completedAt: stringFrom(row.completed_at),
  }
}

function productGateFromRow(row: DbRow) {
  return evaluateProductPublicationGate({
    status: stringFrom(row.status),
    inventoryOnHand: numberFrom(row.inventory_on_hand),
    photoReady: numberFrom(row.photo_ready),
    shopifyHandle: stringFrom(row.shopify_handle) || null,
    supplierUrl: stringFrom(row.supplier_url) || null,
    primaryImageUrl: stringFrom(row.primary_image_url) || null,
    originCountryCode: stringFrom(row.origin_country_code) || null,
    hsCode: stringFrom(row.hs_code) || null,
    fulfillmentDays: numberFrom(row.fulfillment_days),
    supplierVerified: booleanFrom(row.supplier_verified),
    sampleVerified: booleanFrom(row.sample_verified),
    imageRightsVerified: booleanFrom(row.image_rights_verified),
    complianceVerified: booleanFrom(row.compliance_verified),
    fulfillmentVerified: booleanFrom(row.fulfillment_verified),
  })
}

export type StorefrontProbe = {
  reachable: boolean
  passwordProtected: boolean
  status: number | null
  location: string | null
}

export async function probeSericiaStorefront(fetcher: typeof fetch = fetch): Promise<StorefrontProbe> {
  try {
    const response = await fetcher("https://sericia.com", {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "Paradigm-SERICIA-Launch-Audit/1.0" },
    })
    const location = response.headers.get("location")
    return {
      reachable: response.status >= 200 && response.status < 500,
      passwordProtected: response.status >= 300 && response.status < 400 && Boolean(location?.includes("/password")),
      status: response.status,
      location,
    }
  } catch (error) {
    console.error("[shopify-launch-control] storefront probe failed:", error)
    return { reachable: false, passwordProtected: true, status: null, location: null }
  }
}

type EvaluationInput = {
  shopifyReachable: boolean
  catalogProductCount: number
  eligibleProductCount: number
  baseAppConfigured: boolean
  baseShopConnected: boolean
  baseLastScheduledStatus: string | null
  baseLastScheduledAt: string | null
  socialConnectorConfigured: boolean
  socialLastStatus: string | null
  socialLastStartedAt: string | null
  storefrontReachable: boolean
  storefrontPasswordProtected: boolean
  paymentsVerified: boolean
  checkoutVerified: boolean
  policiesVerified: boolean
  publicReleaseApproved: boolean
  now?: Date
}

function recentEnough(value: string | null, maxHours: number, now: Date): boolean {
  if (!value) return false
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && timestamp >= now.getTime() - maxHours * 60 * 60 * 1_000
}

export function evaluateLaunchGates(input: EvaluationInput): ShopifyLaunchGate[] {
  const now = input.now ?? new Date()
  const baseFresh = input.baseLastScheduledStatus === "succeeded" && recentEnough(input.baseLastScheduledAt, 2, now)
  const socialFresh = input.socialLastStatus === "succeeded" && recentEnough(input.socialLastStartedAt, 36, now)
  const gate = (
    key: string,
    category: ShopifyLaunchGate["category"],
    label: string,
    ready: boolean,
    success: string,
    blocked: string,
  ): ShopifyLaunchGate => ({ key, category, label, status: ready ? "ready" : "blocked", detail: ready ? success : blocked })

  return [
    gate("shopify_admin", "operations", "Shopify Admin API", input.shopifyReachable, "接続と商品監査が正常です", "Shopify Admin APIを確認できません"),
    gate("storefront_health", "storefront", "ストア到達性", input.storefrontReachable, "sericia.comへ到達できます", "sericia.comへ到達できません"),
    gate("base_source", "catalog", "BASE商品ソース", input.baseAppConfigured && input.baseShopConnected, "BASE DevelopersアプリとOAuthが接続済みです", "BASE DevelopersアプリまたはOAuthが未接続です"),
    gate("inventory_automation", "operations", "在庫同期の鮮度", baseFresh, "直近2時間の自動同期が正常です", "直近2時間に成功した自動同期がありません"),
    gate("catalog", "catalog", "実商品カタログ", input.catalogProductCount > 0, `${input.catalogProductCount}商品をShopifyで確認しました`, "Shopifyに実商品がありません"),
    gate("product_evidence", "catalog", "商品公開証跡", input.eligibleProductCount > 0, `${input.eligibleProductCount}商品が14項目の公開ゲートを通過しています`, "公開ゲートを通過した商品がありません"),
    gate("payments", "checkout", "決済確認", input.paymentsVerified, "本番決済の確認証跡があります", "Shopify PaymentsまたはPayPalの本番確認が未完了です"),
    gate("checkout", "checkout", "実注文E2E", input.checkoutVerified, "注文から完了までの本番E2E証跡があります", "実注文・決済・注文記録のE2Eが未確認です"),
    gate("policies", "checkout", "配送・税・返品", input.policiesVerified, "配送・税・返品ポリシーの本番確認済みです", "配送・税・返品ポリシーの本番確認が未完了です"),
    gate("social_connector", "social", "SNS公開接続", input.socialConnectorConfigured, "承認済みSNSへ直接投稿できます", "InstagramまたはPinterest Businessが未接続です"),
    gate("social_automation", "social", "SNS日次運転", socialFresh, "直近36時間の日次パイプラインが成功しています", "直近36時間に成功したSNS日次運転がありません"),
    gate(
      "public_release",
      "storefront",
      "一般公開ロック",
      input.publicReleaseApproved && !input.storefrontPasswordProtected,
      "公開承認済みでパスワード保護が解除されています",
      input.publicReleaseApproved ? "公開承認後もパスワード保護が残っています" : "公開承認前のためパスワード保護を維持しています",
    ),
  ]
}

async function collectSnapshot() {
  const database = requireDatabase()
  const [productsResult, baseSync, socialAutomation, storefront, shopifyResult] = await Promise.all([
    database.from(DB_TABLES.SHOPIFY_OPS_PRODUCTS).select("*"),
    getBaseSyncStatus(),
    getSocialAutomationStatus(),
    probeSericiaStorefront(),
    getShopifyCatalogSnapshot().catch((error) => {
      console.error("[shopify-launch-control] Shopify catalog probe failed:", error)
      return { reachable: false, productCount: 0, primaryDomain: null }
    }),
  ])
  if (productsResult.error) throw new Error(`商品公開証跡の取得に失敗しました: ${productsResult.error.message}`)
  const productRows = (productsResult.data ?? []) as DbRow[]
  const eligibleProductCount = productRows.filter((row) => productGateFromRow(row).ready).length
  const socialConnectorConfigured = socialAutomation.connectors.some((connector) => (
    connector.directPublishingSupported && connector.configured
  ))
  const latestSocial = socialAutomation.recentRuns[0] ?? null
  const latestBase = baseSync.lastScheduledRun
  const publicReleaseApproved = envFlag("SERICIA_PUBLIC_RELEASE_APPROVED")
  const gates = evaluateLaunchGates({
    shopifyReachable: shopifyResult.reachable,
    catalogProductCount: shopifyResult.productCount,
    eligibleProductCount,
    baseAppConfigured: baseSync.baseAppConfigured,
    baseShopConnected: baseSync.baseShopConnected,
    baseLastScheduledStatus: latestBase?.status ?? null,
    baseLastScheduledAt: latestBase?.startedAt ?? null,
    socialConnectorConfigured,
    socialLastStatus: latestSocial?.status ?? null,
    socialLastStartedAt: latestSocial?.startedAt ?? null,
    storefrontReachable: storefront.reachable,
    storefrontPasswordProtected: storefront.passwordProtected,
    paymentsVerified: envFlag("SERICIA_PAYMENTS_VERIFIED"),
    checkoutVerified: envFlag("SERICIA_CHECKOUT_E2E_VERIFIED"),
    policiesVerified: envFlag("SERICIA_POLICIES_VERIFIED"),
    publicReleaseApproved,
  })
  const blockers = gates.filter((item) => item.status === "blocked").map((item) => item.detail)
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(gates.map(({ key, status, detail }) => ({ key, status, detail }))))
    .digest("hex")

  return {
    status: blockers.length === 0 ? "ready" as const : "blocked" as const,
    readyGateCount: gates.length - blockers.length,
    totalGateCount: gates.length,
    catalogProductCount: shopifyResult.productCount,
    eligibleProductCount,
    storefrontPasswordProtected: storefront.passwordProtected,
    publicReleaseApproved,
    safetyLockActive: storefront.passwordProtected && !publicReleaseApproved,
    gates,
    blockers,
    fingerprint,
    snapshot: {
      storefront,
      shopify: shopifyResult,
      base: {
        appConfigured: baseSync.baseAppConfigured,
        connected: baseSync.baseShopConnected,
        linkedProductCount: baseSync.linkedProductCount,
        latestScheduledRunId: latestBase?.id ?? null,
      },
      social: {
        connectorConfigured: socialConnectorConfigured,
        latestRunId: latestSocial?.id ?? null,
      },
    },
  }
}

export async function getLaunchControlStatus(): Promise<ShopifyLaunchControlStatus> {
  const database = requireDatabase()
  const { data, error } = await database
    .from(DB_TABLES.SHOPIFY_LAUNCH_AUDIT_RUNS)
    .select("*")
    .order("completed_at", { ascending: false })
    .limit(12)
  if (error) throw new Error(`ローンチ監査履歴の取得に失敗しました: ${error.message}`)
  const recentAudits = ((data ?? []) as DbRow[]).map(auditFromRow)
  const latestAudit = recentAudits[0] ?? null
  if (!latestAudit) {
    const snapshot = await collectSnapshot()
    return {
      ...snapshot,
      latestAudit: null,
      recentAudits: [],
      scheduledAutomationEnabled: true,
      auditIntervalHours: LAUNCH_AUDIT_INTERVAL_HOURS,
    }
  }
  return {
    status: latestAudit.status,
    readyGateCount: latestAudit.readyGateCount,
    totalGateCount: latestAudit.totalGateCount,
    catalogProductCount: latestAudit.catalogProductCount,
    eligibleProductCount: latestAudit.eligibleProductCount,
    storefrontPasswordProtected: latestAudit.storefrontPasswordProtected,
    publicReleaseApproved: latestAudit.publicReleaseApproved,
    safetyLockActive: latestAudit.storefrontPasswordProtected && !latestAudit.publicReleaseApproved,
    gates: latestAudit.gates,
    blockers: latestAudit.blockers,
    latestAudit,
    recentAudits,
    scheduledAutomationEnabled: true,
    auditIntervalHours: LAUNCH_AUDIT_INTERVAL_HOURS,
  }
}

export async function runLaunchAudit(triggerSource: LaunchAuditTrigger): Promise<{
  audit: ShopifyLaunchAudit
  notifyOperator: boolean
}> {
  const database = requireDatabase()
  const startedAt = new Date().toISOString()
  const { data: previousData, error: previousError } = await database
    .from(DB_TABLES.SHOPIFY_LAUNCH_AUDIT_RUNS)
    .select("*")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (previousError) throw new Error(`直前のローンチ監査取得に失敗しました: ${previousError.message}`)
  const previous = previousData ? auditFromRow(previousData as DbRow) : null
  const snapshot = await collectSnapshot()
  const completedAt = new Date().toISOString()
  const { data, error } = await database.from(DB_TABLES.SHOPIFY_LAUNCH_AUDIT_RUNS).insert({
    trigger_source: triggerSource,
    status: snapshot.status,
    ready_gate_count: snapshot.readyGateCount,
    total_gate_count: snapshot.totalGateCount,
    catalog_product_count: snapshot.catalogProductCount,
    eligible_product_count: snapshot.eligibleProductCount,
    storefront_password_protected: snapshot.storefrontPasswordProtected,
    public_release_approved: snapshot.publicReleaseApproved,
    fingerprint: snapshot.fingerprint,
    gates: snapshot.gates,
    blockers: snapshot.blockers,
    snapshot: snapshot.snapshot,
    started_at: startedAt,
    completed_at: completedAt,
  }).select("*").single()
  if (error) throw new Error(`ローンチ監査の保存に失敗しました: ${error.message}`)
  const audit = auditFromRow(data as DbRow)
  return {
    audit,
    notifyOperator: !previous || previous.fingerprint !== audit.fingerprint || previous.status !== audit.status,
  }
}
