import { beforeEach, describe, expect, it, vi } from "vitest"

const callDeepSeek = vi.hoisted(() => vi.fn())
vi.mock("@/lib/deepseek", () => ({ callDeepSeek }))

import { preflightManualWorkBatch } from "./manual-japan-entry-batch-preflight"

beforeEach(() => vi.clearAllMocks())

describe("manual work batch DeepSeek preflight", () => {
  it("accepts a non-empty provider response", async () => {
    callDeepSeek.mockResolvedValue({ ok: true, text: "READY", usedModel: "deepseek-chat" })

    await expect(preflightManualWorkBatch()).resolves.toEqual({ ok: true, usedModel: "deepseek-chat" })
    expect(callDeepSeek).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ maxTokens: 4 }))
  })

  it("preserves the actionable provider error", async () => {
    callDeepSeek.mockResolvedValue({ ok: false, error: "DeepSeek APIの残高不足です" })

    await expect(preflightManualWorkBatch()).resolves.toEqual({
      ok: false,
      error: "DeepSeek APIの残高不足です",
    })
  })
})
