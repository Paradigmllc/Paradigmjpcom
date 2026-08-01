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
    // PageSpeed is usable without a key, so we always mark it as ready.
    return { ready: true, missing: [] };
  }

  public async run(url: string, strategy: "mobile" | "desktop" = "mobile"): Promise<ApiClientResponse<PsiResultData>> {
    const runFetch = async (useKey: boolean): Promise<ApiClientResponse<PsiResultData>> => {
      const params = new URLSearchParams({ url, strategy, category: "performance" });
      const rawKey = process.env.GOOGLE_PSI_API_KEY?.trim()
      const key = rawKey ? rawKey.replace(/^'|'$/g, "").trim() : null
      if (useKey && key) {
        params.set("key", key);
      }

      const rawUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`;
      try {
        const res = await fetch(rawUrl, { signal: AbortSignal.timeout(60000) });
        if (!res.ok) {
          const text = await res.text().catch(() => "Unknown error");
          return { ok: false, statusCode: res.status, error: `PageSpeed API error ${res.status}: ${text}` };
        }
        const data = await res.json();
        const score = data?.lighthouseResult?.categories?.performance?.score;
        return {
          ok: true,
          statusCode: res.status,
          data: {
            performance: typeof score === "number" ? Math.round(score * 100) : null,
            https: url.startsWith("https"),
          },
        };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Network error" };
      }
    };

    const hasKey = !!process.env.GOOGLE_PSI_API_KEY && process.env.GOOGLE_PSI_API_KEY.replace(/^'|'$/g, "").trim() !== "";

    // Try with key first
    if (hasKey) {
      const keyedResult = await runFetch(true);
      if (keyedResult.ok) {
        return keyedResult;
      }
      console.warn(`[PageSpeedClient] Keyed request failed (status: ${keyedResult.statusCode}, error: ${keyedResult.error}). Retrying with keyless fallback...`);
    }

    // Try keyless fallback
    const keylessResult = await runFetch(false);
    if (!keylessResult.ok) {
      console.error(`[PageSpeedClient] Keyless request failed: ${keylessResult.error}`);
    }
    return keylessResult;
  }
}

export const pageSpeedApi = new PageSpeedClient();
