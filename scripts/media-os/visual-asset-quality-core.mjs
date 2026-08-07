export const VISUAL_ASSET_GATE_VERSION = "2026-08-03.1";

function result(id, pass, detail) {
  return { id, pass, detail, blocking: true };
}

function alphaPixelFormat(value) {
  return typeof value === "string" && /(^|[^a-z])(rgba|bgra|argb|abgr|yuva|gbrap)/i.test(value);
}

export function evaluateGeneratedAsset({ profile, asset, generated, verification = {} }) {
  if (!profile || !asset || !generated) throw new Error("Visual asset QA requires profile, asset, and generated record.");
  const quality = profile.quality;
  const checks = [
    result("output_kind", generated.outputKind === profile.outputKind, `${generated.outputKind} / expected ${profile.outputKind}`),
    result("minimum_width", Number(generated.actualWidth) >= quality.minimumWidth, `${generated.actualWidth ?? "unknown"} / ${quality.minimumWidth}px`),
    result("minimum_height", Number(generated.actualHeight) >= quality.minimumHeight, `${generated.actualHeight ?? "unknown"} / ${quality.minimumHeight}px`),
    result("minimum_bytes", Number(generated.bytes) >= quality.minimumBytes, `${generated.bytes ?? "unknown"} / ${quality.minimumBytes} bytes`),
  ];
  if (profile.outputKind === "video") {
    checks.push(
      result("minimum_duration", Number(generated.durationSeconds) >= quality.minimumDurationSeconds, `${generated.durationSeconds ?? "unknown"}s`),
      result("maximum_duration", Number(generated.durationSeconds) <= quality.maximumDurationSeconds, `${generated.durationSeconds ?? "unknown"}s`),
    );
  }
  if (quality.requireAlpha) checks.push(result("alpha_channel", alphaPixelFormat(generated.pixelFormat), generated.pixelFormat ?? "unknown"));
  if (quality.requireLipSyncScore) {
    checks.push(result("lip_sync_score", Number(verification.lipSyncScore) >= quality.minimumLipSyncScore,
      `${verification.lipSyncScore ?? "missing"} / ${quality.minimumLipSyncScore}`));
  }
  if (quality.requireIdentityScore) {
    checks.push(result("identity_score", Number(verification.identityScore) >= quality.minimumIdentityScore,
      `${verification.identityScore ?? "missing"} / ${quality.minimumIdentityScore}`));
  }
  const failed = checks.filter((check) => !check.pass);
  return {
    version: VISUAL_ASSET_GATE_VERSION,
    kind: "generated_visual_asset",
    assetId: asset.id,
    profileId: profile.id,
    status: failed.length === 0 ? "pass" : "blocked",
    score: Math.round((checks.filter((check) => check.pass).length / checks.length) * 100),
    threshold: 100,
    checks,
    blockerIds: failed.map((check) => check.id),
  };
}

export function evaluateGeneratedAssetSet(records) {
  const owners = new Map();
  const duplicateAssetIds = new Set();
  for (const record of records) {
    const owner = owners.get(record.outputSha256);
    if (owner) {
      duplicateAssetIds.add(owner);
      duplicateAssetIds.add(record.id);
    } else {
      owners.set(record.outputSha256, record.id);
    }
  }
  return {
    version: VISUAL_ASSET_GATE_VERSION,
    status: duplicateAssetIds.size === 0 ? "pass" : "blocked",
    duplicateAssetIds: [...duplicateAssetIds].sort(),
    uniqueOutputShare: records.length === 0 ? 0 : Number((owners.size / records.length).toFixed(4)),
  };
}
