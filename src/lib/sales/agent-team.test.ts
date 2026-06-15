import { describe, expect, it } from "vitest"
import { classifyAgentCommand } from "./agent-team"

describe("classifyAgentCommand", () => {
  it("routes Telegram sales operations to safe intents", () => {
    expect(classifyAgentCommand("今日の営業OS状況を見て")).toBe("status_report")
    expect(classifyAgentCommand("\u55b6\u696d\u72b6\u6cc1\u3092\u78ba\u8a8d\u3057\u3066")).toBe("status_report")
    expect(classifyAgentCommand("カルテ生成を3件進めて")).toBe("run_enrichment")
    expect(classifyAgentCommand("フォーム営業dry-runを5件実行して")).toBe("run_outreach_dry_run")
    expect(classifyAgentCommand("Twenty同期して")).toBe("sync_twenty")
    expect(classifyAgentCommand("Web制作向けの資料と動画ブリーフを準備して")).toBe("prepare_assets")
  })

  it("classifies natural language list acquisition as collect_list", () => {
    expect(classifyAgentCommand("ZA\u306eWooCommerce\u30ea\u30b9\u30c81\u4ef6\u53ce\u96c6\u3057\u3066")).toBe("collect_list")
    expect(classifyAgentCommand("\u30b9\u30a4\u30b9\u306eHubSpot\u30ea\u30b9\u30c8\u5168\u3066\u96c6\u3081\u3066")).toBe("collect_list")
    expect(classifyAgentCommand("\u5357\u30a2\u30d5\u30ea\u30ab\u306eShopify\u4e00\u89a7\u3092\u62bd\u51fa")).toBe("collect_list")
  })

  it("routes unclear instructions to manual review", () => {
    expect(classifyAgentCommand("この会社をいい感じに進めて")).toBe("manual_review")
    expect(classifyAgentCommand("")).toBe("unknown")
  })
})
