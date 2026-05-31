import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { upsertCompanyByDomain, findExistingCompany } from "@/lib/sales/companies"
import { enqueueCompanyEnrichment, triggerEnrichmentRunner } from "@/lib/sales/enrichment-jobs"
import { normalizeDomain, normalizeCompanyName } from "@/lib/sales/dedup"
import { salesScopeFromCountry } from "@/lib/sales/locale-scope"
import {
  normalizeTargetCountry,
  normalizeTemplateVariant,
  type ReportLocale,
  type TemplateVariant,
} from "@/lib/sales/routing"
import type { Industry } from "@/lib/sales/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

interface CsvRow {
  company_name?: string
  domain?: string
  industry?: Industry
  prefecture?: string
  report_locale?: ReportLocale
  target_country?: string
  country?: string
  template_variant?: TemplateVariant
  email?: string
  phone?: string
  contact_name?: string
  contact_title?: string
  source?: string
}

interface Body {
  rows?: CsvRow[]
  enrich?: boolean
}

function isCsvRowArray(value: unknown): value is CsvRow[] {
  return Array.isArray(value) && value.every((row) => row && typeof row === "object" && !Array.isArray(row))
}

export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch (e) {
    console.error("[import-csv] invalid JSON body:", e)
    return NextResponse.json({ ok: false, error: "invalid json body" }, { status: 400 })
  }

  const rows = body.rows
  if (!isCsvRowArray(rows) || rows.length === 0) {
    return NextResponse.json({ ok: false, error: "rows[] required" }, { status: 400 })
  }
  if (rows.length > 1000) {
    return NextResponse.json(
      { ok: false, error: "max 1000 rows per request (split into chunks)" },
      { status: 400 },
    )
  }

  const shouldEnrich = body.enrich !== false
  const seenKeys = new Set<string>()
  const dedupedRows = rows.filter((row) => {
    const key = normalizeDomain(row.domain) ?? normalizeCompanyName(row.company_name)
    if (!key) return true
    if (seenKeys.has(key)) return false
    seenKeys.add(key)
    return true
  })

  let inserted = 0
  let skipped = 0
  let jobsEnqueued = 0
  const failures: { row: number; reason: string }[] = []

  for (let i = 0; i < dedupedRows.length; i++) {
    const row = dedupedRows[i]
    if (!row.company_name || !row.domain) {
      failures.push({ row: i, reason: "company_name and domain required" })
      continue
    }

    const cleanDomain = normalizeDomain(row.domain)
    if (!cleanDomain) {
      failures.push({ row: i, reason: "invalid domain format" })
      continue
    }

    const scope = salesScopeFromCountry({
      reportLocale: row.report_locale,
      targetCountry: row.target_country ?? row.country,
    })
    const existing = await findExistingCompany({
      domain: cleanDomain,
      nameKey: normalizeCompanyName(row.company_name),
      region: scope.region,
    })
    if (existing) {
      skipped++
      if (shouldEnrich && existing.pipeline_status !== "report_ready") {
        const queued = await enqueueCompanyEnrichment({
          companyId: existing.id,
          source: row.source ?? "csv_import_existing",
          triggeredBy: "csv_import_api",
          priority: 55,
          payload: {
            domain: cleanDomain,
            company_name: row.company_name,
            existing: true,
            report_locale: scope.reportLocale,
            target_country: scope.targetCountry,
            region: scope.region,
          },
        })
        if (queued.ok) jobsEnqueued++
        else failures.push({ row: i, reason: queued.error ?? "enrichment enqueue failed" })
      }
      continue
    }

    const reportLocale = scope.reportLocale
    const targetCountry = normalizeTargetCountry(row.target_country ?? row.country, reportLocale)
    const templateVariant = normalizeTemplateVariant(row.template_variant)
    const result = await upsertCompanyByDomain({
      domain: cleanDomain,
      company_name: row.company_name,
      region: scope.region,
      report_locale: reportLocale,
      target_country: targetCountry,
      template_variant: templateVariant,
      industry: row.industry ?? null,
      prefecture: row.prefecture ?? null,
      pipeline_status: shouldEnrich ? "scanning" : "pending",
      source: row.source ?? "csv_import",
      meta: {
        csv_import: {
          imported_at: new Date().toISOString(),
          source_file: row.source ?? "unknown",
          original_row: row,
          routing_scope: {
            region: scope.region,
            report_locale: reportLocale,
            target_country: targetCountry,
          },
        },
        contact_seed: {
          email: row.email ?? null,
          phone: row.phone ?? null,
          name: row.contact_name ?? null,
          title: row.contact_title ?? null,
        },
      },
    })

    if (!result.ok || !result.company) {
      console.error("[import-csv] upsert failed:", {
        row: i,
        domain: cleanDomain,
        company_name: row.company_name,
        error: result.error,
      })
      failures.push({ row: i, reason: result.error ?? "upsert failed" })
      continue
    }

    inserted++
    if (!shouldEnrich) continue

    const queued = await enqueueCompanyEnrichment({
      companyId: result.company.id,
      source: row.source ?? "csv_import",
      triggeredBy: "csv_import_api",
      priority: row.source === "apollo" || row.source === "apollo_exporter" ? 75 : 60,
      payload: {
        row_index: i,
        domain: cleanDomain,
        company_name: row.company_name,
        report_locale: reportLocale,
        target_country: targetCountry,
        region: scope.region,
        contact_seed: {
          email: row.email ?? null,
          phone: row.phone ?? null,
          name: row.contact_name ?? null,
          title: row.contact_title ?? null,
        },
      },
    })

    if (queued.ok) jobsEnqueued++
    else failures.push({ row: i, reason: queued.error ?? "enrichment enqueue failed" })
  }

  if (jobsEnqueued > 0) {
    await triggerEnrichmentRunner(Math.min(jobsEnqueued, 3))
  }

  return NextResponse.json({
    ok: true,
    total: rows.length,
    batch_duplicates_removed: rows.length - dedupedRows.length,
    deduped_total: dedupedRows.length,
    inserted,
    skipped,
    jobs_enqueued: jobsEnqueued,
    enrich_triggered: jobsEnqueued,
    failures: failures.slice(0, 20),
    note: shouldEnrich
      ? "Rows were saved to Supabase SSOT and durable enrichment jobs were queued."
      : "Rows were saved only. Enrichment was skipped because enrich=false.",
  })
}
