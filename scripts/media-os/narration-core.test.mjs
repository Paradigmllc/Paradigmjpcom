import { describe, expect, it } from "vitest";
import {
  mergeSegmentTranscripts,
  scoreBackTranscript,
  validateNarrationManifest,
} from "./narration-core.mjs";

function manifest(language = "ja") {
  return {
    version: 1,
    episodeId: `episode-enron-${language}`,
    language,
    voice: {
      provider: "kokoro-onnx",
      id: language === "ja" ? "jf_alpha" : "af_nova",
      speed: 1,
      provenance: "bundled_stock_model_voice",
      humanImitation: false,
      modelLicense: "Apache-2.0",
      adapterLicense: "MIT",
    },
    transcription: { provider: "faster-whisper", model: "small", language },
    quality: { minimumAccuracy: 0.8 },
    segments: [{ id: "narr-hook", role: "hook", text: "数字は完璧に見えた。", claimIds: [] }],
  };
}

describe("narration manifest", () => {
  it("accepts approved stock voices for Japanese and English", () => {
    expect(validateNarrationManifest(manifest("ja")).voice.id).toBe("jf_alpha");
    expect(validateNarrationManifest(manifest("en")).voice.id).toBe("af_nova");
  });

  it("rejects reference audio and English-only Japanese transcription", () => {
    const cloned = manifest("ja");
    cloned.voice.referenceAudio = "person.wav";
    expect(() => validateNarrationManifest(cloned)).toThrow(/forbidden/);

    const wrongModel = manifest("ja");
    wrongModel.transcription.model = "small.en";
    expect(() => validateNarrationManifest(wrongModel)).toThrow(/invalid for ja/);
  });
});

describe("back-transcription QA", () => {
  it("scores Japanese by normalized characters", () => {
    const qa = scoreBackTranscript(
      "数字は、完璧に見えた。",
      [{ text: "数字は" }, { text: "完璧に" }, { text: "見えた" }],
      "ja",
      0.9,
    );
    expect(qa).toMatchObject({ unit: "character", accuracy: 1, passed: true });
  });

  it("fails English when word error rate is too high", () => {
    const qa = scoreBackTranscript(
      "The cash was not there",
      [{ text: "The" }, { text: "story" }, { text: "was" }, { text: "different" }],
      "en",
      0.9,
    );
    expect(qa.passed).toBe(false);
  });

  it("normalizes audited proper-name ASR variants without lowering the threshold", () => {
    const qa = scoreBackTranscript(
      "Richard Causey discussed Enron's results",
      [{ text: "Richard" }, { text: "Cossie" }, { text: "discussed" }, { text: "in" }, { text: "Ron's" }, { text: "results" }],
      "en",
      1,
    );
    expect(qa).toMatchObject({ accuracy: 1, minimumAccuracy: 1, passed: true });
  });

  it("normalizes equivalent spoken and written evidence quantities", () => {
    const qa = scoreBackTranscript(
      "eighteen hundred interviews, three thousand boxes, four terabytes, six hundred employees",
      [{ text: "1,800 interviews, 3,000 boxes, 4 terabytes, 600 employees" }],
      "en",
      1,
    );
    expect(qa).toMatchObject({ accuracy: 1, minimumAccuracy: 1, passed: true });
  });

  it("merges segment timestamps and retains traceability", () => {
    const merged = mergeSegmentTranscripts([
      {
        id: "narr-a",
        claimIds: ["claim-a"],
        sourceHash: "abc",
        audioDuration: 1,
        qa: { passed: true },
        words: [{ text: "記録", start: 0, end: 0.5 }],
      },
      {
        id: "narr-b",
        claimIds: [],
        sourceHash: "def",
        audioDuration: 1,
        qa: { passed: true },
        words: [{ text: "です", start: 0.1, end: 0.6 }],
      },
    ], "ja", "faster-whisper-small", 0.25);
    expect(merged.words[1]).toMatchObject({ id: "w-0002", start: 1.35, segmentId: "narr-b" });
    expect(merged.segments[0].claimIds).toEqual(["claim-a"]);
  });

  it("moves words and captions to their scene-aligned placements", () => {
    const segments = [{
      id: "narr-a", sceneId: "scene-2", claimIds: [], sourceHash: "abc",
      audioDuration: 2, qa: { passed: true }, words: [{ text: "Evidence", start: 0.2, end: 0.8 }],
    }];
    const timeline = {
      mode: "scene_aligned", durationSeconds: 20,
      placements: [{ id: "narr-a", sceneId: "scene-2", startSeconds: 12, endSeconds: 14 }],
    };
    const merged = mergeSegmentTranscripts(segments, "en", "faster-whisper-small", 0.25, timeline);
    expect(merged.words[0]).toMatchObject({ start: 12.2, end: 12.8 });
    expect(merged).toMatchObject({ durationSeconds: 20, speechDurationSeconds: 2, timelineMode: "scene_aligned" });
  });
});
