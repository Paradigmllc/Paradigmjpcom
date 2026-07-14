import { describe, expect, it } from "vitest"
import { buildPremiumV3RevealVariants } from "./PremiumV3Motion"

describe("Premium V3 motion profiles", () => {
  it.each(["restrained", "editorial", "expressive"] as const)("keeps %s reveal animated", (style) => {
    const variants = buildPremiumV3RevealVariants(style)

    expect(variants.hidden).toBeDefined()
    expect(variants.visible).toBeDefined()
    expect(variants.hidden).not.toEqual(variants.visible)
  })

  it("uses a richer visual transition for expressive demos", () => {
    const expressive = buildPremiumV3RevealVariants("expressive")

    expect(expressive.hidden).toMatchObject({ opacity: 0.94, scale: 0.99, filter: "blur(1px)" })
    expect(expressive.visible).toMatchObject({ opacity: 1, scale: 1, filter: "blur(0px)" })
  })
})
