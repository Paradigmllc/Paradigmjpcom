import type { BusinessModel } from "./japan-entry-projection";
import { normalizeDomain } from "./dedup";
import { isCustomerFacingBusinessDomain } from "./data-quality-guard";
import { getProxyFetchOptions } from "./proxy-agent";
import { auditJapanMarketReadiness } from "./sources/japan-market-audit";
import { fetchPageWithCrawl4Ai } from "./crawl4ai-page";

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

function decodeNumericHtmlEntity(entity: string): string {
  const hexadecimal = entity.match(/^&#x([0-9a-f]{1,6});$/i)?.[1]
  const decimal = entity.match(/^&#([0-9]{1,7});$/)?.[1]
  const codePoint = hexadecimal
    ? Number.parseInt(hexadecimal, 16)
    : decimal
      ? Number.parseInt(decimal, 10)
      : Number.NaN
  if (!Number.isInteger(codePoint) || codePoint <= 0 || codePoint > 0x10ffff) return " "
  if ((codePoint >= 0xd800 && codePoint <= 0xdfff) || codePoint === 0x7f) return " "
  return String.fromCodePoint(codePoint)
}

export function decodePublicHtmlText(value: string): string {
  let decoded = value
  for (let pass = 0; pass < 2; pass += 1) {
    const next = decoded
      .replace(/&#(?:x[0-9a-f]{1,6}|[0-9]{1,7});/gi, decodeNumericHtmlEntity)
      .replace(/&(?:amp|quot|apos|nbsp|lt|gt|rsquo|lsquo|ldquo|rdquo);/gi, (entity) => ({
        "&amp;": "&",
        "&quot;": "\"",
        "&apos;": "'",
        "&nbsp;": " ",
        "&lt;": "<",
        "&gt;": ">",
        "&rsquo;": "’",
        "&lsquo;": "‘",
        "&ldquo;": "“",
        "&rdquo;": "”",
      })[entity.toLowerCase()] ?? " ")
    decoded = next
    if (!/&(?:amp|#(?:x[0-9a-f]{1,6}|[0-9]{1,7}));/i.test(decoded)) break
  }
  return decoded
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const decodeHtml = decodePublicHtmlText

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

export function joinPublicEvidenceSegments(values: Array<string | null | undefined>, maxChars = 700): string {
  const segments = [...new Set(values
    .filter((value): value is string => Boolean(value && value.length >= 3))
    .map((value) => value.replace(/\s+/g, " ").trim()))];
  const selected: string[] = [];
  for (const segment of segments) {
    const candidate = [...selected, segment].join(" | ");
    if (candidate.length > maxChars) continue;
    selected.push(segment);
  }
  return selected.join(" | ");
}

function visiblePageText(html: string): string {
  return decodeHtml(html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " "))
}

function samePublicHostname(left: string, right: string): boolean {
  try {
    return new URL(left).hostname.replace(/^www\./, "") === new URL(right).hostname.replace(/^www\./, "")
  } catch (error) {
    console.warn("[manual-work] ignored invalid rendered homepage URL:", { left, right, error })
    return false
  }
}

export function selectRicherHomepageHtml(directHtml: string, renderedHtml: string | null): {
  html: string
  evidenceMode: "direct_html" | "browser_rendered"
} {
  if (!renderedHtml) return { html: directHtml, evidenceMode: "direct_html" }
  const directText = visiblePageText(directHtml)
  const renderedText = visiblePageText(renderedHtml)
  const directHeadings = textMatches(directHtml, /<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi, 12).length
  const renderedHeadings = textMatches(renderedHtml, /<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi, 12).length
  const materiallyRicher = renderedText.length >= Math.max(240, directText.length * 1.5)
    && (renderedHeadings > directHeadings || renderedText.length >= directText.length + 500)
  return materiallyRicher
    ? { html: renderedHtml.slice(0, MAX_HOMEPAGE_BYTES), evidenceMode: "browser_rendered" }
    : { html: directHtml, evidenceMode: "direct_html" }
}

function credibleSiteName(value: string | null): string | null {
  if (!value) return null;
  const cleaned = (value.split(/\s*[|–—]\s*/)[0] ?? value)
    .replace(/\s*-\s*(?:Official Site|Online Store|Shopify).*$/i, "")
    .trim();
  if (cleaned.length < 2 || cleaned.length > 100 || /^(?:home|shop|store|official site|shopify)$/i.test(cleaned)) return null;
  return cleaned;
}

const PRODUCT_SCHEMA_TYPES = new Set([
  "Product",
  "Service",
  "SoftwareApplication",
  "WebApplication",
  "MobileApplication",
]);

function productName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = decodeHtml(value).replace(/\s+/g, " ").trim();
  if (
    normalized.length < 2
    || normalized.length > 100
    || /^(?:home|service|services|product|products|software|platform|official site)$/i.test(normalized)
  ) return null;
  return normalized;
}

function collectStructuredProductNames(value: unknown, names: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectStructuredProductNames(item, names);
    return;
  }
  if (!value || typeof value !== "object") return;
  const data = value as JsonRecord;
  const rawType = data["@type"];
  const types = Array.isArray(rawType)
    ? rawType.filter((item): item is string => typeof item === "string")
    : typeof rawType === "string" ? [rawType] : [];
  if (types.some((type) => PRODUCT_SCHEMA_TYPES.has(type))) {
    const name = productName(data.name);
    if (name) names.add(name);
  }
  for (const nested of Object.values(data)) collectStructuredProductNames(nested, names);
}

export function extractPublicProductNames(html: string): string[] {
  const names = new Set<string>();
  for (const key of ["application-name", "apple-mobile-web-app-title"]) {
    const name = productName(metaContent(html, key));
    if (name) names.add(name);
  }
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const source = decodeHtml(match[1] ?? "").trim();
    if (!source) continue;
    try {
      collectStructuredProductNames(JSON.parse(source), names);
    } catch (error) {
      console.warn("[manual-work] ignored malformed JSON-LD while extracting product names:", error);
    }
  }
  return [...names].slice(0, 5);
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
  const directHtml = (await response.text()).slice(0, MAX_HOMEPAGE_BYTES);
  const directVisibleText = visiblePageText(directHtml);
  const directHeadings = textMatches(directHtml, /<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi, 3);
  const needsBrowserEvidence = directVisibleText.length < 240 || directHeadings.length === 0;
  const renderedPage = needsBrowserEvidence
    ? await fetchPageWithCrawl4Ai(origin, 20_000)
    : null;
  const sameHostRenderedHtml = renderedPage
    && samePublicHostname(renderedPage.url, response.url)
    ? renderedPage.html
    : null;
  const selected = selectRicherHomepageHtml(directHtml, sameHostRenderedHtml);
  const html = selected.html;
  const title = textMatches(html, /<title\b[^>]*>([\s\S]*?)<\/title>/gi, 1)[0] ?? null;
  const description = metaContent(html, "description") ?? metaContent(html, "og:description");
  const headings = textMatches(html, /<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi, 8);
  const descriptiveParagraphs = textMatches(html, /<p\b[^>]*>([\s\S]*?)<\/p>/gi, 5)
    .filter((value) => value.length >= 20 && value.length <= 220);
  const companyName = credibleSiteName(metaContent(html, "og:site_name")) ?? credibleSiteName(title);
  const productNames = extractPublicProductNames(html);
  const productContext = joinPublicEvidenceSegments([
    ...productNames,
    description,
    ...descriptiveParagraphs,
    ...headings,
    title,
  ]);
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
    productNames,
    evidenceMode: selected.evidenceMode,
    audit,
  };
}
