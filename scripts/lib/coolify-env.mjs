import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"

export const DEFAULT_COOLIFY_URL = process.env.COOLIFY_API_URL || process.env.COOLIFY_URL || "https://coolify.paradigmjp.com"
export const DEFAULT_APP_UUID = process.env.PARADIGM_APP_UUID || "n8i2sjiqvr2d8hrzppop2m2i"
const CLAUDE_PROJECT_MEMORY_DIR = path.join(os.homedir(), ".claude", "projects")
const DOTFILES_CLAUDE_MEMORY_DIR = path.join(os.homedir(), "Desktop", "dotfiles", "claude", "memory")
const CLAUDE_MCP_FILE = path.join(os.homedir(), ".claude", "mcp.json")

function envValue(name, fallback = null) {
  const value = process.env[name]
  if (typeof value === "string" && value.trim().length > 0) return value.trim()
  return fallback
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"))
  } catch (error) {
    console.warn(`[coolify-env] failed to read JSON ${file}:`, error)
    return null
  }
}

function normalizeCoolifyEnvValue(row) {
  const rawValue = typeof row.real_value === "string" && row.real_value.length > 0 ? row.real_value : row.value
  if (typeof rawValue !== "string") return rawValue
  const trimmed = rawValue.trim()
  const singleQuoted = trimmed.match(/^'(.*)'$/s)
  if (singleQuoted) return singleQuoted[1].trim()
  const doubleQuoted = trimmed.match(/^"(.*)"$/s)
  if (doubleQuoted) return doubleQuoted[1].trim()
  if (/^(null|undefined)$/i.test(trimmed)) return ""
  return trimmed
}

function hasEnvValue(value) {
  return typeof value === "string" ? value.trim().length > 0 : value != null
}

function mergeEnvRows(rows) {
  const envs = new Map()
  const sortedRows = [...rows].sort((a, b) => {
    if (a?.is_preview === b?.is_preview) return 0
    return a?.is_preview ? -1 : 1
  })
  for (const row of sortedRows) {
    if (!row?.key) continue
    const value = normalizeCoolifyEnvValue(row)
    const previous = envs.get(row.key)
    if (!hasEnvValue(previous) || hasEnvValue(value)) {
      envs.set(row.key, value)
    }
  }
  return Object.fromEntries(envs)
}

function parseReferenceField(text, labels) {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const patterns = [
      new RegExp(`^\\s*-\\s*\\*\\*${escaped}\\*\\*:\\s*\`([^\`]+)\`\\s*$`, "im"),
      new RegExp(`^\\s*-?\\s*(?:\\*\\*)?${escaped}(?:\\*\\*)?\\s*[:=]\\s*([A-Za-z0-9_|:/?&.=+~%-]+)\\s*$`, "im"),
    ]
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match?.[1]?.trim()) return match[1].trim()
    }
  }
  return null
}

function findCoolifyFromClaudeReferences() {
  const roots = [CLAUDE_PROJECT_MEMORY_DIR, DOTFILES_CLAUDE_MEMORY_DIR].filter((dir) => fs.existsSync(dir))
  if (roots.length === 0) return null
  const files = []
  const seen = new Set()
  const walk = (dir) => {
    // Follow symlinked dirs (e.g. project memory dirs symlinked into dotfiles)
    // and guard against symlink loops via realpath dedup.
    let real
    try {
      real = fs.realpathSync(dir)
    } catch {
      return
    }
    if (seen.has(real)) return
    seen.add(real)
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const isDirectory = entry.isDirectory() || (entry.isSymbolicLink() && fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory())
      if (isDirectory) {
        walk(fullPath)
      } else if (/^reference_.*(?:coolify|api_keys).*\.md$/i.test(entry.name)) {
        files.push(fullPath)
      }
    }
  }
  for (const root of roots) walk(root)
  const scored = files
    .map((file) => {
      const normalized = file.replace(/\\/g, "/").toLowerCase()
      let score = 0
      if (normalized.includes("paradigmjpcom")) score += 10
      if (normalized.includes("hetzner")) score += 5
      if (path.basename(normalized).includes("coolify")) score += 1
      return { file, score }
    })
    .sort((a, b) => b.score - a.score || b.file.localeCompare(a.file))

  for (const { file } of scored) {
    try {
      const text = fs.readFileSync(file, "utf8")
      const token = parseReferenceField(text, ["COOLIFY_API_TOKEN", "token", "api token"])
      if (!token || token.length <= 10) continue
      return {
        token,
        baseUrl: parseReferenceField(text, ["COOLIFY_API_URL", "API base URL", "baseUrl", "base url", "url"]) || DEFAULT_COOLIFY_URL,
      }
    } catch (error) {
      console.warn(`[coolify-env] failed to read Coolify reference ${file}:`, error)
    }
  }
  return null
}

function findCoolifyFromCurrentMcp() {
  const cfg = readJson(CLAUDE_MCP_FILE)
  const server = cfg?.mcpServers?.coolify || cfg?.servers?.coolify
  const token = server?.env?.COOLIFY_API_TOKEN
  if (typeof token !== "string" || token.length <= 10) return null
  return {
    token,
    baseUrl: server.env.COOLIFY_API_URL || DEFAULT_COOLIFY_URL,
  }
}

function findCoolifyFromKeychain() {
  if (process.platform !== "darwin") return null
  const result = spawnSync("security", ["find-generic-password", "-w", "-s", "Paradigm-Coolify-API"], {
    encoding: "utf8",
  })
  const token = result.status === 0 ? result.stdout.trim() : ""
  if (token.length <= 10) return null
  return {
    token,
    baseUrl: DEFAULT_COOLIFY_URL,
  }
}

function findCoolifyFromMcpBackup() {
  const backupDir = path.join(os.homedir(), ".codex", "tmp", "mcp-backups")
  if (!fs.existsSync(backupDir)) return null
  const files = fs
    .readdirSync(backupDir)
    .filter((name) => name.startsWith("mcp.json.bak-"))
    .sort()
    .reverse()

  for (const file of files) {
    const cfg = readJson(path.join(backupDir, file))
    const servers = cfg?.mcpServers || cfg?.servers || {}
    for (const server of Object.values(servers)) {
      const token = server?.env?.COOLIFY_API_TOKEN
      if (typeof token === "string" && token.length > 10) {
        return {
          token,
          baseUrl: server.env.COOLIFY_API_URL || DEFAULT_COOLIFY_URL,
        }
      }
    }
  }
  return null
}

export function getCoolifyAuth() {
  const token = envValue("COOLIFY_API_TOKEN")
  const explicitUrl = envValue("COOLIFY_API_URL") || envValue("COOLIFY_URL")
  if (token && explicitUrl) {
    return {
      token,
      baseUrl: explicitUrl,
    }
  }
  const reference = findCoolifyFromClaudeReferences()
  if (reference) return { ...reference, baseUrl: explicitUrl || DEFAULT_COOLIFY_URL }
  const currentMcp = findCoolifyFromCurrentMcp()
  if (currentMcp) return { ...currentMcp, baseUrl: explicitUrl || DEFAULT_COOLIFY_URL }
  const keychain = findCoolifyFromKeychain()
  if (keychain) return keychain
  if (token) {
    return {
      token,
      baseUrl: DEFAULT_COOLIFY_URL,
    }
  }
  const backup = findCoolifyFromMcpBackup()
  if (backup) return { ...backup, baseUrl: explicitUrl || DEFAULT_COOLIFY_URL }
  return null
}

export async function coolifyRequest(pathname, options = {}) {
  const auth = getCoolifyAuth()
  if (!auth) throw new Error("COOLIFY_API_TOKEN is not configured")
  const method = String(options.method || "GET").toUpperCase()
  const attempts = method === "GET" ? 3 : 1
  let lastError = null
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(`${auth.baseUrl}${pathname}`, {
        ...options,
        signal: options.signal ?? AbortSignal.timeout(30_000),
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      })
      const text = await res.text()
      if (!res.ok) {
        const error = new Error(`Coolify API HTTP ${res.status}`)
        if (attempt < attempts && (res.status === 429 || res.status >= 500)) {
          lastError = error
          await new Promise((resolve) => setTimeout(resolve, attempt * 750))
          continue
        }
        throw error
      }
      return text ? JSON.parse(text) : null
    } catch (error) {
      lastError = error
      if (attempt >= attempts) break
      await new Promise((resolve) => setTimeout(resolve, attempt * 750))
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Coolify API request failed")
}

export async function readCoolifyApplicationEnvs(appUuid = envValue("PARADIGM_APP_UUID", DEFAULT_APP_UUID)) {
  const rows = await coolifyRequest(`/api/v1/applications/${appUuid}/envs`)
  return mergeEnvRows(rows)
}

export async function readProductionEnvValue(name, appUuid) {
  const local = envValue(name)
  if (local) return local
  const envs = await readCoolifyApplicationEnvs(appUuid)
  const value = envs[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export async function updateCoolifyEnvs(appUuid, envMap) {
  const resolvedAppUuid = appUuid || envValue("PARADIGM_APP_UUID", DEFAULT_APP_UUID)
  const entries = Object.entries(envMap).map(([key, value]) => ({
    key,
    value: String(value),
    is_preview: false,
    is_literal: true,
    is_multiline: false,
    is_shown_once: false,
  }))
  if (entries.length === 0) return []

  try {
    await coolifyRequest(`/api/v1/applications/${resolvedAppUuid}/envs/bulk`, {
      method: "PATCH",
      body: JSON.stringify({ data: entries }),
    })
    return entries.map(({ key }) => ({ key, status: "set" }))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[coolify-env] bulk env update failed; trying per-variable fallback:", message)
  }

  const results = []
  for (const { key, value } of entries) {
    try {
      await coolifyRequest(`/api/v1/applications/${resolvedAppUuid}/envs`, {
        method: "PATCH",
        body: JSON.stringify({ key, value }),
      })
      results.push({ key, status: "set" })
    } catch (error) {
      try {
        await coolifyRequest(`/api/v1/applications/${resolvedAppUuid}/envs`, {
          method: "POST",
          body: JSON.stringify({ key, value }),
        })
        results.push({ key, status: "created" })
      } catch (postError) {
        const message = error instanceof Error ? error.message : String(error)
        const postMessage = postError instanceof Error ? postError.message : String(postError)
        results.push({ key, status: "failed", error: message })
        console.error(`[coolify-env] failed to set ${key}:`, message, postMessage)
      }
    }
  }
  return results
}

export async function ensureCoolifyEnvs(appUuid, requiredEnvMap) {
  const current = await readCoolifyApplicationEnvs(appUuid)
  const missing = {}
  for (const [key, value] of Object.entries(requiredEnvMap)) {
    const currentVal = current[key]
    if (!currentVal || (typeof currentVal === "string" && currentVal.trim().length === 0)) {
      missing[key] = value
    }
  }
  if (Object.keys(missing).length === 0) {
    console.log("[coolify-env] all required envs are already set")
    return { set: 0, skipped: Object.keys(requiredEnvMap).length, results: [] }
  }
  console.log(`[coolify-env] setting ${Object.keys(missing).length} missing env vars...`)
  const results = await updateCoolifyEnvs(appUuid, missing)
  return { set: results.filter(r => r.status !== "failed").length, failed: results.filter(r => r.status === "failed").length, results }
}
