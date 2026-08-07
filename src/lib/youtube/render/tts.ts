/**
 * lib/youtube/render/tts.ts — シーンごとのナレーション音声を作る
 *
 * edge-tts を使う。完全無料で日本語のニューラル音声が出るため、
 * ElevenLabs のような従量課金を避けられる。
 *
 * 重要: 台本の尺は文字数と話速からの見積もりでしかない。
 * 実際に合成した音声の長さとは必ずずれる。映像を音声に合わせないと
 * ナレーションが途中で切れるので、合成後に ffprobe で実測し、
 * その値でシーンの尺を上書きする。
 */

import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { VideoScript } from "../formats/types"
import type { SpeechSegment } from "./captions"

export interface TtsOptions {
  /** Python 実行ファイル。scripts/youtube-tts.py を動かす。 */
  pythonPath?: string
  /** scripts/youtube-tts.py のパス。 */
  scriptPath?: string
  /** ffprobe 実行ファイルのパス。 */
  ffprobePath?: string
  voice: string
  /** 出力先ディレクトリ。 */
  outputDir: string
  /** 話速の調整 (-50〜+100 の百分率)。 */
  ratePercent?: number
  timeoutMs?: number
}

export interface SceneAudio {
  sceneId: string
  /** 生成した音声ファイルの絶対パス。 */
  filePath: string
  /** ffprobe で実測した秒数。台本の見積もりではない。 */
  actualDurationSec: number
  /** 台本が見積もっていた秒数。ずれの把握用に残す。 */
  estimatedDurationSec: number
  /** TTS が返した発話区間。字幕の同期に使う。取れない声もあるので空になりうる。 */
  segments: SpeechSegment[]
}

export interface SynthesizeResult {
  audios: SceneAudio[]
  /** 実測合計。映像側の尺はこれに合わせる。 */
  totalActualSec: number
  /** 見積もり合計。 */
  totalEstimatedSec: number
  warnings: string[]
}

/** 音声ファイルの長さを秒で返す。 */
export function probeDurationSec(filePath: string, ffprobePath = "ffprobe"): number {
  const out = execFileSync(
    ffprobePath,
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", filePath],
    { encoding: "utf-8", timeout: 30_000 },
  )
  const seconds = Number.parseFloat(out.trim())
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`音声の長さを取得できませんでした: ${filePath} (${out.trim()})`)
  }
  return seconds
}

/** edge-tts に渡す rate 引数を組み立てる。 */
export function formatRate(ratePercent: number | undefined): string | null {
  if (ratePercent === undefined || ratePercent === 0) return null
  const sign = ratePercent > 0 ? "+" : "-"
  return `${sign}${Math.abs(Math.round(ratePercent))}%`
}

/**
 * 台本の各シーンのナレーションを音声化する。
 * ナレーションが空のシーンは無音扱いとして飛ばす。
 */
export function synthesizeScriptAudio(script: VideoScript, options: TtsOptions): SynthesizeResult {
  const python = options.pythonPath ?? "python"
  const scriptPath = options.scriptPath ?? "scripts/youtube-tts.py"
  const ffprobe = options.ffprobePath ?? "ffprobe"
  const timeout = options.timeoutMs ?? 120_000
  const rate = formatRate(options.ratePercent) ?? "+0%"

  if (!existsSync(options.outputDir)) mkdirSync(options.outputDir, { recursive: true })

  const audios: SceneAudio[] = []
  const warnings: string[] = []

  for (const scene of script.scenes) {
    if (scene.narration.trim().length === 0) {
      warnings.push(`${scene.id}: ナレーションが空のため音声を作りませんでした。`)
      continue
    }

    const filePath = join(options.outputDir, `${scene.id}.mp3`)
    const timingPath = join(options.outputDir, `${scene.id}.timing.json`)

    let segments: SpeechSegment[] = []
    try {
      // ナレーションは標準入力で渡す。コマンドライン引数だと長文や
      // 引用符を含むテキストでシェルの解釈に巻き込まれる。
      execFileSync(python, [scriptPath, filePath, timingPath, options.voice, rate], {
        timeout,
        stdio: ["pipe", "pipe", "pipe"],
        input: Buffer.from(scene.narration, "utf-8"),
      })
      const timing = JSON.parse(readFileSync(timingPath, "utf-8")) as { segments?: SpeechSegment[] }
      segments = timing.segments ?? []
    } catch (error) {
      warnings.push(`${scene.id}: 音声合成に失敗しました (${error instanceof Error ? error.message : String(error)})`)
      continue
    }

    if (segments.length === 0) {
      warnings.push(`${scene.id}: 発話区間が取れなかったため字幕を付けられません。`)
    }

    const actualDurationSec = probeDurationSec(filePath, ffprobe)
    const gap = actualDurationSec - scene.durationSec
    if (Math.abs(gap) > Math.max(2, scene.durationSec * 0.25)) {
      warnings.push(
        `${scene.id}: 見積もり${scene.durationSec}秒に対し実測${actualDurationSec.toFixed(1)}秒 (${gap > 0 ? "+" : ""}${gap.toFixed(1)}秒)。話速の設定を見直してください。`,
      )
    }

    audios.push({
      sceneId: scene.id,
      filePath,
      actualDurationSec,
      estimatedDurationSec: scene.durationSec,
      segments,
    })
  }

  return {
    audios,
    totalActualSec: audios.reduce((sum, audio) => sum + audio.actualDurationSec, 0),
    totalEstimatedSec: audios.reduce((sum, audio) => sum + audio.estimatedDurationSec, 0),
    warnings,
  }
}
