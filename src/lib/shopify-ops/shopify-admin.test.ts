import { afterEach, describe, expect, it } from "vitest"
import { isShopifyAdminConfigured, missingShopifyAdminScopes } from "./shopify-admin"

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe("Shopify Admin authentication readiness", () => {
  it("accepts Dev Dashboard client credentials", () => {
    process.env.SHOPIFY_STORE_DOMAIN = "sericia.myshopify.com"
    process.env.SHOPIFY_API_VERSION = "2026-07"
    process.env.SHOPIFY_CLIENT_ID = "client-id"
    process.env.SHOPIFY_CLIENT_SECRET = "client-secret"
    delete process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
    expect(isShopifyAdminConfigured()).toBe(true)
  })

  it("rejects an incomplete credential pair", () => {
    process.env.SHOPIFY_STORE_DOMAIN = "sericia.myshopify.com"
    process.env.SHOPIFY_API_VERSION = "2026-07"
    process.env.SHOPIFY_CLIENT_ID = "client-id"
    delete process.env.SHOPIFY_CLIENT_SECRET
    delete process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
    expect(isShopifyAdminConfigured()).toBe(false)
  })

  it("accepts read access implied by Shopify write scopes", () => {
    expect(missingShopifyAdminScopes([
      "write_products",
      "write_inventory",
      "read_locations",
    ])).toEqual([])
  })

  it("reports scopes that are neither granted nor implied", () => {
    expect(missingShopifyAdminScopes(["write_products"])).toEqual([
      "read_inventory",
      "write_inventory",
      "read_locations",
    ])
  })
})
