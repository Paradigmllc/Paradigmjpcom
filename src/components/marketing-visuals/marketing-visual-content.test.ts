import { describe, expect, it } from "vitest"
import {
  getLocaleFreeRoute,
  getMarketingVisualKind,
  getMarketingVisualLocale,
  resolveMarketingVisualProfile,
} from "./marketing-visual-content"

describe("marketing visual route resolver", () => {
  it("normalizes locale-prefixed routes", () => {
    expect(getLocaleFreeRoute("/ja/services/web/")).toBe("/services/web")
    expect(getLocaleFreeRoute("/en")).toBe("/")
    expect(getMarketingVisualLocale("/en/package")).toBe("en")
    expect(getMarketingVisualLocale("/ja/package")).toBe("ja")
  })

  it("assigns a contextual visual system to representative public routes", () => {
    expect(getMarketingVisualKind("/ja/video-as-a-service")).toBe("video")
    expect(getMarketingVisualKind("/en/package")).toBe("japan")
    expect(getMarketingVisualKind("/en/services")).toBe("japan")
    expect(getMarketingVisualKind("/ja/services/web")).toBe("web")
    expect(getMarketingVisualKind("/ja/lp/ai")).toBe("web")
    expect(getMarketingVisualKind("/ja/blog/example-article")).toBe("general")
  })

  it("keeps legal pages restrained and internal routes excluded", () => {
    expect(resolveMarketingVisualProfile("/ja/privacy")).toMatchObject({
      kind: "legal",
      compact: true,
      showVideo: false,
    })
    expect(resolveMarketingVisualProfile("/ja/work")).toBeNull()
    expect(resolveMarketingVisualProfile("/ja/work-report/example")).toBeNull()
    expect(resolveMarketingVisualProfile("/ja/opportunity/example")).toBeNull()
    expect(resolveMarketingVisualProfile("/admin")).toBeNull()
    expect(resolveMarketingVisualProfile("/en/report/example")).toBeNull()
  })

  it("provides complete localized slider and process content", () => {
    const profile = resolveMarketingVisualProfile("/ja/video-as-a-service")
    expect(profile).not.toBeNull()
    expect(profile?.slides).toHaveLength(4)
    expect(profile?.process).toHaveLength(4)
    expect(profile?.tableHeaders).toHaveLength(3)
    expect(profile?.slides.every((slide) => slide.alt.length > 0)).toBe(true)
  })
})
