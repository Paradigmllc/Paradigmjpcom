import { describe, expect, it } from "vitest"
import { demoHeadlineClass, demoHeadlineText, hasRepeatedHomeNarrative, resolveDemoArtDirection } from "./demo-art-direction"
import type { DemoMultiPageData } from "./demo-site-types"

describe("demo art direction", () => {
  it("assigns a dedicated salon composition instead of the generic corporate grammar", () => {
    const direction = resolveDemoArtDirection({ industry: "beauty_salon" })

    expect(direction).toEqual(expect.objectContaining({
      id: "beauty",
      hero: "editorial-split",
      serviceLayout: "salon-catalogue",
      worksLayout: "salon-lookbook",
    }))
    expect(direction.labels).toEqual(expect.objectContaining({ category: "サロン", gallery: "スタイル" }))
  })

  it("caps long Japanese hero copy below the oversized display scale", () => {
    const long = demoHeadlineClass("横浜・港北で四十二年、地域に寄り添いながら一人ひとりの髪を丁寧に整える美容室", "hero")
    const productionLength = demoHeadlineClass("横浜・港北で42年、地域に寄り添う美容室", "hero")
    const short = demoHeadlineClass("髪を、整える。", "hero")

    expect(long).toContain("3.8rem")
    expect(long).toContain("leading-[1.2]")
    expect(productionLength).toContain("3.8rem")
    expect(short).toContain("4rem")
  })

  it("balances a long Japanese title at meaningful punctuation", () => {
    expect(demoHeadlineText("横浜・港北で42年、地域に寄り添う美容室"))
      .toBe("横浜・港北で42年、\n地域に寄り添う美容室")
  })

  it("detects a repeated hero and intro title", () => {
    const page = {
      pages: {
        home: { hero: { title: "地域に寄り添う美容室" } },
        about: { story: "異なる紹介文" },
      },
      premium: { intro: { title: "地域に寄り添う美容室", body: "別の本文" } },
    } as DemoMultiPageData

    expect(hasRepeatedHomeNarrative(page)).toBe(true)
  })
})
