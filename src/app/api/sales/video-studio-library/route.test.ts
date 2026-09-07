import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({ auth: vi.fn(), list: vi.fn(), get: vi.fn(), save: vi.fn(), notify: vi.fn() }))
vi.mock("@/lib/sales/api-auth", () => ({ authorizeSalesApiRequest: mocks.auth }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))
vi.mock("@/lib/video-studio-control/library-repository", () => ({
  getLibraryVersion: mocks.get, listLibraryVersions: mocks.list, saveLibraryVersion: mocks.save, LibraryConflict: class extends Error {},
}))
import { GET, POST } from "./route"
const id = "11111111-1111-4111-8111-111111111111"
const input = { operationId: id, entryId: id, parentVersionId: null, spec: { kind: "template", name: "テスト", genre: "解説", direction: "図解", limitations: "未検証", references: [], character: null,
  settings: { seed: null, steps: null, width: 1080, height: 1920, fps: 24, durationSeconds: 30 } } }
const principal = { key: "payload:1", role: "admin", authSource: "payload", email: null }
const request = (body?: string, query = "") => new NextRequest(`http://localhost/api/sales/video-studio-library${query}`, { method: body === undefined ? "GET" : "POST", body })

describe("library API authorization, validation and outcome reporting", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.auth.mockResolvedValue({ ok: true, principal })
    mocks.list.mockResolvedValue({ versions: [], nextOffset: null })
    mocks.get.mockResolvedValue(null)
    mocks.save.mockResolvedValue({ version: { ...input, status: "draft" }, replay: false })
    mocks.notify.mockResolvedValue({ ok: true })
  })
  it("rejects unauthenticated reads and writes", async () => {
    mocks.auth.mockResolvedValue({ ok: false })
    expect((await GET(request())).status).toBe(401)
    expect((await POST(request(JSON.stringify(input)))).status).toBe(401)
    expect(mocks.list).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled()
  })
  it("allows viewer reads with explicit no-write capability", async () => {
    mocks.auth.mockResolvedValue({ ok: true, principal: { ...principal, role: "viewer" } })
    const response = await GET(request())
    expect(await response.json()).toMatchObject({ canWrite: false })
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect((await POST(request(JSON.stringify(input)))).status).toBe(403)
  })
  it("validates pagination and scopes lookups by principal", async () => {
    expect((await GET(request(undefined, "?offset=-1"))).status).toBe(400)
    expect((await GET(request(undefined, "?actor=other"))).status).toBe(400)
    expect((await GET(request(undefined, `?versionId=${id}`))).status).toBe(404)
    expect(mocks.get).toHaveBeenCalledWith(principal, id)
    expect((await GET(request(undefined, `?entryId=${id}&offset=50`))).status).toBe(200)
    expect(mocks.list).toHaveBeenCalledWith(principal, 50, id)
  })
  it("rejects malformed, oversized and approval-injected bodies before persistence", async () => {
    expect((await POST(request("{"))).status).toBe(400)
    expect((await POST(request("あ".repeat(12000)))).status).toBe(413)
    expect((await POST(request(JSON.stringify({ ...input, approved: true })))).status).toBe(400)
    expect(mocks.save).not.toHaveBeenCalled()
    expect(mocks.notify).not.toHaveBeenCalled()
  })
  it("saves only metadata and emits a generic notification without private prompts", async () => {
    expect((await POST(request(JSON.stringify(input)))).status).toBe(201)
    expect(mocks.save).toHaveBeenCalledWith(input, principal)
    expect(mocks.notify).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ idempotencyKey: `video-studio-library:${id}`, clientMessageId: id }))
    expect(JSON.stringify(mocks.notify.mock.calls)).not.toContain(input.spec.direction)
  })
  it("does not resend shared notifications after a committed replay", async () => {
    mocks.save.mockResolvedValue({ version: input, replay: true })
    const response = await POST(request(JSON.stringify(input)))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ notificationOk: null })
    expect(mocks.notify).not.toHaveBeenCalled()
  })
  it("reports partial notification failure without losing the saved version", async () => {
    mocks.notify.mockResolvedValue({ ok: false })
    expect(await (await POST(request(JSON.stringify(input)))).json()).toMatchObject({ ok: true, notificationOk: false, version: { operationId: id } })
  })
  it("sanitizes DB failures and instructs retry with the same operation ID", async () => {
    mocks.save.mockRejectedValue(new Error("database credential secret"))
    const response = await POST(request(JSON.stringify(input)))
    expect(response.status).toBe(503)
    const payload = await response.json()
    expect(payload.error).toContain("同じ内容・保存ID")
    expect(JSON.stringify(payload)).not.toContain("credential")
  })
})
