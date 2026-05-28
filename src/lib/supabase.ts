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
      throw new Error("Supabase client is not configured")
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

export function getServiceSalesSupabase() {
  const salesUrl = readOptionalEnv("SALES_SUPABASE_URL")
  const salesServiceKey = readOptionalEnv("SALES_SUPABASE_SERVICE_ROLE_KEY")

  if (salesUrl && salesServiceKey) {
    return createClient(salesUrl, salesServiceKey, { auth: { persistSession: false } })
  }

  if (salesUrl || salesServiceKey) {
    console.error("[supabase] SALES_SUPABASE_URL and SALES_SUPABASE_SERVICE_ROLE_KEY must be configured together")
  }

  return getServiceSupabase()
}
