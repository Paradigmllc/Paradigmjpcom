import { execSync } from "child_process"
import { mkdirSync, existsSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import { randomUUID } from "crypto"

/* ───── 型定義 ───── */

export type OssRendererType =
  | "ffcreator"
  | "editly"
  | "moviepy"
  | "short_video_maker"
  | "openmontage"

export interface OssRenderInput {
  /** レンダラー種別 */
  renderer: OssRendererType
  /** 出力ファイル名（拡張子含む） */
  outputFilename: string
  /** 出力解像度 */
  width: number
  height: number
  /** FPS */
  fps: number
  /** 動画長（秒） */
  durationSec: number
  /** レンダラー固有のパラメータ */
  params: Record<string, unknown>
  /** 作業ディレクトリ（省略時は temp） */
  workDir?: string
  /** タイムアウト（ms） */
  timeoutMs?: number
}

export interface OssRenderResult {
  ok: boolean
  /** 出力ファイルの絶対パス */
  outputPath?: string
  /** 出力ファイルサイズ（bytes） */
  fileSize?: number
  /** レンダリング所要時間（ms） */
  durationMs?: number
  /** レンダラー固有のメタデータ */
  metadata?: Record<string, unknown>
  error?: string
}

export interface OssRendererCapability {
  renderer: OssRendererType
  name: string
  installed: boolean
  version: string | null
  supportedFormats: string[]
  maxDurationSec: number
  description: string
}

/* ───── 定数 ───── */

export const RENDERER_TIMEOUT_MS = 600_000 // 10分デフォルト

/* ───── インストール確認 ───── */

export function checkCommand(cmd: string): boolean {
  try {
    execSync(`${cmd} --version 2>&1`, { stdio: "pipe", timeout: 10_000 })
    return true
  } catch (e) {
    console.error("[oss-renderers] checkCommand failed:", e)
    return false
  }
}

export function checkNpmPackage(pkg: string): boolean {
  try {
    execSync(`node -e "require.resolve('${pkg}')" 2>&1`, { stdio: "pipe", timeout: 10_000 })
    return true
  } catch (e) {
    console.error("[oss-renderers] checkNpmPackage failed:", e)
    return false
  }
}

export function checkPythonPackage(pkg: string): boolean {
  try {
    execSync(`python -c "import ${pkg}" 2>&1`, { stdio: "pipe", timeout: 10_000 })
    return true
  } catch (e) {
    console.error("[oss-renderers] checkPythonPackage failed:", e)
    return false
  }
}

function getNpmPackageVersion(pkg: string): string | null {
  try {
    const stdout = execSync(`node -e "console.log(require('${pkg}/package.json').version)" 2>&1`, {
      stdio: "pipe",
      timeout: 10_000,
    })
    return stdout.toString().trim()
  } catch (e) {
    console.error("[oss-renderers] getNpmPackageVersion failed:", e)
    return null
  }
}

function getPythonPackageVersion(pkg: string): string | null {
  try {
    const stdout = execSync(`python -c "import ${pkg}; print(${pkg}.__version__)" 2>&1`, {
      stdio: "pipe",
      timeout: 10_000,
    })
    return stdout.toString().trim()
  } catch (e) {
    console.warn("[oss-renderers] getPythonPackageVersion failed:", e)
    return null
  }
}

/* ───── ケイパビリティ ───── */

export function getOssRendererCapabilities(): OssRendererCapability[] {
  return [
    {
      renderer: "ffcreator",
      name: "FFCreator",
      installed: checkNpmPackage("ffcreator"),
      version: getNpmPackageVersion("ffcreator"),
      supportedFormats: ["mp4"],
      maxDurationSec: 600,
      description: "Node.js ネイティブ動画生成。GPU アクセラレーション対応。",
    },
    {
      renderer: "editly",
      name: "Editly",
      installed: checkNpmPackage("editly"),
      version: getNpmPackageVersion("editly"),
      supportedFormats: ["mp4", "webm"],
      maxDurationSec: 300,
      description: "CLI 動画編集。JSON 設定ファイルで動画を組み立てます。",
    },
    {
      renderer: "moviepy",
      name: "MoviePy",
      installed: checkPythonPackage("moviepy"),
      version: getPythonPackageVersion("moviepy"),
      supportedFormats: ["mp4", "webm", "gif", "avi"],
      maxDurationSec: 3600,
      description: "Python 動画編集。スクリプトで動画をプログラム的に編集します。",
    },
    {
      renderer: "short_video_maker",
      name: "Short Video Maker",
      installed: checkNpmPackage("@shtcut/sdk"),
      version: getNpmPackageVersion("@shtcut/sdk"),
      supportedFormats: ["mp4"],
      maxDurationSec: 60,
      description: "ショート動画生成。TikTok/Reels/Shorts 向けに最適化。",
    },
    {
      renderer: "openmontage",
      name: "OpenMontage",
      installed: checkCommand("openmontage") || checkPythonPackage("openmontage"),
      version: getPythonPackageVersion("openmontage"),
      supportedFormats: ["mp4", "webm"],
      maxDurationSec: 3600,
      description: "Python 製オーケストレーションツール。複数動画を連結・合成します。",
    },
  ]
}

/* ───── ユーティリティ ───── */

export function ensureWorkDir(workDir?: string): string {
  const dir = workDir ?? join(tmpdir(), `paradigm-oss-render-${randomUUID()}`)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
