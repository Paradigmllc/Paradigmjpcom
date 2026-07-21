import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ManualCompanyProfile } from "./manual-japan-entry-types";

const twenty = vi.hoisted(() => ({
  createTwentyCompanyBase: vi.fn(),
  findTwentyCompanyByDomain: vi.fn(),
  findTwentyCompanyById: vi.fn(),
  patchTwentyCompanyHome: vi.fn(),
}));

vi.mock("./twenty-sync-company-home", () => twenty);

import {
  ManualTwentySyncError,
  syncManualWorkToTwenty,
  twentyLinkMatches,
  twentyNumberMatches,
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
    twenty.findTwentyCompanyById.mockResolvedValue(null);
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
      paradigmNextAction: "フォーム・初回文面を人間確認（未送信）",
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
    let saved: Record<string, unknown> | null = null;
    twenty.findTwentyCompanyById.mockImplementation(async () => saved ?? { id: "company-owned" });
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
    expect(twenty.findTwentyCompanyByDomain).not.toHaveBeenCalled();
    expect(twenty.findTwentyCompanyById).toHaveBeenCalledTimes(2);
  });

  it("fails closed instead of updating a same-domain duplicate when the owned company is missing", async () => {
    twenty.findTwentyCompanyById.mockResolvedValue(null);
    twenty.findTwentyCompanyByDomain.mockResolvedValue({ id: "same-domain-duplicate" });

    await expect(syncManualWorkToTwenty({
      domain: "screenshottocode.com",
      profile,
      formUrl: "https://screenshottocode.com/contact",
      reportUrl: "https://paradigmjp.com/en/work-report/report-1",
      initialMessage: "未送信の初回フォーム文面",
      ownedCompanyId: "company-owned",
    })).rejects.toMatchObject({
      name: "ManualTwentySyncError",
      companyId: "company-owned",
    });
    expect(twenty.findTwentyCompanyByDomain).not.toHaveBeenCalled();
    expect(twenty.patchTwentyCompanyHome).not.toHaveBeenCalled();
  });

  it("updates an existing same-domain Twenty company with /work analysis instead of treating Twenty as the source", async () => {
    let saved: Record<string, unknown> | null = null;
    twenty.findTwentyCompanyByDomain.mockImplementation(async () => saved ?? { id: "company-existing" });
    twenty.patchTwentyCompanyHome.mockImplementation(async (id: string, payload: Record<string, unknown>) => {
      saved = { id, ...payload };
      return { ok: true };
    });

    await expect(syncManualWorkToTwenty({
      domain: "screenshottocode.com",
      profile,
      formUrl: "https://screenshottocode.com/contact",
      reportUrl: "https://paradigmjp.com/en/work-report/report-1",
      initialMessage: "未送信の初回フォーム文面",
    })).resolves.toEqual({ status: "synced", companyId: "company-existing" });
    expect(twenty.createTwentyCompanyBase).not.toHaveBeenCalled();
    expect(twenty.patchTwentyCompanyHome).toHaveBeenCalledWith("company-existing", expect.objectContaining({
      paradigmSourceName: "manual_work",
    }));
  });

  it("persists analyzed review data even when no verified form or approved message exists", async () => {
    let saved: Record<string, unknown> | null = null;
    twenty.findTwentyCompanyByDomain.mockImplementation(async () => saved);
    twenty.patchTwentyCompanyHome.mockImplementation(async (id: string, payload: Record<string, unknown>) => {
      saved = { id, ...payload };
      return { ok: true };
    });

    await expect(syncManualWorkToTwenty({
      domain: "screenshottocode.com",
      profile,
      formUrl: null,
      reportUrl: "https://paradigmjp.com/en/work-report/report-1",
      initialMessage: null,
      readiness: { sendReady: false, reasons: ["A verified public form was not found"] },
    })).resolves.toEqual({ status: "synced", companyId: "company-1" });
    expect(saved).toMatchObject({
      paradigmSalesStatus: "手動確認 / 未対応",
      paradigmDataStatus: "Manual workbench / analyzed / evidence review required",
      paradigmFormUrl: { primaryLinkUrl: "" },
    });
    expect(JSON.stringify(saved)).toContain("A verified public form was not found");
    expect(JSON.stringify(saved)).toContain("No draft passed the production quality gate");
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

  it("preserves a verified CRM country when the current website classification is unconfirmed", async () => {
    const unconfirmedProfile = { ...profile, countryCode: null };
    let saved: Record<string, unknown> = {
      id: "company-existing",
      paradigmCountryName: "米国",
    };
    twenty.findTwentyCompanyByDomain.mockImplementation(async () => saved);
    twenty.patchTwentyCompanyHome.mockImplementation(async (id: string, payload: Record<string, unknown>) => {
      saved = { ...saved, id, ...payload };
      return { ok: true };
    });

    await expect(syncManualWorkToTwenty({
      domain: "usefathom.com",
      profile: unconfirmedProfile,
      formUrl: null,
      reportUrl: "https://paradigmjp.com/en/work-report/fathom",
      initialMessage: null,
      readiness: { sendReady: false, reasons: ["Country remains unconfirmed"] },
    })).resolves.toEqual({ status: "synced", companyId: "company-existing" });
    expect(saved.paradigmCountryName).toBe("米国");
  });
});

describe("manual work Twenty read-back normalization", () => {
  it("accepts Twenty numeric fields returned as JSON numbers or PostgreSQL numeric strings", () => {
    expect(twentyNumberMatches(85, 85)).toBe(true);
    expect(twentyNumberMatches("85", 85)).toBe(true);
    expect(twentyNumberMatches("80.0", 80)).toBe(true);
  });

  it("continues to fail closed for missing, malformed, or different scores", () => {
    expect(twentyNumberMatches(null, 85)).toBe(false);
    expect(twentyNumberMatches("85 points", 85)).toBe(false);
    expect(twentyNumberMatches("84", 85)).toBe(false);
  });

  it("normalizes only harmless URL representation differences during read-back", () => {
    expect(
      twentyLinkMatches(
        "https://abcduparfum.fr/contact",
        "https://abcduparfum.fr/contact/",
      ),
    ).toBe(true);
    expect(
      twentyLinkMatches(
        "https://abcduparfum.fr:443/contact#form",
        "https://ABCduparfum.fr/contact/",
      ),
    ).toBe(true);
    expect(
      twentyLinkMatches(
        "https://abcduparfum.fr/contact-us",
        "https://abcduparfum.fr/contact/",
      ),
    ).toBe(false);
  });
});
