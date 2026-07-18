/**
 * /api/demo-designs/[slug] — Hyper-personalized demo design spec API
 *
 * GET  — Returns cached DemoDesignSpec JSON (public, cached)
 * POST — Triggers DeepSeek generation of a new design spec (admin auth)
 */
import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { generateDemoDesign, buildDesignInput } from "@/lib/sales/demo-design-generator"
import { validateDesignSpec } from "@/lib/sales/demo-design-prompts"
import type { DesignPromptInput } from "@/lib/sales/demo-design-prompts"
import { isAuthorizedOperatorRequest } from "@/lib/api-security"
import { generateScreenshotToCode } from "@/lib/sales/screenshot-to-code-client"
import { demoSiteUrl } from "@/lib/sales/routing"

export const dynamic = "force-dynamic"

// ── GET — return cached design spec ──

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!(await isAuthorizedOperatorRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { slug } = await params
  try {
    const sb = getServiceSalesSupabase()
    if (!sb) return NextResponse.json({ error: "supabase not configured" }, { status: 500 })

    const { data, error } = await sb
      .from("theme_demo_pages")
      .select("meta, company_id")
      .eq("slug", slug)
      .eq("is_published", true)
      .in("publication_status", ["published", "legacy_published"])
      .maybeSingle()

    if (error) {
      console.error(`[demo-designs/${slug}] fetch error:`, error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: "not found" }, { status: 404 })
    }

    const meta = (data.meta ?? {}) as Record<string, unknown>
    const spec = meta.design_spec
    if (!spec) {
      return NextResponse.json({ error: "design spec not yet generated" }, { status: 404 })
    }

    return NextResponse.json(spec, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    })
  } catch (e) {
    console.error(`[demo-designs/${slug}] unexpected:`, e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

// ── POST — generate new design spec (admin auth) ──

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const expected = process.env.ADMIN_SCRIPT_SECRET
  if (!expected) return NextResponse.json({ error: "secret not set" }, { status: 500 })
  if (req.headers.get("x-admin-secret") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { slug } = await params
  let body: Record<string, unknown>
  try {
    const parsed = await req.json()
    body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch (error) {
    console.error(`[demo-designs/${slug}] request body parse failed:`, error)
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }
  const locale = (typeof body.locale === "string" ? body.locale : "ja") as "ja" | "en"

  try {
    const sb = getServiceSalesSupabase()
    if (!sb) return NextResponse.json({ error: "supabase not configured" }, { status: 500 })

    // Fetch company data
    const companyId = typeof body.company_id === "string" ? body.company_id : null

    let companyData: Record<string, unknown> | null = null
    if (companyId) {
      const { data: company } = await sb
        .from("sales_companies")
        .select("company_name, domain, industry, prefecture, meta, pain_diagnosis, dify_result, tech_stack, pagespeed_mobile, pagespeed_desktop, detected_issues")
        .eq("id", companyId)
        .maybeSingle()
      companyData = company ?? null
    }

    if (!companyData) {
      return NextResponse.json({ error: "company not found" }, { status: 404 })
    }

    const websiteAssets = companyData.meta
      ? ((companyData.meta as Record<string, unknown>).website_assets as Record<string, unknown>)
      : null

    const input = buildDesignInput({
      company_name: String(companyData.company_name ?? ""),
      domain: String(companyData.domain ?? ""),
      industry: typeof companyData.industry === "string" ? companyData.industry : null,
      location: typeof companyData.prefecture === "string" ? companyData.prefecture : null,
      locale,
      website_assets: websiteAssets,
      diagnosis: {
        pain_summary: companyData.pain_diagnosis ?? companyData.dify_result ?? {},
        detected_issues: companyData.detected_issues,
        pagespeed_mobile: companyData.pagespeed_mobile,
        pagespeed_desktop: companyData.pagespeed_desktop,
        tech_stack: companyData.tech_stack,
        improvement_actions: [],
      } as Record<string, unknown>,
    })

    if (!input) {
      return NextResponse.json({ error: "insufficient company data" }, { status: 400 })
    }

    const imported = body.spec
    const importedValidation = imported ? validateDesignSpec(imported) : null
    if (imported && (!importedValidation?.ok || !importedValidation.spec)) {
      console.error(`[demo-designs/${slug}] imported screenshot-to-code spec rejected:`, importedValidation?.errors)
      return NextResponse.json({ error: "invalid design spec", details: importedValidation?.errors }, { status: 422 })
    }

    const result = importedValidation?.spec
      ? { ok: true as const, spec: importedValidation.spec, source: "screenshot-to-code" as const }
      : { ...(await generateDemoDesign(input, slug)), source: "deepseek" as const }
    if (!result.ok || !result.spec) {
      const failure = "error" in result ? result.error : undefined
      return NextResponse.json({ error: failure ?? "generation failed" }, { status: 500 })
    }

    const rawScreenshotUrls = body.screenshot_data_urls
    const screenshotDataUrls = Array.isArray(rawScreenshotUrls)
      ? rawScreenshotUrls.filter((value): value is string => typeof value === "string" && value.length <= 8_000_000 && (value.startsWith("data:image/") || value.startsWith("https://")))
      : []
    if (rawScreenshotUrls !== undefined && (!Array.isArray(rawScreenshotUrls) || rawScreenshotUrls.length < 1 || rawScreenshotUrls.length > 3 || screenshotDataUrls.length !== rawScreenshotUrls.length)) {
      return NextResponse.json({ error: "screenshot_data_urls must contain 1-3 data:image or HTTPS images" }, { status: 400 })
    }
    const screenshotToCode = screenshotDataUrls.length > 0
      ? await generateScreenshotToCode({
          imageDataUrls: screenshotDataUrls,
          prompt: `${companyData.company_name}の公開提案用サイト。${typeof body.screenshot_prompt === "string" ? body.screenshot_prompt : ""}`.trim(),
          designSystem: typeof body.screenshot_design_system === "string" ? body.screenshot_design_system : undefined,
        })
      : null
    const screenshotPreviewToken = screenshotToCode ? randomUUID() : null

    // Store the generated spec in theme_demo_pages
    const { error: upsertErr } = await sb
      .from("theme_demo_pages")
      .upsert(
        {
          slug,
          theme: "hyper-personalized",
          title: result.spec.pages.home?.title ?? `${companyData.company_name} Demo`,
          blocks: result.spec,
          meta: {
            ...((typeof companyData.meta === "object" && companyData.meta !== null) ? companyData.meta as Record<string, unknown> : {}),
            design_spec: result.spec,
            design_spec_source: result.source,
            ...(screenshotToCode ? {
              screenshot_to_code: {
                status: "review",
                code: screenshotToCode.code,
                code_bytes: Buffer.byteLength(screenshotToCode.code, "utf8"),
                generated_at: new Date().toISOString(),
                upstream_commit: screenshotToCode.upstreamCommit,
                provider: screenshotToCode.provider,
                model: screenshotToCode.model,
                source: "abi/screenshot-to-code",
                preview_token: screenshotPreviewToken,
              },
            } : {}),
            design_philosophy: result.spec.design_philosophy,
            generated_at: new Date().toISOString(),
          },
          is_published: false,
          publication_status: "quality_review",
          company_id: companyId,
        },
        { onConflict: "slug" },
      )

    if (upsertErr) {
      console.error(`[demo-designs/${slug}] upsert error:`, upsertErr.message)
    }

    return NextResponse.json({
      ...result.spec,
      screenshotToCode: screenshotToCode ? {
        status: "review",
        codeBytes: Buffer.byteLength(screenshotToCode.code, "utf8"),
        upstreamCommit: screenshotToCode.upstreamCommit,
        provider: screenshotToCode.provider,
        model: screenshotToCode.model,
        previewUrl: screenshotPreviewToken
          ? `${demoSiteUrl()}/api/sales/demo-site/screenshot-to-code/preview/${encodeURIComponent(slug)}?token=${encodeURIComponent(screenshotPreviewToken)}`
          : null,
      } : null,
    }, { status: 201 })
  } catch (e) {
    console.error(`[demo-designs/${slug}] unexpected:`, e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
