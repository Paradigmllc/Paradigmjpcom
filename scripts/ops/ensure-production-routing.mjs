#!/usr/bin/env node

import fs from "node:fs"
import { pathToFileURL } from "node:url"

const BASE_URL = (process.env.COOLIFY_API_URL || "https://coolify.paradigmjp.com").replace(/\/+$/, "")
const TOKEN = process.env.COOLIFY_API_TOKEN
const APP_UUID = process.env.PARADIGM_APP_UUID || "n8i2sjiqvr2d8hrzppop2m2i"
const ROUTER_PRIORITY = Number(process.env.PARADIGM_ROUTER_PRIORITY || "100000")
const EVIDENCE_PATH = process.env.ROUTING_EVIDENCE_PATH || "/tmp/application-routing-after.json"
const DOMAINS = [
  "https://paradigmjp.com",
  "https://www.paradigmjp.com",
  "https://keystatic.paradigmjp.com",
  "https://status.paradigmjp.com",
].join(",")

async function api(pathname, options = {}) {
  const response = await fetch(`${BASE_URL}/api/v1${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    signal: options.signal ?? AbortSignal.timeout(30_000),
  })
  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    // Preserve the response body in the error below.
  }
  if (!response.ok) {
    throw new Error(`${pathname} -> HTTP ${response.status}: ${text.slice(0, 1200)}`)
  }
  return data
}

export function decodeCustomLabels(value) {
  if (typeof value !== "string" || value.trim() === "") return ""
  const source = value.trim()
  try {
    const decoded = Buffer.from(source, "base64").toString("utf8")
    if (/^(?:traefik\.|caddy_)/m.test(decoded)) return decoded
  } catch {
    // Fall through to plain-text handling.
  }
  return value
}

function validateProxyNetwork(network) {
  if (typeof network !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(network)) {
    throw new Error("Proxy network must be a valid Docker network name")
  }
}

export function enforceRouterPriorities(labels, priority = 100000, proxyNetwork = "coolify") {
  if (!Number.isSafeInteger(priority) || priority < 1) {
    throw new Error("Router priority must be a positive safe integer")
  }
  validateProxyNetwork(proxyNetwork)

  const normalized = labels.replace(/\r\n/g, "\n").trim()
  const lines = normalized ? normalized.split("\n") : []
  const routers = new Set()

  for (const line of lines) {
    const match = line.match(/^traefik\.http\.routers\.([^.]+)\.(?:entryPoints|rule|service)=/)
    if (match) routers.add(match[1])
  }

  if (routers.size === 0) {
    throw new Error("No Traefik HTTP routers were found in the Coolify custom labels")
  }

  const managedKeys = new Set([
    "traefik.docker.network",
    ...[...routers].map((router) => `traefik.http.routers.${router}.priority`),
  ])
  const retained = lines.filter((line) => {
    const separator = line.indexOf("=")
    const key = separator >= 0 ? line.slice(0, separator) : line
    return !managedKeys.has(key)
  })

  // Coolify may attach the application to more than one Docker network during
  // rolling deployment. Without an explicit provider network, Traefik can pick
  // an unreachable network nondeterministically and return 502 for a healthy app.
  retained.push(`traefik.docker.network=${proxyNetwork}`)
  for (const router of [...routers].sort()) {
    retained.push(`traefik.http.routers.${router}.priority=${priority}`)
  }

  return {
    labels: `${retained.join("\n")}\n`,
    proxyNetwork,
    routers: [...routers].sort(),
  }
}

async function patchApplication(payload) {
  return api(`/applications/${APP_UUID}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

async function main() {
  if (!TOKEN) throw new Error("COOLIFY_API_TOKEN is missing")
  if (!Number.isSafeInteger(ROUTER_PRIORITY) || ROUTER_PRIORITY < 1) {
    throw new Error("PARADIGM_ROUTER_PRIORITY must be a positive safe integer")
  }

  console.log("Normalizing Paradigm production routing settings")
  await patchApplication({
    domains: DOMAINS,
    ports_exposes: "3000",
    connect_to_docker_network: true,
    force_domain_override: true,
    is_auto_deploy_enabled: false,
    is_force_https_enabled: true,
    redirect: "www",
    health_check_enabled: true,
    health_check_path: "/api/ready",
    health_check_port: 3000,
    health_check_host: "localhost",
    health_check_method: "GET",
    health_check_return_code: 200,
    health_check_scheme: "http",
    health_check_interval: 10,
    health_check_timeout: 5,
    health_check_retries: 6,
    health_check_start_period: 20,
  })

  const generated = await api(`/applications/${APP_UUID}`)
  const proxyNetwork = (
    process.env.PARADIGM_PROXY_NETWORK
    || generated?.destination?.network
    || "coolify"
  ).trim()
  validateProxyNetwork(proxyNetwork)
  const decoded = decodeCustomLabels(generated?.custom_labels)
  const { labels, routers } = enforceRouterPriorities(
    decoded,
    ROUTER_PRIORITY,
    proxyNetwork,
  )

  console.log(
    `Pinning Traefik to ${proxyNetwork} and applying priority ${ROUTER_PRIORITY} to ${routers.length} routers`,
  )
  await patchApplication({
    custom_labels: Buffer.from(labels, "utf8").toString("base64"),
  })

  const finalState = await api(`/applications/${APP_UUID}`)
  const savedLabels = decodeCustomLabels(finalState?.custom_labels)
  const savedLines = new Set(savedLabels.replace(/\r\n/g, "\n").trim().split("\n"))
  const missing = routers.filter(
    (router) => !savedLines.has(`traefik.http.routers.${router}.priority=${ROUTER_PRIORITY}`),
  )
  if (missing.length > 0) {
    throw new Error(`Coolify did not persist router priority labels: ${missing.join(", ")}`)
  }
  if (!savedLines.has(`traefik.docker.network=${proxyNetwork}`)) {
    throw new Error(`Coolify did not persist Traefik network pin: ${proxyNetwork}`)
  }

  const evidence = {
    checked_at: new Date().toISOString(),
    uuid: finalState?.uuid,
    name: finalState?.name,
    status: finalState?.status,
    fqdn: finalState?.fqdn,
    ports_exposes: finalState?.ports_exposes,
    health_check_path: finalState?.health_check_path,
    health_check_port: finalState?.health_check_port,
    is_auto_deploy_enabled: finalState?.is_auto_deploy_enabled,
    proxy_network: proxyNetwork,
    router_priority: ROUTER_PRIORITY,
    routers,
  }
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(JSON.stringify(evidence))
}

const isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
}
