import { ProxyAgent } from "undici"

/**
 * Get configured Scrapoxy ProxyAgent for Node.js fetch/undici dispatch.
 * Returns undefined if SCRAPOXY_URL is not configured.
 */
export function getProxyDispatcher(): ProxyAgent | undefined {
  const scrapoxyUrl = process.env.SCRAPOXY_URL
  if (!scrapoxyUrl || scrapoxyUrl.trim().length === 0) {
    return undefined
  }

  const username = process.env.SCRAPOXY_USERNAME
  const password = process.env.SCRAPOXY_PASSWORD
  let authPrefix = ""
  if (username && password && username.trim().length > 0 && password.trim().length > 0) {
    authPrefix = `${encodeURIComponent(username.trim())}:${encodeURIComponent(password.trim())}@`
  }

  // Remove protocol if present to build a clean http proxy url
  const hostPort = scrapoxyUrl.replace(/^(https?:\/\/)?/, "")
  const cleanProxy = `http://${authPrefix}${hostPort}`
  
  return new ProxyAgent(cleanProxy)
}

/**
 * Builds fetch options with proxy dispatcher if Scrapoxy is enabled.
 */
export function getProxyFetchOptions(options: RequestInit = {}): RequestInit & { dispatcher?: ProxyAgent } {
  const dispatcher = getProxyDispatcher()
  if (dispatcher) {
    return {
      ...options,
      dispatcher,
    } as any
  }
  return options
}
