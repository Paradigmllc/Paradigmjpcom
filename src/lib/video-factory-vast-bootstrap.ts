import "server-only"

import {
  constants,
  createHash,
  generateKeyPairSync,
  privateDecrypt,
  randomBytes,
  timingSafeEqual,
} from "node:crypto"
import fs from "node:fs"
import path from "node:path"

const TOKEN_SHA256 = "327e902d248afca137dc12f47c6c33c88b8647c609c54c99ae4bb17dabe09e6e"
const CONFIG_ROOT = process.env.VIDEO_FACTORY_WORKSPACE?.trim()
  ? path.join(process.env.VIDEO_FACTORY_WORKSPACE.trim(), "config")
  : "/data/video-factory/config"
const PRIVATE_KEY_PATH = path.join(CONFIG_ROOT, ".vast-bootstrap-private.pem")
const PUBLIC_KEY_PATH = path.join(CONFIG_ROOT, ".vast-bootstrap-public.pem")
const STATE_PATH = path.join(CONFIG_ROOT, ".vast-bootstrap-state.json")

export type VastBootstrapState = {
  configured_at?: string
  scoped_key_created?: boolean
  scoped_key_id?: number | null
  original_key_fingerprint?: string
  instance_id?: number | null
  template_hash?: string | null
  offer_id?: number | null
  gpu_name?: string | null
  hourly_price?: number | null
  proxy_key?: string | null
  provision_started_at?: string | null
  comfyui_base_url?: string | null
  workflow_id?: string | null
  smoke_output_path?: string | null
  smoke_sha256?: string | null
  smoke_size_bytes?: number | null
  completed_at?: string
  failed_at?: string | null
  last_error?: string | null
}

function base64UrlDecode(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4))
  return Buffer.from(`${normalized}${padding}`, "base64")
}

export function tokenIsValid(token: string | null): boolean {
  if (!token) return false
  const expected = Buffer.from(TOKEN_SHA256, "hex")
  const actual = createHash("sha256").update(token, "utf8").digest()
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function ensureConfigRoot(): void {
  fs.mkdirSync(CONFIG_ROOT, { recursive: true, mode: 0o700 })
  fs.chmodSync(CONFIG_ROOT, 0o700)
}

export function readBootstrapState(): VastBootstrapState {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) as VastBootstrapState
  } catch {
    return {}
  }
}

export function writeBootstrapState(update: VastBootstrapState): VastBootstrapState {
  ensureConfigRoot()
  const state = { ...readBootstrapState(), ...update }
  const temporary = `${STATE_PATH}.${process.pid}.${randomBytes(6).toString("hex")}`
  fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 })
  fs.renameSync(temporary, STATE_PATH)
  fs.chmodSync(STATE_PATH, 0o600)
  return state
}

export function bootstrapIsComplete(): boolean {
  return Boolean(readBootstrapState().completed_at)
}

export function publicKeyPem(): string {
  ensureConfigRoot()
  if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
    return fs.readFileSync(PUBLIC_KEY_PATH, "utf8")
  }
  const pair = generateKeyPairSync("rsa", {
    modulusLength: 3072,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  })
  fs.writeFileSync(PRIVATE_KEY_PATH, pair.privateKey, { mode: 0o600 })
  fs.writeFileSync(PUBLIC_KEY_PATH, pair.publicKey, { mode: 0o600 })
  return pair.publicKey
}

export function decryptVastKey(ciphertext: string): string {
  if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    throw new Error("Bootstrap public key has not been initialized")
  }
  const value = privateDecrypt(
    {
      key: fs.readFileSync(PRIVATE_KEY_PATH, "utf8"),
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    base64UrlDecode(ciphertext),
  ).toString("utf8").trim()
  if (!/^[A-Fa-f0-9]{64,128}$/.test(value)) {
    throw new Error("Decrypted Vast.ai key has an unexpected format")
  }
  return value
}

export function fingerprintSecret(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 16)
}

export function removeBootstrapKeyMaterial(): void {
  fs.rmSync(PRIVATE_KEY_PATH, { force: true })
  fs.rmSync(PUBLIC_KEY_PATH, { force: true })
}
