import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Manual Japan Entry Workbench | Paradigm",
  description: "海外SMBのJapan Entry営業準備を行う管理者専用ワークベンチ",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function ManualWorkLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" data-theme="light" className="min-h-full w-full min-w-full overflow-x-clip bg-[#f6f7f9]">
      <body className="min-h-full w-full min-w-full overflow-x-clip bg-[#f6f7f9]">{children}</body>
    </html>
  )
}
