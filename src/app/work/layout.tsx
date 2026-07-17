import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Manual Japan Entry Workbench | Paradigm",
  description: "海外SMBのJapan Entry営業準備を行う管理者専用ワークベンチ",
  robots: { index: false, follow: false },
}

export default function ManualWorkLayout({ children }: { children: ReactNode }) {
  return <html lang="ja" data-theme="light"><body>{children}</body></html>
}
