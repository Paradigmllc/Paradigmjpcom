/**
 * Compatibility entry point for the former Astro/R2 direct publisher.
 *
 * Direct object-storage publication bypassed evidence, rights, collision, and
 * quality checks. Every caller now enters the canonical quality-gated Next.js
 * full-site pipeline instead.
 */
import { generateFullStackDemo } from "./demo-page-service"
import type { SalesCompany } from "./types"

export interface BuildDeployResult {
  ok: boolean
  url?: string
  slug?: string
  error?: string
}

export async function buildAndDeployDemo(company: SalesCompany): Promise<BuildDeployResult> {
  const result = await generateFullStackDemo(company.id, company.report_locale ?? "ja")
  return {
    ok: result.ok,
    url: result.demoUrl ?? undefined,
    slug: result.slug ?? undefined,
    error: result.error,
  }
}
