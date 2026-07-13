import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getServiceSalesSupabase: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  getServiceSalesSupabase: mocks.getServiceSalesSupabase,
}));
vi.mock("./enrichment-jobs-runner", () => ({
  recoverStaleEnrichmentJobs: vi.fn(),
  runEnrichmentJobs: vi.fn(),
}));
vi.mock("./host-admission", () => ({
  shouldDeferHeavyDispatch: vi.fn().mockResolvedValue(false),
}));

import { enqueueJapanEntryReportBatch } from "./enrichment-jobs";

function resolvedBuilder(result: unknown) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "in", "eq", "order", "limit", "insert"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return builder;
}

beforeEach(() => vi.clearAllMocks());

describe("enqueueJapanEntryReportBatch", () => {
  it("accepts 100 companies in two batch queries without N+1 lookups", async () => {
    const ids = Array.from(
      { length: 100 },
      (_, index) =>
        `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    );
    const activeQuery = resolvedBuilder({ data: [], error: null });
    const insertedRows = ids.map((company_id, index) => ({
      id: `job-${index}`,
      company_id,
      job_type: "japan_entry_report",
      status: "queued",
    }));
    const insertQuery = resolvedBuilder({ data: insertedRows, error: null });
    const from = vi
      .fn()
      .mockReturnValueOnce(activeQuery)
      .mockReturnValueOnce(insertQuery);
    mocks.getServiceSalesSupabase.mockReturnValue({ from });

    const result = await enqueueJapanEntryReportBatch({
      targets: ids.map((companyId) => ({
        companyId,
        payload: { sending_enabled: false },
      })),
      triggeredBy: "test",
    });

    expect(result.ok).toBe(true);
    expect(result.queued).toHaveLength(100);
    expect(result.reused).toHaveLength(0);
    expect(from).toHaveBeenCalledTimes(2);
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          company_id: ids[0],
          job_type: "japan_entry_report",
          input_payload: { sending_enabled: false },
        }),
      ]),
    );
  });

  it("reuses an active company job instead of creating a duplicate", async () => {
    const active = {
      id: "job-existing",
      company_id: "00000000-0000-4000-8000-000000000001",
      job_type: "japan_entry_report",
      status: "running",
    };
    const activeQuery = resolvedBuilder({ data: [active], error: null });
    const from = vi.fn().mockReturnValue(activeQuery);
    mocks.getServiceSalesSupabase.mockReturnValue({ from });

    const result = await enqueueJapanEntryReportBatch({
      targets: [{ companyId: active.company_id, payload: {} }],
      triggeredBy: "test",
    });

    expect(result.queued).toHaveLength(0);
    expect(result.reused).toEqual([active]);
    expect(from).toHaveBeenCalledTimes(1);
  });
});
