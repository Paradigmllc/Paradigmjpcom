import type { S3Client as S3ClientType } from "@aws-sdk/client-s3"

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

import { optionalEnv } from "./japan-readiness-utils"

export function getR2StorageConfig(): R2StorageConfig {
  const bucket = optionalEnv("CLOUDFLARE_R2_BUCKET") ?? optionalEnv("R2_BUCKET")
  const publicBaseUrl = optionalEnv("CLOUDFLARE_R2_PUBLIC_BASE_URL") ?? optionalEnv("R2_PUBLIC_BASE_URL")
  const required = ["CLOUDFLARE_R2_ACCOUNT_ID", "CLOUDFLARE_R2_ACCESS_KEY_ID", "CLOUDFLARE_R2_SECRET_ACCESS_KEY"]
  const missing = required.filter((name) => optionalEnv(name) === null)
  if (!bucket) missing.push("CLOUDFLARE_R2_BUCKET or R2_BUCKET")
  return { ready: missing.length === 0, bucket, publicBaseUrl, missing }
}

async function createR2Client(): Promise<S3ClientType> {
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

  const { S3Client } = await import("@aws-sdk/client-s3")
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
  const client = await createR2Client()
  const { PutObjectCommand } = await import("@aws-sdk/client-s3")
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner")
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

export async function uploadToR2(objectKey: string, body: Buffer | Uint8Array, contentType: string): Promise<string> {
  const config = getR2StorageConfig()
  if (!config.ready || !config.bucket) {
    throw new Error(`R2 is not ready: ${config.missing.join(", ")}`)
  }
  const bucket = config.bucket
  const client = await createR2Client()
  const { PutObjectCommand } = await import("@aws-sdk/client-s3")
  const key = sanitizeR2ObjectName(objectKey)
  if (!key) throw new Error("R2 object key is empty")
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  })
  try {
    await client.send(command)
  } catch (error) {
    console.error("[r2-storage] uploadToR2 failed:", error)
    const { captureException } = await import("@/lib/error-monitor")
    await captureException(error, {
      source: "r2-storage/uploadToR2",
      context: { bucket, key, contentType },
    })
    throw error
  }
  const pub = publicUrlFor(config.publicBaseUrl, key)
  if (!pub) {
    throw new Error("R2 public base URL is not configured")
  }
  return pub
}

export async function checkR2StorageHealth(): Promise<{ ok: boolean; label: string }> {
  const config = getR2StorageConfig()
  const missing = [...config.missing]
  if (!config.publicBaseUrl) missing.push("CLOUDFLARE_R2_PUBLIC_BASE_URL or R2_PUBLIC_BASE_URL")
  if (!config.ready || !config.bucket || missing.length > 0) {
    return { ok: false, label: `R2 is not ready: ${missing.join(", ")}` }
  }

  try {
    const client = await createR2Client()
    const { HeadBucketCommand } = await import("@aws-sdk/client-s3")
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }))
    return { ok: true, label: `bucket reachable: ${config.bucket}` }
  } catch (error) {
    console.error("[r2-storage] HeadBucket health check failed:", error)
    return { ok: false, label: error instanceof Error ? error.message : "R2 HeadBucket failed" }
  }
}
