import { s3Storage } from "@payloadcms/storage-s3"
import type { Plugin } from "payload"

/**
 * PayloadCMS の media コレクションを Cloudflare R2 に逃がす。
 *
 * ローカルディスク (`public/media`) 保存はディスク枯渇の原因になり、
 * かつコンテナ再デプロイでアップロード済みファイルが消える。
 * R2 は egress 無料なので Hetzner の帯域も消費しない。
 *
 * env 未設定時はプラグインを無効化して従来どおりローカル保存にフォールバックする
 * （env 投入前にデプロイしても既存挙動を壊さないため）。
 * 中途半端な設定は握りつぶさず必ずエラーログを出す。
 */
const REQUIRED_ENV = [
  "CLOUDFLARE_R2_ACCOUNT_ID",
  "CLOUDFLARE_R2_ACCESS_KEY_ID",
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
  "CLOUDFLARE_R2_MEDIA_BUCKET",
  "CLOUDFLARE_R2_MEDIA_PUBLIC_BASE_URL",
] as const

type RequiredEnvName = (typeof REQUIRED_ENV)[number]

/** enabled:false のとき s3Storage は一切参照しないが、型上 bucket が必須なので置く番人。 */
const UNUSED_WHEN_DISABLED = "r2-media-storage-disabled"

function readEnv(name: RequiredEnvName): string | null {
  const raw = process.env[name]
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function createR2MediaStorage(): Plugin {
  const env = Object.fromEntries(REQUIRED_ENV.map((name) => [name, readEnv(name)])) as Record<
    RequiredEnvName,
    string | null
  >
  const missing = REQUIRED_ENV.filter((name) => env[name] === null)

  if (missing.length > 0) {
    if (missing.length < REQUIRED_ENV.length) {
      // 一部だけ設定済み＝設定ミス。無言でローカル保存に落ちると事故るので必ず可視化する。
      console.error(
        `[payload-r2-media] R2 設定が不完全なためローカル保存にフォールバックします。未設定: ${missing.join(", ")}`,
      )
    }
    // enabled を切り替えるとスキーマが環境ごとにズレて migration が壊れるため、
    // 無効時も alwaysInsertFields でフィールド定義だけは同一に保つ。
    return s3Storage({
      enabled: false,
      alwaysInsertFields: true,
      collections: { media: { prefix: "media" } },
      bucket: UNUSED_WHEN_DISABLED,
      config: {},
    })
  }

  const accountId = env.CLOUDFLARE_R2_ACCOUNT_ID as string
  const publicBaseUrl = (env.CLOUDFLARE_R2_MEDIA_PUBLIC_BASE_URL as string).replace(/\/+$/, "")

  return s3Storage({
    enabled: true,
    alwaysInsertFields: true,
    collections: {
      media: {
        prefix: "media",
        // media の access.read は公開なので、R2 公開ドメインから直接配信して Cloudflare CDN に載せる
        disablePayloadAccessControl: true,
        generateFileURL: ({ filename, prefix }) =>
          `${publicBaseUrl}/${prefix ? `${prefix}/${filename}` : filename}`,
      },
    },
    bucket: env.CLOUDFLARE_R2_MEDIA_BUCKET as string,
    config: {
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID as string,
        secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY as string,
      },
    },
  })
}
