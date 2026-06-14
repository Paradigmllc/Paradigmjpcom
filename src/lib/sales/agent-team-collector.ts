import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { pullTwentyCompaniesToSupabase } from "@/lib/sales/twenty-sync"
import { syncCompanyKarteToTwenty } from "@/lib/sales/twenty-sync"
import type { Region } from "@/lib/sales/types"

const INDUSTRY_MAP: Record<string, string> = {
  "美容院": "beauty_salon", "美容室": "beauty_salon", "ヘアサロン": "beauty_salon",
  "歯科": "dental", "歯医者": "dental", "デンタル": "dental",
  "飲食店": "restaurant", "レストラン": "restaurant", "居酒屋": "restaurant", "カフェ": "restaurant",
  "建設": "construction", "工務店": "construction",
  "会計": "accounting", "税理士": "accounting", "会計士": "accounting",
  "小売": "retail", "販売": "retail", "ショップ": "retail",
  "クリーニング": "cleaning", "清掃": "cleaning",
  "コンサル": "consulting", "コンサルティング": "consulting",
}

const PREFECTURE_MAP: Record<string, string> = {
  "東京": "tokyo", "東京都": "tokyo",
  "大阪": "osaka", "大阪府": "osaka",
  "愛知": "aichi", "愛知県": "aichi",
  "福岡": "fukuoka", "福岡県": "fukuoka",
  "北海道": "hokkaido",
  "神奈川": "kanagawa", "神奈川県": "kanagawa",
}

interface CollectListInput {
  industry?: string
  prefecture?: string
  region: Region
  limit: number
}

interface CollectListResult {
  ok: boolean
  total: number
  companies: Array<{ id: string; company_name: string; domain: string; industry: string | null }>
  twentySync: { attempted: boolean; synced: number; failed: number }
  error?: string
}

function parseCollectCommand(text: string): CollectListInput {
  let industry: string | undefined
  for (const [jp, en] of Object.entries(INDUSTRY_MAP)) {
    if (text.includes(jp)) { industry = en; break }
  }

  let prefecture: string | undefined
  for (const [jp, en] of Object.entries(PREFECTURE_MAP)) {
    if (text.includes(jp)) { prefecture = en; break }
  }

  const region: Region = /(global|海外|世界|グローバル)/i.test(text) ? "global" : "jp"

  const limitMatch = text.match(/(\d+)件/)
  const limit = limitMatch ? Math.min(parseInt(limitMatch[1], 10), 50) : 20

  return { industry, prefecture, region, limit }
}

export async function collectCompanyList(text: string, input: { region?: string | null; limit?: number | null }): Promise<CollectListResult> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, total: 0, companies: [], twentySync: { attempted: false, synced: 0, failed: 0 }, error: "Supabase not configured" }

  const parsed = parseCollectCommand(text)
  const region = (input.region ?? parsed.region ?? "jp") as Region
  const limit = input.limit ?? parsed.limit

  let query = sb.from(DB_TABLES.SALES_COMPANIES).select("id, company_name, domain, industry, meta")

  if (parsed.industry) {
    query = query.eq("industry", parsed.industry)
  }
  if (parsed.prefecture) {
    query = query.ilike("prefecture", `%${parsed.prefecture}%`)
  }
  query = query.eq("region", region)
  query = query.order("created_at", { ascending: false }).limit(limit)

  const { data, error } = await query

  if (error) {
    console.error("[agent-team-collector] query failed:", error.message)
    return { ok: false, total: 0, companies: [], twentySync: { attempted: false, synced: 0, failed: 0 }, error: error.message }
  }

  const companies = ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    company_name: String(r.company_name ?? r.domain ?? "unknown"),
    domain: String(r.domain ?? ""),
    industry: typeof r.industry === "string" ? r.industry : null,
  }))

  let twentySync = { attempted: false, synced: 0, failed: 0 }
  if (companies.length > 0) {
    try {
      await pullTwentyCompaniesToSupabase(limit, { pipelineRunId: "telegram_collect_list" })

      let synced = 0
      let failed = 0
      for (const company of companies) {
        try {
          const syncResult = await syncCompanyKarteToTwenty(company.id)
          if (syncResult.ok) synced++
          else failed++
        } catch {
          failed++
        }
      }
      twentySync = { attempted: true, synced, failed }
    } catch (e) {
      console.error("[agent-team-collector] Twenty sync failed:", e)
    }
  }

  return { ok: true, total: companies.length, companies, twentySync }
}

export function formatCollectListReply(result: CollectListResult): string {
  if (!result.ok) return `❌ リスト収集に失敗しました: ${result.error ?? "不明なエラー"}`
  if (result.total === 0) return "🔍 条件に一致する企業が見つかりませんでした。"

  const lines = [
    `📋 条件に一致する企業を **${result.total}件** 収集しました。`,
    "",
  ]

  result.companies.forEach((c, i) => {
    lines.push(`${i + 1}. ${c.company_name}`)
    if (c.domain) lines.push(`   🌐 ${c.domain}`)
    lines.push("")
  })

  if (result.twentySync.attempted) {
    lines.push(`📤 Twenty同期: ${result.twentySync.synced}件成功 / ${result.twentySync.failed}件失敗`)
  }

  return lines.join("\n")
}
