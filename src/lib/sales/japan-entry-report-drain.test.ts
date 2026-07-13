import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getServiceSalesSupabase: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  getServiceSalesSupabase: mocks.getServiceSalesSupabase,
}));

import {
  claimJapanEntryReportDrain,
  dispatchJapanEntryReportDrain,
  releaseJapanEntryReportDrain,
} from "./japan-entry-report-drain";

beforeEach(() => vi.clearAllMocks());

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Japan Entry report drain", () => {
  it("claims and releases the singleton lease with the same drain ID", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: true, error: null });
    mocks.getServiceSalesSupabase.mockReturnValue({ rpc });
    const drainId = "00000000-0000-4000-8000-000000000001";

    await expect(claimJapanEntryReportDrain(drainId)).resolves.toEqual({
      ok: true,
      claimed: true,
    });
    await releaseJapanEntryReportDrain(drainId);

    expect(rpc).toHaveBeenNthCalledWith(1, "claim_japan_entry_report_drain", {
      p_owner: drainId,
      p_lease_seconds: 600,
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "release_japan_entry_report_drain", {
      p_owner: drainId,
    });
  });

  it("dispatches one authenticated event without exposing the secret in the body", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://paradigmjp.com");
    vi.stubEnv("TRIGGER_WEBHOOK_SECRET", "test-secret");
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response("{}", { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const drainId = "00000000-0000-4000-8000-000000000002";

    await expect(
      dispatchJapanEntryReportDrain({ drainId, limit: 3 }),
    ).resolves.toEqual({ ok: true, status: 200 });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    if (!init) throw new Error("fetch init was not provided");
    expect(url).toBe(
      "https://paradigmjp.com/api/sales/opportunity-briefs/batch",
    );
    expect(init.headers).toEqual(
      expect.objectContaining({ "x-webhook-secret": "test-secret" }),
    );
    expect(init.body).toBe(
      JSON.stringify({ limit: 3, drainId, automated: true }),
    );
    expect(String(init.body)).not.toContain("test-secret");
  });

  it("fails closed when the webhook secret is unavailable", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://paradigmjp.com");
    vi.stubEnv("TRIGGER_WEBHOOK_SECRET", "");
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    const result = await dispatchJapanEntryReportDrain({
      drainId: "00000000-0000-4000-8000-000000000003",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("TRIGGER_WEBHOOK_SECRET");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
