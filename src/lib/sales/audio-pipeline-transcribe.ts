import { execSync } from "child_process"
import { writeFileSync } from "fs"
import { join } from "path"
import {
  TRANSCRIPTION_TIMEOUT_MS,
  ensureWorkDir,
  checkPythonPackage,
  getAudioPipelineCapabilities,
  type TranscriptionEngine,
  type TranscriptionInput,
  type TranscriptionResult,
  type TranscriptionSegment,
  type TranscriptionWord,
} from "./audio-pipeline-utils"

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
      segments: result.segments as TranscriptionSegment[],
      words: result.words as TranscriptionWord[],
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
      segments: result.segments as TranscriptionSegment[],
      words: result.words as TranscriptionWord[],
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

/* ───── 統合 文字起こし 関数 ───── */

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
 * 利用可能な文字起こしエンジンの一覧を取得する。
 */
export function listAvailableTranscriptionEngines(): TranscriptionEngine[] {
  return getAudioPipelineCapabilities()
    .filter((c) => c.type === "transcription" && c.installed)
    .map((c) => c.engine as TranscriptionEngine)
}
