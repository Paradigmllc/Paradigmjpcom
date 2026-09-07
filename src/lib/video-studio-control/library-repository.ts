import "server-only"
import { createHash } from "node:crypto"
import { z } from "zod"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import type { SalesApiPrincipal } from "@/lib/sales/api-auth"
import { canonicalLibrary, LIBRARY_EVENT, libraryBlockers, librarySaveSchema, type LibrarySave, type LibraryVersion } from "./library"

export class LibraryConflict extends Error {}
const rowSchema = z.object({ id: z.string().uuid(), created_at: z.string().datetime({ offset: true }), payload: z.object({
  schemaVersion: z.literal(1), input: librarySaveSchema, contentHash: z.string().regex(/^[a-f0-9]{64}$/),
}).strict() })

function database(principal: SalesApiPrincipal) {
  // Scope by the existing login identity. Legacy/work logins are shared admin scopes.
  if (!["payload", "legacy", "work"].includes(principal.authSource) || !principal.key || principal.key.endsWith(":unknown")) {
    throw new LibraryConflict("個人を識別できる管理者ログインが必要です")
  }
  const client = getServiceSalesSupabase()
  if (!client) throw new Error("Video Studio database is unavailable")
  return client
}

function hash(input: LibrarySave) { return createHash("sha256").update(canonicalLibrary(input)).digest("hex") }

function version(value: unknown): LibraryVersion {
  const row = rowSchema.parse(value)
  if (row.id !== row.payload.input.operationId || hash(row.payload.input) !== row.payload.contentHash) {
    throw new LibraryConflict("保存済みレシピの整合性検査に失敗しました")
  }
  return { ...row.payload.input, contentHash: row.payload.contentHash, createdAt: row.created_at,
    status: "draft", blockers: libraryBlockers(row.payload.input.spec) }
}

export async function getLibraryVersion(principal: SalesApiPrincipal, id: string): Promise<LibraryVersion | null> {
  const { data, error } = await database(principal).from(DB_TABLES.VIDEO_FACTORY_GENERATION_EVENTS)
    .select("id,created_at,payload").eq("actor", principal.key).eq("event_type", LIBRARY_EVENT).eq("id", id).maybeSingle()
  if (error) throw new Error("Library version query failed")
  return data ? version(data) : null
}

export async function listLibraryVersions(principal: SalesApiPrincipal, offset: number, entryId?: string) {
  let query = database(principal).from(DB_TABLES.VIDEO_FACTORY_GENERATION_EVENTS)
    .select("id,created_at,payload").eq("actor", principal.key).eq("event_type", LIBRARY_EVENT)
  if (entryId) query = query.eq("payload->input->>entryId", entryId)
  const { data, error } = await query.order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 50)
  if (error) throw new Error("Library list query failed")
  const rows = data ?? []
  return { versions: rows.slice(0, 50).map(version), nextOffset: rows.length > 50 ? offset + 50 : null }
}

export async function saveLibraryVersion(input: LibrarySave, principal: SalesApiPrincipal) {
  input = librarySaveSchema.parse(input)
  const client = database(principal)
  const existing = await getLibraryVersion(principal, input.operationId)
  if (existing) {
    if (existing.contentHash !== hash(input)) throw new LibraryConflict("同じ保存IDで内容が変更されています。新しい版として保存してください")
    return { version: existing, replay: true }
  }
  if (input.parentVersionId) {
    const parent = await getLibraryVersion(principal, input.parentVersionId)
    if (!parent || parent.entryId !== input.entryId || parent.spec.kind !== input.spec.kind) {
      throw new LibraryConflict("参照元の版が見つからないか、種別が一致しません")
    }
  }
  const { data, error } = await client.from(DB_TABLES.VIDEO_FACTORY_GENERATION_EVENTS).insert({
    id: input.operationId, event_type: LIBRARY_EVENT, actor: principal.key,
    payload: { schemaVersion: 1, input, contentHash: hash(input) },
  }).select("id,created_at,payload").single()
  if (error) {
    if (error.code === "23505") {
      const concurrent = await getLibraryVersion(principal, input.operationId)
      if (concurrent?.contentHash === hash(input)) return { version: concurrent, replay: true }
      throw new LibraryConflict("保存IDが競合しました。内容は上書きしていません")
    }
    throw new Error("Library insert failed")
  }
  return { version: version(data), replay: false }
}
