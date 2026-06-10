/**
 * HyperFrames video render script
 *
 * Usage:
 *   node scripts/render-video-hyperframes.mjs [--profile draft|standard|high]
 *
 * Renders test-video/index.html to MP4 via HyperFrames CLI.
 * Pipeline integration: callable from n8n or trigger.dev workers.
 */
import { execSync } from "child_process"
import { existsSync, mkdirSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_DIR = resolve(__dirname, "..", "test-video")
const RENDERS_DIR = resolve(PROJECT_DIR, "renders")

const PROFILES: Record<string, { fps: number; quality: string; extra?: string; desc: string }> = {
  draft: { fps: 15, quality: "draft", desc: "Quick preview" },
  standard: { fps: 30, quality: "standard", desc: "Standard quality" },
  high: { fps: 60, quality: "high", extra: "--video-bitrate 20M", desc: "High quality delivery" },
  "social-portrait": { fps: 30, quality: "standard", extra: "--resolution portrait", desc: "TikTok/Reels/Shorts" },
  "social-square": { fps: 30, quality: "standard", extra: "--resolution square", desc: "Instagram square" },
}

function parseArgs() {
  const args = process.argv.slice(2)
  const profileIdx = args.indexOf("--profile")
  const profile = profileIdx >= 0 ? (args[profileIdx + 1] || "standard") : "standard"
  const compIdx = args.indexOf("--composition")
  const composition = compIdx >= 0 ? args[compIdx + 1] : null
  const outIdx = args.indexOf("--output")
  const output = outIdx >= 0 ? args[outIdx + 1] : null
  return { profile, composition, output }
}

function main() {
  const { profile, composition, output } = parseArgs()

  if (!PROFILES[profile]) {
    console.error(`Unknown profile: ${profile}`)
    console.error(`Available: ${Object.keys(PROFILES).join(", ")}`)
    process.exit(1)
  }

  const config = PROFILES[profile]
  console.log(`\nHyperFrames render start`)
  console.log(`  Profile: ${profile} (${config.desc})`)
  console.log(`  Project: ${PROJECT_DIR}`)

  if (!existsSync(resolve(PROJECT_DIR, "index.html"))) {
    console.error(`${PROJECT_DIR}/index.html not found`)
    process.exit(1)
  }

  if (!existsSync(RENDERS_DIR)) {
    mkdirSync(RENDERS_DIR, { recursive: true })
  }

  const renderArgs = [
    `cd /d "${PROJECT_DIR}"`,
    "&&",
    "npx hyperframes render",
    `--fps ${config.fps}`,
    `--quality ${config.quality}`,
    config.extra || "",
    composition ? `--composition "${composition}"` : "",
    output ? `--output "${output}"` : "",
  ].filter(Boolean).join(" ")

  const cmd = `cmd /c "${renderArgs}"`
  console.log(`  Command: ${cmd}\n`)

  try {
    const startTime = Date.now()
    execSync(cmd, { stdio: "inherit", cwd: PROJECT_DIR, timeout: 600_000 })
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    const renders = execSync(
      `cmd /c "dir /b /o-d "${RENDERS_DIR}"\\*.mp4 2>nul"`,
      { encoding: "utf-8", cwd: PROJECT_DIR },
    ).trim().split("\n").filter(Boolean)

    if (renders.length > 0) {
      const latest = renders[0].trim()
      const filePath = resolve(RENDERS_DIR, latest)
      const stats = existsSync(filePath)
        ? execSync(`cmd /c "for %I in ("${filePath}") do @echo %~zI"`, { encoding: "utf-8" }).trim()
        : "?"
      console.log(`\nRender complete!`)
      console.log(`  File: ${filePath}`)
      console.log(`  Size: ${(parseInt(stats, 10) / 1024 / 1024).toFixed(1)} MB`)
      console.log(`  Time: ${elapsed}s`)
    } else {
      console.log(`\nRender complete (output file check unavailable)`)
    }
  } catch (error) {
    console.error(`\nRender failed: ${(error as Error).message}`)
    process.exit(1)
  }
}

main()
