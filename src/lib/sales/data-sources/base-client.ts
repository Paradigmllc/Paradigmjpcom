import { toast } from "sonner";
import { getSalesIntegrationDefinitions } from "../integration-registry";

export interface ApiClientConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface ApiClientResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

/**
 * Base client for all 40+ API integrations.
 * Ensures robust error handling, timeout management, and prevents silent failures.
 */
export class BaseApiClient {
  protected integrationSlug: string;
  protected config: ApiClientConfig;

  constructor(integrationSlug: string, config: ApiClientConfig = {}) {
    this.integrationSlug = integrationSlug;
    this.config = {
      timeoutMs: 15000,
      ...config,
    };
  }

  /**
   * Verifies that the required environment variables for this API are present.
   */
  public verifyKeys(): { ready: boolean; missing: string[] } {
    const definitions = getSalesIntegrationDefinitions();
    const def = definitions.find((d) => d.slug === this.integrationSlug);
    
    if (!def) {
      console.warn(`[BaseApiClient] Integration definition not found for slug: ${this.integrationSlug}`);
      return { ready: true, missing: [] };
    }

    const requiredKeys = def.requiredEnv || [];
    const missing = requiredKeys.filter((key) => !process.env[key] || process.env[key].trim() === "");

    if (missing.length > 0) {
      const msg = `[${def.displayName}] Missing API Keys: ${missing.join(", ")}`;
      console.error(msg);
      // We don't throw here to prevent app crashes, but we mark it as not ready.
      return { ready: false, missing };
    }

    return { ready: true, missing: [] };
  }

  /**
   * Executes a robust fetch request with timeout and error wrapping.
   * NEVER swallows errors silently (Rule 1).
   */
  protected async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiClientResponse<T>> {
    const { ready, missing } = this.verifyKeys();
    if (!ready) {
      const errorMsg = `Cannot execute request: Missing API keys [${missing.join(", ")}]`;
      toast.error(errorMsg);
      console.error(`[BaseApiClient:${this.integrationSlug}] ${errorMsg}`);
      return { ok: false, error: errorMsg };
    }

    const url = this.config.baseUrl ? `${this.config.baseUrl}${endpoint}` : endpoint;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          ...this.config.headers,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text().catch(() => "Unknown error");
        const errorMsg = `API Error (${res.status}): ${errorText.substring(0, 200)}`;
        console.error(`[BaseApiClient:${this.integrationSlug}] ${errorMsg}`);
        
        // Log to toast if it's a critical server error, else just console
        if (res.status >= 500 || res.status === 401 || res.status === 403) {
          toast.error(`[${this.integrationSlug}] API Error: ${res.status}`);
        }

        return { ok: false, statusCode: res.status, error: errorMsg };
      }

      // Handle empty 204 No Content
      if (res.status === 204) {
        return { ok: true, statusCode: res.status };
      }

      const data = (await res.json()) as T;
      return { ok: true, statusCode: res.status, data };
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      
      const isAbort = error instanceof Error && error.name === "AbortError";
      const errorMsg = isAbort 
        ? `Request timeout after ${this.config.timeoutMs}ms` 
        : error instanceof Error ? error.message : "Unknown network error";

      console.error(`[BaseApiClient:${this.integrationSlug}] Exception:`, error);
      toast.error(`[${this.integrationSlug}] ${errorMsg}`);

      return { ok: false, error: errorMsg };
    }
  }
}
