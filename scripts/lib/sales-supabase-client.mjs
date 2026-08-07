import { createClient } from "@supabase/supabase-js"

export const SALES_TABLES = [
  "sales_companies",
  "sales_pipeline_runs",
  "sales_pipeline_steps",
  "sales_source_runs",
  "sales_artifact_manifest",
  "sales_sync_logs",
  "sales_error_log",
  "sales_operator_queue_items",
]

function value(envs, name) {
  const raw = envs?.[name] ?? process.env[name]
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null
}

function directPostgrestFetch(baseUrl) {
  const normalizedBase = baseUrl.replace(/\/+$/, "")
  const restPrefix = `${normalizedBase}/rest/v1`
  return async (input, init) => {
    if (typeof input === "string" || input instanceof URL) {
      const raw = input.toString()
      return fetch(raw.startsWith(restPrefix) ? `${normalizedBase}${raw.slice(restPrefix.length)}` : input, init)
    }
    const raw = input.url
    return fetch(raw.startsWith(restPrefix) ? new Request(`${normalizedBase}${raw.slice(restPrefix.length)}`, input) : input, init)
  }
}

export function createSupabaseScriptClient(url, serviceKey, options = {}) {
  if (!url || !serviceKey) return null
  const directPostgrest =
    options.directPostgrest ??
    /supabase-rest-1(?::3000)?$/i.test(new URL(url).host) ??
    false
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: directPostgrest ? { fetch: directPostgrestFetch(url) } : undefined,
  })
}

export function createSalesSupabaseScriptClient(envs) {
  const dedicatedPrimary = /^(1|true|yes)$/i.test(value(envs, "SALES_SUPABASE_PRIMARY") ?? "")
  const salesUrl = value(envs, "SALES_SUPABASE_URL")
  const salesKey = value(envs, "SALES_SUPABASE_SERVICE_ROLE_KEY")
  const cloudUrl = value(envs, "NEXT_PUBLIC_SUPABASE_URL")
  const cloudKey = value(envs, "SUPABASE_SERVICE_ROLE_KEY")
  const url = dedicatedPrimary && salesUrl && salesKey ? salesUrl : cloudUrl ?? salesUrl
  const key = dedicatedPrimary && salesUrl && salesKey ? salesKey : cloudKey ?? salesKey
  const client = createSupabaseScriptClient(url, key)
  return { client, url, source: dedicatedPrimary && salesUrl && salesKey ? "dedicated" : "default" }
}

export function createLegacyCloudSupabaseScriptClient(envs) {
  const url =
    value(envs, "CLOUD_SUPABASE_URL") ??
    value(envs, "SUPABASE_CLOUD_URL") ??
    value(envs, "LEGACY_SUPABASE_URL") ??
    value(envs, "OLD_SUPABASE_URL") ??
    value(envs, "MIGRATION_SOURCE_SUPABASE_URL")
  const key =
    value(envs, "CLOUD_SUPABASE_SERVICE_ROLE_KEY") ??
    value(envs, "SUPABASE_CLOUD_SERVICE_ROLE_KEY") ??
    value(envs, "LEGACY_SUPABASE_SERVICE_ROLE_KEY") ??
    value(envs, "OLD_SUPABASE_SERVICE_ROLE_KEY") ??
    value(envs, "MIGRATION_SOURCE_SUPABASE_SERVICE_ROLE_KEY")
  return { client: createSupabaseScriptClient(url, key, { directPostgrest: false }), url }
}

export async function tableCount(client, table) {
  const { count, error } = await client.from(table).select("id", { count: "exact", head: true })
  if (error) return { ok: false, table, error: error.message, count: null }
  return { ok: true, table, count: count ?? 0, error: null }
}

export async function countTables(client, tables = SALES_TABLES) {
  const results = []
  for (const table of tables) results.push(await tableCount(client, table))
  return results
}
