import "./globals.css"

/**
 * Root layout — next-intl v4 公式パターン。
 *
 * このファイルは Next.js の App Router 仕様を満たすために存在する。
 * 実際の <html>/<body> と i18n プロバイダは src/app/[locale]/layout.tsx に置く。
 *
 * - not-found.tsx, error.tsx, robots.ts, sitemap.ts 等のルートレベルファイルが動作するために必要
 * - children をそのまま返すだけ（html/body は子レイアウトが持つ）
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
