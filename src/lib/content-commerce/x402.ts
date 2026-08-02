import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server"
import type { Network } from "@x402/core/types"
import { ExactEvmScheme } from "@x402/evm/exact/server"
import { bazaarResourceServerExtension } from "@x402/extensions/bazaar"

export const X402_BASE_MAINNET = "eip155:8453" as const
export const X402_BASE_SEPOLIA = "eip155:84532" as const
export type SupportedX402Network = typeof X402_BASE_MAINNET | typeof X402_BASE_SEPOLIA

interface X402Environment {
  NODE_ENV?: string
  X402_NETWORK?: string
  X402_PAY_TO_ADDRESS?: string
  X402_FACILITATOR_URL?: string
  CDP_API_KEY_ID?: string
  CDP_API_KEY_SECRET?: string
}

export interface X402Configuration {
  network: SupportedX402Network
  payTo: `0x${string}`
  facilitatorMode: "cdp" | "testnet"
  facilitatorUrl: string | null
}

export type X402ConfigurationResult =
  | { ok: true; config: X402Configuration }
  | { ok: false; code: "X402_NOT_CONFIGURED" | "X402_INVALID_CONFIGURATION"; message: string }

export type X402RuntimeResult =
  | { ok: true; config: X402Configuration; server: x402ResourceServer }
  | { ok: false; code: "X402_NOT_CONFIGURED" | "X402_INVALID_CONFIGURATION" | "X402_INITIALIZATION_FAILED"; message: string }

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/

export function resolveX402Configuration(env: X402Environment = process.env): X402ConfigurationResult {
  const network = (env.X402_NETWORK?.trim() || (env.NODE_ENV === "production" ? X402_BASE_MAINNET : X402_BASE_SEPOLIA)) as SupportedX402Network
  if (network !== X402_BASE_MAINNET && network !== X402_BASE_SEPOLIA) {
    return {
      ok: false,
      code: "X402_INVALID_CONFIGURATION",
      message: "X402_NETWORK must be eip155:8453 or eip155:84532.",
    }
  }

  const payTo = env.X402_PAY_TO_ADDRESS?.trim()
  if (!payTo) {
    return {
      ok: false,
      code: "X402_NOT_CONFIGURED",
      message: "X402_PAY_TO_ADDRESS is not configured.",
    }
  }
  if (!ADDRESS_PATTERN.test(payTo)) {
    return {
      ok: false,
      code: "X402_INVALID_CONFIGURATION",
      message: "X402_PAY_TO_ADDRESS must be a valid EVM address.",
    }
  }

  if (network === X402_BASE_MAINNET) {
    if (!env.CDP_API_KEY_ID?.trim() || !env.CDP_API_KEY_SECRET?.trim()) {
      return {
        ok: false,
        code: "X402_NOT_CONFIGURED",
        message: "CDP_API_KEY_ID and CDP_API_KEY_SECRET are required for Base mainnet settlement.",
      }
    }
    return {
      ok: true,
      config: {
        network,
        payTo: payTo as `0x${string}`,
        facilitatorMode: "cdp",
        facilitatorUrl: null,
      },
    }
  }

  const facilitatorUrl = env.X402_FACILITATOR_URL?.trim() || "https://x402.org/facilitator"
  try {
    const parsed = new URL(facilitatorUrl)
    if (parsed.protocol !== "https:") throw new Error("facilitator must use HTTPS")
  } catch (error) {
    console.error("[x402] invalid facilitator URL:", error)
    return {
      ok: false,
      code: "X402_INVALID_CONFIGURATION",
      message: "X402_FACILITATOR_URL must be a valid HTTPS URL.",
    }
  }

  return {
    ok: true,
    config: {
      network,
      payTo: payTo as `0x${string}`,
      facilitatorMode: "testnet",
      facilitatorUrl,
    },
  }
}

let runtimePromise: Promise<X402RuntimeResult> | null = null

async function initializeX402Runtime(): Promise<X402RuntimeResult> {
  const resolved = resolveX402Configuration()
  if (!resolved.ok) return resolved

  try {
    const facilitator = resolved.config.facilitatorMode === "cdp"
      ? (await import("@coinbase/cdp-sdk/x402")).createCdpFacilitatorClient()
      : new HTTPFacilitatorClient({ url: resolved.config.facilitatorUrl as string })

    const server = new x402ResourceServer(facilitator)
      .register(resolved.config.network as Network, new ExactEvmScheme())
      .registerExtension(bazaarResourceServerExtension)

    return { ok: true, config: resolved.config, server }
  } catch (error) {
    console.error("[x402] resource server initialization failed:", error)
    return {
      ok: false,
      code: "X402_INITIALIZATION_FAILED",
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

export function getX402Runtime(): Promise<X402RuntimeResult> {
  runtimePromise ??= initializeX402Runtime()
  return runtimePromise
}

export function resetX402RuntimeForTests(): void {
  runtimePromise = null
}
