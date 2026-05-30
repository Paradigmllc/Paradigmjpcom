/**
 * lib/notion.ts — Notion API client (営業 OS hub for Sprint 8)
 *
 * 役割: Notion API (notion.com/api/v1) を fetch wrapper で呼び出す lib。
 *       営業 OS の 4 DB (リード/顧客/納品/テンプレ) との同期に使う唯一の窓口。
 *
 * 設計原則:
 *   1. レート制限 (3 req/秒) を内部キューで守る — Notion 公式制限超過で 429 を防ぐ
 *   2. fetch ベース (依存追加ゼロ・Vercel/Cloudflare edge 対応)
 *   3. env 未設定なら全 method が `{ ok: false }` を返す (fail-soft・本番事故防止)
 *   4. sync ログは lib/sales/sync.ts で記録 (Supabase sales_sync_logs)
 *
 * Sprint 8 (2026-05-13) 新規。
 */

const NOTION_API = "https://api.notion.com/v1"
const NOTION_VERSION = "2022-06-28"
const RATE_LIMIT_MS = 350 // 3 req/秒 → 333ms 間隔 + 17ms バッファ

const apiKey = () => process.env.NOTION_API_KEY ?? ""

/* ───── Rate limiter (in-memory FIFO queue) ───── */
let lastCallAt = 0
async function rateLimit(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastCallAt
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed))
  }
  lastCallAt = Date.now()
}

/* ───── Core fetch wrapper ───── */
export interface NotionResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
  status?: number
}

async function notionFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<NotionResponse<T>> {
  const key = apiKey()
  if (!key) {
    console.warn("[notion] NOTION_API_KEY not set — fail-soft no-op")
    return { ok: false, error: "NOTION_API_KEY not configured" }
  }
  await rateLimit()
  try {
    const res = await fetch(`${NOTION_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${key}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return { ok: false, error: text || res.statusText, status: res.status }
    }
    const data = (await res.json()) as T
    return { ok: true, data, status: res.status }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

/* ───── Public API: Page operations ───── */

/** Notion page を作成 (sales_companies → Notion リードDB に新規ページ) */
export async function notionCreatePage(
  databaseId: string,
  properties: Record<string, unknown>,
): Promise<NotionResponse<{ id: string }>> {
  return notionFetch("/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  })
}

/** Notion page URL helper. Notion accepts both dashed and undashed ids in URLs. */
export function notionPageUrl(pageId: string): string {
  return `https://www.notion.so/${pageId.replace(/-/g, "")}`
}

/** Notion page の properties を更新 (Supabase → Notion 一方向同期) */
export async function notionUpdatePage(
  pageId: string,
  properties: Record<string, unknown>,
): Promise<NotionResponse> {
  return notionFetch(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  })
}

/** Notion page を archive (削除ではなく archive・Notion 仕様) */
export async function notionArchivePage(
  pageId: string,
): Promise<NotionResponse> {
  return notionFetch(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ archived: true }),
  })
}

/* ───── Public API: Database query ───── */

interface QueryResult {
  results: Array<{ id: string; properties: Record<string, unknown>; last_edited_time: string }>
  has_more: boolean
  next_cursor: string | null
}

/** Notion DB を filter 付きで query (例: domain で既存 lead 探索) */
export async function notionQueryDatabase(
  databaseId: string,
  filter?: Record<string, unknown>,
  pageSize: number = 100,
): Promise<NotionResponse<QueryResult>> {
  return notionFetch<QueryResult>(`/databases/${databaseId}/query`, {
    method: "POST",
    body: JSON.stringify({
      ...(filter ? { filter } : {}),
      page_size: pageSize,
    }),
  })
}

/** companies.domain で Notion 側の既存ページを検索 (重複作成防止) */
export async function notionFindPageByDomain(
  databaseId: string,
  domain: string,
  domainPropertyName: string = "ドメイン",
): Promise<NotionResponse<{ id: string } | null>> {
  const clean = domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./i, "")
    .toLowerCase()
  const res = await notionQueryDatabase(databaseId, {
    or: [
      { property: domainPropertyName, url: { equals: clean } },
      { property: domainPropertyName, url: { equals: `https://${clean}` } },
      { property: domainPropertyName, url: { equals: `https://www.${clean}` } },
    ],
  })
  if (!res.ok) return { ok: false, error: res.error }
  const first = res.data?.results[0]
  return { ok: true, data: first ? { id: first.id } : null }
}

/** Notion DB の差分取得 (last_edited_time > since の page 一覧) — N→S 逆流に使用 */
export async function notionQueryRecentlyEdited(
  databaseId: string,
  sinceIso: string,
  pageSize: number = 100,
): Promise<NotionResponse<QueryResult>> {
  return notionQueryDatabase(
    databaseId,
    {
      timestamp: "last_edited_time",
      last_edited_time: { on_or_after: sinceIso },
    },
    pageSize,
  )
}

/* ───── Public API: 単一ページ取得 + Bot 自己識別 (Webhook 用) ───── */

interface NotionPage {
  id: string
  parent: { type: string; database_id?: string; data_source_id?: string }
  properties: Record<string, unknown>
  last_edited_time: string
  archived?: boolean
  in_trash?: boolean
}

/** 単一 Notion ページを取得 (properties + parent.database_id)。Webhook で entity.id から実値を引く */
export async function notionGetPage(
  pageId: string,
): Promise<NotionResponse<NotionPage>> {
  return notionFetch<NotionPage>(`/pages/${pageId}`)
}

/**
 * この integration の bot user id を取得 (cache)。
 * Webhook のエコーループ防止に使う: 変更者 (authors) が自分の bot なら無視する
 * (= Supabase→Notion 同期で自分が書いた変更を再び拾わない)。
 */
let cachedBotId: string | null = null
export async function notionGetBotId(): Promise<string | null> {
  if (cachedBotId) return cachedBotId
  const envBot = process.env.NOTION_BOT_ID
  if (envBot) {
    cachedBotId = envBot
    return cachedBotId
  }
  const res = await notionFetch<{ id: string }>("/users/me")
  if (res.ok && res.data?.id) {
    cachedBotId = res.data.id
    return cachedBotId
  }
  return null
}

/* ───── Helpers: Notion property シリアライゼーション ───── */

/** Notion property shape を簡潔に作るヘルパ群 */
export const N = {
  title: (text: string) => ({ title: [{ text: { content: text } }] }),
  richText: (text: string) => ({ rich_text: [{ text: { content: text } }] }),
  url: (url: string) => ({ url }),
  number: (num: number) => ({ number: num }),
  select: (name: string) => ({ select: { name } }),
  multiSelect: (names: string[]) => ({
    multi_select: names.map((name) => ({ name })),
  }),
  checkbox: (checked: boolean) => ({ checkbox: checked }),
  date: (iso: string | null) => ({ date: iso ? { start: iso } : null }),
} as const

/** Notion API response からプロパティ値を抜き出すヘルパ */
export function extractProperty(
  properties: Record<string, unknown>,
  key: string,
): string | number | boolean | string[] | null {
  const p = properties[key] as { type?: string; [k: string]: unknown } | undefined
  if (!p?.type) return null
  switch (p.type) {
    case "title":
      return (p.title as Array<{ plain_text: string }>)?.[0]?.plain_text ?? null
    case "rich_text":
      return (p.rich_text as Array<{ plain_text: string }>)?.[0]?.plain_text ?? null
    case "url":
      return (p.url as string) ?? null
    case "number":
      return (p.number as number) ?? null
    case "select":
      return (p.select as { name: string } | null)?.name ?? null
    case "multi_select":
      return ((p.multi_select as Array<{ name: string }>) ?? []).map((s) => s.name)
    case "status":
      // Notion "status" 型 (Kanban 用・select とは別物) — 商談ステージ等で使用
      return (p.status as { name: string } | null)?.name ?? null
    case "people":
      // 担当者 (people 型) — 先頭ユーザーの表示名 (なければ id) を返す
      return (
        ((p.people as Array<{ name?: string; id: string }>) ?? [])[0]?.name ??
        ((p.people as Array<{ id: string }>) ?? [])[0]?.id ??
        null
      )
    case "checkbox":
      return (p.checkbox as boolean) ?? false
    case "date":
      return (p.date as { start: string } | null)?.start ?? null
    default:
      return null
  }
}

/** env 確認用 — admin が Sprint 8 セットアップ時に動作確認できる */
export function notionIsConfigured(): boolean {
  return !!process.env.NOTION_API_KEY
}
