import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { getR2StorageConfig, sanitizeR2ObjectName } from "@/lib/sales/r2-storage"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

function getR2Client() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim()
  const accessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim()
  const secretKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim()
  if (!accountId || !accessKey || !secretKey) return null
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  })
}

/**
 * POST /api/sales/r2/upload — 大容量ファイルをR2にアップロード
 * Body: { key: string, body: string (base64 or text), contentType: string }
 * 
 * 用途: 動画MP4、スクリーンショットPNG、AstroデモHTML
 * SupabaseではなくR2に保存することでDB圧迫と転送コストを回避
 */
export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const config = getR2StorageConfig()
  if (!config.ready || !config.bucket) {
    return NextResponse.json({ ok: false, error: "R2 is not configured" }, { status: 503 })
  }

  const client = getR2Client()
  if (!client) {
    return NextResponse.json({ ok: false, error: "R2 client could not be created" }, { status: 503 })
  }

  try {
    const body = await req.json() as { key?: string; prefix?: string; body?: string; contentType?: string; base64?: boolean }
    if (!body.key && !body.prefix) {
      return NextResponse.json({ ok: false, error: "key or prefix is required" }, { status: 400 })
    }

    const objectKey = sanitizeR2ObjectName(body.key ?? `${body.prefix}/${Date.now()}.json`)
    const content = body.base64 ? Buffer.from(body.body ?? "", "base64") : Buffer.from(body.body ?? "", "utf-8")
    const contentType = body.contentType ?? "application/octet-stream"

    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      Body: content,
      ContentType: contentType,
    }))

    const publicUrl = config.publicBaseUrl
      ? `${config.publicBaseUrl.replace(/\/+$/, "")}/${objectKey}`
      : null

    return NextResponse.json({
      ok: true,
      key: objectKey,
      publicUrl,
      bucket: config.bucket,
      size: content.length,
    })
  } catch (e) {
    console.error("[r2-upload] failed:", e)
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "R2 upload failed" }, { status: 500 })
  }
}

/**
 * GET /api/sales/r2/status — R2の設定状態とバケット情報
 */
export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const config = getR2StorageConfig()
  return NextResponse.json({
    ok: true,
    ready: config.ready,
    bucket: config.bucket,
    publicBaseUrl: config.publicBaseUrl,
    missing: config.missing,
  })
}
