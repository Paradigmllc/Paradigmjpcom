import { describe, expect, it } from "vitest"
import { manualFormDiscoveryPresentation } from "./manual-form-discovery-status"

describe("manualFormDiscoveryPresentation", () => {
  it("shows a terminal no-public-form result with persisted diagnostics", () => {
    expect(manualFormDiscoveryPresentation({
      formUrl: null,
      formDiscovery: {
        verification: "fallback",
        outcome: "no_public_form",
        outcomeReason: "No usable public inquiry form was verified after checking 14 public routes.",
        checkedUrlCount: 14,
        checkedAt: "2026-07-20T00:00:00.000Z",
      },
    })).toEqual({
      state: "no_public_form",
      label: "公開フォームなし",
      detail: "No usable public inquiry form was verified after checking 14 public routes.",
      checkedUrlCount: 14,
      checkedAt: "2026-07-20T00:00:00.000Z",
    })
  })

  it("requires verified fields before presenting a saved URL as usable", () => {
    const presentation = manualFormDiscoveryPresentation({
      formUrl: "https://example.com/contact",
      formDiscovery: {
        verification: "page",
        outcome: "contact_page_only",
        inspection: { status: "page" },
      },
    })

    expect(presentation.state).toBe("contact_page_only")
    expect(presentation.label).toBe("問い合わせページのみ")
  })

  it("does not expose a URL when the saved form inspection lacks required controls", () => {
    const presentation = manualFormDiscoveryPresentation({
      formUrl: "https://example.com/contact",
      formDiscovery: {
        verification: "form",
        confidence: 95,
        inspection: { status: "form", fields: ["email"] },
      },
    })

    expect(presentation.state).toBe("unverified")
    expect(presentation.label).toBe("フォーム要確認")
  })
})
