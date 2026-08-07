import { describe, expect, it } from "vitest";
import { buildResearchManifest, canonicalPublicUrl, sourceRequests } from "./research-ingest-core.mjs";

const evidence = {
  episodeId: "episode-test-en",
  claims: [
    { id: "c1", sourceTitle: "Official", sourceUrl: "https://example.gov/report#one", locator: "section one" },
    { id: "c2", sourceTitle: "Official", sourceUrl: "https://example.gov/report", locator: "section two" },
  ],
};

describe("research ingestion", () => {
  it("deduplicates source URLs while retaining claim locators", () => {
    const requests = sourceRequests(evidence);
    expect(requests).toHaveLength(1);
    expect(requests[0].claimIds).toEqual(["c1", "c2"]);
  });

  it("blocks non-public research targets", () => {
    expect(() => canonicalPublicUrl("http://example.com")).toThrow(/HTTPS/);
    expect(() => canonicalPublicUrl("https://127.0.0.1/private")).toThrow(/private/);
  });

  it("builds a hashed provenance manifest", () => {
    const markdown = "Government report evidence ".repeat(20);
    const manifest = buildResearchManifest({
      evidencePack: evidence,
      retrievedAt: "2026-08-03T00:00:00.000Z",
      crawlPayload: { results: [{ url: "https://example.gov/report", success: true, markdown }] },
    });
    expect(manifest.documentCount).toBe(1);
    expect(manifest.documents[0].contentSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.documents[0].claimIds).toHaveLength(2);
  });
});
