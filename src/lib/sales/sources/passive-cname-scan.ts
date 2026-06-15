import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { spawn } from "node:child_process"
import { optionalEnv } from "../japan-readiness-utils"

export interface CnameScanResult {
  ok: boolean
  records: Record<string, string | null>
  engine: "massdns" | "doh"
  checked: number
  error?: string
}

function parseMassdnsLine(line: string): { domain: string; cname: string } | null {
  const match = line.match(/^([^\s.]+(?:\.[^\s.]+)*)\.\s+CNAME\s+([^\s]+)\.?$/i)
  if (!match) return null
  return { domain: match[1]!.toLowerCase().replace(/^www\./, ""), cname: match[2]!.toLowerCase().replace(/\.$/, "") }
}

function run(bin: string, args: string[], timeoutMs: number): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(bin, args, { windowsHide: true })
    let stderr = ""
    const timer = setTimeout(() => {
      child.kill("SIGTERM")
      resolve({ code: 124, stderr: "massdns timed out" })
    }, timeoutMs)
    child.stderr.on("data", (chunk) => { stderr += String(chunk) })
    child.on("error", (error) => {
      clearTimeout(timer)
      resolve({ code: 1, stderr: error.message })
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      resolve({ code: code ?? 0, stderr })
    })
  })
}

async function scanWithMassdns(domains: string[], timeoutMs: number): Promise<CnameScanResult | null> {
  const bin = optionalEnv("MASSDNS_BIN")
  if (!bin) return null
  const dir = await mkdtemp(path.join(tmpdir(), "revenueos-massdns-"))
  try {
    const input = path.join(dir, "domains.txt")
    const output = path.join(dir, "out.txt")
    const resolvers = optionalEnv("MASSDNS_RESOLVERS_FILE") ?? path.join(dir, "resolvers.txt")
    await writeFile(input, domains.map((domain) => `${domain}.`).join("\n"))
    if (!optionalEnv("MASSDNS_RESOLVERS_FILE")) await writeFile(resolvers, "1.1.1.1\n8.8.8.8\n9.9.9.9\n")
    const args = ["-r", resolvers, "-t", "CNAME", "-o", "S", "-w", output, input]
    const result = await run(bin, args, timeoutMs)
    if (result.code !== 0 && result.code !== 1) return { ok: false, records: {}, engine: "massdns", checked: domains.length, error: result.stderr }
    const text = await readFile(output, "utf8").catch(() => "")
    const records: Record<string, string | null> = Object.fromEntries(domains.map((domain) => [domain, null]))
    for (const line of text.split(/\r?\n/)) {
      const parsed = parseMassdnsLine(line)
      if (parsed) records[parsed.domain] = parsed.cname
    }
    return { ok: true, records, engine: "massdns", checked: domains.length }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch((error) => {
      console.error("[passive-cname] temp cleanup failed:", error)
    })
  }
}

async function dohCname(domain: string): Promise<string | null> {
  const endpoints = [
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=CNAME`,
    `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=CNAME`,
  ]
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { headers: { Accept: "application/dns-json" }, signal: AbortSignal.timeout(6_000) })
      if (!res.ok) continue
      const body = await res.json() as { Answer?: Array<{ data?: unknown }> }
      const cname = body.Answer?.map((row) => (typeof row.data === "string" ? row.data.replace(/\.$/, "").toLowerCase() : null)).find(Boolean)
      if (cname) return cname
    } catch (error) {
      console.warn("[passive-cname] DoH query failed:", domain, error)
    }
  }
  return null
}

async function scanWithDoh(domains: string[], concurrency: number): Promise<CnameScanResult> {
  const records: Record<string, string | null> = {}
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, domains.length) }, async () => {
    while (cursor < domains.length) {
      const domain = domains[cursor++]!
      records[domain] = await dohCname(domain)
    }
  })
  await Promise.all(workers)
  return { ok: true, records, engine: "doh", checked: domains.length }
}

export async function scanCnameRecords(domains: string[], options: { timeoutMs?: number; concurrency?: number } = {}): Promise<CnameScanResult> {
  if (domains.length === 0) return { ok: true, records: {}, engine: "doh", checked: 0 }
  const massdns = await scanWithMassdns(domains, options.timeoutMs ?? 120_000)
  if (massdns?.ok) return massdns
  const doh = await scanWithDoh(domains, Math.max(1, Math.min(options.concurrency ?? 16, 64)))
  if (massdns?.error) doh.error = massdns.error
  return doh
}
