import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { formatPricingPeriod, getCardIcon } from "./BlockRendererCards"

describe("getCardIcon", () => {
  it.each([
    "Globe",
    "ShieldCheck",
    "CreditCard",
    "MessageCircle",
    "ClipboardCheck",
    "Languages",
    "Workflow",
    "Rocket",
    "UserCheck",
    "BadgeDollarSign",
    "UserCog",
    "Timer",
  ])(
    "renders the CMS icon name %s as an accessible-tree-neutral Lucide SVG",
    (iconName) => {
      const Icon = getCardIcon(iconName)
      expect(Icon).toBeDefined()

      const markup = renderToStaticMarkup(
        createElement(Icon!, { "aria-hidden": true }),
      )

      expect(markup).toContain("<svg")
      expect(markup).toContain('aria-hidden="true"')
      expect(markup).not.toContain(`>${iconName}<`)
    },
  )

  it("does not expose an unknown internal icon token as visible copy", () => {
    expect(getCardIcon("InternalOnlyIcon")).toBeUndefined()
  })

  it("does not render one-time pricing as a rate", () => {
    expect(formatPricingPeriod("one-time")).toBe(" one-time")
    expect(formatPricingPeriod("month")).toBe("/month")
    expect(formatPricingPeriod("/mo")).toBe("/mo")
  })
})
