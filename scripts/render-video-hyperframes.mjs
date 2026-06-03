/**
 * HyperFrames 動画レンダリングスクリプト
 *
 * 使い方:
 *   node scripts/render-video-hyperframes.mjs [--profile draft|standard|high] [--composition compositions/xxx.html]
 *
 * 説明:
 *   test-video/ プロジェクト内の index.html を HyperFrames CLI で MP4 にレンダリングする。
 *   --profile で品質プロファイルを指定可能。
 *   --composition で特定のコンポジションファイルを指定可能。
 *
 * パイプライン統合:
 *   n8n からこのスクリプトを呼び出すことで、動画生成パイプラインの一部として使用できる。
 *   例: node scripts/render-video-hyperframes.mjs --profile standard
 */

import { execSync } from "child_process"
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_DIR = resolve(__dirname, "..", "test-video")
const RENDERS_DIR = resolve(PROJECT_DIR, "renders")

// プロファイル設定
const PROFILES = {
  draft: { fps: 15, quality: "draft", desc: "クイックプレビュー" },
  standard: { fps: 30, quality: "standard", desc: "標準品質" },
  high: { fps: 60, quality: "high", extra: "--video-bitrate 20M", desc: "高品質納品用" },
  "social-portrait": { fps: 30, quality: "standard", extra: "--resolution portrait", desc: "TikTok/Reels/Shorts 縦型" },
  "social-square": { fps: 30, quality: "standard", extra: "--resolution square", desc: "Instagram スクエア" },
}

function parseArgs() {
  const args = process.argv.slice(2)
  const profile = args.includes("--profile") ? args[args.indexOf("--profile") + 1] || "standard" : "standard"
  const composition = args.includes("--composition") ? args[args.indexOf("--composition") + 1] : null
  const output = args.includes("--output") ? args[args.indexOf("--output") + 1] : null
  return { profile, composition, output }
}

function main() {
  const { profile, composition, output } = parseArgs()

  if (!PROFILES[profile]) {
    console.error(`✗ 不明なプロファイル: ${profile}`)
    console.error(`  使用可能: ${Object.keys(PROFILES).join(", ")}`)
    process.exit(1)
  }

  const config = PROFILES[profile]
  console.log(`\n🎬 HyperFrames レンダリング開始`)
  console.log(`   プロファイル: ${profile} (${config.desc})`)
  console.log(`   プロジェクト: ${PROJECT_DIR}`)

  // プロジェクトの存在確認
  if (!existsSync(resolve(PROJECT_DIR, "index.html"))) {
    console.error(`✗ ${PROJECT_DIR}/index.html が見つかりません`)
    process.exit(1)
  }

  // renders ディレクトリ作成
  if (!existsSync(RENDERS_DIR)) {
    mkdirSync(RENDERS_DIR, { recursive: true })
  }

  // コマンド構築
  const cmdParts = [
    `cd /d "${PROJECT_DIR}"`,
    "&&",
    "npx hyperframes render",
    `--fps ${config.fps}`,
    `--quality ${config.quality}`,
    config.extra || "",
    composition ? `--composition "${composition}"` : "",
    output ? `--output "${output}"` : "",
  ]
    .filter(Boolean)
    .join(" ")

  const cmd = `cmd /c "${cmdParts}"`

  console.log(`   コマンド: ${cmd}`)
  console.log("")

  try {
    const startTime = Date.now()
    execSync(cmd, { stdio: "inherit", cwd: PROJECT_DIR, timeout: 600_000 }) // 10分タイムアウト
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    // 最新のレンダリング結果を探す
    const renders = execSync(
      `cmd /c "dir /b /o-d "${RENDERS_DIR}"\\*.mp4 2>nul"`,
      { encoding: "utf-8", cwd: PROJECT_DIR },
    )
      .trim()
      .split("\n")
      .filter(Boolean)

    if (renders.length > 0) {
      const latest = renders[0].trim()
      const filePath = resolve(RENDERS_DIR, latest)
      const stats = existsSync(filePath) ? execSync(
        `cmd /c "for %I in ("${filePath}") do @echo %~zI"`,
        { encoding: "utf-8" },
      ).trim() : "?"

      console.log(`\n✅ レンダリング完了！`)
      console.log(`   ファイル: ${filePath}`)
      console.log(`   サイズ: ${(parseInt(stats) / 1024 / 1024).toFixed(1)} MB`)
      console.log(`   所要時間: ${elapsed}秒`)
    } else {
      console.log(`\n✅ レンダリング完了（出力ファイル確認不可）`)
    }
  } catch (error) {
    console.error(`\n✗ レンダリング失敗: ${error.message}`)
    process.exit(1)
  }
}

main()
