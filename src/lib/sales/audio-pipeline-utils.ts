import { execSync } from "child_process"
import { mkdirSync, existsSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import { randomUUID } from "crypto"

/* ───── 型定義 ───── */

export type TtsEngine = "edge_tts" | "cosyvoice" | "xttsv2"
export type TranscriptionEngine = "whisperx" | "faster_whisper"

export interface TtsInput {
  /** TTS エンジン */
  engine: TtsEngine
  /** 合成するテキスト */
  text: string
  /** 出力ファイル名（拡張子含む） */
  outputFilename: string
  /** 言語コード（例: "ja", "en", "zh"） */
  locale: string
  /** 話者設定 */
  voice?: string
  /** 速度（0.5〜2.0） */
  speed?: number
  /** ピッチ（Hz） */
  pitch?: number
  /** CosyVoice/XTTSv2 用：参照音声ファイルパス */
  referenceAudio?: string
  /** CosyVoice/XTTSv2 用：参照テキスト */
  referenceText?: string
  /** 作業ディレクトリ */
  workDir?: string
  /** タイムアウト（ms） */
  timeoutMs?: number
}

export interface TtsResult {
  ok: boolean
  /** 出力ファイルの絶対パス */
  outputPath?: string
  /** 出力ファイルサイズ（bytes） */
  fileSize?: number
  /** 処理所要時間（ms） */
  durationMs?: number
  /** 音声の長さ（秒） */
  audioDurationSec?: number
  /** 使用したエンジン */
  engine: TtsEngine
  /** 使用した話者 */
  voice: string
  error?: string
}

export interface TranscriptionInput {
  /** 文字起こしエンジン */
  engine: TranscriptionEngine
  /** 音声ファイルパス */
  audioPath: string
  /** 出力ファイル名（拡張子含む、例: "captions.srt"） */
  outputFilename: string
  /** 言語コード */
  locale: string
  /** モデルサイズ（"tiny", "base", "small", "medium", "large-v3"） */
  modelSize?: string
  /** 字幕フォーマット（"srt", "vtt", "json", "txt"） */
  format?: "srt" | "vtt" | "json" | "txt"
  /** 話者分離を有効にするか */
  diarize?: boolean
  /** 単語レベルのタイムスタンプを出力するか */
  wordTimestamps?: boolean
  /** 作業ディレクトリ */
  workDir?: string
  /** タイムアウト（ms） */
  timeoutMs?: number
}

export interface TranscriptionResult {
  ok: boolean
  /** 字幕ファイルの絶対パス */
  outputPath?: string
  /** 処理所要時間（ms） */
  durationMs?: number
  /** 認識されたテキスト */
  text?: string
  /** セグメント（文単位） */
  segments?: TranscriptionSegment[]
  /** 単語レベルのタイムスタンプ */
  words?: TranscriptionWord[]
  /** 話者ラベル（話者分離時） */
  speakers?: string[]
  /** 使用したエンジン */
  engine: TranscriptionEngine
  error?: string
}

export interface TranscriptionSegment {
  start: number
  end: number
  text: string
  speaker?: string
}

export interface TranscriptionWord {
  word: string
  start: number
  end: number
  probability: number
  speaker?: string
}

export interface AudioPipelineCapability {
  engine: TtsEngine | TranscriptionEngine
  name: string
  type: "tts" | "transcription"
  installed: boolean
  version: string | null
  supportedLocales: string[]
  description: string
}

/* ───── 定数 ───── */

export const TTS_TIMEOUT_MS = 120_000
export const TRANSCRIPTION_TIMEOUT_MS = 300_000

// Edge-TTS の音声マッピング
export const EDGE_TTS_VOICES: Record<string, string> = {
  ja: "ja-JP-NanamiNeural",
  en: "en-US-JennyNeural",
  zh: "zh-CN-XiaoxiaoNeural",
  ko: "ko-KR-SunHiNeural",
  fr: "fr-FR-DeniseNeural",
  de: "de-DE-KatjaNeural",
  es: "es-ES-ElviraNeural",
  pt: "pt-BR-FranciscaNeural",
  ru: "ru-RU-SvetlanaNeural",
  ar: "ar-SA-ZariyahNeural",
  vi: "vi-VN-HoaiMyNeural",
  id: "id-ID-GadisNeural",
  th: "th-TH-PremwadeeNeural",
}

/* ───── ユーティリティ ───── */

export function ensureWorkDir(workDir?: string): string {
  const dir = workDir ?? join(tmpdir(), `paradigm-audio-${randomUUID()}`)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function checkCommand(cmd: string): boolean {
  try {
    execSync(`${cmd} --version 2>&1`, { stdio: "pipe", timeout: 10_000 })
    return true
  } catch {
    return false
  }
}

export function checkPythonPackage(pkg: string): boolean {
  try {
    execSync(`python -c "import ${pkg}" 2>&1`, { stdio: "pipe", timeout: 10_000 })
    return true
  } catch {
    return false
  }
}

export function getPythonPackageVersion(pkg: string): string | null {
  try {
    const stdout = execSync(`python -c "import ${pkg}; print(${pkg}.__version__)" 2>&1`, {
      stdio: "pipe",
      timeout: 10_000,
    })
    return stdout.toString().trim()
  } catch {
    return null
  }
}

/* ───── ケイパビリティ ───── */

export function getAudioPipelineCapabilities(): AudioPipelineCapability[] {
  return [
    {
      engine: "edge_tts",
      name: "Edge-TTS",
      type: "tts",
      installed: checkCommand("edge-tts") || checkPythonPackage("edge_tts"),
      version: getPythonPackageVersion("edge_tts"),
      supportedLocales: Object.keys(EDGE_TTS_VOICES),
      description: "Microsoft Edge TTS。多言語対応、高品質。",
    },
    {
      engine: "cosyvoice",
      name: "CosyVoice",
      type: "tts",
      installed: checkPythonPackage("cosyvoice"),
      version: getPythonPackageVersion("cosyvoice"),
      supportedLocales: ["zh", "ja", "en", "ko"],
      description: "多言語TTS + 音声クローン。3秒の参照音声で声を複製。",
    },
    {
      engine: "xttsv2",
      name: "XTTSv2",
      type: "tts",
      installed: checkPythonPackage("TTS"),
      version: getPythonPackageVersion("TTS"),
      supportedLocales: ["en", "ja", "zh", "ko", "fr", "de", "es", "pt", "ar", "vi", "id", "th"],
      description: "多言語TTS + 音声クローン。17言語対応。",
    },
    {
      engine: "whisperx",
      name: "WhisperX",
      type: "transcription",
      installed: checkPythonPackage("whisperx"),
      version: getPythonPackageVersion("whisperx"),
      supportedLocales: ["ja", "en", "zh", "ko", "fr", "de", "es", "pt", "ru", "ar", "vi", "id", "th"],
      description: "高速文字起こし + 話者分離 + 単語レベルのタイムスタンプ。",
    },
    {
      engine: "faster_whisper",
      name: "Faster Whisper",
      type: "transcription",
      installed: checkPythonPackage("faster_whisper"),
      version: getPythonPackageVersion("faster_whisper"),
      supportedLocales: ["ja", "en", "zh", "ko", "fr", "de", "es", "pt", "ru", "ar", "vi", "id", "th"],
      description: "高速Whisper。CTranslate2ベースで4倍高速。",
    },
  ]
}
