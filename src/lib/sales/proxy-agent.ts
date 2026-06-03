import { ProxyAgent } from "undici"

type ProxyFetchOptions = RequestInit & { dispatcher?: ProxyAgent }

/**
 * Get configured mubeng ProxyAgent for Node.js fetch/undici dispatch.
 * Returns undefined if MUBENG_PROXY_URL is not configured.
 */
export function getProxyDispatcher(): ProxyAgent | undefined {
  const proxyUrl = getMubengProxyUrl()
  return proxyUrl ? new ProxyAgent(proxyUrl) : undefined
}

export function getMubengProxyUrl(): string | undefined {
  const mubengUrl = process.env.MUBENG_PROXY_URL
  if (!mubengUrl || mubengUrl.trim().length === 0) return undefined

  const username = process.env.MUBENG_PROXY_USERNAME
  const password = process.env.MUBENG_PROXY_PASSWORD
  let authPrefix = ""
  if (username && password && username.trim().length > 0 && password.trim().length > 0) {
    authPrefix = `${encodeURIComponent(username.trim())}:${encodeURIComponent(password.trim())}@`
  }

  const hostPort = mubengUrl.trim().replace(/^(https?:\/\/)?/, "")
  return `http://${authPrefix}${hostPort}`
}

/**
 * Builds fetch options with proxy dispatcher if mubeng is enabled.
 */
export function getProxyFetchOptions(options: RequestInit = {}): ProxyFetchOptions {
  const dispatcher = getProxyDispatcher()
  if (dispatcher) {
    return {
      ...options,
      dispatcher,
    }
  }
  return options
}
