import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { findCompanyById, findCompanyBySlug } from "@/lib/sales/companies"
import { fetchDiagnosticReport } from "@/lib/sales/diagnostic"
import { generateReplacementDemo } from "@/lib/sales/demo-generator"
import type { SalesCompany } from "@/lib/sales/types"

export const runtime = "nodejs"

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

async function resolveCompany(input: { companyId?: string | null; slug?: string | null }): Promise<SalesCompany | null> {
  if (input.companyId) return findCompanyById(input.companyId)
  if (input.slug) return findCompanyBySlug(input.slug.replace(/-demo$/, ""))
  return null
}

export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json() as Record<string, unknown>
    const companyId = readString(body.companyId)
    const slug = readString(body.slug)
    const company = await resolveCompany({ companyId, slug })

    if (!company) {
      return NextResponse.json({ ok: false, error: "company not found" }, { status: 404 })
    }

    const report = await fetchDiagnosticReport({
      companyId: company.id,
      reportLocale: company.report_locale ?? undefined,
      targetCountry: company.target_country ?? undefined,
      templateVariant: company.template_variant ?? undefined,
    })

    if (!report) {
      return NextResponse.json({ ok: false, error: "diagnostic report not found" }, { status: 404 })
    }

    const result = await generateReplacementDemo(company, report)
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error ?? "demo generation failed" },
        { status: 422 },
      )
    }

    return NextResponse.json({
      ok: true,
      demoUrl: result.demoUrl,
      companyId: company.id,
      slug: company.slug,
    })
  } catch (error) {
    console.error("[sales-demo-regenerate] failed:", error)
    return NextResponse.json({ ok: false, error: "demo regeneration failed" }, { status: 500 })
  }
}
