import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateEditorialBlueprint, jaccardSimilarity, loadEditorialDna } from "./editorial-blueprint-core.mjs";

function planningInput(profile, episodeNumber) {
  const language = profile.language;
  return {
    episodeId: `${profile.channelId}-wave-a-${episodeNumber}`,
    episodeNumber,
    channelId: profile.channelId,
    title: `${profile.signature} research candidate ${episodeNumber}`,
    language,
    riskLevel: "medium",
    targetMinutes: 12 + ((episodeNumber + profile.signature.length) % 5),
    thesis: language === "ja"
      ? `${profile.editorialPromise}という約束を、候補テーマ固有の因果関係と一次資料で検証するための編集仮説である。`
      : `This planning thesis tests the channel promise through a case-specific mechanism, primary records, and an original editorial conclusion.`,
    keyQuestion: language === "ja"
      ? `この候補事件で、結果を生んだ仕組みと制度上の境界は何だったのかを一次資料から特定できるか。`
      : `Which mechanism and institutional boundary produced the outcome, and can primary records establish it?`,
    counterpoint: language === "ja"
      ? `単一原因や人物像に還元せず、反対資料と別の説明可能性を本編内で同じ強度で検討する。`
      : `The episode must test competing explanations and cannot reduce the outcome to one person or one cause.`,
    takeaway: language === "ja"
      ? `視聴者が別の事件にも適用できる検証手順を、固有の証拠と限界を示しながら提示する。`
      : `The conclusion must give viewers a reusable method while preserving the evidence limits unique to the case.`,
    claims: [
      { id: `${profile.channelId}-${episodeNumber}-claim-a`, status: "confirmed", sourceTitle: `primary source A ${episodeNumber}`, locator: "planning locator A" },
      { id: `${profile.channelId}-${episodeNumber}-claim-b`, status: "alleged", sourceTitle: `primary source B ${episodeNumber}`, locator: "planning locator B" }
    ]
  };
}

function main() {
  const dna = loadEditorialDna(resolve("config/editorial-dna.json"));
  const blueprints = dna.channels.flatMap((profile) => [1, 2].map((episodeNumber) => generateEditorialBlueprint(planningInput(profile, episodeNumber), dna)));
  const pairs = [];
  for (let left = 0; left < blueprints.length; left += 1) {
    for (let right = left + 1; right < blueprints.length; right += 1) {
      pairs.push({
        left: blueprints[left].episodeId,
        right: blueprints[right].episodeId,
        sameChannel: blueprints[left].channelId === blueprints[right].channelId,
        similarity: jaccardSimilarity(blueprints[left], blueprints[right])
      });
    }
  }
  pairs.sort((a, b) => b.similarity - a.similarity);
  const threshold = 0.58;
  const failures = pairs.filter((pair) => pair.similarity >= threshold);
  const report = {
    version: dna.version,
    planningOnly: true,
    productionReady: false,
    reason: "Topic candidates still require source ingestion and claim review.",
    blueprintCount: blueprints.length,
    pairCount: pairs.length,
    threshold,
    maxSimilarity: pairs[0]?.similarity ?? 0,
    nearestPairs: pairs.slice(0, 12),
    failures,
    status: failures.length === 0 ? "pass" : "blocked"
  };
  const output = resolve("renders/editorial/portfolio-variation-report.json");
  mkdirSync(resolve("renders/editorial"), { recursive: true });
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ output, status: report.status, blueprintCount: report.blueprintCount, maxSimilarity: report.maxSimilarity, failures: failures.length })}\n`);
  if (failures.length > 0) process.exitCode = 1;
}

main();
