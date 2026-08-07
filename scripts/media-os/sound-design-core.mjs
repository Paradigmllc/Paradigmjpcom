import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const TRACK_KINDS = new Set(["music", "ambience", "sfx"]);
const ALLOWED_LICENSES = new Set(["CC0-1.0", "CC-BY-4.0", "project-original", "commercial-license"]);

function result(id, pass, detail, blocking = true) {
  return { id, pass, detail, category: "sound", blocking };
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function finiteNumber(value, label, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    throw new Error(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return number;
}

export function validateSoundDesignManifest(input, manifestPath, options = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Sound design manifest must be an object.");
  if (input.version !== 1) throw new Error("Sound design manifest version must be 1.");
  if (input.episodeId !== options.episodeId) throw new Error("Sound design episode mismatch.");
  const mix = input.mix ?? {};
  const normalizedMix = {
    targetIntegratedLufs: finiteNumber(mix.targetIntegratedLufs, "mix.targetIntegratedLufs", -16, -12),
    targetTruePeakDbtp: finiteNumber(mix.targetTruePeakDbtp, "mix.targetTruePeakDbtp", -3, -1),
    narrationGainDb: finiteNumber(mix.narrationGainDb ?? 0, "mix.narrationGainDb", -6, 6),
    ducking: {
      threshold: finiteNumber(mix.ducking?.threshold, "mix.ducking.threshold", 0.005, 0.2),
      ratio: finiteNumber(mix.ducking?.ratio, "mix.ducking.ratio", 2, 20),
      attackMs: finiteNumber(mix.ducking?.attackMs, "mix.ducking.attackMs", 5, 100),
      releaseMs: finiteNumber(mix.ducking?.releaseMs, "mix.ducking.releaseMs", 100, 1000),
    },
  };
  const base = dirname(resolve(manifestPath));
  const ids = new Set();
  const tracks = (Array.isArray(input.tracks) ? input.tracks : []).map((track, index) => {
    const id = String(track.id ?? "");
    if (!/^snd-[a-z0-9-]+$/.test(id) || ids.has(id)) throw new Error(`tracks[${index}].id must be a unique snd-* identifier.`);
    ids.add(id);
    if (!TRACK_KINDS.has(track.kind)) throw new Error(`${id} has an unsupported kind.`);
    const source = String(track.source ?? "").trim();
    if (!source) throw new Error(`${id}.source is required.`);
    const sourcePath = resolve(base, source);
    const rights = track.rights ?? {};
    if (!ALLOWED_LICENSES.has(rights.license) || rights.commercialUse !== true || !String(rights.provenance ?? "").trim()) {
      throw new Error(`${id} rights metadata is incomplete.`);
    }
    if (track.kind === "music" && options.generatedMusicAllowed === false && rights.aiGenerated === true) {
      throw new Error(`${id} violates generatedMusicAllowed=false.`);
    }
    return {
      id,
      kind: track.kind,
      sourcePath,
      source,
      startSeconds: finiteNumber(track.startSeconds ?? 0, `${id}.startSeconds`, 0, options.durationSeconds),
      durationSeconds: finiteNumber(track.durationSeconds, `${id}.durationSeconds`, 0.05, options.durationSeconds),
      gainDb: finiteNumber(track.gainDb, `${id}.gainDb`, -48, 6),
      loop: track.loop === true,
      sha256: String(track.sha256 ?? "").toLowerCase(),
      rights: {
        license: rights.license,
        commercialUse: true,
        provenance: rights.provenance,
        attribution: String(rights.attribution ?? ""),
        aiGenerated: rights.aiGenerated === true,
      },
    };
  });
  for (const track of tracks) {
    if (!/^[a-f0-9]{64}$/.test(track.sha256)) throw new Error(`${track.id}.sha256 must be a SHA-256 digest.`);
  }
  return { version: 1, episodeId: input.episodeId, mix: normalizedMix, tracks };
}

export function evaluateSoundDesignPlan(manifest, durationSeconds, verifyFiles = false) {
  if (!manifest) {
    const checks = [result("sound_design_manifest", false, "No sound design manifest")];
    return { version: "2026-08-03.1", status: "blocked", checks, blockers: checks, metrics: { trackCount: 0 } };
  }
  const ambience = manifest.tracks.filter((track) => track.kind === "ambience" || track.kind === "music");
  const sfx = manifest.tracks.filter((track) => track.kind === "sfx");
  const coverage = Math.min(1, ambience.reduce((sum, track) => sum + track.durationSeconds, 0) / durationSeconds);
  const existing = manifest.tracks.filter((track) => existsSync(track.sourcePath));
  const matchingHashes = existing.filter((track) => /^[a-f0-9]{64}$/.test(track.sha256) && sha256(track.sourcePath) === track.sha256);
  const rightsComplete = manifest.tracks.every((track) => ALLOWED_LICENSES.has(track.rights.license)
    && track.rights.commercialUse === true && track.rights.provenance.length > 0);
  const checks = [
    result("sound_design_manifest", true, "Validated sound design contract"),
    result("sound_bed_coverage", coverage >= 0.75, `${(coverage * 100).toFixed(1)}% bed coverage`),
    result("sound_effect_cue_density", sfx.length >= Math.max(3, Math.ceil(durationSeconds / 120)), `${sfx.length} SFX cues`),
    result("sound_rights_complete", rightsComplete, `${manifest.tracks.length} rights-tracked stems`),
    result("sound_source_hashes", !verifyFiles || matchingHashes.length === manifest.tracks.length, verifyFiles ? `${matchingHashes.length}/${manifest.tracks.length} verified files` : "Deferred to render host"),
    result("dialogue_ducking_configured", manifest.mix.ducking.ratio >= 4 && manifest.mix.ducking.releaseMs >= 150, `ratio ${manifest.mix.ducking.ratio}:1, release ${manifest.mix.ducking.releaseMs}ms`),
  ];
  const blockers = checks.filter((check) => check.blocking && !check.pass);
  return {
    version: "2026-08-03.1",
    status: blockers.length === 0 ? "pass" : "blocked",
    checks,
    blockers,
    metrics: { trackCount: manifest.tracks.length, bedCount: ambience.length, sfxCount: sfx.length, bedCoverage: Number(coverage.toFixed(4)) },
  };
}
