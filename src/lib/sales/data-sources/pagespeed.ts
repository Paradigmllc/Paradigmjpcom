import { BaseApiClient, type ApiClientResponse } from "./base-client";

export interface PsiResultData {
  performance: number | null;
  https: boolean;
}

export class PageSpeedClient extends BaseApiClient {
  constructor() {
    super("pagespeed", {
      baseUrl: "https://www.googleapis.com/pagespeedonline/v5",
      timeoutMs: 60000,
    });
  }

  public override verifyKeys(): { ready: boolean; missing: string[] } {
    // PageSpeed is technically usable without key, but for high volume we need it.
    // To respect the registry "recommended: true" and allow low-volume fallback:
    if (!process.env.GOOGLE_PSI_API_KEY) {
      console.info("[PageSpeedClient] Running without API key (rate limits apply)");
    }
    return { ready: true, missing: [] };
  }

  public async run(url: string, strategy: "mobile" | "desktop" = "mobile"): Promise<ApiClientResponse<PsiResultData>> {
    const params = new URLSearchParams({ url, strategy, category: "performance" });
    if (process.env.GOOGLE_PSI_API_KEY) {
      params.set("key", process.env.GOOGLE_PSI_API_KEY);
    }

    const res = await this.fetch<any>(`/runPagespeed?${params.toString()}`);
    if (!res.ok) {
      return { ok: false, error: res.error, statusCode: res.statusCode };
    }

    const score = res.data?.lighthouseResult?.categories?.performance?.score;
    return {
      ok: true,
      statusCode: res.statusCode,
      data: {
        performance: typeof score === "number" ? Math.round(score * 100) : null,
        https: url.startsWith("https"),
      },
    };
  }
}

export const pageSpeedApi = new PageSpeedClient();
