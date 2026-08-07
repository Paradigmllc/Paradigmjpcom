import { readFileSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { buildResearchManifest, sourceRequests } from "./research-ingest-core.mjs";

function valueAfter(argv, flag, fallback = null) {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

function parseArgs(argv) {
  const evidence = argv[0];
  const output = valueAfter(argv, "--output");
  if (!evidence || !output) throw new Error("Usage: node scripts/run-research-ingest.mjs <evidence-pack.json> --output <directory>");
  return { evidence: resolve(evidence), output: resolve(output) };
}

async function writeAtomic(path, content) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, content, "utf8");
  await rename(temporary, path);
}

async function fetchJson(url, options, timeoutMs = 120_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const body = await response.json();
    if (!response.ok) throw new Error(`Crawl4AI HTTP ${response.status}: ${JSON.stringify(body).slice(0, 1000)}`);
    return body;
  } finally {
    clearTimeout(timer);
  }
}

async function crawl(endpoint, urls) {
  const token = process.env.CRAWL4AI_API_TOKEN?.trim();
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const payload = await fetchJson(new URL("crawl", endpoint), {
    method: "POST",
    headers,
    body: JSON.stringify({
      urls,
      priority: 10,
      browser_config: { type: "BrowserConfig", params: { headless: true } },
      crawler_config: {
        type: "CrawlerRunConfig",
        params: { cache_mode: "BYPASS", check_robots_txt: true, word_count_threshold: 20, excluded_tags: ["nav", "footer"] },
      },
    }),
  });
  if (Array.isArray(payload.results)) return payload;
  if (!payload.task_id) throw new Error("Crawl4AI returned neither results nor task_id.");
  for (let attempt = 0; attempt < 120; attempt += 1) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 2_000));
    const status = await fetchJson(new URL(`task/${encodeURIComponent(payload.task_id)}`, endpoint), { headers }, 30_000);
    if (status.status === "completed") return status;
    if (["failed", "cancelled"].includes(status.status)) throw new Error(`Crawl4AI task ${status.status}: ${status.error ?? "unknown error"}`);
  }
  throw new Error("Crawl4AI task timed out after 240 seconds.");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const endpointValue = process.env.CRAWL4AI_API_URL?.trim();
  if (!endpointValue) throw new Error("CRAWL4AI_API_URL is required; research ingestion will not fabricate source content.");
  const endpoint = new URL(endpointValue.endsWith("/") ? endpointValue : `${endpointValue}/`);
  if (!["http:", "https:"].includes(endpoint.protocol)) throw new Error("CRAWL4AI_API_URL must use HTTP or HTTPS.");
  const evidencePack = JSON.parse(readFileSync(options.evidence, "utf8"));
  const requests = sourceRequests(evidencePack);
  const crawlPayload = await crawl(endpoint, requests.map((request) => request.url));
  const manifest = buildResearchManifest({ evidencePack, crawlPayload, retrievedAt: new Date().toISOString() });
  for (const document of manifest.documents) {
    const filename = `${document.contentSha256.slice(0, 12)}-${basename(new URL(document.url).pathname || "source").replace(/[^a-z0-9.-]+/gi, "-") || "source"}.md`;
    document.contentPath = resolve(options.output, "documents", filename);
    await writeAtomic(document.contentPath, `${document.markdown}\n`);
    delete document.markdown;
  }
  const manifestPath = resolve(options.output, "research-manifest.json");
  await writeAtomic(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ ok: true, manifestPath, documentCount: manifest.documentCount, claimCount: manifest.claimCount })}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
