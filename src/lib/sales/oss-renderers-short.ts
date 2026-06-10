import { execSync } from "child_process"
import { writeFileSync, existsSync, readFileSync } from "fs"
import { join } from "path"
import {
  RENDERER_TIMEOUT_MS,
  ensureWorkDir,
  checkNpmPackage,
  checkCommand,
  checkPythonPackage,
  type OssRenderInput,
  type OssRenderResult,
} from "./oss-renderers-utils"

/* ───── Short Video Maker レンダラー ───── */

export async function renderWithShortVideoMaker(input: OssRenderInput): Promise<OssRenderResult> {
  const startTime = Date.now()
  const workDir = ensureWorkDir(input.workDir)
  const outputPath = join(workDir, input.outputFilename)

  try {
    // Short Video Maker 設定
    const template = (input.params.template as string) ?? "default"
    const scriptPath = join(workDir, "short-video-render.mjs")

    const script = `
import { readFileSync, writeFileSync } from 'fs';

// Short Video Maker SDK 設定
const config = {
  output: ${JSON.stringify(outputPath)},
  width: ${input.width},
  height: ${input.height},
  fps: ${input.fps},
  duration: ${input.durationSec},
  template: ${JSON.stringify(template)},
  text: ${JSON.stringify(input.params.text ?? "")},
  bgColor: ${JSON.stringify((input.params.bgColor as string) ?? "#000000")},
  musicUrl: ${JSON.stringify((input.params.musicUrl as string) ?? null)},
  voiceoverUrl: ${JSON.stringify((input.params.voiceoverUrl as string) ?? null)},
  captions: ${JSON.stringify((input.params.captions as boolean) ?? true)},
  branding: ${JSON.stringify((input.params.branding as Record<string, unknown>) ?? {})},
}

try {
  // @shtcut/sdk がインストールされていれば使用
  const sdk = require('@shtcut/sdk');
  const result = await sdk.render(config);
  console.log(JSON.stringify(result));
} catch (e) {
  // SDK がない場合 FFmpeg でフォールバック
  console.warn(JSON.stringify({ fallback: true, message: e.message }));
}
`
    writeFileSync(scriptPath, script, "utf-8")

    if (checkNpmPackage("@shtcut/sdk")) {
      const stdout = execSync(`node "${scriptPath}"`, {
        cwd: process.cwd(),
        timeout: input.timeoutMs ?? RENDERER_TIMEOUT_MS,
        stdio: "pipe",
      })
      const result = JSON.parse(stdout.toString().trim())
      return {
        ok: true,
        outputPath: result.output ?? outputPath,
        fileSize: result.size ?? (existsSync(outputPath) ? readFileSync(outputPath).length : 0),
        durationMs: Date.now() - startTime,
        metadata: { template, sdkAvailable: true },
      }
    } else {
      // FFmpeg でフォールバック (9:16 ショート動画用)
      const ffmpegCmd = [
        `ffmpeg -y`,
        `-f lavfi -i color=c=${input.params.bgColor ?? "black"}:s=${input.width}x${input.height}:d=${input.durationSec}:r=${input.fps}`,
        ...(input.params.text
          ? [
              `-vf "drawtext=text='${String(input.params.text).replace(/'/g, "'\\\\''")}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2"`,
            ]
          : []),
        `-c:v libx264 -preset ultrafast -crf 28`,
        `-pix_fmt yuv420p`,
        `"${outputPath}"`,
      ].join(" ")

      execSync(ffmpegCmd, { timeout: input.timeoutMs ?? RENDERER_TIMEOUT_MS, stdio: "pipe" })

      return {
        ok: true,
        outputPath,
        fileSize: existsSync(outputPath) ? readFileSync(outputPath).length : 0,
        durationMs: Date.now() - startTime,
        metadata: { template, sdkAvailable: false, fallback: true },
      }
    }
  } catch (error) {
    return {
      ok: false,
      error: `Short Video Maker render failed: ${error instanceof Error ? error.message : String(error)}`,
      durationMs: Date.now() - startTime,
    }
  }
}

/* ───── OpenMontage レンダラー ───── */

export async function renderWithOpenMontage(input: OssRenderInput): Promise<OssRenderResult> {
  const startTime = Date.now()
  const workDir = ensureWorkDir(input.workDir)
  const outputPath = join(workDir, input.outputFilename)

  try {
    // OpenMontage 設定ファイルを生成
    const segments = (input.params.segments as Array<Record<string, unknown>>) ?? []
    const montageConfig = {
      output: outputPath,
      width: input.width,
      height: input.height,
      fps: input.fps,
      duration: input.durationSec,
      segments: segments.map((seg, i) => ({
        id: seg.id ?? `seg-${i}`,
        type: (seg.type as string) ?? "video",
        src: seg.src as string,
        start: (seg.start as number) ?? 0,
        duration: (seg.duration as number) ?? 5,
        transition: (seg.transition as string) ?? "fade",
        transitionDuration: (seg.transitionDuration as number) ?? 0.5,
        ...(seg.params ? { params: seg.params as Record<string, unknown> } : {}),
      })),
      audio: input.params.audioPath as string | undefined,
      subtitles: input.params.subtitlesPath as string | undefined,
      metadata: {
        title: (input.params.title as string) ?? "Paradigm Video",
        description: (input.params.description as string) ?? "",
        created_at: new Date().toISOString(),
      },
    }

    const configPath = join(workDir, "openmontage-config.json")
    writeFileSync(configPath, JSON.stringify(montageConfig, null, 2), "utf-8")

    // OpenMontage 実行
    if (checkCommand("openmontage")) {
      execSync(`openmontage render "${configPath}"`, {
        cwd: process.cwd(),
        timeout: input.timeoutMs ?? RENDERER_TIMEOUT_MS,
        stdio: "pipe",
      })
    } else if (checkPythonPackage("openmontage")) {
      const scriptPath = join(workDir, "openmontage-render.py")
      const script = `
import json, sys
from openmontage import Montage

with open(${JSON.stringify(configPath)}, 'r') as f:
    config = json.load(f)

montage = Montage(config)
montage.render()
print(json.dumps({"output": config["output"], "segments": len(config["segments"])}))
`
      writeFileSync(scriptPath, script, "utf-8")
      execSync(`python "${scriptPath}"`, {
        cwd: process.cwd(),
        timeout: input.timeoutMs ?? RENDERER_TIMEOUT_MS,
        stdio: "pipe",
      })
    } else {
      // FFmpeg でフォールバック (セグメント連結)
      const concatFile = join(workDir, "concat-list.txt")
      const concatEntries = segments
        .filter((seg) => seg.src && typeof seg.src === "string")
        .map((seg) => `file '${String(seg.src).replace(/'/g, "'\\\\''")}'`)
        .join("\n")

      if (concatEntries) {
        writeFileSync(concatFile, concatEntries, "utf-8")
        execSync(
          `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c copy -pix_fmt yuv420p "${outputPath}"`,
          { timeout: input.timeoutMs ?? RENDERER_TIMEOUT_MS, stdio: "pipe" },
        )
      } else {
        execSync(
          `ffmpeg -y -f lavfi -i color=c=black:s=${input.width}x${input.height}:d=${input.durationSec}:r=${input.fps} -c:v libx264 -preset ultrafast -crf 28 -pix_fmt yuv420p "${outputPath}"`,
          { timeout: input.timeoutMs ?? RENDERER_TIMEOUT_MS, stdio: "pipe" },
        )
      }
    }

    if (!existsSync(outputPath)) {
      return { ok: false, error: "OpenMontage output file not found", durationMs: Date.now() - startTime }
    }

    const stats = existsSync(outputPath) ? { size: readFileSync(outputPath).length } : { size: 0 }
    return {
      ok: true,
      outputPath,
      fileSize: stats.size,
      durationMs: Date.now() - startTime,
      metadata: { segments: segments.length, configPath },
    }
  } catch (error) {
    return {
      ok: false,
      error: `OpenMontage render failed: ${error instanceof Error ? error.message : String(error)}`,
      durationMs: Date.now() - startTime,
    }
  }
}
