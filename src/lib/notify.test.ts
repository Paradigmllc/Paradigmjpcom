import { afterEach, describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getServiceSalesSupabase: vi.fn(),
  insert: vi.fn(),
}))

vi.mock("@/lib/supabase", () => ({
  getServiceSalesSupabase: mocks.getServiceSalesSupabase,
}))

import { notifyBothChannels } from "./notify"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe("notifyBothChannels", () => {
  test("returns explicit channel failures when notification infrastructure is missing", async () => {
    vi.stubEnv("SLACK_BOT_TOKEN", "")
    mocks.getServiceSalesSupabase.mockReturnValue(null)

    const result = await notifyBothChannels("contact", {
      title: "Japan Entry application",
      message: "Lead saved",
      leadId: "lead-123",
    })

    expect(result).toMatchObject({
      ok: false,
      slack: { ok: false, error: expect.stringContaining("not configured") },
      database: { ok: false, error: expect.stringContaining("not available") },
    })
  })

  test("attaches the persisted lead id to the DB notification", async () => {
    vi.stubEnv("SLACK_BOT_TOKEN", "slack-token")
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    )
    mocks.insert.mockResolvedValue({ error: null })
    mocks.getServiceSalesSupabase.mockReturnValue({
      from: () => ({ insert: mocks.insert }),
    })

    const result = await notifyBothChannels("contact", {
      title: "Japan Entry application",
      message: "Lead saved",
      leadId: "lead-123",
      idempotencyKey: "idem-123",
    })

    expect(result.ok).toBe(true)
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Japan Entry application",
        source_tool: "supabase",
        target_tool: null,
        meta: expect.objectContaining({
          lead_id: "lead-123",
          idempotency_key: "idem-123",
        }),
      }),
    )
  })

  test("reuses an atomic contact outbox without inserting a second DB bell", async () => {
    vi.stubEnv("SLACK_BOT_TOKEN", "slack-token")
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const outboxId = "22222222-2222-4222-8222-222222222222"
    const result = await notifyBothChannels("contact", {
      title: "Japan Entry application",
      message: "Lead saved",
      existingQueueItemId: outboxId,
      clientMessageId: outboxId,
    })

    expect(result).toEqual({
      ok: true,
      slack: { ok: true },
      database: { ok: true },
    })
    expect(mocks.getServiceSalesSupabase).not.toHaveBeenCalled()
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(
      JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)),
    ).toMatchObject({ client_msg_id: outboxId })
  })
})
