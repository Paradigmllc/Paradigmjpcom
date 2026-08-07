import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let directory;

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout;
}

function hash(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

beforeAll(() => {
  directory = mkdtempSync(resolve(tmpdir(), "media-os-sound-test-"));
  run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=black:s=320x180:r=30:d=2", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=2", "-c:v", "mpeg4", "-c:a", "aac", "-shortest", resolve(directory, "input.mp4")]);
  run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "anoisesrc=color=pink:sample_rate=48000:duration=2:amplitude=0.03", resolve(directory, "room.wav")]);
  run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=1200:sample_rate=48000:duration=0.1", resolve(directory, "hit.wav")]);
  const rights = { license: "project-original", commercialUse: true, provenance: "automated integration fixture", attribution: "", aiGenerated: false };
  writeFileSync(resolve(directory, "sound.json"), JSON.stringify({
    version: 1,
    episodeId: "episode-test",
    generatedMusicAllowed: false,
    mix: { targetIntegratedLufs: -14, targetTruePeakDbtp: -1.5, narrationGainDb: 0, ducking: { threshold: 0.03, ratio: 8, attackMs: 20, releaseMs: 350 } },
    tracks: [
      { id: "snd-room", kind: "ambience", source: "room.wav", startSeconds: 0, durationSeconds: 2, gainDb: -28, loop: true, sha256: hash(resolve(directory, "room.wav")), rights },
      ...[0.4, 1, 1.6].map((startSeconds, index) => ({ id: `snd-hit-${index}`, kind: "sfx", source: "hit.wav", startSeconds, durationSeconds: 0.1, gainDb: -16, loop: false, sha256: hash(resolve(directory, "hit.wav")), rights })),
    ],
  }), "utf8");
});

afterAll(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe("sound-designed master renderer", () => {
  it("renders a rights-verified, ducked and loudness-mastered MP4", () => {
    const output = resolve(directory, "master.mp4");
    const report = resolve(directory, "report.json");
    run(process.execPath, [resolve("scripts/render-sound-designed-master.mjs"), resolve(directory, "input.mp4"), "--manifest", resolve(directory, "sound.json"), "--output", output, "--report", report]);
    const result = JSON.parse(readFileSync(report, "utf8"));
    expect(result.plan.status).toBe("pass");
    expect(result.stems).toHaveLength(4);
    expect(Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", output]).trim())).toBeGreaterThan(1.9);
  }, 30_000);
});
