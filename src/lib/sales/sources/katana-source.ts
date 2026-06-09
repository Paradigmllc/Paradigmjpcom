/**
 * Katana — Go-based fast web crawler by ProjectDiscovery.
 * Docker: projectdiscovery/katana
 * Usage: docker run --rm projectdiscovery/katana -u <url> -headless -silent -jc
 */
import { execSync } from "node:child_process"

interface KrResult { source: string; ok: boolean; data?: unknown; error?: string }

function runKatana(url: string, timeoutMs = 30_000): KrResult {
  if (!url?.startsWith("http")) return { source: "katana", ok: false, error: "invalid url" }
  try {
    const output = execSync(
      `docker run --rm projectdiscovery/katana -u "${url}" -headless -silent -jc -timeout 15 -retries 1`,
      { timeout: timeoutMs + 10_000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    )
    const lines = output.trim().split("\n").filter(Boolean)
    const urls: string[] = []
    const jsFiles: string[] = []
    for (const line of lines) {
      try {
        const obj = JSON.parse(line)
        if (obj?.request?.endpoint) urls.push(obj.request.endpoint)
        if (obj?.response?.raw) jsFiles.push(obj.response.raw.slice(0, 200))
      } catch { urls.push(line) }
    }
    return { source: "katana", ok: lines.length > 0, data: { crawled: urls.length, urls: urls.slice(0, 50), jsFiles: jsFiles.slice(0, 10) } }
  } catch (e: any) {
    const err = e?.stderr || e?.stdout || String(e)
    return { source: "katana", ok: false, error: err.slice(0, 300) }
  }
}

export async function crawlWithKatana(url: string): Promise<KrResult> {
  return runKatana(url, 35_000)
}

export async function checkKatanaHealth(): Promise<{ ok: boolean; detail: string }> {
  try {
    const out = execSync("docker run --rm projectdiscovery/katana -version", {
      timeout: 15_000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"]
    })
    return { ok: out.includes("katana"), detail: out.trim().split("\n")[0] || "installed" }
  } catch (e: any) {
    return { ok: false, detail: e?.stderr || String(e) }
  }
}
