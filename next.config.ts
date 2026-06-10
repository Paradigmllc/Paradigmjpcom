import { withPayload } from "@payloadcms/next/withPayload"
import createNextIntlPlugin from "next-intl/plugin"
import type { NextConfig } from "next"
import path from "node:path"
import fs from "node:fs"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const nextConfig: NextConfig = {
  output: "standalone",
  staticPageGenerationTimeout: 180,
  // Pin Turbopack workspace root to this directory so worktree node_modules
  // resolves correctly. Without this, Next.js auto-detects the parent
  // D:\dev\paradigmjpcom\package-lock.json as root, then Turbopack ignores
  // the worktree's node_modules → "Module not found" for any package
  // installed only in the worktree (e.g. next-themes added by P18-A).
  turbopack: {
    root: process.cwd(),
  },
  // 2026-05-03: @paradigmllc/blocks は TypeScript ソース直配布 (no build step)
  // Appexxme と同一 Block 実装を共有するため transpile 必須。
  transpilePackages: ["@paradigmllc/blocks"],
  // 2026-05-08: OOM 真因 #2 根治 (Appexxme 同期適用 / commit 508a6e3 と同パターン)
  //   build 内の TypeScript validation が別 Node プロセスで peak ~3GB RSS を消費し、
  //   DigitalOcean 4vCPU/8GB Droplet で OOM-killer に殺されていた (paradigm-hp 4 連続 deploy fail root cause)。
  //   型保護は IDE / pre-push hook / CI 側で検証 (build 時点ではスキップして memory 節約).
  typescript: { ignoreBuildErrors: true },
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
