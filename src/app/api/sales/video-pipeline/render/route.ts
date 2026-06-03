/**
 * /api/sales/video-pipeline/render — 動画レンダリング実行API
 *
 * GUIから「今すぐレンダリング」ボタンで呼び出される。
 * 1. ジョブのナレーションスクリプトを生成（DeepSeek）
 * 2. HyperFrames HTML をビルド
 * 3. test-video/ に書き出してレンダリング実行
 * 4. 完了後 R2 にアップロード
 * 5. ジョブのステータスを更新
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

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5分

const TEST_VIDEO_DIR = resolve(process.cwd(), "test-video")
const RENDERS_DIR = resolve(TEST_VIDEO_DIR, "renders")

interface RenderRequest {
  jobId: string
  quality?: "draft" | "standard" | "high"
  fps?: number
}

/** 診断レポートがない場合のフォールバックデータ */
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

    // ジョブを取得
    const { data: job, error: jobError } = await sb
      .from("sales_video_jobs")
      .select("*, sales_companies!inner(company_name, domain, slug)")
      .eq("id", body.jobId)
      .single()

    if (jobError || !job) {
      console.error("[render-api] job not found:", jobError?.message)
      return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 })
    }

    // ステータスを rendering に更新
    await runVideoJobAction({ jobId: body.jobId, action: "approve_render" })

    // 企業情報を取得
    const companyId = job.company_id
    const company = companyId ? await findCompanyById(companyId) : null
    const companyName = company?.company_name ?? job.sales_companies?.company_name ?? "Unknown"

    // 診断レポートを取得
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

    // レポートデータを確定（なければフォールバック）
    const resolvedReport: DiagnosticReportData = reportData ?? buildFallbackReportData({
      companyName,
      industry: company?.industry ?? null,
      locale,
    })

    // ナレーションスクリプトを生成
    const narrationResult = await generateNarrationScript(resolvedReport)
    const narrationScript = narrationResult.script ?? {
      hook: `${companyName}の公開データから、改善できる機会損失を可視化します。`,
      pain: "検索、SNS、フォーム導線のシグナルから、比較中の顧客が迷うポイントを特定しました。",
      fear: "このまま放置すると、毎月の機会損失が見えないまま積み上がります。",
      hope: "信頼材料と問い合わせ導線の改善で、機会損失の一部は回収できる可能性があります。",
      cta: `${companyName}向けの診断レポートと改善デモを30分で確認しましょう。`,
    }

    // HyperFrames HTML をビルド
    const html = buildHyperFramesHtml(resolvedReport, narrationScript)

    // test-video/index.html を上書き
    if (!existsSync(RENDERS_DIR)) {
      mkdirSync(RENDERS_DIR, { recursive: true })
    }
    writeFileSync(resolve(TEST_VIDEO_DIR, "index.html"), html, "utf-8")

    // レンダリング実行
    const quality = body.quality ?? "draft"
    const fps = body.fps ?? (quality === "draft" ? 15 : quality === "high" ? 60 : 30)
    const outputFilename = `render-${body.jobId.slice(0, 8)}-${Date.now()}.mp4`
    const outputPath = resolve(RENDERS_DIR, outputFilename)

    const cmd = [
      `cd /d "${TEST_VIDEO_DIR}"`,
      "&&",
      "npx hyperframes render",
      `--fps ${fps}`,
      `--quality ${quality}`,
      quality === "high" ? "--video-bitrate 20M" : "",
      `--output "${outputPath}"`,
    ]
      .filter(Boolean)
      .join(" ")

    console.log(`[render-api] executing: ${cmd}`)
    execSync(cmd, { stdio: "pipe", timeout: 240_000 }) // 4分タイムアウト

    // レンダリング結果を確認
    if (!existsSync(outputPath)) {
      throw new Error("Render completed but output file not found")
    }

    // ファイルサイズを取得
    const stats = await import("fs/promises").then((fs) => fs.stat(outputPath))
    const fileSizeBytes = stats.size

    // プレビューURL（ローカルファイルの絶対パス）
    const previewUrl = `file://${outputPath}`

    // ジョブを完了状態に更新
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
      message: "動画のレンダリングが完了しました",
    })
  } catch (error) {
    console.error("[render-api] render failed:", error)
    const message = error instanceof Error ? error.message : "Unknown render error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
