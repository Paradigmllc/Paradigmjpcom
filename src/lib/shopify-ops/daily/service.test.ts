import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  operationsDb: vi.fn(),
  performDailyTask: vi.fn(),
}));
vi.mock("../operations/store", () => mocks);
vi.mock("./tasks", () => mocks);
import { runDailyJob } from "./service";
import { jobNeedsAttention, type DailyJob } from "./model";
let patch: Record<string, unknown>, filters: unknown[];
function database(claim = true) {
  const chain = {
    update: (p: Record<string, unknown>) => {
      patch = p;
      return chain;
    },
    eq: (...args: unknown[]) => {
      filters.push(args);
      return chain;
    },
    select: () => chain,
    single: async () => ({
      data: { kind: "inventory", ...patch },
      error: null,
    }),
  };
  return {
    rpc: vi
      .fn()
      .mockResolvedValue({
        data: claim ? [{ lease_id: "lease", cursor: "next" }] : [],
        error: null,
      }),
    from: () => chain,
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  filters = [];
  patch = {};
  mocks.operationsDb.mockReturnValue(database());
});
it("skips locked or not-due work without provider calls", async () => {
  mocks.operationsDb.mockReturnValue(database(false));
  expect(await runDailyJob("inventory", "actor")).toMatchObject({
    state: "skipped",
  });
  expect(mocks.performDailyTask).not.toHaveBeenCalled();
});
it("resumes the persisted cursor and fences completion to its lease", async () => {
  mocks.performDailyTask.mockResolvedValue({
    state: "succeeded",
    cursor: "page-2",
    summary: { processed: 25 },
    message: null,
  });
  await runDailyJob("inventory", "actor");
  expect(mocks.performDailyTask).toHaveBeenCalledWith(
    "inventory",
    "next",
    "actor",
  );
  expect(filters).toContainEqual(["lease_id", "lease"]);
  expect(patch.cursor).toBe("page-2");
  expect(patch.last_success_at).toBeUndefined();
  expect(patch.lease_id).toBeNull();
});
it("persists failures without erasing progress or leaking provider errors", async () => {
  mocks.performDailyTask.mockRejectedValue(
    new Error("private provider detail"),
  );
  await runDailyJob("inventory", "actor");
  expect(patch.state).toBe("failed");
  expect(patch.cursor).toBeUndefined();
  expect(patch.error_message).not.toContain("private");
});
it("flags expired execution leases and late scheduler runs", () => {
  const job = {
    state: "running",
    started_at: "2026-10-02T00:00:00Z",
    due_at: "2026-10-02T00:00:00Z",
  } as DailyJob;
  expect(jobNeedsAttention(job, Date.parse("2026-10-02T00:06:00Z"))).toBe(true);
  expect(
    jobNeedsAttention(
      { ...job, state: "succeeded" },
      Date.parse("2026-10-02T00:46:00Z"),
    ),
  ).toBe(true);
  expect(
    jobNeedsAttention(
      { ...job, state: "succeeded" },
      Date.parse("2026-10-02T00:05:00Z"),
    ),
  ).toBe(false);
});
