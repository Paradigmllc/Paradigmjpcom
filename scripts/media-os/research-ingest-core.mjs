import { createHash } from "node:crypto";
import { isIP } from "node:net";

function isPrivateIpv4(hostname) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  return parts[0] === 10 || parts[0] === 127 || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168);
}

export function canonicalPublicUrl(value) {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "https:") throw new Error(`Research source must use HTTPS: ${value}`);
  if (url.username || url.password) throw new Error(`Research source cannot contain credentials: ${value}`);
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname === "::1" || isPrivateIpv4(hostname)) {
    throw new Error(`Research source cannot target a local or private host: ${hostname}`);
  }
  if (isIP(hostname) === 6 && (hostname.startsWith("fc") || hostname.startsWith("fd") || hostname.startsWith("fe80"))) {
    throw new Error(`Research source cannot target a private IPv6 host: ${hostname}`);
  }
  url.hash = "";
  return url.toString();
}

export function sourceRequests(evidencePack) {
  if (!evidencePack || !Array.isArray(evidencePack.claims) || evidencePack.claims.length === 0) {
    throw new Error("Evidence pack must contain at least one claim.");
  }
  const byUrl = new Map();
  for (const claim of evidencePack.claims) {
    if (typeof claim.id !== "string" || typeof claim.sourceUrl !== "string" || typeof claim.locator !== "string") {
      throw new Error("Every evidence claim requires id, sourceUrl, and locator.");
    }
    const url = canonicalPublicUrl(claim.sourceUrl);
    const current = byUrl.get(url) ?? { url, sourceTitle: claim.sourceTitle ?? url, claimIds: [], locators: [] };
    current.claimIds.push(claim.id);
    current.locators.push({ claimId: claim.id, locator: claim.locator });
    byUrl.set(url, current);
  }
  return [...byUrl.values()];
}

function markdownText(result) {
  if (typeof result.markdown === "string") return result.markdown;
  if (result.markdown && typeof result.markdown === "object") {
    return result.markdown.fit_markdown || result.markdown.raw_markdown || result.markdown.markdown_with_citations || "";
  }
  return typeof result.cleaned_html === "string" ? result.cleaned_html : "";
}

export function normalizeCrawlResults(payload) {
  const candidates = Array.isArray(payload) ? payload : payload?.results ?? payload?.result ?? payload?.data?.results;
  if (!Array.isArray(candidates)) throw new Error("Crawl4AI response does not contain a results array.");
  return candidates.map((result) => {
    const url = canonicalPublicUrl(result.url ?? result.redirected_url);
    const markdown = markdownText(result).trim();
    if (result.success === false) throw new Error(`Crawl4AI failed for ${url}: ${result.error_message ?? "unknown error"}`);
    if (markdown.length < 200) throw new Error(`Crawl4AI returned insufficient source content for ${url}.`);
    return {
      url,
      markdown,
      contentSha256: createHash("sha256").update(markdown).digest("hex"),
      statusCode: Number(result.status_code ?? 200),
      redirectedUrl: result.redirected_url ? canonicalPublicUrl(result.redirected_url) : null,
    };
  });
}

export function buildResearchManifest({ evidencePack, crawlPayload, retrievedAt }) {
  const requests = sourceRequests(evidencePack);
  const crawled = normalizeCrawlResults(crawlPayload);
  const byUrl = new Map(crawled.map((document) => [document.url, document]));
  const documents = requests.map((request) => {
    const document = byUrl.get(request.url);
    if (!document) throw new Error(`Crawl4AI omitted required source ${request.url}.`);
    return { ...request, ...document, retrievedAt, wordCount: document.markdown.split(/\s+/u).filter(Boolean).length };
  });
  return {
    version: "2026-08-03.1",
    provider: "crawl4ai",
    episodeId: evidencePack.episodeId,
    retrievedAt,
    documentCount: documents.length,
    claimCount: evidencePack.claims.length,
    documents,
  };
}
