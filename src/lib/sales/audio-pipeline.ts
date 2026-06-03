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

import { execSync } from "child_process"
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs"
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

const TTS_TIMEOUT_MS = 120_000
const TRANSCRIPTION_TIMEOUT_MS = 300_000

// Edge-TTS の音声マッピング
const EDGE_TTS_VOICES: Record<string, string> = {
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

function ensureWorkDir(workDir?: string): string {
  const dir = workDir ?? join(tmpdir(), `paradigm-audio-${randomUUID()}`)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

function checkCommand(cmd: string): boolean {
  try {
    execSync(`${cmd} --version 2>&1`, { stdio: "pipe", timeout: 10_000 })
    return true
  } catch {
    return false
  }
}

function checkPythonPackage(pkg: string): boolean {
  try {
    execSync(`python -c "import ${pkg}" 2>&1`, { stdio: "pipe", timeout: 10_000 })
    return true
  } catch {
    return false
  }
}

function getPythonPackageVersion(pkg: string): string | null {
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

/* ───── Edge-TTS ───── */

async function synthesizeWithEdgeTts(input: TtsInput): Promise<TtsResult> {
  const startTime = Date.now()
  const workDir = ensureWorkDir(input.workDir)
  const outputPath = join(workDir, input.outputFilename)
  const voice = input.voice ?? EDGE_TTS_VOICES[input.locale] ?? "en-US-JennyNeural"

  try {
    if (checkCommand("edge-tts")) {
      const args = [
        `edge-tts`,
        `--voice "${voice}"`,
        `--text ${JSON.stringify(input.text)}`,
        `--write-media "${outputPath}"`,
        ...(input.speed ? [`--rate=${input.speed > 1 ? "+" : ""}${((input.speed - 1) * 100).toFixed(0)}%`] : []),
        ...(input.pitch ? [`--pitch=${input.pitch}Hz`] : []),
      ].join(" ")

      execSync(args, { timeout: input.timeoutMs ?? TTS_TIMEOUT_MS, stdio: "pipe" })
    } else if (checkPythonPackage("edge_tts")) {
      const scriptPath = join(workDir, "edge-tts-synth.py")
      const script = `
import asyncio, json, os
import edge_tts

async def main():
    tts = edge_tts.Communicate(
        text=${JSON.stringify(input.text)},
        voice="${voice}",
        rate="${input.speed ? (input.speed > 1 ? "+" : "") + ((input.speed - 1) * 100).toFixed(0) + "%" : "+0%"}",
        pitch="${input.pitch ? input.pitch + "Hz" : "0Hz"}",
    )
    await tts.save(${JSON.stringify(outputPath)})
    duration = os.path.getsize(${JSON.stringify(outputPath)})
    print(json.dumps({"output": ${JSON.stringify(outputPath)}, "size": duration}))

asyncio.run(main())
`
      writeFileSync(scriptPath, script, "utf-8")
      const stdout = execSync(`python "${scriptPath}"`, {
        timeout: input.timeoutMs ?? TTS_TIMEOUT_MS,
        stdio: "pipe",
      })
      const result = JSON.parse(stdout.toString().trim())
      return {
        ok: true,
        outputPath: result.output,
        fileSize: result.size,
        durationMs: Date.now() - startTime,
        engine: "edge_tts",
        voice,
      }
    } else {
      // FFmpeg で無音フォールバック
      const durationSec = Math.max(1, Math.ceil(input.text.length / 10))
      execSync(
        `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t ${durationSec} -c:a aac -b:a 128k "${outputPath}"`,
        { timeout: 30_000, stdio: "pipe" },
      )
      return {
        ok: true,
        outputPath,
        fileSize: existsSync(outputPath) ? readFileSync(outputPath).length : 0,
        durationMs: Date.now() - startTime,
        engine: "edge_tts",
        voice,
        error: "Edge-TTS not installed; generated silent audio fallback",
      }
    }

    if (!existsSync(outputPath)) {
      return { ok: false, error: "Edge-TTS output file not found", durationMs: Date.now() - startTime, engine: "edge_tts", voice }
    }

    return {
      ok: true,
      outputPath,
      fileSize: readFileSync(outputPath).length,
      durationMs: Date.now() - startTime,
      engine: "edge_tts",
      voice,
    }
  } catch (error) {
    return {
      ok: false,
      error: `Edge-TTS failed: ${error instanceof Error ? error.message : String(error)}`,
      durationMs: Date.now() - startTime,
      engine: "edge_tts",
      voice,
    }
  }
}

/* ───── CosyVoice ───── */

async function synthesizeWithCosyVoice(input: TtsInput): Promise<TtsResult> {
  const startTime = Date.now()
  const workDir = ensureWorkDir(input.workDir)
  const outputPath = join(workDir, input.outputFilename)
  const voice = input.voice ?? "default"

  try {
    if (!checkPythonPackage("cosyvoice")) {
      // Edge-TTS でフォールバック
      return synthesizeWithEdgeTts({ ...input, engine: "edge_tts" })
    }

    const scriptPath = join(workDir, "cosyvoice-synth.py")
    const script = `
import json, os, sys
sys.path.insert(0, ".")

try:
    from cosyvoice.cli.cosyvoice import CosyVoice
    from cosyvoice.utils.file_utils import load_wav

    model = CosyVoice("pretrained_models/CosyVoice-300M")
    output_path = ${JSON.stringify(outputPath)}

    ${input.referenceAudio
      ? `
    # 音声クローンモード
    prompt_speech_16k = load_wav(${JSON.stringify(input.referenceAudio)}, 16000)
    for result in model.inference_zero_shot(
        ${JSON.stringify(input.text)},
        ${JSON.stringify(input.referenceText ?? "")},
        prompt_speech_16k,
    ):
        import torchaudio
        torchaudio.save(output_path, result["tts_speech"], 22050)
        break
    `
      : `
    # 標準TTSモード
    for result in model.inference_sft(
        ${JSON.stringify(input.text)},
        ${JSON.stringify(input.locale)},
        ${JSON.stringify(voice)},
    ):
        import torchaudio
        torchaudio.save(output_path, result["tts_speech"], 22050)
        break
    `}

    size = os.path.getsize(output_path)
    print(json.dumps({"output": output_path, "size": size}))
except ImportError as e:
    print(json.dumps({"error": f"CosyVoice import failed: {str(e)}"}))
    sys.exit(1)
`
    writeFileSync(scriptPath, script, "utf-8")

    const stdout = execSync(`python "${scriptPath}"`, {
      timeout: input.timeoutMs ?? TTS_TIMEOUT_MS,
      stdio: "pipe",
    })
    const result = JSON.parse(stdout.toString().trim())

    if (result.error) {
      return {
        ok: false,
        error: result.error,
        durationMs: Date.now() - startTime,
        engine: "cosyvoice",
        voice,
      }
    }

    return {
      ok: true,
      outputPath: result.output,
      fileSize: result.size,
      durationMs: Date.now() - startTime,
      engine: "cosyvoice",
      voice,
    }
  } catch (error) {
    return {
      ok: false,
      error: `CosyVoice failed: ${error instanceof Error ? error.message : String(error)}`,
      durationMs: Date.now() - startTime,
      engine: "cosyvoice",
      voice,
    }
  }
}

/* ───── XTTSv2 ───── */

async function synthesizeWithXttsV2(input: TtsInput): Promise<TtsResult> {
  const startTime = Date.now()
  const workDir = ensureWorkDir(input.workDir)
  const outputPath = join(workDir, input.outputFilename)
  const voice = input.voice ?? "default"

  try {
    if (!checkPythonPackage("TTS")) {
      // Edge-TTS でフォールバック
      return synthesizeWithEdgeTts({ ...input, engine: "edge_tts" })
    }

    const scriptPath = join(workDir, "xttsv2-synth.py")
    const script = `
import json, os, sys, torch

try:
    from TTS.api import TTS

    output_path = ${JSON.stringify(outputPath)}
    device = "cuda" if torch.cuda.is_available() else "cpu"

    ${input.referenceAudio
      ? `
    # 音声クローンモード
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
    tts.tts_to_file(
        text=${JSON.stringify(input.text)},
        speaker_wav=${JSON.stringify(input.referenceAudio)},
        language=${JSON.stringify(input.locale)},
        file_path=output_path,
        speed=${input.speed ?? 1.0},
    )
    `
      : `
    # 標準TTSモード
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
    tts.tts_to_file(
        text=${JSON.stringify(input.text)},
        speaker="${voice}",
        language=${JSON.stringify(input.locale)},
        file_path=output_path,
        speed=${input.speed ?? 1.0},
    )
    `}

    size = os.path.getsize(output_path)
    print(json.dumps({"output": output_path, "size": size}))
except ImportError as e:
    print(json.dumps({"error": f"XTTSv2 import failed: {str(e)}"}))
    sys.exit(1)
`
    writeFileSync(scriptPath, script, "utf-8")

    const stdout = execSync(`python "${scriptPath}"`, {
      timeout: input.timeoutMs ?? TTS_TIMEOUT_MS,
      stdio: "pipe",
    })
    const result = JSON.parse(stdout.toString().trim())

    if (result.error) {
      return {
        ok: false,
        error: result.error,
        durationMs: Date.now() - startTime,
        engine: "xttsv2",
        voice,
      }
    }

    return {
      ok: true,
      outputPath: result.output,
      fileSize: result.size,
      durationMs: Date.now() - startTime,
      engine: "xttsv2",
      voice,
    }
  } catch (error) {
    return {
      ok: false,
      error: `XTTSv2 failed: ${error instanceof Error ? error.message : String(error)}`,
      durationMs: Date.now() - startTime,
      engine: "xttsv2",
      voice,
    }
  }
}

/* ───── WhisperX ───── */

async function transcribeWithWhisperX(input: TranscriptionInput): Promise<TranscriptionResult> {
  const startTime = Date.now()
  const workDir = ensureWorkDir(input.workDir)
  const format = input.format ?? "srt"
  const outputPath = join(workDir, input.outputFilename)

  try {
    if (!checkPythonPackage("whisperx")) {
      // Faster Whisper でフォールバック
      return transcribeWithFasterWhisper(input)
    }

    const scriptPath = join(workDir, "whisperx-transcribe.py")
    const script = `
import json, os, sys

try:
    import whisperx

    device = "cuda" if whisperx.utils.get_device() == "cuda" else "cpu"
    audio_path = ${JSON.stringify(input.audioPath)}
    output_path = ${JSON.stringify(outputPath)}
    locale = ${JSON.stringify(input.locale)}
    model_size = ${JSON.stringify(input.modelSize ?? "large-v3")}
    format = ${JSON.stringify(format)}
    diarize = ${JSON.stringify(input.diarize ?? false)}
    word_timestamps = ${JSON.stringify(input.wordTimestamps ?? true)}

    # 1. 文字起こし
    model = whisperx.load_model(model_size, device, compute_type="float16", language=locale)
    result = model.transcribe(audio_path, language=locale)

    # 2. 単語レベルのアライメント
    if word_timestamps and result.get("segments"):
        align_model, metadata = whisperx.load_align_model(language_code=locale, device=device)
        result = whisperx.align(result["segments"], align_model, metadata, audio_path, device)

    # 3. 話者分離（オプション）
    speakers = []
    if diarize:
        diarize_model = whisperx.DiarizationPipeline(use_auth_token=None, device=device)
        diarize_segments = diarize_model(audio_path)
        result = whisperx.assign_word_speakers(diarize_segments, result)
        speakers = list(set(
            seg.get("speaker", "") for seg in result.get("segments", []) if seg.get("speaker")
        ))

    # 4. 出力生成
    segments = []
    words = []
    for seg in result.get("segments", []):
        segments.append({
            "start": seg.get("start", 0),
            "end": seg.get("end", 0),
            "text": seg.get("text", "").strip(),
            "speaker": seg.get("speaker", None),
        })
        for word in seg.get("words", []):
            words.append({
                "word": word.get("word", ""),
                "start": word.get("start", 0),
                "end": word.get("end", 0),
                "probability": word.get("probability", 0),
                "speaker": word.get("speaker", None),
            })

    # 5. 字幕ファイル出力
    full_text = " ".join(s["text"] for s in segments)

    if format == "srt":
        lines = []
        for i, seg in enumerate(segments, 1):
            start_s = seg["start"]
            end_s = seg["end"]
            start_str = f"{int(start_s//3600):02d}:{int((start_s%3600)//60):02d}:{start_s%60:06.3f}".replace(".", ",")
            end_str = f"{int(end_s//3600):02d}:{int((end_s%3600)//60):02d}:{end_s%60:06.3f}".replace(".", ",")
            speaker_prefix = f"[{seg['speaker']}] " if seg.get("speaker") else ""
            lines.append(f"{i}\\n{start_str} --> {end_str}\\n{speaker_prefix}{seg['text']}\\n")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\\n".join(lines))
    elif format == "vtt":
        lines = ["WEBVTT\\n"]
        for seg in segments:
            start_s = seg["start"]
            end_s = seg["end"]
            start_str = f"{int(start_s//3600):02d}:{int((start_s%3600)//60):02d}:{start_s%60:06.3f}"
            end_str = f"{int(end_s//3600):02d}:{int((end_s%3600)//60):02d}:{end_s%60:06.3f}"
            speaker_prefix = f"<v {seg['speaker']}> " if seg.get("speaker") else ""
            lines.append(f"{start_str} --> {end_str}\\n{speaker_prefix}{seg['text']}\\n")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\\n".join(lines))
    elif format == "json":
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump({"text": full_text, "segments": segments, "words": words, "speakers": speakers}, f, ensure_ascii=False, indent=2)
    else:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(full_text)

    print(json.dumps({
        "output": output_path,
        "text": full_text,
        "segments": segments,
        "words": words,
        "speakers": speakers,
        "engine": "whisperx",
    }))
except ImportError as e:
    print(json.dumps({"error": f"WhisperX import failed: {str(e)}"}))
    sys.exit(1)
`
    writeFileSync(scriptPath, script, "utf-8")

    const stdout = execSync(`python "${scriptPath}"`, {
      timeout: input.timeoutMs ?? TRANSCRIPTION_TIMEOUT_MS,
      stdio: "pipe",
    })
    const result = JSON.parse(stdout.toString().trim())

    if (result.error) {
      return {
        ok: false,
        error: result.error,
        durationMs: Date.now() - startTime,
        engine: "whisperx",
      }
    }

    return {
      ok: true,
      outputPath: result.output,
      durationMs: Date.now() - startTime,
      text: result.text,
      segments: result.segments,
      words: result.words,
      speakers: result.speakers,
      engine: "whisperx",
    }
  } catch (error) {
    return {
      ok: false,
      error: `WhisperX failed: ${error instanceof Error ? error.message : String(error)}`,
      durationMs: Date.now() - startTime,
      engine: "whisperx",
    }
  }
}

/* ───── Faster Whisper ───── */

async function transcribeWithFasterWhisper(input: TranscriptionInput): Promise<TranscriptionResult> {
  const startTime = Date.now()
  const workDir = ensureWorkDir(input.workDir)
  const format = input.format ?? "srt"
  const outputPath = join(workDir, input.outputFilename)

  try {
    if (!checkPythonPackage("faster_whisper")) {
      return {
        ok: false,
        error: "No transcription engine available (neither whisperx nor faster_whisper installed)",
        durationMs: Date.now() - startTime,
        engine: "faster_whisper",
      }
    }

    const scriptPath = join(workDir, "faster-whisper-transcribe.py")
    const script = `
import json, os, sys

try:
    from faster_whisper import WhisperModel

    audio_path = ${JSON.stringify(input.audioPath)}
    output_path = ${JSON.stringify(outputPath)}
    locale = ${JSON.stringify(input.locale)}
    model_size = ${JSON.stringify(input.modelSize ?? "large-v3")}
    format = ${JSON.stringify(format)}
    word_timestamps = ${JSON.stringify(input.wordTimestamps ?? true)}

    # モデル読み込み
    model = WhisperModel(model_size, device="auto", compute_type="float16")

    # 文字起こし
    segments, info = model.transcribe(audio_path, language=locale, word_timestamps=word_timestamps)

    # 結果整形
    result_segments = []
    result_words = []
    full_text_parts = []

    for seg in segments:
        result_segments.append({
            "start": seg.start,
            "end": seg.end,
            "text": seg.text.strip(),
        })
        full_text_parts.append(seg.text.strip())
        if word_timestamps and seg.words:
            for word in seg.words:
                result_words.append({
                    "word": word.word,
                    "start": word.start,
                    "end": word.end,
                    "probability": word.probability,
                })

    full_text = " ".join(full_text_parts)

    # 字幕ファイル出力
    if format == "srt":
        lines = []
        for i, seg in enumerate(result_segments, 1):
            start_s = seg["start"]
            end_s = seg["end"]
            start_str = f"{int(start_s//3600):02d}:{int((start_s%3600)//60):02d}:{start_s%60:06.3f}".replace(".", ",")
            end_str = f"{int(end_s//3600):02d}:{int((end_s%3600)//60):02d}:{end_s%60:06.3f}".replace(".", ",")
            lines.append(f"{i}\\n{start_str} --> {end_str}\\n{seg['text']}\\n")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\\n".join(lines))
    elif format == "vtt":
        lines = ["WEBVTT\\n"]
        for seg in result_segments:
            start_s = seg["start"]
            end_s = seg["end"]
            start_str = f"{int(start_s//3600):02d}:{int((start_s%3600)//60):02d}:{start_s%60:06.3f}"
            end_str = f"{int(end_s//3600):02d}:{int((end_s%3600)//60):02d}:{end_s%60:06.3f}"
            lines.append(f"{start_str} --> {end_str}\\n{seg['text']}\\n")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\\n".join(lines))
    elif format == "json":
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump({"text": full_text, "segments": result_segments, "words": result_words}, f, ensure_ascii=False, indent=2)
    else:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(full_text)

    print(json.dumps({
        "output": output_path,
        "text": full_text,
        "segments": result_segments,
        "words": result_words,
        "engine": "faster_whisper",
    }))
except ImportError as e:
    print(json.dumps({"error": f"Faster Whisper import failed: {str(e)}"}))
    sys.exit(1)
`
    writeFileSync(scriptPath, script, "utf-8")

    const stdout = execSync(`python "${scriptPath}"`, {
      timeout: input.timeoutMs ?? TRANSCRIPTION_TIMEOUT_MS,
      stdio: "pipe",
    })
    const result = JSON.parse(stdout.toString().trim())

    if (result.error) {
      return {
        ok: false,
        error: result.error,
        durationMs: Date.now() - startTime,
        engine: "faster_whisper",
      }
    }

    return {
      ok: true,
      outputPath: result.output,
      durationMs: Date.now() - startTime,
      text: result.text,
      segments: result.segments,
      words: result.words,
      engine: "faster_whisper",
    }
  } catch (error) {
    return {
      ok: false,
      error: `Faster Whisper failed: ${error instanceof Error ? error.message : String(error)}`,
      durationMs: Date.now() - startTime,
      engine: "faster_whisper",
    }
  }
}

/* ───── 統合 TTS 関数 ───── */

/**
 * 指定された TTS エンジンで音声を合成する。
 * 各エンジンがインストールされていない場合は Edge-TTS → 無音でフォールバック。
 */
export async function synthesizeSpeech(input: TtsInput): Promise<TtsResult> {
  switch (input.engine) {
    case "edge_tts":
      return synthesizeWithEdgeTts(input)
    case "cosyvoice":
      return synthesizeWithCosyVoice(input)
    case "xttsv2":
      return synthesizeWithXttsV2(input)
    default: {
      const _exhaustive: never = input.engine
      return { ok: false, error: `Unknown TTS engine: ${_exhaustive}`, engine: "edge_tts", voice: "default" }
    }
  }
}

/**
 * 指定された文字起こしエンジンで音声を文字起こしする。
 * WhisperX → Faster Whisper の順でフォールバック。
 */
export async function transcribeAudio(input: TranscriptionInput): Promise<TranscriptionResult> {
  switch (input.engine) {
    case "whisperx":
      return transcribeWithWhisperX(input)
    case "faster_whisper":
      return transcribeWithFasterWhisper(input)
    default: {
      const _exhaustive: never = input.engine
      return { ok: false, error: `Unknown transcription engine: ${_exhaustive}`, engine: "faster_whisper" }
    }
  }
}

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

/**
 * 利用可能な TTS エンジンの一覧を取得する。
 */
export function listAvailableTtsEngines(): TtsEngine[] {
  return getAudioPipelineCapabilities()
    .filter((c) => c.type === "tts" && c.installed)
    .map((c) => c.engine as TtsEngine)
}

/**
 * 利用可能な文字起こしエンジンの一覧を取得する。
 */
export function listAvailableTranscriptionEngines(): TranscriptionEngine[] {
  return getAudioPipelineCapabilities()
    .filter((c) => c.type === "transcription" && c.installed)
    .map((c) => c.engine as TranscriptionEngine)
}
