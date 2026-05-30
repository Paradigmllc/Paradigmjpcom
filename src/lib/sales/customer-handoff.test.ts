import { describe, expect, it } from "vitest"
import { normalizeCustomerHandoffProductTypes } from "./customer-handoff"

describe("normalizeCustomerHandoffProductTypes", () => {
  it("keeps the four commercial product types separated", () => {
    expect(normalizeCustomerHandoffProductTypes(["WEB制作", "dx automation"])).toEqual([
      "jp_web_production",
      "jp_dx_package",
    ])
    expect(normalizeCustomerHandoffProductTypes(["Japan Entry", "video subscription"])).toEqual([
      "global_jaas",
      "global_video_subscription",
    ])
  })

  it("defaults to domestic web production when contract product is unknown", () => {
    expect(normalizeCustomerHandoffProductTypes(null)).toEqual(["jp_web_production"])
    expect(normalizeCustomerHandoffProductTypes(["unknown"])).toEqual(["jp_web_production"])
  })
})
