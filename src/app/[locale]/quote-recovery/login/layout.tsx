import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "ログイン | Quote Recovery",
  description: "Quote Recoveryへのログインと新規契約",
  robots: { index: false, follow: false },
}

export default function QuoteRecoveryLoginLayout({ children }: { children: ReactNode }) {
  return children
}
