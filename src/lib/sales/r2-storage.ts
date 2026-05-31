import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export interface R2StorageConfig {
  ready: boolean
  bucket: string | null
  publicBaseUrl: string | null
  missing: string[]
}

export interface R2UploadRequest {
  objectKey: string
  contentType: string
  expiresInSeconds?: number
}

export interface R2SignedUpload {
  objectKey: string
  uploadUrl: string
  publicUrl: string | null
  contentType: string
  expiresInSeconds: number
}

function optionalEnv(name: string): string | null {
  const value = process.env[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export function getR2StorageConfig(): R2StorageConfig {
  const bucket = optionalEnv("CLOUDFLARE_R2_BUCKET") ?? optionalEnv("R2_BUCKET")
  const publicBaseUrl = optionalEnv("CLOUDFLARE_R2_PUBLIC_BASE_URL") ?? optionalEnv("R2_PUBLIC_BASE_URL")
  const required = ["CLOUDFLARE_R2_ACCOUNT_ID", "CLOUDFLARE_R2_ACCESS_KEY_ID", "CLOUDFLARE_R2_SECRET_ACCESS_KEY"]
  const missing = required.filter((name) => optionalEnv(name) === null)
  if (!bucket) missing.push("CLOUDFLARE_R2_BUCKET or R2_BUCKET")
  return { ready: missing.length === 0, bucket, publicBaseUrl, missing }
}

function createR2Client(): S3Client {
  const accountId = optionalEnv("CLOUDFLARE_R2_ACCOUNT_ID")
  const accessKeyId = optionalEnv("CLOUDFLARE_R2_ACCESS_KEY_ID")
  const secretAccessKey = optionalEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY")
  const missing = [
    !accountId ? "CLOUDFLARE_R2_ACCOUNT_ID" : null,
    !accessKeyId ? "CLOUDFLARE_R2_ACCESS_KEY_ID" : null,
    !secretAccessKey ? "CLOUDFLARE_R2_SECRET_ACCESS_KEY" : null,
  ].filter((value): value is string => value !== null)
  if (missing.length > 0) throw new Error(`R2 upload credentials are not configured: ${missing.join(", ")}`)
  if (!accountId || !accessKeyId || !secretAccessKey) throw new Error("R2 upload credentials are incomplete")

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

export function sanitizeR2ObjectName(value: string): string {
  return value
    .trim()
    .replace(/^\/+/, "")
    .replace(/\\/g, "/")
    .split("/")
    .map((part) =>
      part
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/-\./g, ".")
        .replace(/^-+|-+$/g, ""),
    )
    .filter(Boolean)
    .join("/")
}

function publicUrlFor(baseUrl: string | null, objectKey: string): string | null {
  if (!baseUrl) return null
  return `${baseUrl.replace(/\/+$/, "")}/${objectKey}`
}

export async function createR2SignedUploads(requests: R2UploadRequest[]): Promise<R2SignedUpload[]> {
  const config = getR2StorageConfig()
  if (!config.ready || !config.bucket) {
    throw new Error(`R2 is not ready: ${config.missing.join(", ")}`)
  }
  const bucket = config.bucket
  const client = createR2Client()
  return Promise.all(
    requests.map(async (request) => {
      const objectKey = sanitizeR2ObjectName(request.objectKey)
      if (!objectKey) throw new Error("R2 object key is empty")
      const expiresInSeconds = Math.max(60, Math.min(request.expiresInSeconds ?? 900, 3600))
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: request.contentType,
      })
      const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds })
      return {
        objectKey,
        uploadUrl,
        publicUrl: publicUrlFor(config.publicBaseUrl, objectKey),
        contentType: request.contentType,
        expiresInSeconds,
      }
    }),
  )
}
