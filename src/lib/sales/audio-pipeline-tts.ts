import { execSync } from "child_process"
import { writeFileSync, existsSync, readFileSync } from "fs"
import { join } from "path"
import {
  EDGE_TTS_VOICES,
  TTS_TIMEOUT_MS,
  ensureWorkDir,
  checkCommand,
  checkPythonPackage,
  getAudioPipelineCapabilities,
  type TtsEngine,
  type TtsInput,
  type TtsResult,
} from "./audio-pipeline-utils"

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
 * 利用可能な TTS エンジンの一覧を取得する。
 */
export function listAvailableTtsEngines(): TtsEngine[] {
  return getAudioPipelineCapabilities()
    .filter((c) => c.type === "tts" && c.installed)
    .map((c) => c.engine as TtsEngine)
}
