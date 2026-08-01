#!/usr/bin/env node
/**
 * scripts/migrate-demos-to-fullstack.mjs
 *
 * Regenerates all existing R2/Astro demos as full-stack Next.js demo pages.
 * 
 * Usage:
 *   node scripts/migrate-demos-to-fullstack.mjs [--dry-run] [--limit N] [--company-id ID]
 *
 * Environment:
 *   SUPABASE_SERVICE_ROLE_KEY — required
 *   SUPABASE_URL — required
 *   MIGRATION_API_BASE — API base URL (default: http://localhost:3000)
 *   MIGRATION_API_KEY — API key for sales API auth
 */

const API_BASE = process.env.MIGRATION_API_BASE || "http://localhost:3000"
const API_KEY = process.env.MIGRATION_API_KEY
const DRY_RUN = process.argv.includes("--dry-run")
const LIMIT_ARG = process.argv.indexOf("--limit")
const LIMIT = LIMIT_ARG > -1 ? parseInt(process.argv[LIMIT_ARG + 1], 10) || 100 : 100
const COMPANY_ID_ARG = process.argv.indexOf("--company-id")
const SINGLE_COMPANY_ID = COMPANY_ID_ARG > -1 ? process.argv[COMPANY_ID_ARG + 1] : null

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
  process.exit(1)
}

async function fetchCompanies() {
  const url = `${SUPABASE_URL}/rest/v1/sales_companies`
  const params = new URLSearchParams({
    select: "id,company_name,domain,slug,industry,report_locale",
    order: "created_at.desc",
    limit: String(LIMIT),
  })

  if (SINGLE_COMPANY_ID) {
    params.set("id", `eq.${SINGLE_COMPANY_ID}`)
  } else {
    // Only companies that have a pipeline_status of report_ready or later
    params.set("pipeline_status", "in.(report_ready,sent,manual_queue)")
  }

  const res = await fetch(`${url}?${params}`, {
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${SUPABASE_KEY}`,
    },
  })

  if (!res.ok) {
    throw new Error(`Supabase fetch failed: ${res.status} ${res.statusText}`)
  }

  return /** @type {Array<{id:string, company_name:string, domain:string, slug:string|null, industry:string|null, report_locale:string|null}>} */ (await res.json())
}

async function generateDemo(companyId) {
  if (!API_KEY) throw new Error("MIGRATION_API_KEY is required for demo generation")
  const res = await fetch(`${API_BASE}/api/sales/demo-site/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ company_id: companyId }),
  })

  const data = await res.json()
  return { status: res.status, ...data }
}

async function main() {
  console.log(`\n🚀 Demo Migration Tool — Full-Stack Next.js${DRY_RUN ? " (DRY RUN)" : ""}`)
  console.log(`   API: ${API_BASE}`)
  console.log(`   Limit: ${LIMIT}${SINGLE_COMPANY_ID ? ` | Company: ${SINGLE_COMPANY_ID}` : ""}\n`)

  if (DRY_RUN) {
    console.log("🔍 DRY RUN — fetching companies without generating...")
    const companies = await fetchCompanies()
    console.log(`Found ${companies.length} companies:`)
    for (const c of companies) {
      const rawSlug = (c.domain || c.slug || c.id)
        .replace(/^https?:\/\//, "")
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9-]+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase()
        .slice(0, 50)
      console.log(`  - ${c.company_name} (${c.domain}) → demo.paradigmjp.com/${rawSlug}-demo`)
    }
    console.log("\n✅ Dry run complete. Remove --dry-run to execute.\n")
    return
  }

  const companies = await fetchCompanies()
  console.log(`📋 Found ${companies.length} companies to process\n`)

  let success = 0
  let failed = 0
  const errors = []

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i]
    const label = `[${i + 1}/${companies.length}]`
    
    try {
      const result = await generateDemo(company.id)
      if (result.ok) {
        success++
        console.log(`${label} ✅ ${company.company_name} → ${result.demoUrl}`)
      } else {
        failed++
        const errMsg = result.error || "unknown error"
        console.error(`${label} ❌ ${company.company_name}: ${errMsg}`)
        errors.push(`${company.id} (${company.company_name}): ${errMsg}`)
      }
    } catch (err) {
      failed++
      console.error(`${label} ❌ ${company.company_name}: ${err.message}`)
      errors.push(`${company.id} (${company.company_name}): ${err.message}`)
    }
  }

  console.log(`\n📊 Migration complete:`)
  console.log(`   ✅ Success: ${success}`)
  console.log(`   ❌ Failed:  ${failed}`)
  
  if (errors.length > 0) {
    console.log(`\n⚠️  Errors:`)
    for (const e of errors.slice(0, 10)) {
      console.log(`   - ${e}`)
    }
    if (errors.length > 10) {
      console.log(`   ... and ${errors.length - 10} more`)
    }
  }
  
  console.log()
}

main().catch((err) => {
  console.error("Fatal error:", err.message)
  process.exit(1)
})
