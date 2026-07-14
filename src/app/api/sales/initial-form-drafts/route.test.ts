import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  generate: vi.fn(),
  list: vi.fn(),
  notify: vi.fn(),
}));

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }));
vi.mock("@/lib/sales/initial-form-draft", () => ({
  generateInitialFormDraftBatch: mocks.generate,
  listInitialFormDrafts: mocks.list,
}));
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }));

import { GET, POST } from "./route";

const runId = "2253338a-e7a2-41e3-a0d8-31634b0213a0";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authorize.mockResolvedValue(true);
  mocks.notify.mockResolvedValue({ ok: true });
  mocks.list.mockResolvedValue([]);
  mocks.generate.mockResolvedValue({ ok: true, requested: 2, generated: 2, failed: 0, sent: 0, results: [] });
});
describe("initial form draft route", () => {
  it("requires explicit run or company IDs and returns a structurally zero-send result", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/initial-form-drafts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ runIds: [runId], limit: 40 }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ runIds: [runId], force: false }));
    expect(payload.sent).toBe(0);
    expect(mocks.notify).toHaveBeenCalledWith("sales", expect.objectContaining({ type: "initial_form_drafts_generated" }));
  });

  it("rejects implicit all-company generation", async () => {
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/initial-form-drafts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ limit: 40 }),
    }));

    expect(response.status).toBe(400);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("lists review drafts for one explicit run", async () => {
    const response = await GET(new NextRequest(`https://paradigmjp.com/api/sales/initial-form-drafts?runId=${runId}`));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith(runId, 100);
    expect(payload.sent).toBe(0);
  });
});
