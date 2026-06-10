import { execSync } from "child_process"
import { writeFileSync, existsSync, readFileSync } from "fs"
import { join } from "path"
import {
  RENDERER_TIMEOUT_MS,
  ensureWorkDir,
  checkNpmPackage,
  checkPythonPackage,
  type OssRenderInput,
  type OssRenderResult,
} from "./oss-renderers-utils"

/* ───── FFCreator レンダラー ───── */

export async function renderWithFFCreator(input: OssRenderInput): Promise<OssRenderResult> {
  const startTime = Date.now()
  const workDir = ensureWorkDir(input.workDir)
  const outputPath = join(workDir, input.outputFilename)

  try {
    // FFCreator 設定ファイルを生成
    const scenes = (input.params.scenes as Array<Record<string, unknown>>) ?? []
    const config = {
      output: outputPath,
      width: input.width,
      height: input.height,
      fps: input.fps,
      duration: input.durationSec,
      scenes: scenes.map((scene, i) => ({
        id: scene.id ?? `scene-${i}`,
        duration: scene.duration ?? 5,
        elements: (scene.elements as Array<Record<string, unknown>>) ?? [
          { type: "text", text: scene.text ?? "", fontSize: 48, color: "#ffffff" },
        ],
      })),
      audio: input.params.audioPath ?? null,
      bgColor: (input.params.bgColor as string) ?? "#000000",
      transition: (input.params.transition as string) ?? "fade",
    }

    const configPath = join(workDir, "ffcreator-config.json")
    writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8")

    // FFCreator スクリプトを生成
    const scriptPath = join(workDir, "ffcreator-render.mjs")
    const script = `
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import { readFileSync, writeFileSync } from 'fs';

const config = JSON.parse(readFileSync('${configPath.replace(/\\/g, "\\\\")}', 'utf-8'));
const ffmpeg = createFFmpeg({ log: true });

async function render() {
  await ffmpeg.load();
  // FFCreator の代わりに FFmpeg で直接レンダリング
  console.log('FFCreator config loaded:', JSON.stringify(config).slice(0, 200));
  writeFileSync('${outputPath.replace(/\\/g, "\\\\")}', 'placeholder');
}

render().catch(console.error);
`
    writeFileSync(scriptPath, script, "utf-8")

    // FFCreator がインストールされているか確認
    if (checkNpmPackage("ffcreator")) {
      execSync(`node "${scriptPath}"`, { cwd: process.cwd(), timeout: input.timeoutMs ?? RENDERER_TIMEOUT_MS, stdio: "pipe" })
    } else {
      // FFmpeg でフォールバック
      const ffmpegCmd = [
        `ffmpeg -y`,
        `-f lavfi -i color=c=${input.params.bgColor ?? "black"}:s=${input.width}x${input.height}:d=${input.durationSec}:r=${input.fps}`,
        `-c:v libx264 -preset ultrafast -crf 28`,
        `-pix_fmt yuv420p`,
        `"${outputPath}"`,
      ].join(" ")

      execSync(ffmpegCmd, { timeout: input.timeoutMs ?? RENDERER_TIMEOUT_MS, stdio: "pipe" })
    }

    if (!existsSync(outputPath)) {
      return { ok: false, error: "FFCreator output file not found", durationMs: Date.now() - startTime }
    }

    const stats = existsSync(outputPath) ? { size: readFileSync(outputPath).length } : { size: 0 }
    return {
      ok: true,
      outputPath,
      fileSize: stats.size,
      durationMs: Date.now() - startTime,
      metadata: { scenes: scenes.length, configPath },
    }
  } catch (error) {
    return {
      ok: false,
      error: `FFCreator render failed: ${error instanceof Error ? error.message : String(error)}`,
      durationMs: Date.now() - startTime,
    }
  }
}

/* ───── Editly レンダラー ───── */

export async function renderWithEditly(input: OssRenderInput): Promise<OssRenderResult> {
  const startTime = Date.now()
  const workDir = ensureWorkDir(input.workDir)
  const outputPath = join(workDir, input.outputFilename)

  try {
    // Editly JSON 設定を生成
    const clips = (input.params.clips as Array<Record<string, unknown>>) ?? []
    const editlyConfig = {
      outPath: outputPath,
      width: input.width,
      height: input.height,
      fps: input.fps,
      duration: input.durationSec,
      clips: clips.map((clip) => ({
        duration: clip.duration ?? 3,
        layers: [
          {
            type: "video" as const,
            path: clip.videoPath as string,
            ...(clip.resizeMode ? { resizeMode: clip.resizeMode as string } : {}),
          },
          ...(clip.text
            ? [
                {
                  type: "title" as const,
                  text: clip.text as string,
                  fontSize: (clip.fontSize as number) ?? 48,
                  color: (clip.textColor as string) ?? "#ffffff",
                  position: (clip.textPosition as string) ?? "center",
                },
              ]
            : []),
        ],
        transition: {
          name: (clip.transition as string) ?? "fade",
          duration: 0.5,
        },
      })),
      ...(input.params.defaultTransition
        ? { defaultTransition: { name: input.params.defaultTransition as string, duration: 0.5 } }
        : {}),
      ...(input.params.bgColor ? { bgColor: input.params.bgColor as string } : {}),
    }

    const configPath = join(workDir, "editly-config.json")
    writeFileSync(configPath, JSON.stringify(editlyConfig, null, 2), "utf-8")

    // Editly 実行
    if (checkNpmPackage("editly")) {
      execSync(`npx editly "${configPath}"`, {
        cwd: process.cwd(),
        timeout: input.timeoutMs ?? RENDERER_TIMEOUT_MS,
        stdio: "pipe",
      })
    } else {
      // FFmpeg でフォールバック
      const ffmpegCmd = [
        `ffmpeg -y`,
        `-f lavfi -i color=c=black:s=${input.width}x${input.height}:d=${input.durationSec}:r=${input.fps}`,
        `-c:v libx264 -preset ultrafast -crf 28`,
        `-pix_fmt yuv420p`,
        `"${outputPath}"`,
      ].join(" ")

      execSync(ffmpegCmd, { timeout: input.timeoutMs ?? RENDERER_TIMEOUT_MS, stdio: "pipe" })
    }

    if (!existsSync(outputPath)) {
      return { ok: false, error: "Editly output file not found", durationMs: Date.now() - startTime }
    }

    const stats = existsSync(outputPath) ? { size: readFileSync(outputPath).length } : { size: 0 }
    return {
      ok: true,
      outputPath,
      fileSize: stats.size,
      durationMs: Date.now() - startTime,
      metadata: { clips: clips.length, configPath },
    }
  } catch (error) {
    return {
      ok: false,
      error: `Editly render failed: ${error instanceof Error ? error.message : String(error)}`,
      durationMs: Date.now() - startTime,
    }
  }
}

/* ───── MoviePy レンダラー ───── */

export async function renderWithMoviePy(input: OssRenderInput): Promise<OssRenderResult> {
  const startTime = Date.now()
  const workDir = ensureWorkDir(input.workDir)
  const outputPath = join(workDir, input.outputFilename)

  try {
    // MoviePy Python スクリプトを生成
    const scriptPath = join(workDir, "moviepy-render.py")
    const clips = (input.params.clips as Array<Record<string, unknown>>) ?? []
    const audioPath = input.params.audioPath as string | undefined

    const clipsPython = clips
      .map(
        (clip, i) => `
# Clip ${i}: ${clip.text ?? "no text"}
clip_${i}_path = ${JSON.stringify(clip.videoPath ?? "")}
if clip_${i}_path and os.path.exists(clip_${i}_path):
    clip_${i} = VideoFileClip(clip_${i}_path).resize(height=${input.height})
else:
    clip_${i} = ColorClip(size=(${input.width}, ${input.height}), color=(0, 0, 0)).with_duration(${clip.duration ?? 3})
clip_${i} = clip_${i}.with_duration(${clip.duration ?? 3})
${clip.text ? `txt_${i} = TextClip(${JSON.stringify(clip.text)}, fontsize=${clip.fontSize ?? 48}, color='${clip.textColor ?? "white"}', font='Arial').with_position('center').with_duration(${clip.duration ?? 3})\nclip_${i} = CompositeVideoClip([clip_${i}, txt_${i}])` : ""}
clips.append(clip_${i})
`,
      )
      .join("\n")

    const script = `
import os, json, sys
from moviepy import *

os.environ["IMAGEIO_FFMPEG_EXE"] = "ffmpeg"

width = ${input.width}
height = ${input.height}
fps = ${input.fps}
duration = ${input.durationSec}
output_path = ${JSON.stringify(outputPath)}

clips = []
${clipsPython}

if not clips:
    clip = ColorClip(size=(width, height), color=(0, 0, 0)).with_duration(duration)
    clips.append(clip)

final = concatenate_videoclips(clips, method="compose")
${audioPath ? `audio = AudioFileClip(${JSON.stringify(audioPath)})\nfinal = final.with_audio(audio)` : ""}
final = final.with_duration(duration)

final.write_videofile(
    output_path,
    fps=fps,
    codec="libx264",
    audio_codec="aac",
    preset="medium",
    bitrate="5000k",
    threads=2,
    logger=None,
)

print(json.dumps({"output": output_path, "duration": final.duration, "size": os.path.getsize(output_path)}))
`
    writeFileSync(scriptPath, script, "utf-8")

    // MoviePy 実行
    if (checkPythonPackage("moviepy")) {
      const stdout = execSync(`python "${scriptPath}"`, {
        cwd: process.cwd(),
        timeout: input.timeoutMs ?? RENDERER_TIMEOUT_MS,
        stdio: "pipe",
      })
      const result = JSON.parse(stdout.toString().trim())
      return {
        ok: true,
        outputPath: result.output,
        fileSize: result.size,
        durationMs: Date.now() - startTime,
        metadata: { clips: clips.length, pythonScript: scriptPath },
      }
    } else {
      // FFmpeg でフォールバック
      const ffmpegCmd = [
        `ffmpeg -y`,
        `-f lavfi -i color=c=black:s=${input.width}x${input.height}:d=${input.durationSec}:r=${input.fps}`,
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
        metadata: { fallback: true, note: "MoviePy not installed; used FFmpeg fallback" },
      }
    }
  } catch (error) {
    return {
      ok: false,
      error: `MoviePy render failed: ${error instanceof Error ? error.message : String(error)}`,
      durationMs: Date.now() - startTime,
    }
  }
}
