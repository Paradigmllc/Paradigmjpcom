/**
 * /api/sales/video-pipeline/render — Video render execution API
 *
 * 1. Fetches job + company + diagnostic data
 * 2. Generates narration via DeepSeek
 * 3. Builds HyperFrames HTML composition
 * 4. Renders to MP4 via HyperFrames CLI
 * 5. Completes job in Supabase
 */
import { NextRequest, NextResponse } from "next/server"
import { execSync } from "child_process"
import { existsSync, mkdirSync, writeFileSync } from "fs"
import { resolve } from "path"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { findCompanyById } from "@/lib/sales/companies"
import { fetchDiagnosticReport, type DiagnosticReportData } from "@/lib/sales/diagnostic"
import { generateNarrationScript, buildHyperFramesHtml } from "@/lib/sales/video-generator"
import { runVideoJobAction } from "@/lib/sales/video-pipeline"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const TEST_VIDEO_DIR = resolve(process.cwd(), "test-video")
const RENDERS_DIR = resolve(TEST_VIDEO_DIR, "renders")

interface RenderRequest {
  jobId: string
  quality?: "draft" | "standard" | "high"
  fps?: number
}

function buildFallbackReportData(opts: {
  companyName: string
  industry: string | null
  locale: string
}): DiagnosticReportData {
  return {
    company_name: opts.companyName,
    industry: opts.industry as DiagnosticReportData["industry"],
    report_locale: opts.locale as DiagnosticReportData["report_locale"],
    target_country: "jp",
    template_variant: "website_diagnostic",
    prefecture: null,
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    hook: "",
    total_loss: "0",
    acts: [],
    cta_text: "",
    video_thumbnail: null,
    demo_url: null,
    source_coverage: { score: 0, collected: 0, configured: 0, missing: 0, items: [] },
    intelligence: {} as DiagnosticReportData["intelligence"],
    content_template: {} as DiagnosticReportData["content_template"],
    report_url: "",
    localized_report_urls: [],
  }
}

export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await req.json()) as RenderRequest
    if (!body.jobId) {
      return NextResponse.json({ ok: false, error: "jobId is required" }, { status: 400 })
    }

    const sb = getServiceSalesSupabase()
    if (!sb) {
      return NextResponse.json({ ok: false, error: "Supabase is not configured" }, { status: 500 })
    }

    const { data: job, error: jobError } = await sb
      .from(DB_TABLES.SALES_VIDEO_JOBS)
      .select("*, sales_companies!inner(company_name, domain, slug)")
      .eq("id", body.jobId)
      .single()

    if (jobError || !job) {
      console.error("[render-api] job not found:", jobError?.message)
      return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 })
    }

    await runVideoJobAction({ jobId: body.jobId, action: "approve_render" })

    const companyId = job.company_id
    const company = companyId ? await findCompanyById(companyId) : null
    const companyName = company?.company_name ?? job.sales_companies?.company_name ?? "Unknown"

    const slug = company?.slug ?? job.sales_companies?.slug
    const locale = job.locale || "ja"
    let reportData: DiagnosticReportData | null = null
    if (slug) {
      try {
        reportData = await fetchDiagnosticReport({ slug, reportLocale: locale })
      } catch (e) {
        console.warn("[render-api] fetchDiagnosticReport failed (continuing with fallback):", e)
      }
    }

    const resolvedReport: DiagnosticReportData = reportData ?? buildFallbackReportData({
      companyName,
      industry: company?.industry ?? null,
      locale,
    })

    const narrationResult = await generateNarrationScript(resolvedReport)
    const narrationScript = narrationResult.script ?? {
      hook: `${companyName}の公開データから、改善できる機会損失を可視化します。`,
      pain: "検索、SNS、フォーム導線のシグナルから、比較中の顧客が迷うポイントを特定しました。",
      fear: "このまま放置すると、毎月の機会損失が見えないまま積み上がります。",
      hope: "信頼材料と問い合わせ導線の改善で、機会損失の一部は回収できる可能性があります。",
      cta: `${companyName}向けの診断レポートと改善デモを30分で確認しましょう。`,
    }

    const html = buildHyperFramesHtml(resolvedReport, narrationScript)

    if (!existsSync(RENDERS_DIR)) {
      mkdirSync(RENDERS_DIR, { recursive: true })
    }
    writeFileSync(resolve(TEST_VIDEO_DIR, "index.html"), html, "utf-8")

    const quality = body.quality ?? "standard"
    const fps = body.fps ?? (quality === "draft" ? 15 : quality === "high" ? 60 : 30)
    const outputFilename = `render-${body.jobId.slice(0, 8)}-${Date.now()}.mp4`
    const outputPath = resolve(RENDERS_DIR, outputFilename)

    const renderArgs = [
      "npx hyperframes render",
      `--fps ${fps}`,
      `--quality ${quality}`,
      quality === "high" ? `--video-bitrate 20M` : "",
      `--output "${outputPath}"`,
    ].filter(Boolean).join(" ")

    console.warn(`[render-api] executing: ${renderArgs} in ${TEST_VIDEO_DIR}`)
    execSync(renderArgs, { cwd: TEST_VIDEO_DIR, stdio: "pipe", timeout: 240_000 })

    if (!existsSync(outputPath)) {
      throw new Error("Render completed but output file not found")
    }

    const stats = await import("fs/promises").then((fs) => fs.stat(outputPath))
    const fileSizeBytes = stats.size
    const previewUrl = `file://${outputPath}`

    await runVideoJobAction({
      jobId: body.jobId,
      action: "complete",
      outputUrl: previewUrl,
    })

    return NextResponse.json({
      ok: true,
      jobId: body.jobId,
      outputPath,
      filename: outputFilename,
      fileSizeBytes,
      previewUrl,
      message: "Video render completed",
    })
  } catch (error) {
    console.error("[render-api] render failed:", error)
    const message = error instanceof Error ? error.message : "Unknown render error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
