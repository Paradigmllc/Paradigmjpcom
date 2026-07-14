import type { BusinessModel } from "./japan-entry-projection";
import { normalizeDomain } from "./dedup";
import { isCustomerFacingBusinessDomain } from "./data-quality-guard";
import { getProxyFetchOptions } from "./proxy-agent";
import { auditJapanMarketReadiness } from "./sources/japan-market-audit";

type JsonRecord = Record<string, unknown>;
const MAX_HOMEPAGE_BYTES = 1_500_000;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}
export function initialDraftTechnologyNames(value: unknown): string[] {
  const detections = record(value).detections;
  if (!Array.isArray(detections)) return [];
  return detections.flatMap((item) => {
    const name = record(item).name;
    return typeof name === "string" ? [name] : [];
  });
}

function publicOrigin(domain: string): string {
  const normalized = normalizeDomain(domain);
  if (!normalized) throw new Error("A valid public company domain is required");
  if (
    normalized === "localhost"
    || normalized.endsWith(".localhost")
    || normalized.endsWith(".local")
    || /^(?:0|10|127|169\.254|172\.(?:1[6-9]|2\d|3[01])|192\.168)\./.test(normalized)
  ) throw new Error("Private or local domains are prohibited");
  if (!isCustomerFacingBusinessDomain(normalized)) {
    throw new Error("A customer-facing canonical domain is required; hosted platform domains are review-only");
  }
  return `https://${normalized}`;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function attribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match?.[1] ? decodeHtml(match[1]) : null;
}

function metaContent(html: string, key: string): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = attribute(tag, "name") ?? attribute(tag, "property");
    if (name?.toLowerCase() !== key.toLowerCase()) continue;
    const content = attribute(tag, "content");
    if (content) return content;
  }
  return null;
}

function textMatches(html: string, pattern: RegExp, limit: number): string[] {
  const values: string[] = [];
  for (const match of html.matchAll(pattern)) {
    const value = decodeHtml(match[1] ?? "");
    if (value.length >= 3 && !values.includes(value)) values.push(value);
    if (values.length >= limit) break;
  }
  return values;
}

function credibleSiteName(value: string | null): string | null {
  if (!value) return null;
  const cleaned = (value.split(/\s*[|–—]\s*/)[0] ?? value)
    .replace(/\s*-\s*(?:Official Site|Online Store|Shopify).*$/i, "")
    .trim();
  if (cleaned.length < 2 || cleaned.length > 100 || /^(?:home|shop|store|official site|shopify)$/i.test(cleaned)) return null;
  return cleaned;
}

function inferBusinessModel(industry: string | null, techStack: unknown, productContext: string): BusinessModel {
  const text = `${industry ?? ""} ${initialDraftTechnologyNames(techStack).join(" ")} ${productContext}`.toLowerCase();
  if (/shopify|e-?commerce|online store|shop|retail|collection|cart/.test(text)) return "ecommerce";
  if (/saas|software|platform|subscription|cloud/.test(text)) return "saas";
  return "service";
}

export async function collectInitialFormDraftEvidence(input: {
  domain: string;
  industry: string | null;
  techStack: unknown;
}) {
  const origin = publicOrigin(input.domain);
  const response = await fetch(origin, getProxyFetchOptions({
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
    headers: { "User-Agent": "ParadigmInitialDraftEvidence/1.0 (+https://paradigmjp.com)" },
  }));
  if (!response.ok) throw new Error(`Homepage returned HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) throw new Error("Homepage did not return HTML");
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_HOMEPAGE_BYTES) throw new Error("Homepage HTML exceeded the evidence size limit");
  const html = (await response.text()).slice(0, MAX_HOMEPAGE_BYTES);
  const title = textMatches(html, /<title\b[^>]*>([\s\S]*?)<\/title>/gi, 1)[0] ?? null;
  const description = metaContent(html, "description") ?? metaContent(html, "og:description");
  const headings = textMatches(html, /<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/gi, 5);
  const companyName = credibleSiteName(metaContent(html, "og:site_name")) ?? credibleSiteName(title);
  const productContext = [...new Set([description, ...headings, title]
    .filter((value): value is string => Boolean(value && value.length >= 3)))]
    .join(" | ")
    .slice(0, 700);
  if (productContext.length < 12) throw new Error("Homepage did not provide enough grounded product context");
  const audit = await auditJapanMarketReadiness(origin);
  if (audit.pages_checked.length === 0) throw new Error("No public pages were available for Japan-readiness evidence");
  return {
    companyName,
    productContext,
    businessModel: inferBusinessModel(input.industry, input.techStack, productContext),
    sourceUrl: response.url,
    title,
    description,
    headings,
    audit,
  };
}
