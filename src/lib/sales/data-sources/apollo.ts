import { BaseApiClient, type ApiClientResponse } from "./base-client";

export class ApolloClient extends BaseApiClient {
  constructor() {
    super("apollo", {
      baseUrl: "https://api.apollo.io/v1",
      timeoutMs: 30000,
    });
  }

  public override verifyKeys(): { ready: boolean; missing: string[] } {
    if (!process.env.APOLLO_API_KEY) {
      console.info("[ApolloClient] API key missing, skipping");
      return { ready: false, missing: ["APOLLO_API_KEY"] };
    }
    return { ready: true, missing: [] };
  }

  public async searchOrganizations(query: string, page: number = 1): Promise<ApiClientResponse<any>> {
    const key = process.env.APOLLO_API_KEY;
    if (!key) return { ok: false, error: "Missing APOLLO_API_KEY" };
    return this.fetch<any>("/mixed_companies/search", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      },
      body: JSON.stringify({
        api_key: key,
        q_organization_name: query,
        page,
      })
    });
  }

  public async enrichDomain(domain: string): Promise<ApiClientResponse<any>> {
    const key = process.env.APOLLO_API_KEY;
    if (!key) return { ok: false, error: "Missing APOLLO_API_KEY" };
    return this.fetch<any>(`/organizations/enrich?api_key=${key}&domain=${domain}`, {
      method: "GET"
    });
  }
}

export const apolloApi = new ApolloClient();
