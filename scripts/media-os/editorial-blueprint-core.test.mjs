import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { generateEditorialBlueprint, loadEditorialDna } from "./editorial-blueprint-core.mjs";
import { evaluateEditorialBlueprint } from "./editorial-quality-core.mjs";

const dna = loadEditorialDna(resolve("config/editorial-dna.json"));
const input = {
  episodeId: "episode-quality-test",
  episodeNumber: 1,
  channelId: "channel-ledger-ja",
  title: "品質検証用エピソード",
  language: "ja",
  riskLevel: "medium",
  targetMinutes: 15,
  thesis: "異なる記録を照合すると、表面的な数字では説明できない意思決定と制度上の仕組みが見えてくる。",
  keyQuestion: "どの仕組みが公表された結果と実態の差を維持し、どの記録によってその差を検証できるのか。",
  counterpoint: "複雑さそのものを不正の証拠とはせず、別の説明可能性と反対資料も同じ基準で検討する。",
  takeaway: "個別事件の印象論ではなく、現金・統治・開示・反証可能性を再利用可能な検証手順として残す。",
  claims: [
    { id: "claim-a", status: "confirmed", sourceTitle: "Primary source A", locator: "section 1" },
    { id: "claim-b", status: "alleged", sourceTitle: "Primary source B", locator: "section 2" }
  ]
};

describe("editorial blueprint", () => {
  it("defines unique editorial DNA for twelve bilingual channels", () => {
    expect(dna.channels).toHaveLength(12);
    expect(new Set(dna.channels.map((profile) => profile.signature)).size).toBe(12);
    expect(dna.channels.filter((profile) => profile.language === "ja")).toHaveLength(6);
    expect(dna.channels.filter((profile) => profile.language === "en")).toHaveLength(6);
  });

  it("generates a deterministic 10-20 minute source-linked blueprint", () => {
    const first = generateEditorialBlueprint(input, dna);
    const second = generateEditorialBlueprint(input, dna);
    expect(first).toEqual(second);
    expect(first.targetDurationSeconds).toBe(900);
    expect(first.scenes).toHaveLength(14);
    expect(first.scenes.every((scene) => scene.visualElements.length >= 8)).toBe(true);
    expect(first.scenes.filter((scene) => scene.claimIds.length > 0).every((scene) => scene.sourceLocator)).toBe(true);
  });

  it("passes the uncompromising quality gate for an authored blueprint", () => {
    const blueprint = generateEditorialBlueprint(input, dna);
    const report = evaluateEditorialBlueprint(blueprint);
    expect(report.status).toBe("pass");
    expect(report.score).toBe(100);
    expect(report.threshold).toBe(92);
  });

  it("blocks synthetic expert personas and realistic undisclosed media", () => {
    const blueprint = generateEditorialBlueprint(input, dna);
    blueprint.syntheticMedia.syntheticExpertPersonaAllowed = true;
    blueprint.syntheticMedia.visualReality = "photorealistic_generated_scene";
    const report = evaluateEditorialBlueprint(blueprint);
    expect(report.status).toBe("blocked");
    expect(report.blockers.map((blocker) => blocker.id)).toEqual(expect.arrayContaining([
      "no_synthetic_expert_persona",
      "synthetic_disclosure_consistency"
    ]));
  });

  it("blocks a structurally duplicated peer even when the episode id differs", () => {
    const blueprint = generateEditorialBlueprint(input, dna);
    const duplicate = structuredClone(blueprint);
    duplicate.episodeId = "episode-duplicate";
    const report = evaluateEditorialBlueprint(blueprint, [duplicate]);
    expect(report.status).toBe("blocked");
    expect(report.nearestPeer?.similarity).toBe(1);
  });

  it("keeps all 24 Wave A structures below the portfolio similarity ceiling", () => {
    const blueprints = dna.channels.flatMap((profile) => [1, 2].map((episodeNumber) => generateEditorialBlueprint({
      ...input,
      episodeId: `${profile.channelId}-wave-a-${episodeNumber}`,
      episodeNumber,
      channelId: profile.channelId,
      title: `${profile.signature} ${episodeNumber}`,
      language: profile.language,
    }, dna)));
    const similarities = blueprints.flatMap((left, leftIndex) => blueprints
      .slice(leftIndex + 1)
      .map((right) => evaluateEditorialBlueprint(left, [right]).nearestPeer?.similarity ?? 0));
    expect(Math.max(...similarities)).toBeLessThan(0.58);
  });
});
