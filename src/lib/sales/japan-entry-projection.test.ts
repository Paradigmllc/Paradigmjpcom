import { describe, expect, it } from "vitest";
import {
  buildJapanEntryProjection,
  calculateJapanEntryScenario,
} from "./japan-entry-projection";
import type { MarketVisibilityIndex } from "./market-visibility";

const visibility: MarketVisibilityIndex = {
  version: "public-signals-v1",
  index: 63,
  band: "top-100k",
  bestRank: 52_000,
  countrySignals: [
    { countryCode: "US", signal: "ccTLD", value: ".us", confidence: 0.72 },
  ],
  evidence: [
    {
      id: "tranco-rank",
      label: "Tranco domain rank",
      value: "#52,000",
      source: "Tranco",
      sourceUrl: "https://tranco-list.eu/query?domain=example.com",
      observedAt: "2026-07-13T00:00:00.000Z",
      confidence: 0.7,
      limitation: "Public proxy only; not first-party visits or revenue.",
    },
  ],
  unknowns: [],
  actualMonthlyVisits: null,
  actualRevenue: null,
};

describe("Japan Entry opportunity projection", () => {
  it("produces market estimates and 6/12/24 base horizons", () => {
    const projection = buildJapanEntryProjection({
      companyName: "Example",
      domain: "example.com",
      targetCountry: "US",
      visibility,
      observedAt: "2026-07-13T00:00:00.000Z",
    });
    const base = projection.scenarios.find(
      (scenario) => scenario.scenario === "base",
    );

    expect(projection.estimatedMonthlyVisits).toBe(130_000);
    expect(
      projection.markets.reduce(
        (sum, market) => sum + market.estimatedMonthlyVisits,
        0,
      ),
    ).toBeCloseTo(130_000, -1);
    expect(base?.horizons.map((item) => item.horizon)).toEqual([6, 12, 24]);
    expect(base?.horizons[0].cumulativeCostUsd).toBe(12_000);
    expect(base?.horizons[1].cumulativeCostUsd).toBe(12_000);
    expect(base?.horizons[2].cumulativeCostUsd).toBe(12_000);
  });

  it("keeps every number explicitly modeled and leaves actual traffic unknown", () => {
    const projection = buildJapanEntryProjection({
      companyName: "Example",
      domain: "example.com",
      visibility,
    });
    expect(projection.classification).toBe("modeled-estimate");
    expect(
      projection.evidence.some((item) => item.classification === "estimated"),
    ).toBe(true);
    expect(visibility.actualMonthlyVisits).toBeNull();
    expect(visibility.actualRevenue).toBeNull();
  });

  it("refuses to create traffic estimates without public rank evidence", () => {
    expect(() =>
      buildJapanEntryProjection({
        companyName: "Unknown",
        domain: "unknown.example",
        visibility: { ...visibility, band: "not-observed", bestRank: null },
      }),
    ).toThrow("Public rank evidence is required");
  });

  it("recalculates sensitivity without mutating the persisted base model", () => {
    const projection = buildJapanEntryProjection({
      companyName: "Example",
      domain: "example.com",
      visibility,
    });
    const baseline = projection.scenarios.find(
      (scenario) => scenario.scenario === "base",
    )?.horizons[1];
    const adjusted = calculateJapanEntryScenario(
      projection.estimatedMonthlyVisits,
      {
        ...projection.assumptions,
        averageOrderValueUsd: projection.assumptions.averageOrderValueUsd * 1.5,
      },
      "base",
    ).horizons[1];

    expect(adjusted.cumulativeGrossProfitUsd).toBeGreaterThan(
      baseline?.cumulativeGrossProfitUsd ?? 0,
    );
    expect(adjusted.cumulativeCostUsd).toBe(baseline?.cumulativeCostUsd);
    expect(projection.assumptions.averageOrderValueUsd).toBe(110);
  });
});
