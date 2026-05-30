import { describe, expect, it } from "vitest"
import { classifyAgentCommand } from "./agent-team"

describe("classifyAgentCommand", () => {
  it("routes Telegram sales operations to safe intents", () => {
    expect(classifyAgentCommand("今日の営業OS状況を見て")).toBe("status_report")
    expect(classifyAgentCommand("カルテ生成を3件進めて")).toBe("run_enrichment")
    expect(classifyAgentCommand("フォーム営業dry-runを5件実行して")).toBe("run_outreach_dry_run")
    expect(classifyAgentCommand("Twenty同期して")).toBe("sync_twenty")
    expect(classifyAgentCommand("Web制作向けの資料と動画ブリーフを準備して")).toBe("prepare_assets")
  })

  it("routes unclear instructions to manual review", () => {
    expect(classifyAgentCommand("この会社をいい感じに進めて")).toBe("manual_review")
    expect(classifyAgentCommand("")).toBe("unknown")
  })
})
