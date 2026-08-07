function finitePositive(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${label} must be positive.`);
  return number;
}

function round(value) {
  return Number(value.toFixed(3));
}

export function buildSceneAlignedNarrationTimeline(segmentResults, blueprint, defaultGapSeconds = 0.25) {
  const scenes = Array.isArray(blueprint?.scenes) ? blueprint.scenes : [];
  if (scenes.length === 0) throw new Error("Narration timeline requires blueprint scenes.");
  const results = Array.isArray(segmentResults) ? segmentResults : [];
  const sceneIds = new Set(scenes.map((scene) => scene.id));
  const unknown = results.filter((segment) => !sceneIds.has(segment.sceneId)).map((segment) => segment.id);
  if (unknown.length > 0) throw new Error(`Narration segments have unknown scenes: ${unknown.join(", ")}.`);

  const placements = [];
  for (const scene of scenes) {
    const start = Number(scene.startSeconds);
    const duration = finitePositive(scene.durationSeconds, `${scene.id}.durationSeconds`);
    if (!Number.isFinite(start) || start < 0) throw new Error(`${scene.id}.startSeconds must be non-negative.`);
    const sceneSegments = results.filter((segment) => segment.sceneId === scene.id);
    if (sceneSegments.length === 0) throw new Error(`${scene.id} has no rendered narration.`);
    const speechSeconds = sceneSegments.reduce(
      (sum, segment) => sum + finitePositive(segment.audioDuration, `${segment.id}.audioDuration`),
      0,
    );
    const authoredGaps = sceneSegments.slice(0, -1).map((segment) => {
      const value = Number(segment.pauseAfterSeconds);
      return Number.isFinite(value) ? value : Number(defaultGapSeconds);
    });
    const authoredGapSeconds = authoredGaps.reduce((sum, value) => sum + value, 0);
    const available = duration - speechSeconds;
    if (available < authoredGapSeconds) {
      throw new Error(`${scene.id} narration exceeds its scene by ${round(authoredGapSeconds - available)} seconds.`);
    }
    const breathingRoom = available - authoredGapSeconds;
    const head = Math.min(1.25, breathingRoom * 0.18);
    const tail = Math.min(1.75, Math.max(0, breathingRoom - head) * 0.24);
    const distributable = Math.max(0, breathingRoom - head - tail);
    const internalExtra = sceneSegments.length > 1 ? distributable / (sceneSegments.length - 1) : 0;
    let cursor = start + head;
    for (const [index, segment] of sceneSegments.entries()) {
      const segmentStart = cursor;
      const segmentEnd = segmentStart + Number(segment.audioDuration);
      placements.push({
        id: segment.id,
        sceneId: scene.id,
        startSeconds: round(segmentStart),
        endSeconds: round(segmentEnd),
        audioDuration: round(Number(segment.audioDuration)),
      });
      cursor = segmentEnd;
      if (index < sceneSegments.length - 1) cursor += authoredGaps[index] + internalExtra;
    }
    if (cursor > start + duration + 0.01) {
      throw new Error(`${scene.id} aligned narration exceeds the scene boundary.`);
    }
  }

  const durationSeconds = finitePositive(blueprint.targetDurationSeconds, "blueprint.targetDurationSeconds");
  const speechDurationSeconds = results.reduce((sum, segment) => sum + Number(segment.audioDuration), 0);
  return {
    version: "2026-08-03.1",
    mode: "scene_aligned",
    durationSeconds: round(durationSeconds),
    speechDurationSeconds: round(speechDurationSeconds),
    sceneCount: scenes.length,
    placements,
  };
}

export function placementMap(timeline) {
  return new Map((timeline?.placements ?? []).map((placement) => [placement.id, placement]));
}
