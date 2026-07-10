import { describe, it, expect } from "vitest"
import { classifyAgentCommand } from "./agent-team"
import { buildOssLinksKeyboard } from "./agent-team-telegram"

describe("OSS management deep links (Phase 8-3 / 8-7)", () => {
  it("classifies OSS / dashboard / tool commands as oss_links", () => {
    expect(classifyAgentCommand("/oss")).toBe("oss_links")
    expect(classifyAgentCommand("動向")).toBe("oss_links")
    expect(classifyAgentCommand("ダッシュボード")).toBe("oss_links")
    expect(classifyAgentCommand("metabase")).toBe("oss_links")
    expect(classifyAgentCommand("chatwoot 開いて")).toBe("oss_links")
  })

  it("does not steal generic status commands", () => {
    expect(classifyAgentCommand("状況")).toBe("status_report")
    expect(classifyAgentCommand("status")).toBe("status_report")
  })

  it("builds a keyboard with url deep links to the OSS tools", () => {
    const kb = buildOssLinksKeyboard()
    const urls = kb.inline_keyboard.flat().filter((b) => "url" in b && b.url).map((b) => b.url as string)
    expect(urls.length).toBe(5)
    expect(urls.some((u) => /metabase/i.test(u))).toBe(true)
    expect(urls.some((u) => /chatwoot/i.test(u))).toBe(true)
    expect(urls.some((u) => /keystatic/i.test(u))).toBe(true)
    expect(urls.some((u) => /directus/i.test(u))).toBe(true)
    expect(urls).toContain("https://twenty.paradigmjp.com")
    // back-to-menu uses a callback, not a url
    expect(kb.inline_keyboard.flat().some((b) => b.callback_data === "/menu")).toBe(true)
  })
})
