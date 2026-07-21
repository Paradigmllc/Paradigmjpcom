import type { CompanyKarteSnapshot } from "@/lib/sales/company-karte";
import { twentyCompanyHomePayload } from "./twenty-sync-summaries";
import {
  domainMatches,
  twentyFetch,
  type TwentyListResponse,
  type TwentyMutationResponse,
  type TwentyRecord,
} from "./twenty-sync-utils";

export async function findTwentyCompany(
  karte: CompanyKarteSnapshot,
): Promise<TwentyRecord | null> {
  return findTwentyCompanyByDomain(karte.domain);
}

export async function findTwentyCompanyByDomain(
  domain: string,
): Promise<TwentyRecord | null> {
  const query = `limit=100&filter=domainName.primaryLinkUrl[ilike]:%25${encodeURIComponent(domain)}%25`;
  const result = await twentyFetch<TwentyListResponse<TwentyRecord>>(
    `/rest/companies?${query}`,
  );
  if (!result.ok) throw new Error(result.error);
  return (
    result.data.data?.companies?.find((company) =>
      domainMatches(company, domain),
    ) ?? null
  );
}

export async function findTwentyCompanyById(
  twentyCompanyId: string,
): Promise<TwentyRecord | null> {
  const result = await twentyFetch<TwentyMutationResponse>(
    `/rest/companies/${encodeURIComponent(twentyCompanyId)}`,
  );
  if (!result.ok) throw new Error(result.error);
  return result.data.data?.company ?? null;
}

export async function createTwentyCompany(
  karte: CompanyKarteSnapshot,
): Promise<TwentyRecord> {
  return createTwentyCompanyBase({ companyName: karte.companyName, domain: karte.domain });
}

export async function createTwentyCompanyBase(input: {
  companyName: string;
  domain: string;
}): Promise<TwentyRecord> {
  const result = await twentyFetch<TwentyMutationResponse>("/rest/companies", {
    method: "POST",
    body: JSON.stringify({
      name: input.companyName,
      domainName: {
        primaryLinkLabel: input.domain,
        primaryLinkUrl: `https://${input.domain}`,
      },
    }),
  });
  if (!result.ok) throw new Error(result.error);
  const company = result.data.data?.createCompany ?? result.data.data?.company;
  if (!company?.id)
    throw new Error("Twenty company create response did not include id");
  return company;
}

const unavailableFields = new Set<string>();

export async function patchTwentyCompanyHome(
  twentyCompanyId: string,
  payload: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const pending = Object.fromEntries(
    Object.entries(payload).filter(([key]) => !unavailableFields.has(key)),
  );
  const removed = Object.keys(payload).filter((key) =>
    unavailableFields.has(key),
  );
  if (removed.length > 0)
    console.warn("[twenty-sync] pre-filtered unavailable fields:", removed);

  const maxAttempts = Math.min(8, Object.keys(pending).length + 1);
  let lastError = "Twenty company update failed";
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (Object.keys(pending).length === 0)
      return {
        ok: false,
        error: `All Twenty fields were rejected: ${lastError}`,
      };
    const result = await twentyFetch<TwentyMutationResponse>(
      `/rest/companies/${twentyCompanyId}`,
      {
        method: "PATCH",
        body: JSON.stringify(pending),
      },
    );
    if (result.ok) return { ok: true };
    lastError = result.error;

    const mentioned = new Set<string>();
    for (const match of lastError.matchAll(/"(\w+)"/g)) {
      if (match[1] in pending) mentioned.add(match[1]);
    }
    if (mentioned.size === 0) return { ok: false, error: lastError };
    for (const field of mentioned) {
      unavailableFields.add(field);
      delete pending[field];
    }
    console.warn(
      `[twenty-sync] attempt ${attempt} removed unavailable fields:`,
      [...mentioned],
    );
  }
  return { ok: false, error: lastError };
}

export async function syncTwentyCompanyHomeFields(
  karte: CompanyKarteSnapshot,
  twentyCompanyId: string,
): Promise<void> {
  const result = await patchTwentyCompanyHome(
    twentyCompanyId,
    twentyCompanyHomePayload(karte),
  );
  if (!result.ok) throw new Error(result.error);
}
