import { describe, expect, it } from "vitest"
import { DEFAULT_CRM_VIEW_FIELDS } from "./crm-field-config"
import { TWENTY_TEXT_ONLY_FIELD_KEYS } from "./twenty-crm-metadata-helpers"
import { countryCodeFromTwentyRecord } from "./twenty-pull-helpers"

describe("Twenty country field", () => {
  it("uses text metadata so every approved market survives Twenty restarts", () => {
    expect(DEFAULT_CRM_VIEW_FIELDS.find((field) => field.fieldKey === "country")?.fieldType).toBe("text")
    expect(TWENTY_TEXT_ONLY_FIELD_KEYS.has("country")).toBe(true)
  })

  it("round-trips the new European display labels", () => {
    expect(countryCodeFromTwentyRecord({ paradigmCountryName: "イタリア" }, "vinidea.it")).toBe("IT")
    expect(countryCodeFromTwentyRecord({ paradigmCountryName: "オランダ" }, "example.com")).toBe("NL")
    expect(countryCodeFromTwentyRecord({ paradigmCountryName: "Switzerland" }, "example.com")).toBe("CH")
  })
})
