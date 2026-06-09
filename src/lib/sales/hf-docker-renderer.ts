/**
 * HyperFrames Docker Renderer — Node.js wrapper
 *
 * This module generates HyperFrames HTML, writes it to a temp directory
 * as a HyperFrames composition, then invokes the Docker renderer to
 * produce an MP4 file.
 *
 * Prerequisites:
 *   docker build -t paradigm-hf-renderer -f docker/Dockerfile.hf-renderer .
 */

import { execSync } from "node:child_process"
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import type { DiagnosticReportData } from "./diagnostic"
import { buildVariantVideoHtml } from "./video-templates"

const HUGGINGFACE_IMAGE = process.env.HF_RENDERER_IMAGE || "paradigm-hf-renderer"
const HYPERFRAMES_TIMEOUT = 5 * 60_000 // 5 minutes per render

interface HyperFramesRenderResult {
  success: boolean
  mp4Path?: string
  mp4Base64?: string
  error?: string
  duration?: number
  profile: string
}

/**
 * Step 1: Generate HyperFrames HTML from diagnostic data
 */
function generateCompositionHTML(data: DiagnosticReportData): string {
  const script = {
    hook: data.hook || `${data.company_name}のデジタル診断`,
    pain: data.acts[0]?.headline || "改善すべき課題が見つかりました",
    fear: data.acts[1]?.headline || "このままでは機会損失が拡大",
    hope: data.intelligence.nextActions[0] || "改善で収益最大化",
    cta: data.cta_text || "無料相談を予約する",
  }
  return buildVariantVideoHtml(data, script)
}

/**
 * Step 2: Write composition as HyperFrames project
 */
function writeHyperFramesProject(
  html: string,
  projectDir: string,
  data: DiagnosticReportData,
): void {
  // Create project structure
  mkdirSync(projectDir, { recursive: true })

  // Write index.html (main composition)
  writeFileSync(join(projectDir, "index.html"), html, "utf-8")

  // Write hyperframes.json config
  const hfConfig = {
    paths: {
      blocks: "compositions",
      components: "compositions/components",
      assets: "assets",
    },
    render: {
      defaults: {
        fps: 30,
        quality: "standard" as const,
        format: "mp4" as const,
      },
      profiles: {
        standard: {
          fps: 30,
          quality: "standard" as const,
          description: "Standard quality (SNS/Web)",
        },
        high: {
          fps: 60,
          quality: "high" as const,
          video_bitrate: "20M",
          description: "High quality (client delivery)",
        },
        draft: {
          fps: 15,
          quality: "draft" as const,
          description: "Quick preview",
        },
      },
    },
  }
  writeFileSync(join(projectDir, "hyperframes.json"), JSON.stringify(hfConfig, null, 2), "utf-8")

  // Write meta.json
  const meta = {
    title: `${data.company_name} — Diagnostic Video`,
    variant: data.template_variant,
    industry: data.industry,
    locale: data.report_locale,
    generated: new Date().toISOString(),
  }
  writeFileSync(join(projectDir, "meta.json"), JSON.stringify(meta, null, 2), "utf-8")
}

/**
 * Step 3: Render via Docker container
 */
function renderWithDocker(
  projectDir: string,
  outputDir: string,
  profile: string,
): string {
  const cmd = [
    "docker", "run", "--rm",
    "-v", `"${projectDir}:/app"`,
    "-v", `"${outputDir}:/app/renders"`,
    HUGGINGFACE_IMAGE,
    "--profile", profile,
    "--all",
  ].join(" ")

  execSync(cmd, {
    timeout: HYPERFRAMES_TIMEOUT,
    stdio: "pipe",
    encoding: "utf-8",
  })

  const mp4Files = require("node:fs").readdirSync(outputDir).filter((f: string) => f.endsWith(".mp4"))
  if (mp4Files.length === 0) {
    throw new Error("No MP4 files produced by renderer")
  }
  return join(outputDir, mp4Files[0])
}

/**
 * Orchestrate full render pipeline
 */
export async function renderHyperFramesVideo(
  data: DiagnosticReportData,
  options: { profile?: string } = {},
): Promise<HyperFramesRenderResult> {
  const profile = options.profile || "standard"
  const startTime = Date.now()

  try {
    // 1. Generate HTML
    const html = generateCompositionHTML(data)

    // 2. Write project
    const projectDir = join(tmpdir(), `hf-render-${Date.now()}`)
    const outputDir = join(projectDir, "renders")
    mkdirSync(outputDir, { recursive: true })
    writeHyperFramesProject(html, projectDir, data)

    // 3. Render via Docker
    const mp4Path = renderWithDocker(projectDir, outputDir, profile)

    // 4. Read result
    const mp4Buffer = readFileSync(mp4Path)
    const mp4Base64 = mp4Buffer.toString("base64")

    return {
      success: true,
      mp4Path,
      mp4Base64,
      duration: Date.now() - startTime,
      profile,
    }
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err)
    console.error("[HyperFrames] Render failed:", error)
    return {
      success: false,
      error,
      profile,
    }
  }
}
