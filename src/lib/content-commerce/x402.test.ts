import { describe, expect, it } from "vitest"
import {
  X402_BASE_MAINNET,
  X402_BASE_SEPOLIA,
  resolveX402Configuration,
} from "./x402"

const PAY_TO = "0x1111111111111111111111111111111111111111"

describe("x402 configuration", () => {
  it("uses Base Sepolia outside production", () => {
    const result = resolveX402Configuration({ NODE_ENV: "test", X402_PAY_TO_ADDRESS: PAY_TO })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.config.network).toBe(X402_BASE_SEPOLIA)
      expect(result.config.facilitatorMode).toBe("testnet")
    }
  })

  it("fails closed on mainnet without CDP credentials", () => {
    const result = resolveX402Configuration({
      NODE_ENV: "production",
      X402_NETWORK: X402_BASE_MAINNET,
      X402_PAY_TO_ADDRESS: PAY_TO,
    })
    expect(result).toMatchObject({ ok: false, code: "X402_NOT_CONFIGURED" })
  })

  it("accepts explicit mainnet settlement credentials", () => {
    const result = resolveX402Configuration({
      NODE_ENV: "production",
      X402_NETWORK: X402_BASE_MAINNET,
      X402_PAY_TO_ADDRESS: PAY_TO,
      CDP_API_KEY_ID: "key-id",
      CDP_API_KEY_SECRET: "key-secret",
    })
    expect(result).toMatchObject({
      ok: true,
      config: { network: X402_BASE_MAINNET, facilitatorMode: "cdp" },
    })
  })

  it("rejects invalid recipient addresses", () => {
    const result = resolveX402Configuration({ NODE_ENV: "test", X402_PAY_TO_ADDRESS: "not-an-address" })
    expect(result).toMatchObject({ ok: false, code: "X402_INVALID_CONFIGURATION" })
  })
})
