import { describe, expect, it } from "vitest"
import { buildPageSchema, buildWebSiteSchema } from "./schemas"

describe("buildWebSiteSchema", () => {
  it("advertises only maintained public languages and no nonexistent search", () => {
    const schema = buildWebSiteSchema("en")

    expect(schema.inLanguage).toEqual(["ja", "en"])
    expect(schema).not.toHaveProperty("potentialAction")
  })
})

describe("buildPageSchema", () => {
  it("uses the semantic page type without pretending indexes are articles", () => {
    const schema = buildPageSchema({
      type: "CollectionPage",
      title: "Japan Entry proof",
      description: "Inspectable delivery proof",
      url: "https://paradigmjp.com/en/works",
      locale: "en",
    })

    expect(schema["@type"]).toBe("CollectionPage")
    expect(schema.isPartOf["@id"]).toBe("https://paradigmjp.com#website")
  })
})
