import { beforeEach, describe, expect, it, vi } from "vitest"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { canonicalLibrary, LIBRARY_EVENT, type LibrarySave } from "./library"
import type { SalesApiPrincipal } from "@/lib/sales/api-auth"

const mock = vi.hoisted(() => ({ database: vi.fn() }))
vi.mock("@/lib/supabase", () => ({ getServiceSalesSupabase: mock.database }))
import { getLibraryVersion, listLibraryVersions, saveLibraryVersion } from "./library-repository"

const owner: SalesApiPrincipal = { key: "payload:1", role: "admin", authSource: "payload", email: null }
const other = { ...owner, key: "payload:2" }
const input: LibrarySave = { operationId: "11111111-1111-4111-8111-111111111111", entryId: "11111111-1111-4111-8111-111111111111", parentVersionId: null,
  spec: { kind: "template", name: "テスト", genre: "解説", direction: "線図", limitations: "未検証", references: [], character: null,
    settings: { seed: null, steps: null, width: 1080, height: 1920, fps: 24, durationSeconds: 30 } } }
type Row = { id: string; actor: string; event_type: string; created_at: string; payload: { schemaVersion: number; input: LibrarySave; contentHash: string } }
let rows: Row[]
let raced: boolean
let fail: boolean
let queryFilters: Array<[string, unknown]>

// In-memory PostgREST double enforces the actual query predicates and unique ID constraint.
function query() {
  const filters: Array<[string, unknown]> = []
  let inserted: Omit<Row, "created_at"> | undefined
  const matches = () => rows.filter((row) => filters.every(([key, value]) => key === "payload->input->>entryId" ? row.payload.input.entryId === value : row[key as keyof Row] === value))
  const chain = {
    select: () => chain,
    eq: (key: string, value: unknown) => { filters.push([key, value]); queryFilters.push([key, value]); return chain },
    order: () => chain,
    range: async (start: number, end: number) => ({ data: matches().slice(start, end + 1), error: fail ? { code: "down" } : null }),
    maybeSingle: async () => ({ data: matches()[0] ?? null, error: fail ? { code: "down" } : null }),
    insert: (row: Omit<Row, "created_at">) => { inserted = row; return chain },
    single: async () => {
      if (!inserted) throw new Error("Missing insert")
      if (fail) return { data: null, error: { code: "down" } }
      if (rows.some((row) => row.id === inserted?.id)) return { data: null, error: { code: "23505" } }
      const row = { ...inserted, created_at: "2026-09-08T00:00:00Z" }
      rows.push(row)
      return raced ? { data: null, error: { code: "23505" } } : { data: row, error: null }
    },
  }
  return chain
}

describe("library persistence isolation and replay", () => {
  beforeEach(() => { rows = []; raced = false; fail = false; queryFilters = []; mock.database.mockReturnValue({ from: vi.fn(query) }) })
  it("appends, returns the identical committed version on replay and preserves the parent", async () => {
    const initial = await saveLibraryVersion(input, owner)
    expect(initial.replay).toBe(false)
    expect(await saveLibraryVersion(input, owner)).toMatchObject({ replay: true, version: initial.version })
    const child = { ...input, operationId: "22222222-2222-4222-8222-222222222222", parentVersionId: input.operationId, spec: { ...input.spec, name: "派生" } }
    await saveLibraryVersion(child, owner)
    expect(rows).toHaveLength(2)
    expect((await getLibraryVersion(owner, input.operationId))?.spec.name).toBe("テスト")
    expect(queryFilters).toContainEqual(["actor", owner.key])
    expect(queryFilters).toContainEqual(["event_type", LIBRARY_EVENT])
  })
  it("does not return or fork another login's versions", async () => {
    await saveLibraryVersion(input, owner)
    expect(await getLibraryVersion(other, input.operationId)).toBeNull()
    expect((await listLibraryVersions(other, 0)).versions).toEqual([])
    await expect(saveLibraryVersion({ ...input, operationId: "22222222-2222-4222-8222-222222222222", parentVersionId: input.operationId }, other)).rejects.toThrow("参照元")
    await expect(saveLibraryVersion(input, other)).rejects.toThrow("競合")
  })
  it("rejects changed content with the same operation ID and invalid parent kinds", async () => {
    await saveLibraryVersion(input, owner)
    await expect(saveLibraryVersion({ ...input, spec: { ...input.spec, name: "変更" } }, owner)).rejects.toThrow("同じ保存ID")
    await expect(saveLibraryVersion({ ...input, operationId: "22222222-2222-4222-8222-222222222222", parentVersionId: input.operationId, spec: { ...input.spec, kind: "recipe" } }, owner)).rejects.toThrow("種別")
  })
  it("recovers identical concurrent insert without duplicating a version", async () => {
    raced = true
    expect(await saveLibraryVersion(input, owner)).toMatchObject({ replay: true })
    expect(rows).toHaveLength(1)
  })
  it("detects corrupt metadata, excludes unrelated events and pages at fifty", async () => {
    await saveLibraryVersion(input, owner)
    const original = rows[0]
    for (let index = 1; index < 51; index++) {
      const operationId = `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`
      const item = { ...input, operationId, entryId: operationId }
      rows.push({ ...original, id: operationId, payload: { schemaVersion: 1, input: item, contentHash: createHash("sha256").update(canonicalLibrary(item)).digest("hex") } })
    }
    rows.push({ ...original, event_type: "other_event" })
    expect(await listLibraryVersions(owner, 0)).toMatchObject({ versions: expect.any(Array), nextOffset: 50 })
    expect((await listLibraryVersions(owner, 0)).versions).toHaveLength(50)
    expect((await listLibraryVersions(owner, 50)).versions).toHaveLength(1)
    original.payload.contentHash = "a".repeat(64)
    await expect(getLibraryVersion(owner, input.operationId)).rejects.toThrow("整合性")
  })
  it("fails closed for unavailable DB and unidentified or automation principals", async () => {
    fail = true
    await expect(listLibraryVersions(owner, 0)).rejects.toThrow("query failed")
    await expect(getLibraryVersion({ ...owner, key: "payload:unknown" }, input.operationId)).rejects.toThrow("ログイン")
    await expect(getLibraryVersion({ ...owner, authSource: "webhook" }, input.operationId)).rejects.toThrow("ログイン")
    mock.database.mockReturnValue(null)
    await expect(listLibraryVersions(owner, 0)).rejects.toThrow("unavailable")
  })
  it("keeps private library payloads out of the pre-existing global dashboard query", () => {
    const source = readFileSync("src/lib/video-studio-control/repository.ts", "utf8")
    expect(source).toContain('.from(DB_TABLES.VIDEO_FACTORY_GENERATION_EVENTS).select("*").neq("event_type", LIBRARY_EVENT)')
  })
})
