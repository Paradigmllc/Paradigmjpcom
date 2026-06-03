import type { Metadata } from "next"
import { RootPage, generatePageMetadata } from "@payloadcms/next/views"
import { importMap } from "../importMap.js"
import config from "@payload-config"
import { headers } from "next/headers"
import {
  getPayloadInitFailureMessage,
  isPayloadInitCoolingDown,
  markPayloadInitFailure,
  payloadInitCooldownRemainingMs,
} from "@/lib/payload-availability"

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
  const salesDashboardPath = `/${locale}/admin/sales`
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
        <p style={{ color: "#be123c", fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", margin: 0 }}>
          PAYLOADCMS DATABASE UNAVAILABLE
        </p>
        <h1 style={{ fontSize: 28, lineHeight: 1.25, margin: "12px 0 10px" }}>
          管理画面のデータベース接続を確認しています
        </h1>
        <p style={{ color: "#52525b", fontSize: 14, lineHeight: 1.8, margin: 0 }}>
          PayloadCMS の Postgres 接続が一時的に失敗したため、通常の CMS 管理画面を保護表示に切り替えました。
          公開サイトと営業ダッシュボードの fallback 画面は利用できます。
        </p>
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
            }}
          >
            {message}
          </pre>
        ) : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
          <a
            href={salesDashboardPath}
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
            営業ダッシュボードへ
          </a>
          <a
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
          </a>
        </div>
        {remainingSeconds > 0 ? (
          <p style={{ color: "#71717a", fontSize: 12, margin: "16px 0 0" }}>
            過剰な再接続を避けるため、約 {remainingSeconds} 秒間は保護表示を優先します。
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
    return await RootPage({ config, importMap, params, searchParams })
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
