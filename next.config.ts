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
}

export default withPayload(withNextIntl(nextConfig))
