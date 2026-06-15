import type { ProxyAgent } from "undici"

type ProxyFetchOptions = RequestInit & { dispatcher?: ProxyAgent }

let proxyDisabledWarningShown = false

/**
 * Keep legacy call sites compatible while enforcing the RevenueOS no-proxy policy.
 */
export function getProxyDispatcher(): ProxyAgent | undefined {
  const proxyUrl = getMubengProxyUrl()
  if (proxyUrl && !proxyDisabledWarningShown) {
    proxyDisabledWarningShown = true
    console.warn("[proxy-agent] MUBENG proxy env is configured but ignored because proxy usage is disabled by policy")
  }
  return undefined
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
 * Builds fetch options without proxy dispatchers. Kept for call-site compatibility.
 */
export function getProxyFetchOptions(options: RequestInit = {}): ProxyFetchOptions {
  getProxyDispatcher()
  return options
}
