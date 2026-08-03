import { describe, expect, it } from "vitest"
import { buildShopifyProductSetInput, classifyBaseItem, normalizeBaseItem, type BaseItem } from "./base-sync"

function fixture(overrides: Partial<BaseItem> = {}): BaseItem {
  return {
    item_id: 42,
    title: "手仕事の茶碗",
    detail: "毎日の食卓に。<script>alert(1)</script>",
    price: 4800,
    proper_price: 5200,
    item_tax_type: 1,
    stock: 3,
    visible: 1,
    identifier: "BOWL-42",
    modified: 1_700_000_000,
    variations: [],
    img1_origin: "https://base-ec2.akamaized.net/images/item/origin/bowl.jpg",
    img2_origin: "http://example.com/unsafe.jpg",
    ...overrides,
  }
}

describe("BASE catalog normalization", () => {
  it("maps Japanese product copy, safe images and category", () => {
    const result = normalizeBaseItem(fixture())
    expect(result.collectionHandle).toBe("tableware")
    expect(result.images).toEqual(["https://base-ec2.akamaized.net/images/item/origin/bowl.jpg"])
    expect(result.descriptionHtml).toContain("&lt;script&gt;")
    expect(result.variations[0]).toMatchObject({ sku: "BOWL-42", inventory: 3 })
  })

  it("keeps BASE variations as Shopify variants", () => {
    const result = normalizeBaseItem(fixture({ variations: [{ variation_id: 8, variation: "藍", variation_stock: 2, variation_identifier: "BOWL-AI", barcode: "123" }] }))
    const input = buildShopifyProductSetInput(result, "gid://shopify/Location/1", "gid://shopify/Collection/2")
    expect(input.status).toBe("DRAFT")
    expect(input.productOptions[0].name).toBe("Variation")
    expect(input.variants[0].inventoryQuantities[0].quantity).toBe(2)
    expect(input.variants[0].inventoryItem.countryCodeOfOrigin).toBe("JP")
    expect(input.metafields).toContainEqual({
      namespace: "sericia",
      key: "country_of_origin",
      type: "single_line_text_field",
      value: "Japan",
    })
  })

  it("falls back to living when no stronger collection signal exists", () => {
    expect(classifyBaseItem({ title: "暮らしの道具", detail: "日々使うもの" })).toBe("living")
  })

  it("omits an invalid compare-at price and totals variation inventory", () => {
    const result = normalizeBaseItem(fixture({
      proper_price: 4_000,
      variations: [
        { variation_id: 8, variation: "藍", variation_stock: 2, variation_identifier: "BOWL-AI", barcode: null },
        { variation_id: 9, variation: "白", variation_stock: 4, variation_identifier: "BOWL-WH", barcode: null },
      ],
    }))
    expect(result.compareAtPriceJpy).toBeNull()
    expect(result.inventory).toBe(6)
  })

  it("makes duplicate BASE variation names unique for Shopify options", () => {
    const result = normalizeBaseItem(fixture({
      variations: [
        { variation_id: 8, variation: "藍", variation_stock: 2, variation_identifier: "BOWL-AI-S", barcode: null },
        { variation_id: 9, variation: "藍", variation_stock: 4, variation_identifier: "BOWL-AI-L", barcode: null },
      ],
    }))
    expect(result.variations.map((variation) => variation.name)).toEqual(["藍", "藍 (2)"])
  })
})
