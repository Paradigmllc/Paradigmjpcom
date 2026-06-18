import { createClient } from "@supabase/supabase-js"

let browserClient: ReturnType<typeof createClient> | null = null

function readEnv(name: string): string | null {
  const value = process.env[name]
  if (!value) {
    console.error(`[supabase] ${name} is not configured`)
    return null
  }
  return value
}

function readOptionalEnv(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value : null
}

function flagEnabled(name: string): boolean {
  const value = readOptionalEnv(name)
  return value ? /^(1|true|yes)$/i.test(value) : false
}

export function getSalesSupabaseConfig(): { url: string; serviceKey: string; source: "cloud" | "dedicated" } | null {
  const cloudUrl = readOptionalEnv("NEXT_PUBLIC_SUPABASE_URL")
  const cloudServiceKey = readOptionalEnv("SUPABASE_SERVICE_ROLE_KEY")
  const salesUrl = readOptionalEnv("SALES_SUPABASE_URL")
  const salesServiceKey = readOptionalEnv("SALES_SUPABASE_SERVICE_ROLE_KEY")
  const dedicatedPrimary = flagEnabled("SALES_SUPABASE_PRIMARY")

  if (dedicatedPrimary && salesUrl && salesServiceKey) {
    return { url: salesUrl, serviceKey: salesServiceKey, source: "dedicated" }
  }

  if (cloudUrl && cloudServiceKey) {
    if ((salesUrl || salesServiceKey) && !(salesUrl && salesServiceKey)) {
      console.error("[supabase] SALES_SUPABASE_URL and SALES_SUPABASE_SERVICE_ROLE_KEY must be configured together")
    }
    return { url: cloudUrl, serviceKey: cloudServiceKey, source: "cloud" }
  }

  if (salesUrl && salesServiceKey) {
    console.warn("[supabase] using SALES_SUPABASE_* because cloud Supabase env is not fully configured")
    return { url: salesUrl, serviceKey: salesServiceKey, source: "dedicated" }
  }

  if (salesUrl || salesServiceKey) {
    console.error("[supabase] SALES_SUPABASE_URL and SALES_SUPABASE_SERVICE_ROLE_KEY must be configured together")
  }
  return null
}

export function getSupabaseClient() {
  if (browserClient) return browserClient
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL")
  const anonKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  if (!url || !anonKey) return null
  browserClient = createClient(url, anonKey)
  return browserClient
}

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    const client = getSupabaseClient()
    if (!client) {
      console.error("[supabase] Proxy access denied — client not configured (check NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)")
      return undefined
    }
    const value = client[prop as keyof typeof client]
    return typeof value === "function" ? value.bind(client) : value
  },
})

export function getServiceSupabase() {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL")
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY")
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

function shouldRewriteDirectPostgrest(url: string): boolean {
  return /supabase-rest-1(?::3000)?$/i.test(new URL(url).host) || flagEnabled("SALES_SUPABASE_DIRECT_POSTGREST")
}

function createDirectPostgrestFetch(baseUrl: string): typeof fetch {
  const normalizedBase = baseUrl.replace(/\/+$/, "")
  const restPrefix = `${normalizedBase}/rest/v1`

  return async (input, init) => {
    if (typeof input === "string" || input instanceof URL) {
      const raw = input.toString()
      if (raw.startsWith(restPrefix)) {
        return fetch(`${normalizedBase}${raw.slice(restPrefix.length)}`, init)
      }
      return fetch(input, init)
    }

    const raw = input.url
    if (!raw.startsWith(restPrefix)) return fetch(input, init)
    const rewritten = `${normalizedBase}${raw.slice(restPrefix.length)}`
    return fetch(new Request(rewritten, input), init)
  }
}

export function getServiceSalesSupabase() {
  const config = getSalesSupabaseConfig()
  if (!config) return null
  return createClient(config.url, config.serviceKey, {
    auth: { persistSession: false },
    global: shouldRewriteDirectPostgrest(config.url)
      ? { fetch: createDirectPostgrestFetch(config.url) }
      : undefined,
  })
}
