/**
 * SpiderFoot OSINT — 200+ free modules. Runs via Docker CLI for programmatic access.
 */
import { execSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

interface SfResult { source: string; ok: boolean; data?: Record<string, unknown>; error?: string }

function sfExec(command: string): string {
  try {
    return execSync(`docker exec spiderfoot ${command}`, {
      timeout: 120_000,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    })
  } catch (e: any) {
    // SpiderFoot CLI exits non-zero for some results — capture stdout anyway
    return e?.stdout || e?.stderr || String(e)
  }
}

/** Run SpiderFoot scan via CLI and return parsed JSON results */
function runSpiderFootScan(target: string, modules: string[]): SfResult {
  if (!target?.includes(".")) return { source: "spiderfoot", ok: false, error: "invalid target" }

  const tmpDir = path.join(os.tmpdir(), `sf-${Date.now()}`)
  try {
    fs.mkdirSync(tmpDir, { recursive: true })

    // Run SpiderFoot scan
    const moduleList = modules.join(",")
    const cmd = `python3 /home/spiderfoot/sf.py -s "${target}" -m "${moduleList}" -o json -q`
    const output = sfExec(cmd)

    // Parse JSON results
    const lines = output.trim().split("\n").filter(Boolean)
    const data: unknown[] = []
    for (const line of lines) {
      try { data.push(JSON.parse(line)) } catch { /* skip non-JSON */ }
    }

    return { source: "spiderfoot", ok: data.length > 0, data: { results: data, count: data.length } }
  } catch (error) {
    return { source: "spiderfoot", ok: false, error: String(error) }
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch (e) { console.error("[spiderfoot] cleanup failed:", e) }
  }
}

export async function enrichDomainWithSpiderFoot(domain: string): Promise<SfResult[]> {
  // Core free modules for company intelligence
  const modules = [
    "sfp_dns",           // DNS records
    "sfp_whois",         // WHOIS lookup
    "sfp_sslcert",       // SSL certificate analysis
    "sfp_email",         // Email extraction
    "sfp_names",         // Human name extraction
    "sfp_webserver",     // Web server info
    "sfp_webanalytics",  // Google Analytics etc.
    "sfp_spider",        // Page spider
    "sfp_cookies",       // Cookie analysis
    "sfp_strangeheaders",// Security headers
  ]

  return [runSpiderFootScan(domain, modules)]
}

export async function checkSpiderFootHealth(): Promise<{ ok: boolean; detail: string }> {
  try {
    const output = execSync("docker exec spiderfoot python3 /home/spiderfoot/sf.py -V", {
      timeout: 10_000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
    })
    return { ok: output.includes("SpiderFoot"), detail: output.trim().split("\n")[0] || "running" }
  } catch (e: any) {
    return { ok: false, detail: e?.stderr || e?.stdout || String(e) }
  }
}
