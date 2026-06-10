/**
 * lib/sales/audio-pipeline.ts — 音声・字幕パイプライン
 *
 * 役割: Edge-TTS, CosyVoice/XTTSv2, WhisperX, Faster Whisper を使った
 *       音声合成・音声クローン・文字起こし・字幕生成を統一的に提供。
 *
 * 設計原則:
 *   - 各ツールがインストールされていない場合は graceful fallback
 *   - 全実行は AbortSignal.timeout 付き
 *   - 出力は Cloudflare R2 にアップロード可能な形式で返却
 *   - エラーは console.error + 構造化ログで記録
 */

import { join } from "path"
import type { TtsEngine, TtsInput, TtsResult } from "./audio-pipeline-utils"
import type { TranscriptionEngine } from "./audio-pipeline-utils"
import type { TranscriptionInput, TranscriptionResult } from "./audio-pipeline-utils"
import { ensureWorkDir } from "./audio-pipeline-utils"
import { synthesizeSpeech } from "./audio-pipeline-tts"
import { transcribeAudio } from "./audio-pipeline-transcribe"

// Re-export all public types
export type {
  TtsEngine,
  TranscriptionEngine,
  TtsInput,
  TtsResult,
  TranscriptionInput,
  TranscriptionResult,
  TranscriptionSegment,
  TranscriptionWord,
  AudioPipelineCapability,
} from "./audio-pipeline-utils"

// Re-export public functions
export { getAudioPipelineCapabilities } from "./audio-pipeline-utils"
export { synthesizeSpeech, listAvailableTtsEngines } from "./audio-pipeline-tts"
export { transcribeAudio, listAvailableTranscriptionEngines } from "./audio-pipeline-transcribe"

/**
 * テキストから音声を合成し、その音声を文字起こしして字幕を生成する。
 * TTS → 文字起こし のチェーン処理。
 */
export async function synthesizeAndTranscribe(input: {
  text: string
  locale: string
  ttsEngine?: TtsEngine
  transcriptionEngine?: TranscriptionEngine
  ttsVoice?: string
  outputFilename?: string
  workDir?: string
}): Promise<{
  ok: boolean
  audio?: TtsResult
  transcription?: TranscriptionResult
  error?: string
}> {
  const workDir = ensureWorkDir(input.workDir)
  const audioFilename = input.outputFilename?.replace(/\.[^.]+$/, "") ?? "narration"
  const audioPath = join(workDir, `${audioFilename}.mp3`)

  // 1. TTS で音声合成
  const audio = await synthesizeSpeech({
    engine: input.ttsEngine ?? "edge_tts",
    text: input.text,
    outputFilename: `${audioFilename}.mp3`,
    locale: input.locale,
    voice: input.ttsVoice,
    workDir,
  })

  if (!audio.ok || !audio.outputPath) {
    return { ok: false, error: audio.error ?? "TTS failed", audio }
  }

  // 2. 文字起こし
  const transcription = await transcribeAudio({
    engine: input.transcriptionEngine ?? "whisperx",
    audioPath: audio.outputPath,
    outputFilename: `${audioFilename}.srt`,
    locale: input.locale,
    format: "srt",
    wordTimestamps: true,
    workDir,
  })

  return {
    ok: transcription.ok,
    audio,
    transcription,
    error: transcription.ok ? undefined : transcription.error,
  }
}
