import { describe, expect, it } from "vitest"
import { baseSyncSchema, createContentSchema, dailyMetricSchema, updateProductSchema } from "./schemas"

describe("Shopify operations schemas", () => {
  it("coerces product form values", () => {
    const value = updateProductSchema.parse({
      id: "4f6514bd-13bf-4a78-8572-b55bc59cd866",
      status: "sample_ready",
      inventoryOnHand: "10",
      clipReady: "12",
      photoReady: "6",
      shopifyHandle: "katakana-name-seal",
    })

    expect(value.inventoryOnHand).toBe(10)
    expect(value.clipReady).toBe(12)
  })

  it("rejects fake engagement-era invalid negative metrics", () => {
    const result = dailyMetricSchema.safeParse({
      metricDate: "2026-08-02",
      sessions: -1,
      videoViews: 0,
      profileVisits: 0,
      linkClicks: 0,
      productViews: 0,
      addToCarts: 0,
      checkouts: 0,
      orders: 0,
      revenueUsd: 0,
      variableCostJpy: 0,
      tiktokFollowers: 0,
      instagramFollowers: 0,
    })
    expect(result.success).toBe(false)
  })

  it("requires a meaningful content hook", () => {
    expect(createContentSchema.safeParse({ platform: "tiktok", contentType: "discovery", hook: "short", locale: "en" }).success).toBe(false)
  })

  it("only accepts explicit BASE sync modes", () => {
    expect(baseSyncSchema.parse({ mode: "dry_run" })).toEqual({ mode: "dry_run" })
    expect(baseSyncSchema.safeParse({ mode: "publish" }).success).toBe(false)
  })
})
