import { BaseApiClient, type ApiClientResponse } from "./base-client";

export class SecurityTrailsClient extends BaseApiClient {
  constructor() {
    super("security_apis", { // Using the registry slug
      baseUrl: "https://api.securitytrails.com/v1",
      timeoutMs: 20000,
    });
  }

  public override verifyKeys(): { ready: boolean; missing: string[] } {
    if (!process.env.SECURITYTRAILS_API_KEY) {
      console.info("[SecurityTrailsClient] API key missing, skipping");
      return { ready: false, missing: ["SECURITYTRAILS_API_KEY"] };
    }
    return { ready: true, missing: [] };
  }

  public async getDomainDetails(domain: string): Promise<ApiClientResponse<any>> {
    const key = process.env.SECURITYTRAILS_API_KEY;
    if (!key) return { ok: false, error: "Missing SECURITYTRAILS_API_KEY" };
    return this.fetch<any>(`/domain/${domain}`, {
      headers: { APIKEY: key },
    });
  }

  public async getSubdomains(domain: string): Promise<ApiClientResponse<any>> {
    const key = process.env.SECURITYTRAILS_API_KEY;
    if (!key) return { ok: false, error: "Missing SECURITYTRAILS_API_KEY" };
    return this.fetch<any>(`/domain/${domain}/subdomains`, {
      headers: { APIKEY: key },
    });
  }
}

export const securityTrailsApi = new SecurityTrailsClient();
