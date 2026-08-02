import { describe, expect, it } from "vitest"
import { evaluateProductPublicationGate, productDestinationUrl } from "./product-readiness"

const readyProduct = {
  status: "live",
  inventoryOnHand: 3,
  photoReady: 1,
  shopifyHandle: "handmade-cup",
  supplierUrl: "https://supplier.example/item",
  primaryImageUrl: "https://cdn.example/item.webp",
  originCountryCode: "JP",
  hsCode: "6912.00",
  fulfillmentDays: 3,
  supplierVerified: true,
  sampleVerified: true,
  imageRightsVerified: true,
  complianceVerified: true,
  fulfillmentVerified: true,
}

describe("SERICIA product publication gate", () => {
  it("passes only a real, sellable, rights-cleared product", () => {
    expect(evaluateProductPublicationGate(readyProduct)).toMatchObject({ ready: true, completed: 14, total: 14, blockers: [] })
  })

  it("reports concrete blockers instead of creating a fake post", () => {
    const gate = evaluateProductPublicationGate({ ...readyProduct, inventoryOnHand: 0, imageRightsVerified: false })
    expect(gate.ready).toBe(false)
    expect(gate.blockers).toEqual(expect.arrayContaining(["販売可能在庫を登録する", "画像利用権確認を完了する"]))
  })

  it("builds the public SERICIA product URL from a Shopify handle", () => {
    expect(productDestinationUrl("handmade-cup")).toBe("https://sericia.com/products/handmade-cup")
    expect(productDestinationUrl("https://sericia.com/products/cup")).toBe("https://sericia.com/products/cup")
  })
})
