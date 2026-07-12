import type { Metadata } from "next"
import { RootPage, generatePageMetadata } from "@payloadcms/next/views"
import { importMap } from "../importMap.js"
import config from "@payload-config"
import { headers } from "next/headers"
import Link from "next/link"
import {
  getPayloadInitFailureMessage,
  getConsecutiveFailures,
  isPayloadInitCoolingDown,
  markPayloadInitFailure,
  payloadInitCooldownRemainingMs,
  resetPayloadCooldown,
  withPayloadRetry,
  getPayloadPoolMetrics,
} from "@/lib/payload-availability"
import { getDbUriInfo } from "@/lib/resolve-database-uri"

type Args = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] }>
}

function isNextControlFlowError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    ((error as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (error as { digest: string }).digest.startsWith("NEXT_NOT_FOUND"))
  )
}

export const generateMetadata = async ({ params, searchParams }: Args): Promise<Metadata> => {
  try {
    return await generatePageMetadata({ config, params, searchParams })
  } catch (e) {
    if (isNextControlFlowError(e)) throw e
    console.error("[payload-admin] generate metadata failed:", e)
    markPayloadInitFailure(e)
    return {
      title: "管理画面 | Paradigm CMS",
      robots: { index: false, follow: false },
    }
  }
}

function PayloadAdminUnavailable({ locale }: { locale: string }) {
  const remainingSeconds = Math.ceil(payloadInitCooldownRemainingMs() / 1000)
  const message = getPayloadInitFailureMessage()
  const failures = getConsecutiveFailures()
  const metrics = getPayloadPoolMetrics()
  const twentyCrmPath = "https://twenty.paradigmjp.com"
  const isPoolExhaustion = message.toLowerCase().includes("echeckouttimeout") || message.toLowerCase().includes("unable to check out")

  let dbInfo: ReturnType<typeof getDbUriInfo> | null = null
  try {
    dbInfo = getDbUriInfo()
  } catch (error) {
    console.error("[payload-admin] database URI inspection failed:", error)
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f7f7f4", color: "#18181b", padding: 24 }}>
      <section
        style={{
          border: "1px solid #e4e4e7",
          borderRadius: 8,
          background: "#fff",
          margin: "10vh auto 0",
          maxWidth: 760,
          padding: 32,
          boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
        }}
      >
        <p style={{ color: isPoolExhaustion ? "#d97706" : "#be123c", fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", margin: 0 }}>
          PAYLOADCMS DATABASE UNAVAILABLE
        </p>
        <h1 style={{ fontSize: 28, lineHeight: 1.25, margin: "12px 0 10px" }}>
          管理画面のデータベース接続を確認しています
        </h1>
        <p style={{ color: "#52525b", fontSize: 14, lineHeight: 1.8, margin: 0 }}>
          PayloadCMS の Postgres 接続が一時的に失敗したため、通常の CMS 管理画面を保護表示に切り替えました。
          公開サイトとTwenty CRMのfallback画面は利用できます。
        </p>
        {isPoolExhaustion ? (
          <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 6, marginTop: 14, padding: "12px 14px" }}>
            <p style={{ color: "#92400e", fontSize: 13, fontWeight: 700, margin: "0 0 8px 0" }}>Supabase Pooler 接続プール枯渇</p>
            <p style={{ color: "#a16207", fontSize: 12, lineHeight: 1.7, margin: 0 }}>
              原因: Session モードの Pooler (port 5432) では全接続が占有されて枯渇します。<br />
              対策: Transaction モード (port 6543) への切替が必要です。Supabase Dashboard → Settings → Database → Connection Pooling で変更してください。
            </p>
          </div>
        ) : null}
        {message ? (
          <pre
            style={{
              background: "#f4f4f5",
              borderRadius: 6,
              color: "#3f3f46",
              fontSize: 12,
              lineHeight: 1.6,
              marginTop: 18,
              overflowX: "auto",
              padding: 12,
              whiteSpace: "pre-wrap",
              maxHeight: 200,
            }}
          >
            {message}
          </pre>
        ) : null}
        {failures > 1 ? (
          <p style={{ color: "#a16207", background: "#fef9c3", borderRadius: 6, fontSize: 13, marginTop: 14, padding: "10px 14px" }}>
            連続 {failures} 回の接続失敗を検出しました。Supabase Pooler の状態を確認してください。
          </p>
        ) : null}
        {dbInfo ? (
          <div style={{ background: "#f4f4f5", borderRadius: 6, fontSize: 12, color: "#52525b", marginTop: 14, padding: "10px 14px", fontFamily: "monospace" }}>
            <div>Host: {dbInfo.host}:{dbInfo.port}</div>
            <div>Pooler: {dbInfo.isPooler ? (dbInfo.isTransactionMode ? "Transaction mode (port 6543)" : "Session mode (port 5432)") : "Direct connection"}</div>
            {!dbInfo.isTransactionMode && dbInfo.isPooler ? <div style={{ color: "#d97706", marginTop: 4 }}>Session mode detected — switch to port 6543 for Transaction mode</div> : null}
          </div>
        ) : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
          <a
            href={twentyCrmPath}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "#18181b",
              borderRadius: 6,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              padding: "10px 14px",
              textDecoration: "none",
            }}
          >
            Twenty CRMへ
          </a>
          <Link
            href="/admin"
            style={{
              border: "1px solid #d4d4d8",
              borderRadius: 6,
              color: "#18181b",
              fontSize: 13,
              fontWeight: 700,
              padding: "10px 14px",
              textDecoration: "none",
            }}
          >
            再試行
          </Link>
        </div>
        {remainingSeconds > 0 ? (
          <p style={{ color: "#71717a", fontSize: 12, margin: "16px 0 0" }}>
            過剰な再接続を避けるため、約 {remainingSeconds === 1 ? "1 秒" : `${remainingSeconds} 秒`}間は保護表示を優先します。
          </p>
        ) : (
          <p style={{ color: "#059669", fontSize: 12, margin: "16px 0 0" }}>
            クールダウンが終了しました。「再試行」をクリックすると再接続されます。
          </p>
        )}
        {metrics.totalFailuresSinceStart > 0 ? (
          <p style={{ color: "#a1a1aa", fontSize: 11, margin: "8px 0 0" }}>
            起動後: {metrics.totalSuccessesSinceStart} 成功 / {metrics.totalFailuresSinceStart} 失敗
          </p>
        ) : null}
      </section>
    </main>
  )
}

const Page = async ({ params, searchParams }: Args) => {
  if (isPayloadInitCoolingDown()) {
    const requestHeaders = await headers()
    const acceptLang = requestHeaders.get("accept-language") || ""
    const locale = acceptLang.toLowerCase().startsWith("en") ? "en" : "ja"
    return <PayloadAdminUnavailable locale={locale} />
  }

  try {
    const result = await withPayloadRetry(() => RootPage({ config, importMap, params, searchParams }))
    resetPayloadCooldown()
    return result
  } catch (e) {
    if (isNextControlFlowError(e)) throw e
    console.error("[payload-admin] RootPage failed:", e)
    markPayloadInitFailure(e)
    const requestHeaders = await headers()
    const acceptLang = requestHeaders.get("accept-language") || ""
    const locale = acceptLang.toLowerCase().startsWith("en") ? "en" : "ja"
    return <PayloadAdminUnavailable locale={locale} />
  }
}

export default Page
