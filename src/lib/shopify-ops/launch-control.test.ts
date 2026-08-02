import { describe, expect, it, vi } from "vitest"
import { evaluateLaunchGates, probeSericiaStorefront } from "./launch-control"

const ready = {
  shopifyReachable: true,
  catalogProductCount: 8,
  eligibleProductCount: 6,
  baseAppConfigured: true,
  baseShopConnected: true,
  baseLastScheduledStatus: "succeeded",
  baseLastScheduledAt: "2026-08-03T10:00:00.000Z",
  socialConnectorConfigured: true,
  socialLastStatus: "succeeded",
  socialLastStartedAt: "2026-08-03T09:00:00.000Z",
  storefrontReachable: true,
  storefrontPasswordProtected: false,
  paymentsVerified: true,
  checkoutVerified: true,
  policiesVerified: true,
  publicReleaseApproved: true,
  now: new Date("2026-08-03T11:00:00.000Z"),
}

describe("SERICIA launch control", () => {
  it("requires every commercial and release gate", () => {
    expect(evaluateLaunchGates(ready).every((gate) => gate.status === "ready")).toBe(true)
  })

  it("fails closed when products, source connection, and approval are absent", () => {
    const gates = evaluateLaunchGates({
      ...ready,
      catalogProductCount: 0,
      eligibleProductCount: 0,
      baseAppConfigured: false,
      baseShopConnected: false,
      publicReleaseApproved: false,
      storefrontPasswordProtected: true,
    })
    expect(gates.find((gate) => gate.key === "catalog")?.status).toBe("blocked")
    expect(gates.find((gate) => gate.key === "base_source")?.status).toBe("blocked")
    expect(gates.find((gate) => gate.key === "public_release")?.status).toBe("blocked")
  })

  it("blocks stale inventory and social automation runs", () => {
    const gates = evaluateLaunchGates({
      ...ready,
      baseLastScheduledAt: "2026-08-03T08:59:59.000Z",
      socialLastStartedAt: "2026-08-01T22:59:59.000Z",
    })
    expect(gates.find((gate) => gate.key === "inventory_automation")?.status).toBe("blocked")
    expect(gates.find((gate) => gate.key === "social_automation")?.status).toBe("blocked")
  })

  it("detects the Shopify password redirect without following it", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, {
      status: 302,
      headers: { location: "https://sericia.com/password" },
    }))
    const result = await probeSericiaStorefront(fetcher)
    expect(result).toMatchObject({ reachable: true, passwordProtected: true, status: 302 })
    expect(fetcher).toHaveBeenCalledWith("https://sericia.com", expect.objectContaining({ redirect: "manual" }))
  })
})
