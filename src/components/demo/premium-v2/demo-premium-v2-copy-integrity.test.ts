import fs from "node:fs"
import { describe, expect, it } from "vitest"

const COMPONENTS = [
  "../DemoPremiumV2HomePage.tsx",
  "DemoPremiumV2AboutPage.tsx",
  "DemoPremiumV2ServicesPage.tsx",
  "DemoPremiumV2ContactPage.tsx",
]

describe("premium v2 customer-site copy integrity", () => {
  it("does not contain business-specific legacy literals or provider CTAs", () => {
    const source = COMPONENTS
      .map((file) => fs.readFileSync(new URL(file, import.meta.url), "utf8"))
      .join("\n")

    expect(source).not.toMatch(/及川洋菓子店|Shimokitazawa|Since 2020|公式note|Japan Entryについて問い合わせる/u)
  })
})
