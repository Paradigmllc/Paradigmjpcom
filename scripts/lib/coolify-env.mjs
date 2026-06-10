import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const DEFAULT_COOLIFY_URL = process.env.COOLIFY_URL || "https://coolify.appexx.me"
const DEFAULT_APP_UUID = process.env.PARADIGM_APP_UUID || "i12am4vvcbggefnqdizhnv9a"
const CLAUDE_PROJECT_MEMORY_DIR = path.join(os.homedir(), ".claude", "projects")

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
  for (const row of rows) {
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
      new RegExp(`^\\s*${escaped}\\s*[:=]\\s*([A-Za-z0-9_:/?&.=+~%-]+)\\s*$`, "im"),
    ]
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match?.[1]?.trim()) return match[1].trim()
    }
  }
  return null
}

function findCoolifyFromClaudeReferences() {
  if (!fs.existsSync(CLAUDE_PROJECT_MEMORY_DIR)) return null
  const files = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (/^reference_.*coolify.*\.md$/i.test(entry.name)) {
        files.push(fullPath)
      }
    }
  }
  walk(CLAUDE_PROJECT_MEMORY_DIR)
  files.sort((a, b) => b.localeCompare(a))

  for (const file of files) {
    try {
      const text = fs.readFileSync(file, "utf8")
      const token = parseReferenceField(text, ["COOLIFY_API_TOKEN", "token", "api token"])
      if (!token || token.length <= 10) continue
      return {
        token,
        baseUrl: parseReferenceField(text, ["COOLIFY_API_URL", "baseUrl", "base url", "url"]) || DEFAULT_COOLIFY_URL,
      }
    } catch (error) {
      console.warn(`[coolify-env] failed to read Coolify reference ${file}:`, error)
    }
  }
  return null
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
  if (token) {
    return {
      token,
      baseUrl: envValue("COOLIFY_API_URL", DEFAULT_COOLIFY_URL),
    }
  }
  const backup = findCoolifyFromMcpBackup()
  if (backup) return backup
  const reference = findCoolifyFromClaudeReferences()
  if (reference) return reference
  return null
}

export async function coolifyRequest(pathname, options = {}) {
  const auth = getCoolifyAuth()
  if (!auth) throw new Error("COOLIFY_API_TOKEN is not configured")
  const res = await fetch(`${auth.baseUrl}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(`Coolify API HTTP ${res.status}`)
  return data
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
