import { DB_TABLES } from "@/lib/sales/db-tables"
import type { JsonRecord, SalesPipelineRun, SalesPipelineStep } from "./sales-pipeline-types"
import { asRecord, updateStep } from "./sales-pipeline-helpers"
import type { getServiceSalesSupabase } from "@/lib/supabase"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

export async function executeDataCollectionStep(
  sb: ServiceSupabase,
  run: SalesPipelineRun,
  step: SalesPipelineStep,
): Promise<void> {
    const companyRes = await sb.from(DB_TABLES.SALES_COMPANIES).select("domain, company_name, meta").eq("id", run.company_id).maybeSingle()
    if (companyRes.error) {
      console.error("[sales-pipeline-execution] data_collection company fetch failed:", companyRes.error.message)
      throw new Error(companyRes.error.message)
    }
    const domain: string | null = typeof companyRes.data?.domain === "string" && companyRes.data.domain.length > 0
      ? companyRes.data.domain
      : null
    const currentMeta = asRecord(companyRes.data?.meta)

    const collected: JsonRecord = {}
    const errors: string[] = []

    // crt.sh — SSL certificate log count
    if (domain) {
      try {
        const crtUrl = `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`
        const crtRes = await fetch(crtUrl, { signal: AbortSignal.timeout(15_000) })
        if (crtRes.ok) {
          const crtData = (await crtRes.json()) as unknown
          const certCount = Array.isArray(crtData) ? crtData.length : 0
          collected.crt_cert_count = certCount
          collected.crt_collected_at = new Date().toISOString()
        } else {
          const crtErr = `crt.sh returned HTTP ${crtRes.status}`
          console.error("[sales-pipeline-execution] data_collection crt.sh failed:", crtErr)
          errors.push(crtErr)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "crt.sh fetch error"
        console.error("[sales-pipeline-execution] data_collection crt.sh error:", msg)
        errors.push(`crt.sh: ${msg}`)
      }
    } else {
      errors.push("crt.sh: skipped (no domain)")
    }

    // SSL Labs — SSL grade
    if (domain) {
      try {
        const sslUrl = `https://api.ssllabs.com/api/v3/analyze?host=${encodeURIComponent(domain)}&publish=off&startNew=off&fromCache=on&maxAge=24`
        const sslRes = await fetch(sslUrl, { signal: AbortSignal.timeout(20_000) })
        if (sslRes.ok) {
          const sslData = (await sslRes.json()) as Record<string, unknown>
          const sslEndpoints: Array<Record<string, unknown>> = Array.isArray(sslData.endpoints) ? sslData.endpoints as Array<Record<string, unknown>> : []
          const grades = sslEndpoints
            .map((ep) => (typeof ep.grade === "string" ? ep.grade : null))
            .filter((g): g is string => g !== null)
          const overallGrade = sslEndpoints.length > 0 && typeof sslEndpoints[0].grade === "string"
            ? sslEndpoints[0].grade
            : null
          collected.ssl_grade = overallGrade
          collected.ssl_all_grades = grades
          collected.ssl_status = sslData.status ?? null
          collected.ssl_collected_at = new Date().toISOString()
        } else {
          const sslErr = `SSL Labs returned HTTP ${sslRes.status}`
          console.error("[sales-pipeline-execution] data_collection SSL Labs failed:", sslErr)
          errors.push(sslErr)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "SSL Labs fetch error"
        console.error("[sales-pipeline-execution] data_collection SSL Labs error:", msg)
        errors.push(`SSL Labs: ${msg}`)
      }
    } else {
      errors.push("SSL Labs: skipped (no domain)")
    }

    // Mozilla Observatory — security score
    if (domain) {
      try {
        const obsUrl = `https://http-observatory.security.mozilla.org/api/v1/analyze?host=${encodeURIComponent(domain)}`
        const obsRes = await fetch(obsUrl, { signal: AbortSignal.timeout(20_000) })
        if (obsRes.ok) {
          const obsData = (await obsRes.json()) as Record<string, unknown>
          collected.observatory_grade = obsData.grade ?? null
          collected.observatory_score = obsData.score ?? null
          collected.observatory_tests_passed = obsData.tests_passed ?? null
          collected.observatory_tests_failed = obsData.tests_failed ?? null
          collected.observatory_collected_at = new Date().toISOString()
        } else if (obsRes.status === 404) {
          // Observatory returns 404 if the domain hasn't been scanned yet
          console.warn("[sales-pipeline-execution] data_collection Observatory 404 (not scanned):", domain)
          errors.push("Mozilla Observatory: not yet scanned (submit first)")
        } else {
          const obsErr = `Mozilla Observatory returned HTTP ${obsRes.status}`
          console.error("[sales-pipeline-execution] data_collection Observatory failed:", obsErr)
          errors.push(obsErr)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Mozilla Observatory fetch error"
        console.error("[sales-pipeline-execution] data_collection Observatory error:", msg)
        errors.push(`Mozilla Observatory: ${msg}`)
      }
    } else {
      errors.push("Mozilla Observatory: skipped (no domain)")
    }

    // OverPass API — OpenStreetMap POI data (coordinates, nearby places)
    if (domain) {
      try {
        // Use OverPass to find potential locations by domain name search in OSM
        const overpassQuery = `[out:json];(node["name"~"${domain.replace(/[^a-zA-Z0-9]/g, " ")}",i];way["name"~"${domain.replace(/[^a-zA-Z0-9]/g, " ")}",i];relation["name"~"${domain.replace(/[^a-zA-Z0-9]/g, " ")}",i];);out center 10;`
        const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          body: `data=${encodeURIComponent(overpassQuery)}`,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          signal: AbortSignal.timeout(30_000),
        })
        if (overpassRes.ok) {
          const overpassData = (await overpassRes.json()) as Record<string, unknown>
          const elements = Array.isArray(overpassData.elements) ? overpassData.elements : []
          collected.overpass_osm_elements = elements.length
          if (elements.length > 0) {
            const first = elements[0] as Record<string, unknown>
            collected.overpass_first_name = first.tags && typeof first.tags === "object"
              ? (first.tags as Record<string, unknown>).name ?? null
              : null
            collected.overpass_first_lat = first.lat ?? (first.center && typeof first.center === "object"
              ? (first.center as Record<string, unknown>).lat ?? null
              : null)
            collected.overpass_first_lon = first.lon ?? (first.center && typeof first.center === "object"
              ? (first.center as Record<string, unknown>).lon ?? null
              : null)
          }
          collected.overpass_collected_at = new Date().toISOString()
        } else {
          const opErr = `OverPass API returned HTTP ${overpassRes.status}`
          console.error("[sales-pipeline-execution] data_collection OverPass failed:", opErr)
          errors.push(opErr)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "OverPass API fetch error"
        console.error("[sales-pipeline-execution] data_collection OverPass error:", msg)
        errors.push(`OverPass: ${msg}`)
      }
    } else {
      errors.push("OverPass: skipped (no domain)")
    }

    // Google Trends / PyTrends — Web search interest (keyword-based, no auth needed)
    if (domain) {
      try {
        const cleanName = domain.replace(/\.(com|jp|net|org|io|co\.jp|ne\.jp|ac\.jp|go\.jp|or\.jp)$/i, "").replace(/[^a-zA-Z0-9]/g, " ")
        const trendsKeyword = encodeURIComponent(cleanName.trim() || domain)
        // Use unofficial free trends endpoint (RSS-like)
        const trendsUrl = `https://trends.google.com/trends/api/explore?hl=en-US&tz=-540&req={"comparisonItem":[{"keyword":"${trendsKeyword}","geo":"","time":"today 12-m"}],"category":0,"property":""}`
        const trendsRes = await fetch(trendsUrl, { signal: AbortSignal.timeout(15_000) })
        if (trendsRes.ok) {
          const trendsText = await trendsRes.text()
          // Google Trends returns JSON with a prepended garbage string; strip it
          const jsonStart = trendsText.indexOf("{")
          if (jsonStart >= 0) {
            const trendsData = JSON.parse(trendsText.slice(jsonStart)) as Record<string, unknown>
            collected.trends_data_available = true
            collected.trends_collected_at = new Date().toISOString()
            // Extract widget tokens for later detailed fetch if needed
            const widgets = trendsData.widgets
            collected.trends_widget_count = Array.isArray(widgets) ? widgets.length : 0
          }
        } else {
          const trErr = `Google Trends returned HTTP ${trendsRes.status}`
          console.error("[sales-pipeline-execution] data_collection Google Trends failed:", trErr)
          errors.push(trErr)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Google Trends fetch error"
        console.error("[sales-pipeline-execution] data_collection Google Trends error:", msg)
        errors.push(`Google Trends: ${msg}`)
      }
    } else {
      errors.push("Google Trends: skipped (no domain)")
    }

    // Store results in sales_companies.meta.data_collection
    const { error: metaUpdateError } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .update({
        meta: {
          ...currentMeta,
          data_collection: {
            collected_at: new Date().toISOString(),
            pipeline_run_id: run.id,
            domain: domain ?? null,
            ...collected,
            errors: errors.length > 0 ? errors : null,
          },
        },
      })
      .eq("id", run.company_id)
    if (metaUpdateError) {
      console.error("[sales-pipeline-execution] data_collection meta update failed:", metaUpdateError.message)
      throw new Error(metaUpdateError.message)
    }

    // Insert source_run records for each data source
    const sourceKeyMap: Array<{ slug: string; collectedKey: string; label: string; category: string }> = [
      { slug: "crt_sh", collectedKey: "crt_cert_count", label: "crt.sh SSL Certificates", category: "security" },
      { slug: "ssl_labs", collectedKey: "ssl_grade", label: "SSL Labs Grade", category: "security" },
      { slug: "mozilla_observatory", collectedKey: "observatory_score", label: "Mozilla Observatory", category: "security" },
      { slug: "overpass_api", collectedKey: "overpass_osm_elements", label: "OverPass API (OSM)", category: "geo" },
      { slug: "google_trends", collectedKey: "trends_data_available", label: "Google Trends", category: "market" },
    ]
    for (const src of sourceKeyMap) {
      const hasData = collected[src.collectedKey] !== undefined && collected[src.collectedKey] !== null
      const { error: srcRunError } = await sb
        .from(DB_TABLES.SALES_SOURCE_RUNS)
        .upsert({
          company_id: run.company_id,
          source_slug: src.slug,
          category: src.category,
          status: hasData ? "collected" : "missing",
          score: hasData ? 75 : 0,
          details: {
            label: src.label,
            pipeline_run_id: run.id,
            collected_at: new Date().toISOString(),
          },
          measured_at: new Date().toISOString(),
        }, { onConflict: "company_id,source_slug" })
      if (srcRunError) {
        console.error(`[sales-pipeline-execution] data_collection source_run upsert failed for ${src.slug}:`, srcRunError.message)
      }
    }

    await updateStep(sb, step, {
      status: "completed",
      output_payload: {
        domain: domain ?? null,
        sources_collected: Object.keys(collected).length,
        errors: errors.length > 0 ? errors : null,
      },
    })
    return
}
