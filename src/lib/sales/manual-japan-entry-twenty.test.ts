import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ManualCompanyProfile } from "./manual-japan-entry-types";

const twenty = vi.hoisted(() => ({
  createTwentyCompanyBase: vi.fn(),
  findTwentyCompanyByDomain: vi.fn(),
  patchTwentyCompanyHome: vi.fn(),
}));

vi.mock("./twenty-sync-company-home", () => twenty);

import {
  ManualTwentySyncError,
  syncManualWorkToTwenty,
} from "./manual-japan-entry-twenty";

const profile: ManualCompanyProfile = {
  companyName: "Screenshot to Code",
  countryCode: "US",
  isJapaneseCompany: false,
  smbStatus: "qualified",
  smbConfidence: 83,
  smbEvidence: ["Public software product"],
  japanEntryFitStatus: "qualified",
  japanEntryFitConfidence: 78,
  japanEntryFitEvidence: ["Online product"],
  businessModel: "saas",
  industry: "Technology / IT",
  productContext: "AI-powered screenshot-to-code software for product teams.",
  observedFacts: ["Screenshot-to-code software"],
  outreachPlaybook: "saas_ai_devtools",
  positioningConcept: null,
};

describe("manual work Twenty persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    twenty.createTwentyCompanyBase.mockResolvedValue({ id: "company-1" });
  });

  it("returns synced only after URLs and the complete initial message are readable from Twenty", async () => {
    let saved: Record<string, unknown> | null = null;
    twenty.findTwentyCompanyByDomain.mockImplementation(async () => saved);
    twenty.patchTwentyCompanyHome.mockImplementation(
      async (id: string, payload: Record<string, unknown>) => {
        saved = { id, ...payload };
        return { ok: true };
      },
    );

    const result = await syncManualWorkToTwenty({
      domain: "screenshottocode.com",
      profile,
      formUrl: "https://screenshottocode.com/contact",
      reportUrl: "https://paradigmjp.com/en/opportunity/screenshottocode",
      initialMessage:
        "Screenshot to Code向けに作成した、未送信の初回フォーム文面です。",
    });

    expect(result).toEqual({ status: "synced", companyId: "company-1" });
    expect(JSON.stringify(saved)).toContain("未送信の初回フォーム文面");
    expect(saved).toMatchObject({
      paradigmSalesStatus: "手動確認 / 未対応",
      paradigmNextAction: "初回文面を人間確認（未送信）",
      paradigmFormUrl: {
        primaryLinkUrl: "https://screenshottocode.com/contact",
      },
      paradigmReportUrl: {
        primaryLinkUrl:
          "https://paradigmjp.com/en/opportunity/screenshottocode",
      },
    });
  });

  it("fails closed when Twenty acknowledges the patch but does not persist the draft summary", async () => {
    let call = 0;
    twenty.findTwentyCompanyByDomain.mockImplementation(async () => {
      call += 1;
      if (call === 1) return null;
      return {
        id: "company-1",
        name: profile.companyName,
        paradigmFormUrl: {
          primaryLinkUrl: "https://screenshottocode.com/contact",
        },
        paradigmReportUrl: {
          primaryLinkUrl:
            "https://paradigmjp.com/en/opportunity/screenshottocode",
        },
      };
    });
    twenty.patchTwentyCompanyHome.mockResolvedValue({ ok: true });

    const result = syncManualWorkToTwenty({
      domain: "screenshottocode.com",
      profile,
      formUrl: "https://screenshottocode.com/contact",
      reportUrl: "https://paradigmjp.com/en/opportunity/screenshottocode",
      initialMessage: "未送信の初回フォーム文面",
    });
    await expect(result).rejects.toThrow("Twenty保存確認に失敗しました");
    await expect(result).rejects.toMatchObject({
      name: "ManualTwentySyncError",
      companyId: "company-1",
    });
  });

  it("reuses the owned partial company instead of creating a duplicate", async () => {
    let call = 0;
    let saved: Record<string, unknown> | null = null;
    twenty.findTwentyCompanyByDomain.mockImplementation(async () => {
      call += 1;
      return call === 1 ? { id: "company-owned" } : saved;
    });
    twenty.patchTwentyCompanyHome.mockImplementation(
      async (id: string, payload: Record<string, unknown>) => {
        saved = { id, ...payload };
        return { ok: true };
      },
    );

    await expect(
      syncManualWorkToTwenty({
        domain: "screenshottocode.com",
        profile,
        formUrl: "https://screenshottocode.com/contact",
        reportUrl: "https://paradigmjp.com/en/opportunity/screenshottocode",
        initialMessage: "未送信の初回フォーム文面",
        ownedCompanyId: "company-owned",
      }),
    ).resolves.toEqual({ status: "synced", companyId: "company-owned" });
    expect(twenty.createTwentyCompanyBase).not.toHaveBeenCalled();
  });

  it("keeps the created company id when the live read-back request fails", async () => {
    twenty.findTwentyCompanyByDomain
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("Twenty temporarily unavailable"));
    twenty.patchTwentyCompanyHome.mockResolvedValue({ ok: true });

    const result = syncManualWorkToTwenty({
      domain: "screenshottocode.com",
      profile,
      formUrl: "https://screenshottocode.com/contact",
      reportUrl: "https://paradigmjp.com/en/opportunity/screenshottocode",
      initialMessage: "未送信の初回フォーム文面",
    });
    await expect(result).rejects.toBeInstanceOf(ManualTwentySyncError);
    await expect(result).rejects.toMatchObject({ companyId: "company-1" });
  });
});
