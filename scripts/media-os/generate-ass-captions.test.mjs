import { describe, expect, it } from "vitest";
import { generateAss, groupTranscriptWords } from "./generate-ass-captions.mjs";

const transcript = {
  language: "ja",
  model: "small",
  words: [
    { text: "数字は", start: 0, end: 0.5 },
    { text: "完璧に", start: 0.6, end: 1.1 },
    { text: "見えた。", start: 1.2, end: 1.8 },
    { text: "記録を", start: 2.8, end: 3.3 },
    { text: "追う。", start: 3.4, end: 4.0 },
  ],
};

describe("ASS caption generation", () => {
  it("groups Japanese phrases and preserves stable word IDs", () => {
    const result = groupTranscriptWords(transcript, { profile: "vertical" });

    expect(result.groups).toHaveLength(2);
    expect(result.groups[0]).toMatchObject({ text: "数字は完璧に見えた。", wordIds: ["w-0001", "w-0002", "w-0003"] });
    expect(result.groups[1].wordIds).toEqual(["w-0004", "w-0005"]);
  });

  it("writes trace IDs into ASS Effect fields", () => {
    const result = generateAss(transcript, { profile: "vertical" });

    expect(result.content).toContain("PlayResX: 1080");
    expect(result.content).toContain("mediaos:c-0001:w-0001|w-0002|w-0003");
    expect(result.content).toContain("Noto Sans JP");
  });
});
