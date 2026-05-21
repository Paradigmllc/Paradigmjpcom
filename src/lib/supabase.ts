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

// クライアントサイド（anon key）。build 時 env 評価を避けるため lazy に生成する。
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

// サーバーサイド（service_role key — 全テーブルアクセス）
export function getServiceSupabase() {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL")
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY")
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

