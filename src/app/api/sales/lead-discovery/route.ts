import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { upsertCompanyByDomain, findExistingCompany } from "@/lib/sales/companies"
import { normalizeCompanyName } from "@/lib/sales/dedup"
import { enqueueCompanyEnrichment, triggerEnrichmentRunner } from "@/lib/sales/enrichment-jobs"
import { salesScopeFromCountry } from "@/lib/sales/locale-scope"
import {
  discoverLeadCandidates,
  isLeadDiscoverySource,
  type LeadDiscoverySource,
} from "@/lib/sales/sources/lead-discovery"
import type { Industry } from "@/lib/sales/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

interface Body {
  query?: string
  source?: LeadDiscoverySource
  limit?: number
  market?: string
  import?: boolean
  industry?: Industry | null
  target_country?: string | null
  report_locale?: string | null
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "lead discovery request failed"
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    let body: Body
    try {
      body = (await req.json()) as Body
    } catch (error) {
      console.error("[lead-discovery] invalid JSON:", error)
      return NextResponse.json({ ok: false, error: "invalid json body" }, { status: 400 })
    }

    const query = body.query?.trim()
    if (!query) return NextResponse.json({ ok: false, error: "query is required" }, { status: 400 })
    const source = isLeadDiscoverySource(body.source) ? body.source : "searxng"
    const result = await discoverLeadCandidates({
      query,
      source,
      limit: body.limit,
      market: body.market ?? body.target_country ?? undefined,
    })
    if (!result.ok) {
      return NextResponse.json({ ok: false, source, error: result.error, candidates: [] }, { status: 502 })
    }

    if (!body.import) {
      return NextResponse.json({ ok: true, source, candidates: result.candidates })
    }

    const scope = salesScopeFromCountry({
      reportLocale: body.report_locale ?? undefined,
      targetCountry: body.target_country ?? body.market ?? undefined,
    })
    let inserted = 0
    let skipped = 0
    let jobsEnqueued = 0
    const failures: Array<{ domain: string; reason: string }> = []

    for (const candidate of result.candidates) {
      const existing = await findExistingCompany({
        domain: candidate.domain,
        nameKey: normalizeCompanyName(candidate.companyName),
        region: scope.region,
      })
      if (existing) {
        skipped++
        continue
      }

      const saved = await upsertCompanyByDomain({
        domain: candidate.domain,
        company_name: candidate.companyName,
        region: scope.region,
        report_locale: scope.reportLocale,
        target_country: scope.targetCountry,
        industry: body.industry ?? null,
        source,
        pipeline_status: "scanning",
        meta: {
          lead_discovery: {
            query,
            source,
            market: body.market ?? null,
            url: candidate.url,
            title: candidate.title,
            snippet: candidate.snippet,
            raw: candidate.raw,
            discovered_at: new Date().toISOString(),
          },
        },
      })

      if (!saved.ok || !saved.company) {
        failures.push({ domain: candidate.domain, reason: saved.error ?? "upsert failed" })
        continue
      }
      inserted++
      const queued = await enqueueCompanyEnrichment({
        companyId: saved.company.id,
        source,
        triggeredBy: "lead_discovery_api",
        priority: source === "publicwww" ? 70 : 62,
        payload: {
          query,
          source,
          market: body.market ?? null,
          domain: candidate.domain,
          company_name: candidate.companyName,
          discovery_url: candidate.url,
        },
      })
      if (queued.ok) jobsEnqueued++
      else failures.push({ domain: candidate.domain, reason: queued.error ?? "enqueue failed" })
    }

    if (jobsEnqueued > 0) {
      await triggerEnrichmentRunner(Math.min(jobsEnqueued, 3))
    }

    return NextResponse.json({
      ok: true,
      source,
      candidates: result.candidates,
      inserted,
      skipped,
      jobs_enqueued: jobsEnqueued,
      failures: failures.slice(0, 20),
    })
  } catch (error) {
    console.error("[lead-discovery] request failed:", error)
    return NextResponse.json({ ok: false, error: errorMessage(error), candidates: [] }, { status: 500 })
  }
}
