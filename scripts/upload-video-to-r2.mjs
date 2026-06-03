/**
 * レンダリング済み動画を Cloudflare R2 にアップロードするスクリプト
 *
 * 使い方:
 *   node scripts/upload-video-to-r2.mjs <mp4-file> [--public]
 *
 * 説明:
 *   指定されたMP4ファイルを R2 バケットにアップロードし、公開URLを出力する。
 *   --public フラグで公開アクセス可能なURLを生成する。
 *
 * 環境変数:
 *   CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID,
 *   CLOUDFLARE_R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL
 */

import { readFileSync, existsSync } from "fs"
import { resolve, basename } from "path"
import { createHash } from "crypto"

const REQUIRED_ENV = [
  "CLOUDFLARE_R2_ACCOUNT_ID",
  "CLOUDFLARE_R2_ACCESS_KEY_ID",
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
]

function checkEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key])
  if (missing.length > 0) {
    console.error(`✗ 不足している環境変数: ${missing.join(", ")}`)
    console.error("  .env.local または環境変数を設定してください")
    process.exit(1)
  }
}

async function uploadToR2(filePath, makePublic) {
  if (!existsSync(filePath)) {
    console.error(`✗ ファイルが見つかりません: ${filePath}`)
    process.exit(1)
  }

  const fileBuffer = readFileSync(filePath)
  const fileName = basename(filePath)
  const objectKey = `videos/${Date.now()}-${fileName}`
  const contentType = "video/mp4"

  // R2 S3互換API エンドポイント
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
  const accessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL || `https://${bucket}.${accountId}.r2.dev`

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`
  const url = `${endpoint}/${bucket}/${objectKey}`

  // 日付と認証情報
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "")
  const dateStr = amzDate.slice(0, 8)

  // ペイロードハッシュ
  const payloadHash = createHash("sha256").update(fileBuffer).digest("hex")

  // 認証ヘッダー構築（AWS Signature V4）
  const service = "s3"
  const algorithm = "AWS4-HMAC-SHA256"

  // 署名キーを生成
  function hmac(key, str) {
    return createHash("sha256").update(key).update(str).digest()
  }

  function hmacHex(key, str) {
    return createHash("sha256").update(key).update(str).digest("hex")
  }

  const kDate = hmac(`AWS4${secretKey}`, dateStr)
  const kRegion = hmac(kDate, "auto")
  const kService = hmac(kRegion, service)
  const kSigning = hmac(kService, "aws4_request")

  // 正規リクエスト
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date"
  const canonicalRequest = [
    "PUT",
    `/${bucket}/${objectKey}`,
    "",
    `content-type:${contentType}`,
    `host:${accountId}.r2.cloudflarestorage.com`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    "",
    signedHeaders,
    payloadHash,
  ].join("\n")

  const canonicalHash = createHash("sha256").update(canonicalRequest).digest("hex")

  // 署名文字列
  const credentialScope = `${dateStr}/auto/${service}/aws4_request`
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalHash,
  ].join("\n")

  const signature = hmacHex(kSigning, stringToSign)

  const authorization = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  console.log(`\n📤 R2 にアップロード中...`)
  console.log(`   ファイル: ${fileName} (${(fileBuffer.length / 1024 / 1024).toFixed(1)} MB)`)
  console.log(`   バケット: ${bucket}`)
  console.log(`   キー: ${objectKey}`)

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length.toString(),
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
        Authorization: authorization,
      },
      body: fileBuffer,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`R2 API ${response.status}: ${errorText}`)
    }

    const publicUrl = makePublic ? `${publicBaseUrl}/${objectKey}` : null

    console.log(`\n✅ アップロード成功！`)
    console.log(`   オブジェクトキー: ${objectKey}`)
    if (publicUrl) {
      console.log(`   公開URL: ${publicUrl}`)
    }
    console.log(`   ETag: ${response.headers.get("etag") || "N/A"}`)

    return { objectKey, publicUrl }
  } catch (error) {
    console.error(`\n✗ アップロード失敗: ${error.message}`)
    process.exit(1)
  }
}

// --- main ---
const args = process.argv.slice(2)
const filePath = args[0]
const makePublic = args.includes("--public")

if (!filePath) {
  console.error("使い方: node scripts/upload-video-to-r2.mjs <mp4-file> [--public]")
  console.error("例: node scripts/upload-video-to-r2.mjs test-video/renders/test-video_2026-06-03_12-13-55.mp4 --public")
  process.exit(1)
}

checkEnv()
uploadToR2(resolve(filePath), makePublic)
