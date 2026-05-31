import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const DEFAULT_COOLIFY_URL = "https://coolify.appexx.me"
const DEFAULT_APP_UUID = "i12am4vvcbggefnqdizhnv9a"

function envValue(name, fallback = null) {
  const value = process.env[name]
  if (typeof value === "string" && value.trim().length > 0) return value.trim()
  return fallback
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"))
  } catch {
    return null
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
  if (token) {
    return {
      token,
      baseUrl: envValue("COOLIFY_API_URL", DEFAULT_COOLIFY_URL),
    }
  }
  const backup = findCoolifyFromMcpBackup()
  if (backup) return backup
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
  return Object.fromEntries(rows.map((row) => [row.key, row.real_value || row.value]))
}

export async function readProductionEnvValue(name, appUuid) {
  const local = envValue(name)
  if (local) return local
  const envs = await readCoolifyApplicationEnvs(appUuid)
  const value = envs[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}
