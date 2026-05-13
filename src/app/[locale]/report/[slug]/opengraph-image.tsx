/**
 * /[locale]/report/[slug]/opengraph-image.tsx — Sprint 13
 *
 * 役割: 診断レポートが Slack/LINE/メールでシェアされた時の OG 画像 (1200×630).
 *       sales_companies.company_name を画像に動的合成し、SNS リッチプレビューで
 *       「○○社さま 専用診断レポート」と表示.
 *
 * Sprint 13: /diagnostic → /report に URL リネームに合わせて移動.
 *            slug ベース lookup に統一.
 */

import { ImageResponse } from "next/og"
import { findCompanyBySlug } from "@/lib/sales/companies"
import { localeToRegion } from "@/lib/sales/types"

export const runtime = "nodejs"
export const contentType = "image/png"
export const size = { width: 1200, height: 630 }

export default async function OG({ params }: { params: { locale: string; slug: string } }) {
  const { locale, slug } = params
  const region = localeToRegion(locale) // Sprint 16
  const company = await findCompanyBySlug(slug, region)

  const name = company?.company_name ?? "御社"
  const lossLine = company?.detected_issues?.length
    ? `${company.detected_issues.length} 件の課題を検出`
    : "Web 健康診断"

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 80,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 18,
            color: "#94a3b8",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              color: "#fff",
            }}
          >
            P
          </div>
          Paradigm Web Diagnostics
        </div>

        <div
          style={{
            fontSize: 24,
            color: "#94a3b8",
            marginBottom: 16,
            display: "flex",
          }}
        >
          診断対象
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: 32,
            letterSpacing: "-0.02em",
            display: "flex",
            color: "#fff",
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#fbbf24",
            display: "flex",
            background: "rgba(251, 191, 36, 0.12)",
            border: "1px solid rgba(251, 191, 36, 0.3)",
            padding: "12px 24px",
            borderRadius: 12,
          }}
        >
          ⚠️ {lossLine}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 60,
            right: 80,
            fontSize: 18,
            color: "#64748b",
            letterSpacing: "0.06em",
            display: "flex",
          }}
        >
          paradigmjp.com / report
        </div>
      </div>
    ),
    { ...size },
  )
}
