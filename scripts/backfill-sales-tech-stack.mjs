#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js"
import { readProductionEnvValue } from "./lib/coolify-env.mjs"

function normalizeTechnologySlug(name) {
  const slug = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "unknown"
}

function isTechItem(value) {
  return value && typeof value === "object" && typeof value.name === "string" && typeof value.category === "string"
}

function extractTech(meta) {
  const tech = meta?.tech
  if (!tech || typeof tech !== "object") return { stack: [], server: null }
  return {
    stack: Array.isArray(tech.stack) ? tech.stack.filter(isTechItem) : [],
    server: typeof tech.server === "string" && tech.server.trim() ? tech.server : null,
  }
}

async function main() {
  const url = await readProductionEnvValue("SALES_SUPABASE_URL")
  const key = await readProductionEnvValue("SALES_SUPABASE_SERVICE_ROLE_KEY")
  if (!url || !key) throw new Error("SALES_SUPABASE_URL or SALES_SUPABASE_SERVICE_ROLE_KEY is missing")

  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await sb
    .from("sales_companies")
    .select("id, company_name, domain, meta")
    .order("updated_at", { ascending: false })
    .limit(5000)

  if (error) throw new Error(`sales_companies read failed: ${error.message}`)

  const detectedAt = new Date().toISOString()
  const rows = []
  for (const company of data ?? []) {
    const { stack, server } = extractTech(company.meta ?? {})
    for (const item of stack) {
      rows.push({
        company_id: company.id,
        technology_name: item.name,
        technology_slug: normalizeTechnologySlug(item.name),
        category: item.category,
        confidence: Math.max(0, Math.min(100, Math.round(Number(item.confidence ?? 0)))),
        evidence: Array.isArray(item.evidence) ? item.evidence : [],
        source_slug: "wappalyzer",
        server_header: server,
        detected_at: detectedAt,
      })
    }
  }

  if (rows.length === 0) {
    console.log("Backfill complete: 0 detections found in sales_companies.meta.tech.stack")
    return
  }

  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500)
    const { error: upsertError } = await sb
      .from("sales_tech_stack_detections")
      .upsert(chunk, { onConflict: "company_id,technology_slug,category,source_slug" })
    if (upsertError) throw new Error(`tech stack upsert failed: ${upsertError.message}`)
  }

  console.log(`Backfill complete: ${rows.length} Wappalyzer detections stored`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
