import { withPayload } from "@payloadcms/next/withPayload"
import createNextIntlPlugin from "next-intl/plugin"
import type { NextConfig } from "next"
import path from "node:path"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const nextConfig: NextConfig = {
  // Pin Turbopack workspace root to this directory so worktree node_modules
  // resolves correctly. Without this, Next.js auto-detects the parent
  // D:\dev\paradigmjpcom\package-lock.json as root, then Turbopack ignores
  // the worktree's node_modules → "Module not found" for any package
  // installed only in the worktree (e.g. next-themes added by P18-A).
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  /**
   * 顧客向け公開 URL は /report/[slug] に統一 (CLAUDE.md s10-5 永久ルール)。
   * /p/[slug] は廃止 — Next.js redirects() で 308 (permanent) を framework level
   * で返し、page.tsx は不要 (zero render cost)。
   *
   * 308 は method + body を保持するため、外部から POST でリンクされるケース
   * (beacon 等) にも安全に対応。
   */
  async redirects() {
    return [
      // /[locale]/p/[slug] → /[locale]/report/[slug]
      {
        source: "/:locale(ja|en|ko|zh|de|fr|es|pt|ru|ar|vi|id)/p/:slug",
        destination: "/:locale/report/:slug",
        permanent: true,
      },
      // /p/[slug] (locale-less) → /ja/report/[slug] (defaultLocale)
      {
        source: "/p/:slug",
        destination: "/ja/report/:slug",
        permanent: true,
      },
    ]
  },
}

export default withPayload(withNextIntl(nextConfig))
