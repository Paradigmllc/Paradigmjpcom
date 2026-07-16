import { describe, expect, it } from "vitest"
import { formatChatKnowledge, retrieveChatKnowledge } from "./chat-knowledge"

describe("approved chat knowledge retrieval", () => {
  it("retrieves localized pricing evidence with an internal source", () => {
    const sources = retrieveChatKnowledge("What is the $12,000 setup and month seven price?", "en")
    expect(sources[0]?.href).toBe("/en/pricing")
    expect(sources[0]?.content).toContain("$2,000/month")
    expect(sources[0]?.content).toContain("first 10 selected launch partners")
    expect(formatChatKnowledge(sources)).toContain("[Source 1]")
  })

  it("keeps Japanese answers on Japanese approved sources", () => {
    const sources = retrieveChatKnowledge("公開データで売上や訪問数は分かりますか", "ja")
    expect(sources.length).toBeGreaterThan(0)
    expect(sources.every((source) => source.href.startsWith("/ja/"))).toBe(true)
    expect(sources[0]?.content).toContain("訪問数")
  })

  it("does not fabricate a source when nothing matches", () => {
    expect(retrieveChatKnowledge("quantum widgets in Antarctica", "en")).toEqual([])
    expect(formatChatKnowledge([])).toContain("human confirmation")
  })
})
