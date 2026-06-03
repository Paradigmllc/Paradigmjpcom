import { BaseApiClient, type ApiClientResponse } from "./base-client";
import type { SearxngSearchInput } from "../searxng-source";

interface SearxngResultItem {
  url: string;
  title: string;
  content: string;
  engine: string;
  category: string;
  score: number;
}

interface SearxngPayload {
  query: string;
  number_of_results: number;
  results: SearxngResultItem[];
  unresponsive_engines?: string[];
  suggestions?: string[];
}

export class SearxngClient extends BaseApiClient {
  constructor() {
    const baseUrl = process.env.SEARXNG_BASE_URL
    if (!baseUrl || baseUrl.trim().length === 0) {
      console.warn("[SearxngClient] SEARXNG_BASE_URL is not configured")
    }
    super("searxng_source", {
      baseUrl: baseUrl?.trim() ?? "",
      timeoutMs: 18000,
    });
    // Fallback logic for slug to match registry
    this.integrationSlug = "searxng"; // Actually the registry doesn't have searxng defined explicitly, wait, it might be in another file or implied. Let's use the env check manually if needed.
  }

  public override verifyKeys(): { ready: boolean; missing: string[] } {
    const missing = [];
    if (!process.env.SEARXNG_BASE_URL) missing.push("SEARXNG_BASE_URL");
    
    if (missing.length > 0) {
      console.warn(`[SearxngClient] Missing env variables: ${missing.join(", ")}`);
      return { ready: false, missing };
    }
    return { ready: true, missing: [] };
  }

  public async search(input: SearxngSearchInput, page: number = 1): Promise<ApiClientResponse<SearxngPayload>> {
    const params = new URLSearchParams({
      q: input.query,
      format: "json",
      pageno: page.toString(),
    });

    if (input.language) params.set("language", input.language);
    if (input.engines && input.engines.length > 0) params.set("engines", input.engines.join(","));
    if (input.categories && input.categories.length > 0) params.set("categories", input.categories.join(","));
    if (typeof input.safesearch === "number") params.set("safesearch", input.safesearch.toString());
    if (input.timeRange) params.set("time_range", input.timeRange);

    return this.fetch<SearxngPayload>(`/search?${params.toString()}`);
  }
}

export const searxngApi = new SearxngClient();
