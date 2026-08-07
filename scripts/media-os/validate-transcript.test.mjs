import { describe, expect, it } from "vitest";
import { validateAndCleanTranscript } from "./validate-transcript.mjs";

describe("validateAndCleanTranscript", () => {
  it("normalizes identifiers and removes a small amount of filler", () => {
    const result = validateAndCleanTranscript({
      language: "ja",
      model: "small",
      words: [
        { text: "数字は", start: 0, end: 0.55 },
        { text: "えー", start: 0.6, end: 0.8 },
        { text: "完璧に", start: 0.85, end: 1.35 },
        { text: "見えた", start: 1.4, end: 2.0 },
        { text: "しかし", start: 2.05, end: 2.55 },
        { text: "記録は", start: 2.6, end: 3.15 },
      ],
    });

    expect(result.words).toHaveLength(5);
    expect(result.words[0].id).toBe("w-0001");
    expect(result.quality).toMatchObject({ removedNoise: 1, passed: true });
  });

  it("rejects an English-only model for Japanese", () => {
    expect(() => validateAndCleanTranscript({
      language: "ja",
      model: "small.en",
      words: [{ text: "記録", start: 0, end: 0.4 }],
    })).toThrow(/English-only model/);
  });

  it("rejects reversed or overlapping timing", () => {
    expect(() => validateAndCleanTranscript({
      language: "en",
      model: "small",
      words: [
        { text: "Follow", start: 0, end: 0.5 },
        { text: "records", start: 0.2, end: 0.8 },
      ],
    })).toThrow(/overlaps or reverses/);
  });
});
