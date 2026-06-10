/**
 * lib/sales/oss-renderers.ts — OSS 動画生成エンジン群ラッパー
 *
 * 役割: HyperFrames, FFCreator, Editly, MoviePy, Short Video Maker, OpenMontage の
 *       各レンダラーを統一的に呼び出すラッパー。
 *       各エンジンは child_process 経由でサブプロセス実行する。
 *
 * 設計原則:
 *   - 各エンジンがインストールされていない場合の graceful fallback
 *   - 全実行は AbortSignal.timeout 付き
 *   - 出力は Cloudflare R2 にアップロード可能な形式で返却
 *   - エラーは console.error + 構造化ログで記録
 */

import { renderWithFFCreator } from "./oss-renderers-video"
import { renderWithEditly } from "./oss-renderers-video"
import { renderWithMoviePy } from "./oss-renderers-video"
import { renderWithShortVideoMaker } from "./oss-renderers-short"
import { renderWithOpenMontage } from "./oss-renderers-short"
import { getOssRendererCapabilities } from "./oss-renderers-utils"
import type { OssRendererType, OssRenderInput, OssRenderResult } from "./oss-renderers-utils"

// Re-export all public types
export type {
  OssRendererType,
  OssRenderInput,
  OssRenderResult,
  OssRendererCapability,
} from "./oss-renderers-utils"

// Re-export renderer functions
export { renderWithFFCreator, renderWithEditly, renderWithMoviePy } from "./oss-renderers-video"
export { renderWithShortVideoMaker, renderWithOpenMontage } from "./oss-renderers-short"
export { getOssRendererCapabilities } from "./oss-renderers-utils"

/**
 * 指定された OSS レンダラーで動画を生成する。
 * 各エンジンがインストールされていない場合は FFmpeg でフォールバック。
 */
export async function renderWithOssEngine(input: OssRenderInput): Promise<OssRenderResult> {
  switch (input.renderer) {
    case "ffcreator":
      return renderWithFFCreator(input)
    case "editly":
      return renderWithEditly(input)
    case "moviepy":
      return renderWithMoviePy(input)
    case "short_video_maker":
      return renderWithShortVideoMaker(input)
    case "openmontage":
      return renderWithOpenMontage(input)
    default: {
      const _exhaustive: never = input.renderer
      return { ok: false, error: `Unknown renderer: ${_exhaustive}` }
    }
  }
}

/**
 * 利用可能な OSS レンダラーの一覧を取得する。
 */
export function listAvailableOssRenderers(): OssRendererType[] {
  return getOssRendererCapabilities()
    .filter((c) => c.installed)
    .map((c) => c.renderer)
}

/**
 * 指定されたレンダラーが利用可能か確認する。
 */
export function isOssRendererAvailable(renderer: OssRendererType): boolean {
  return getOssRendererCapabilities().some((c) => c.renderer === renderer && c.installed)
}
