import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import {
  listLeadCandidates,
  type CandidateListItem,
} from "@/lib/sales/lead-candidates"
import { ingestLeadCandidatesDurable } from "@/lib/sales/lead-candidate-runs"
import { startPassiveInventoryRunAndDispatch } from "@/lib/sales/passive-inventory-runner"
import { pullTwentyCompaniesToSupabase, syncCompanyKarteToTwenty } from "@/lib/sales/twenty-sync"
import type { Region } from "@/lib/sales/types"
import { optionalEnv } from "@/lib/sales/japan-readiness-utils"

const INDUSTRY_MAP: Record<string, string> = {
  "美容院": "beauty_salon",
  "美容室": "beauty_salon",
  "ヘアサロン": "beauty_salon",
  "歯科": "dental",
  "歯医者": "dental",
  "デンタル": "dental",
  "飲食店": "restaurant",
  "レストラン": "restaurant",
  "居酒屋": "restaurant",
  "カフェ": "restaurant",
  "建設": "construction",
  "工務店": "construction",
  "会計": "accounting",
  "税理士": "accounting",
  "小売": "retail",
  "ショップ": "retail",
  "クリーニング": "cleaning",
  "コンサル": "consulting",
}

const PREFECTURE_MAP: Record<string, string> = {
  "東京": "tokyo",
  "東京都": "tokyo",
  "大阪": "osaka",
  "大阪府": "osaka",
  "愛知": "aichi",
  "福岡": "fukuoka",
  "北海道": "hokkaido",
  "神奈川": "kanagawa",
}

const COUNTRY_ALIASES: Record<string, string> = {
  "南アフリカ共和国": "ZA",
  "南アフリカ": "ZA",
  "south africa": "ZA",
  "south-africa": "ZA",
  za: "ZA",
  "スイス": "CH",
  switzerland: "CH",
  swiss: "CH",
  ch: "CH",
  "日本": "JP",
  japan: "JP",
  jp: "JP",
  "ドイツ": "DE",
  germany: "DE",
  de: "DE",
  "フランス": "FR",
  france: "FR",
  fr: "FR",
  "英国": "GB",
  "イギリス": "GB",
  uk: "GB",
  gb: "GB",
  "アメリカ": "US",
  "米国": "US",
  "united states": "US",
  usa: "US",
  us: "US",
  "エジプト": "EG",
  egypt: "EG",
  cairo: "EG",
  eg: "EG",
}

const TECHNOLOGY_ALIASES = [
  "WooCommerce",
  "Shopify",
  "WordPress",
  "Webflow",
  "Wix",
  "Squarespace",
  "HubSpot",
  "HubSpot CMS",
  "Klaviyo",
  "Zendesk",
  "Intercom",
  "Zoho",
  "Salesforce",
  "Twilio",
  "Mailchimp",
  "Magento",
  "PrestaShop",
  "Next.js",
  "React",
  "Vue.js",
]

interface ExistingListInput {
  industry?: string
  prefecture?: string
  region: Region
  limit: number
}

interface CandidateCollectInput {
  countryCode: string
  technology: string | null
  limit: number
  inventoryLimit: number
  verifyLimit: number
  promote: boolean
  minOpportunityScore: number
  startPassiveInventory: boolean
}

interface CollectListResult {
  ok: boolean
  total: number
  companies: Array<{ id: string; company_name: string; domain: string; industry: string | null }>
  twentySync: { attempted: boolean; synced: number; failed: number }
  candidateCollection?: {
    source: string
    runId?: string
    status?: string
    countryCode: string
    technology: string | null
    fetched: number
    verified: number
    matchedTechnology: number
    scored: number
    promoted: number
    jobsEnqueued: number
    hasMore?: boolean
    runnerTriggered?: boolean
    fallbackRunnerStarted?: boolean
    candidates: CandidateListItem[]
    failures: Array<{ key: string; reason: string }>
    passiveInventory?: {
      runId: string
      runnerTriggered: boolean
      fallbackRunnerStarted: boolean
      segments: number
      configuration: Record<string, unknown>
    }
  }
  error?: string
}

function parseExistingListCommand(text: string): ExistingListInput {
  let industry: string | undefined
  for (const [jp, en] of Object.entries(INDUSTRY_MAP)) {
    if (text.includes(jp)) {
      industry = en
      break
    }
  }

  let prefecture: string | undefined
  for (const [jp, en] of Object.entries(PREFECTURE_MAP)) {
    if (text.includes(jp)) {
      prefecture = en
      break
    }
  }

  const region: Region = /(global|海外|世界|グローバル)/i.test(text) ? "global" : "jp"
  const limitMatch = text.match(/(\d+)\s*件/)
  const limit = limitMatch ? Math.min(Number.parseInt(limitMatch[1] ?? "20", 10), 50) : 20
  return { industry, prefecture, region, limit }
}

function parseNumberLimit(text: string, fallback: number): number {
  const match = text.match(/(\d+)\s*(?:件|sites?|domains?|社)?/i)
  if (!match) return fallback
  return Math.max(1, Math.min(Number.parseInt(match[1] ?? String(fallback), 10), 10000))
}

function defaultPassiveInventoryCommandLimit(): number {
  const raw = optionalEnv("PASSIVE_INVENTORY_COMMAND_LIMIT")
  const parsed = raw ? Number.parseInt(raw, 10) : 100_000
  return Number.isFinite(parsed) ? Math.max(1_000, Math.min(parsed, 10_000_000)) : 100_000
}

function parseCountryCode(text: string): string | null {
  const lower = text.toLowerCase()
  for (const [alias, code] of Object.entries(COUNTRY_ALIASES)) {
    const normalizedAlias = alias.toLowerCase()
    if (normalizedAlias.length === 2) {
      if (new RegExp(`\\b${normalizedAlias}\\b`, "i").test(text)) return code
    } else if (lower.includes(normalizedAlias)) {
      return code
    }
  }
  const codeMatch = text.match(/\b([A-Z]{2})\b/)
  return codeMatch?.[1] ?? null
}

function parseTechnology(text: string): string | null {
  const lower = text.toLowerCase()
  for (const technology of TECHNOLOGY_ALIASES) {
    if (lower.includes(technology.toLowerCase())) return technology
  }
  const stackMatch = text.match(/(?:stack|tech|technology|技術|スタック)[:=\s]+([A-Za-z][A-Za-z0-9.+\-\s]{2,40})/i)
  const value = stackMatch?.[1]?.trim()
  return value && value.length <= 40 ? value : null
}

export function parseCandidateCollectCommand(
  text: string,
  input: { limit?: number | null },
): CandidateCollectInput | null {
  if (!/(リスト|収集|集めて|抽出|collect|list)/i.test(text)) return null
  const countryCode = parseCountryCode(text)
  if (!countryCode) return null
  const technology = parseTechnology(text)
  const wantsAll = /(全て|全部|すべて|all)/i.test(text)
  const limit = input.limit ?? parseNumberLimit(text, wantsAll ? 5000 : 200)
  const verifyLimit = Math.min(limit, wantsAll || limit > 1000 ? 5000 : 250)
  const candidateOnly = /(候補だけ|保存だけ|promote\s*false|no\s*promote|候補DBのみ)/i.test(text)
  const promote = !candidateOnly
  const minOpportunityScore = wantsAll || limit > 1000 ? 0 : 50
  const startPassiveInventory = wantsAll && Boolean(technology)
  const inventoryLimit = startPassiveInventory ? Math.max(defaultPassiveInventoryCommandLimit(), limit) : limit
  return { countryCode, technology, limit, inventoryLimit, verifyLimit, promote, minOpportunityScore, startPassiveInventory }
}

async function collectLeadCandidates(request: CandidateCollectInput): Promise<CollectListResult> {
  const result = await ingestLeadCandidatesDurable({
    countryCode: request.countryCode,
    technology: request.technology,
    limit: request.limit,
    verifyLimit: request.verifyLimit,
    promote: request.promote,
    minOpportunityScore: request.minOpportunityScore,
    syncVerifyBatchSize: Math.min(request.verifyLimit, 120),
  })
  const candidates = await listLeadCandidates({
    countryCode: request.countryCode,
    technology: request.technology,
    limit: 20,
  })
  const passiveInventory = request.startPassiveInventory && request.technology
    ? await startPassiveInventoryRunAndDispatch({
      countryCode: request.countryCode,
      technology: request.technology,
      limit: request.inventoryLimit,
    }).catch((error) => {
      console.error("[agent-team-collector] passive inventory dispatch failed:", error)
      return null
    })
    : null
  return {
    ok: result.ok,
    total: candidates.length,
    companies: [],
    twentySync: { attempted: false, synced: 0, failed: 0 },
    candidateCollection: {
      source: result.source,
      runId: result.runId,
      status: result.status,
      countryCode: request.countryCode,
      technology: request.technology,
      fetched: result.fetched,
      verified: result.verified,
      matchedTechnology: result.matchedTechnology,
      scored: result.scored,
      promoted: result.promoted,
      jobsEnqueued: result.jobsEnqueued,
      hasMore: result.hasMore,
      runnerTriggered: result.runnerTriggered,
      fallbackRunnerStarted: result.fallbackRunnerStarted,
      candidates,
      failures: result.failures,
      passiveInventory: passiveInventory
        ? {
          runId: passiveInventory.runId,
          runnerTriggered: passiveInventory.runnerTriggered,
          fallbackRunnerStarted: passiveInventory.fallbackRunnerStarted,
          segments: passiveInventory.segments,
          configuration: passiveInventory.configuration as unknown as Record<string, unknown>,
        }
        : undefined,
    },
    error: result.ok ? undefined : result.failures[0]?.reason,
  }
}

export async function collectCompanyList(
  text: string,
  input: { region?: string | null; limit?: number | null },
): Promise<CollectListResult> {
  const sb = getServiceSalesSupabase()
  if (!sb) {
    return { ok: false, total: 0, companies: [], twentySync: { attempted: false, synced: 0, failed: 0 }, error: "Supabase not configured" }
  }

  const candidateRequest = parseCandidateCollectCommand(text, input)
  if (candidateRequest) return collectLeadCandidates(candidateRequest)

  const parsed = parseExistingListCommand(text)
  const region = (input.region ?? parsed.region ?? "jp") as Region
  const limit = input.limit ?? parsed.limit
  let query = sb.from(DB_TABLES.SALES_COMPANIES).select("id, company_name, domain, industry, meta")

  if (parsed.industry) query = query.eq("industry", parsed.industry)
  if (parsed.prefecture) query = query.ilike("prefecture", `%${parsed.prefecture}%`)
  query = query.eq("region", region).order("created_at", { ascending: false }).limit(limit)

  const { data, error } = await query
  if (error) {
    console.error("[agent-team-collector] query failed:", error.message)
    return { ok: false, total: 0, companies: [], twentySync: { attempted: false, synced: 0, failed: 0 }, error: error.message }
  }

  const companies = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    company_name: String(row.company_name ?? row.domain ?? "unknown"),
    domain: String(row.domain ?? ""),
    industry: typeof row.industry === "string" ? row.industry : null,
  }))

  const twentySync = await syncCollectedCompanies(companies, limit)
  return { ok: true, total: companies.length, companies, twentySync }
}

async function syncCollectedCompanies(
  companies: Array<{ id: string; company_name: string; domain: string; industry: string | null }>,
  limit: number,
): Promise<{ attempted: boolean; synced: number; failed: number }> {
  if (companies.length === 0) return { attempted: false, synced: 0, failed: 0 }
  try {
    await pullTwentyCompaniesToSupabase(limit, { requestedBy: "telegram_collect_list" })
    let synced = 0
    let failed = 0
    for (const company of companies) {
      try {
        const syncResult = await syncCompanyKarteToTwenty(company.id)
        if (syncResult.ok) synced++
        else failed++
      } catch (error) {
        console.error("[agent-team-collector] company Twenty sync failed:", error)
        failed++
      }
    }
    return { attempted: true, synced, failed }
  } catch (error) {
    console.error("[agent-team-collector] Twenty sync failed:", error)
    return { attempted: true, synced: 0, failed: companies.length }
  }
}

export function formatCollectListReply(result: CollectListResult): string {
  if (!result.ok) return `リスト収集に失敗しました: ${result.error ?? "unknown error"}`
  if (result.candidateCollection) return formatCandidateCollectionReply(result.candidateCollection)
  if (result.total === 0) return "条件に一致する既存企業は見つかりませんでした。"

  const lines = [`条件に一致する既存企業を ${result.total} 件取得しました。`, ""]
  result.companies.forEach((company, index) => {
    lines.push(`${index + 1}. ${company.company_name}`)
    if (company.domain) lines.push(`   ${company.domain}`)
    lines.push("")
  })

  if (result.twentySync.attempted) {
    lines.push(`Twenty同期: ${result.twentySync.synced}件成功 / ${result.twentySync.failed}件失敗`)
  }
  return lines.join("\n")
}

function formatCandidateCollectionReply(collection: NonNullable<CollectListResult["candidateCollection"]>): string {
  const runnerState = collection.runnerTriggered && collection.fallbackRunnerStarted ? "triggered+fallback" : collection.runnerTriggered ? "triggered" : collection.fallbackRunnerStarted ? "fallback" : "not-triggered"
  const lines = [
    `候補収集を実行しました: ${collection.countryCode}${collection.technology ? ` / ${collection.technology}` : ""}`,
    collection.runId ? `Run: ${collection.runId} / status: ${collection.status ?? "running"} / runner: ${runnerState}` : "",
    `取得候補: ${collection.fetched}件 / 検証: ${collection.verified}件 / スタック一致: ${collection.matchedTechnology}件 / スコア保存: ${collection.scored}件`,
    collection.promoted > 0
      ? `営業DB昇格: ${collection.promoted}件 / エンリッチ予約: ${collection.jobsEnqueued}件`
      : "営業DB昇格: なし（候補DBに保存）",
    "",
  ]
  if (collection.hasMore) lines.push("残り候補は保存済みです。lead-candidate runner が分割処理を継続します。")

  if (collection.passiveInventory) {
    const passiveRunner = collection.passiveInventory.runnerTriggered && collection.passiveInventory.fallbackRunnerStarted
      ? "triggered+fallback"
      : collection.passiveInventory.runnerTriggered ? "triggered" : collection.passiveInventory.fallbackRunnerStarted ? "fallback" : "not-triggered"
    lines.push(`Passive inventory run: ${collection.passiveInventory.runId} / segments: ${collection.passiveInventory.segments} / runner: ${passiveRunner}`)
  }

  for (const [index, candidate] of collection.candidates.slice(0, 10).entries()) {
    const score = candidate.score?.opportunityScore ?? "-"
    const tech = candidate.technologies.map((item) => item.name).slice(0, 3).join(", ")
    lines.push(`${index + 1}. ${candidate.domain} / score ${score}${tech ? ` / ${tech}` : ""}`)
  }
  if (collection.failures.length > 0) {
    lines.push("")
    lines.push(`警告: ${collection.failures.length}件（例: ${collection.failures[0]?.key}: ${collection.failures[0]?.reason}）`)
  }
  lines.push("")
  lines.push("注: 「全て」は無料のパッシブ在庫スキャンと複数の公開バルクソースを継続処理します。検索スクレイピングや有料APIには依存しません。")
  return lines.join("\n")
}
